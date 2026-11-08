#!/usr/bin/env python3
"""Self-contained release policy regressions using only generated temporary data."""
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest
from unittest.mock import patch


def module(name, filename):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(filename))
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


source = module('public_source_policy', 'prepare-public-release.py')
runtime = module('runtime_archive_policy', 'prepare-runtime-release.py')
installers = module('installer_archive_policy', 'prepare-installer-release.py')


class ReleasePolicyTests(unittest.TestCase):
    def test_tag_matches_application_version_and_is_safe_as_a_filename(self):
        with tempfile.TemporaryDirectory() as name:
            root = Path(name)
            (root / 'package.json').write_text('{"version":"0.9.4"}')
            with patch.object(source, 'ROOT', root):
                self.assertEqual(source.release_tag('v0.9.4-beta.3'), 'v0.9.4-beta.3')
                for tag in ['main', 'v0.9.4-beta.0', 'v0.9.4-beta.3/next',
                            'v0.9.4-beta.3;exit', 'v0.9.5-beta.1']:
                    with self.subTest(tag=tag), self.assertRaises(ValueError):
                        source.release_tag(tag)

    def test_runtime_source_license_is_included_without_build_or_private_trees(self):
        with tempfile.TemporaryDirectory() as name:
            root = Path(name)
            for relative in ['packages/runtime/LICENSE', 'packages/runtime/src/index.ts',
                             'packages/runtime/dist/index.js', 'packages/runtime/.local/private.md']:
                path = root / relative
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text('Own generated release test')
            with patch.object(source, 'ROOT', root), patch.object(source, 'FILES', ()), patch.object(source, 'TREES', ('packages/runtime',)):
                self.assertEqual({p.relative_to(root).as_posix() for p in source.selected_files()},
                                 {'packages/runtime/LICENSE', 'packages/runtime/src/index.ts'})

    def test_runtime_archive_closed_shape_version_and_private_data_guards(self):
        with tempfile.TemporaryDirectory() as name:
            root = Path(name)
            package = {'name': '@fbones/runtime', 'version': '0.1.0-beta.1', 'license': 'MIT'}
            package_path = root / 'packages/runtime/package.json'
            package_path.parent.mkdir(parents=True)
            package_path.write_text(json.dumps(package))
            output = root / 'output'
            output.mkdir()
            archive = output / 'fbones-runtime-0.1.0-beta.1.tgz'
            required = [('package/package.json', json.dumps(package).encode()),
                        ('package/LICENSE', b'MIT'), ('package/README.md', b'Own runtime'),
                        ('package/dist/index.js', b'export const own = true;'),
                        ('package/dist/pixi.js', b'export const view = true;'),
                        ('package/dist/types/packages/runtime/src/index.d.ts', b'export {};'),
                        ('package/dist/types/packages/runtime/src/pixi.d.ts', b'export {};')]

            def write(extra=(), members=None):
                with tarfile.open(archive, 'w:gz') as bundle:
                    for path, data in (members or required) + list(extra):
                        info = tarfile.TarInfo(path)
                        info.size = len(data)
                        bundle.addfile(info, io.BytesIO(data))

            with patch.object(runtime, 'ROOT', root):
                write()
                runtime.prepare(output)
                self.assertEqual((output / 'RUNTIME_SHA256SUMS').read_text(),
                                 hashlib.sha256(archive.read_bytes()).hexdigest() + '  ' + archive.name + '\n')
                for path, data in [('package/dist/./index.js', b'x'),
                                   ('package/../escape', b'x'),
                                   ('package/dist/index.js', b'duplicate'),
                                   ('package/extra.txt', b'unreviewed'),
                                   ('package/dist/private.js', ('/home/' + 'someone/private').encode()),
                                   ('package/dist/token.js', ('ghp_' + 'a' * 36).encode())]:
                    with self.subTest(path=path), self.assertRaises(ValueError):
                        write([(path, data)])
                        runtime.prepare(output)
                wrong = [('package/package.json', json.dumps({**package, 'version': '9.9.9'}).encode()), *required[1:]]
                write(members=wrong)
                with self.assertRaises(ValueError):
                    runtime.prepare(output)


