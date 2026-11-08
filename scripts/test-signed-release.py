#!/usr/bin/env python3
"""Exercise the complete signed updater release gate with disposable packages."""
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

SCRIPTS = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('signed_release', SCRIPTS / 'prepare-installer-release.py')
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)


class SignedReleaseTests(unittest.TestCase):
    commit = '1234567890abcdef1234567890abcdef12345678'
    version = '0.9.5'
    tag = 'v0.9.5-beta.1'

    def fixture(self, root):
        (root / 'package.json').write_text(json.dumps({'version': self.version}))
        config = root / 'src-tauri/tauri.conf.json'
        config.parent.mkdir()
        package = root / 'packages/runtime/package.json'
        package.parent.mkdir(parents=True)
        package.write_text('{"version":"0.1.0-beta.1"}')
        artifacts = root / 'artifacts'
        files = []
        reports = []
        for target, (architectures, templates) in release.TARGETS.items():
            rows = []
            base = root / 'target' / target / 'release'
            for template in templates:
                path = base / template.format(version=self.version)
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(('Own generated package ' + path.name).encode())
                rows.append({'path': path.relative_to(base).as_posix(),
                             'bytes': path.stat().st_size, 'sha256': release.digest(path)})
            for relative, _ in release.update_templates(target, self.version):
                path = base / relative
                if not path.exists():
                    path.parent.mkdir(parents=True, exist_ok=True)
                    path.write_bytes(b'Own generated macOS updater fixture')
                files.append(str(path))
            reports.append((target, base, {
                'source_commit': self.commit, 'target': target, 'version': self.version,
                'architectures': architectures, 'checks': [*release.CHECKS, release.UPDATE_CHECK],
                'executable_sha256': 'a' * 64, 'packages': rows, 'native_gui_validation': False,
                'signing': 'ad-hoc; not notarized' if target == 'universal-apple-darwin' else 'not verified',
                'distribution': release.DISTRIBUTION,
            }))
        key_path = root / 'disposable-public-key.txt'
        subprocess.run(['node', str(SCRIPTS / 'test-updater-signature.mjs'), '--write-fixtures'],
                       input=json.dumps({'files': files, 'version': self.version, 'publicKeyPath': str(key_path)}),
                       text=True, check=True, capture_output=True)
        key = key_path.read_text()
        config.write_text(json.dumps({'plugins': {'updater': {
            'pubkey': key, 'requireSignedVersion': True, 'allowDowngrades': False,
            'endpoints': ['https://github.com/Malasuerte94/FBones/releases/latest/download/latest.json'],
        }}}))
        (root / 'scripts').mkdir()
        # The real verifier imports only Node built-ins; copying it makes ROOT
        # point entirely into this disposable fixture without mocking signatures.
        (root / 'scripts/verify-updater-signature.mjs').write_bytes((SCRIPTS / 'verify-updater-signature.mjs').read_bytes())
        for target, base, report in reports:
            updates = []
            for relative, platforms in release.update_templates(target, self.version):
                artifact, signature = base / relative, base / (relative + '.sig')
                updates.append({'path': relative, 'bytes': artifact.stat().st_size,
                                'sha256': release.digest(artifact), 'signature_path': relative + '.sig',
                                'signature_bytes': signature.stat().st_size,
                                'signature_sha256': release.digest(signature), 'platforms': platforms})
            report['updates'] = updates
            report['updater_public_key_sha256'] = hashlib.sha256(key.encode()).hexdigest()
            report_path = root / 'ci-reports' / f'{target}.json'
            report_path.parent.mkdir(exist_ok=True)
            report_path.write_text(json.dumps(report))
            with patch.object(release, 'ROOT', root), patch('builtins.print'):
                release.stage(target, self.commit, artifacts / f'installers-{target}')
        source, runtime, output = root / 'source', root / 'runtime', root / 'output'
        source.mkdir()
        (source / 'repository').mkdir()
        runtime.mkdir()
        for directory, name, checksum in [
                (source, f'fbones-{self.tag}-source.tar.gz', 'SHA256SUMS'),
                (runtime, 'fbones-runtime-0.1.0-beta.1.tgz', 'RUNTIME_SHA256SUMS')]:
            archive = directory / name
            archive.write_bytes(b'Own archive fixture; content verifiers run separately.')
            (directory / checksum).write_text(f'{release.digest(archive)}  {name}\n')
        return artifacts, source, runtime, output

    def assemble(self, root, inputs):
        with patch.object(release, 'ROOT', root), patch('builtins.print'):
            release.assemble(*inputs, self.tag, self.commit)

    def test_closed_sixteen_asset_release_and_five_exact_bundle_routes(self):
        with tempfile.TemporaryDirectory() as name:
            root = Path(name)
            inputs = self.fixture(root)
            self.assemble(root, inputs)
            output = inputs[-1]
            self.assertEqual(len(list(output.iterdir())), 16)
            manifest = json.loads((output / 'latest.json').read_text())
            self.assertEqual(manifest['version'], self.version)
            self.assertEqual(manifest['source_commit'], self.commit)
            self.assertEqual(set(manifest['platforms']), {'windows-x86_64-nsis', 'linux-x86_64-deb',
                             'linux-x86_64-appimage', 'darwin-x86_64-app', 'darwin-aarch64-app'})
            self.assertEqual(manifest['platforms']['darwin-x86_64-app'], manifest['platforms']['darwin-aarch64-app'])
            for entry in manifest['platforms'].values():
                self.assertTrue(entry['url'].startswith(f'https://github.com/Malasuerte94/FBones/releases/download/{self.tag}/'))
                self.assertTrue((output / entry['url'].split('/')[-1]).is_file())
            checksums = (output / 'SHA256SUMS').read_text().splitlines()
            self.assertEqual(len(checksums), 15)
            for line in checksums:
                expected, filename = line.split('  ')
                self.assertEqual(expected, release.digest(output / filename))

    def test_rejects_signed_payload_signature_and_route_tampering(self):
        target = 'x86_64-pc-windows-msvc'
        for change in ('payload', 'signature', 'version', 'route', 'missing', 'unsigned', 'extra'):
            with self.subTest(change=change), tempfile.TemporaryDirectory() as name:
                root = Path(name)
                inputs = self.fixture(root)
                directory = inputs[0] / f'installers-{target}'
                report_path = directory / f'{target}.json'
                report = json.loads(report_path.read_text())
                row = report['updates'][0]
                artifact = directory / Path(row['path']).name
                signature = directory / Path(row['signature_path']).name
                if change == 'payload':
                    artifact.write_bytes(b'Changed after signing')
                    row.update(bytes=artifact.stat().st_size, sha256=release.digest(artifact))
                    report['packages'][0].update(bytes=row['bytes'], sha256=row['sha256'])
                elif change in ('signature', 'version'):
                    import base64
                    decoded = base64.b64decode(signature.read_text()).decode()
                    decoded = decoded.replace('version:0.9.5', 'version:0.9.6') if change == 'version' else decoded.replace('timestamp:1', 'timestamp:2')
                    signature.write_bytes(base64.b64encode(decoded.encode()))
                    row.update(signature_bytes=signature.stat().st_size, signature_sha256=release.digest(signature))
                elif change == 'route':
                    row['platforms'] = ['windows-x86_64']
                elif change == 'missing':
                    signature.unlink()
                elif change == 'unsigned':
                    report.pop('updates')
                    report['checks'] = release.CHECKS
                elif change == 'extra':
                    (directory / 'unexpected.sig').write_bytes(b'Extra unreviewed signature')
                report_path.write_text(json.dumps(report))
                with self.assertRaises(ValueError):
                    self.assemble(root, inputs)
                self.assertFalse(inputs[-1].exists())


if __name__ == '__main__':
    unittest.main()
