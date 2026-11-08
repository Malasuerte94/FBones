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


if __name__ == '__main__':
    unittest.main()