class InstallerReleaseTests(unittest.TestCase):
    commit = '1234567890abcdef1234567890abcdef12345678'
    tag = 'v0.9.4-beta.6'

    def fixture(self, root):
        (root / 'package.json').write_text('{"version":"0.9.4"}')
        package = root / 'packages/runtime/package.json'
        package.parent.mkdir(parents=True)
        package.write_text('{"version":"0.1.0-beta.1"}')
        artifacts = root / 'artifacts'
        with patch.object(installers, 'ROOT', root):
            for target, (architectures, templates) in installers.TARGETS.items():
                rows = []
                for template in templates:
                    relative = template.format(version='0.9.4')
                    path = root / 'target' / target / 'release' / relative
                    path.parent.mkdir(parents=True, exist_ok=True)
                    path.write_bytes(('Own generated test package ' + target + relative).encode())
                    rows.append({'path': relative, 'bytes': path.stat().st_size,
                                 'sha256': installers.digest(path)})
                report = root / 'ci-reports' / f'{target}.json'
                report.parent.mkdir(exist_ok=True)
                report.write_text(json.dumps({
                    'target': target, 'source_commit': self.commit, 'version': '0.9.4',
                    'architectures': architectures, 'checks': installers.CHECKS,
                    'executable_sha256': 'a' * 64, 'packages': rows,
                    'native_gui_validation': False,
                    'signing': 'ad-hoc; not notarized' if target == 'universal-apple-darwin' else 'not verified',
                    'distribution': installers.DISTRIBUTION,
                }))
                with patch('builtins.print'):
                    installers.stage(target, self.commit, artifacts / f'installers-{target}')
        source = root / 'source'
        runtime = root / 'runtime'
        source.mkdir()
        runtime.mkdir()
        (source / 'repository').mkdir()
        for directory, filename, checksums in [
                (source, f'fbones-{self.tag}-source.tar.gz', 'SHA256SUMS'),
                (runtime, 'fbones-runtime-0.1.0-beta.1.tgz', 'RUNTIME_SHA256SUMS')]:
            archive = directory / filename
            archive.write_bytes(b'Own generated archive; content verifiers run separately.')
            (directory / checksums).write_text(f'{installers.digest(archive)}  {filename}\n')
        return artifacts, source, runtime, root / 'output'

    def assemble(self, root, inputs):
        with patch.object(installers, 'ROOT', root), patch('builtins.print'):
            installers.assemble(*inputs, self.tag, self.commit)

    def test_staged_packages_and_all_nine_release_payloads_match_checksums(self):
        with tempfile.TemporaryDirectory() as name:
            root = Path(name)
            inputs = self.fixture(root)
            self.assemble(root, inputs)
            output = inputs[-1]
            files = {path.name for path in output.iterdir()}
            self.assertEqual(len(files), 10)
            checksums = (output / 'SHA256SUMS').read_text().splitlines()
            self.assertEqual(len(checksums), 9)
            self.assertEqual({line.split('  ')[1] for line in checksums}, files - {'SHA256SUMS'})
            for line in checksums:
                digest, filename = line.split('  ')
                self.assertEqual(installers.digest(output / filename), digest)
            with self.assertRaises(ValueError):
                self.assemble(root, inputs)

    def test_rejects_mismatched_commit_version_architecture_and_unproven_claims(self):
        target = 'x86_64-pc-windows-msvc'
        for field, value in [('source_commit', 'b' * 40), ('version', '0.9.5'),
                             ('architectures', ['arm64']), ('native_gui_validation', True),
                             ('signing', 'trusted'), ('checks', []),
                             ('distribution', 'stable'),
                             ('node', '/home/' + 'someone/private')]:
            with self.subTest(field=field), tempfile.TemporaryDirectory() as name:
                root = Path(name)
                inputs = self.fixture(root)
                path = inputs[0] / f'installers-{target}' / f'{target}.json'
                report = json.loads(path.read_text())
                report[field] = value
                path.write_text(json.dumps(report))
                with self.assertRaises(ValueError):
                    self.assemble(root, inputs)
                self.assertFalse(inputs[-1].exists())

    def test_rejects_changed_missing_extra_traversal_symlink_and_duplicate_packages(self):
        target = 'x86_64-pc-windows-msvc'
        for change in ['changed', 'missing', 'extra', 'traversal', 'symlink', 'duplicate',
                       'wrong-digest', 'wrong-size', 'extra-target', 'missing-target', 'archive']:
            with self.subTest(change=change), tempfile.TemporaryDirectory() as name:
                root = Path(name)
                inputs = self.fixture(root)
                directory = inputs[0] / f'installers-{target}'
                path = directory / 'FBones_0.9.4_x64-setup.exe'
                report_path = directory / f'{target}.json'
                report = json.loads(report_path.read_text())
                if change == 'changed':
                    path.write_bytes(b'Altered package bytes')
                elif change == 'missing':
                    path.unlink()
                elif change == 'extra':
                    (directory / 'unreviewed.pdb').write_bytes(b'Unreviewed')
                elif change == 'traversal':
                    report['packages'][0]['path'] = 'bundle/nsis/../../FBones_0.9.4_x64-setup.exe'
                elif change == 'symlink':
                    path.unlink()
                    # Relative symlinks work on Unix; Windows CI may not grant them.
                    try:
                        path.symlink_to(report_path.name)
                    except OSError:
                        continue
                elif change == 'duplicate':
                    report['packages'].append(report['packages'][0].copy())
                elif change == 'wrong-digest':
                    report['packages'][0]['sha256'] = 'b' * 64
                elif change == 'wrong-size':
                    report['packages'][0]['bytes'] += 1
                elif change == 'extra-target':
                    (inputs[0] / 'installers-unreviewed').mkdir()
                elif change == 'missing-target':
                    directory.rename(inputs[0] / 'missing-target')
                    report_path = inputs[0] / 'missing-target' / report_path.name
                elif change == 'archive':
                    (inputs[2] / 'fbones-runtime-0.1.0-beta.1.tgz').write_bytes(b'Changed runtime')
                report_path.write_text(json.dumps(report))
                with self.assertRaises(ValueError):
                    self.assemble(root, inputs)
                self.assertFalse(inputs[-1].exists())

    def test_stage_revalidates_before_copy_and_rejects_existing_output(self):
        with tempfile.TemporaryDirectory() as name:
            root = Path(name)
            self.fixture(root)
            target = 'x86_64-pc-windows-msvc'
            output = root / 'second-stage'
            with patch.object(installers, 'ROOT', root):
                installers.stage(target, self.commit, output)
                self.assertEqual(len(list(output.iterdir())), 2)
                with self.assertRaises(ValueError):
                    installers.stage(target, self.commit, output)
                package = root / 'target' / target / 'release/bundle/nsis/FBones_0.9.4_x64-setup.exe'
                package.write_bytes(b'Changed after native verification')
                with self.assertRaises(ValueError):
                    installers.stage(target, self.commit, root / 'third-stage')
                self.assertFalse((root / 'third-stage').exists())


if __name__ == '__main__':
    unittest.main()
