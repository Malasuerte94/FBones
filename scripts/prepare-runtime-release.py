#!/usr/bin/env python3
"""Verify the independently built runtime archive and write its release digest."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import tarfile

ROOT = Path(__file__).resolve().parents[1]
SENSITIVE = re.compile(
    rb'(?:-----BEGIN (?:OPENSSH |RSA |EC )?PRIVATE KEY-----|'
    rb'gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|'
    rb'AKIA[A-Z0-9]{16}|/(?:home|Users|mnt|media)/[A-Za-z0-9_.-]+/|'
    rb'[A-Za-z]:\\Users\\[^\\\s]+\\)'
)


def prepare(directory):
    archives = list(directory.glob('*.tgz'))
    if len(archives) != 1:
        raise ValueError('Expected exactly one runtime archive.')
    archive = archives[0]
    expected = json.loads((ROOT / 'packages/runtime/package.json').read_text())
    with tarfile.open(archive, 'r:gz') as bundle:
        names = set()
        total = 0
        for member in bundle:
            parts = PurePosixPath(member.name).parts
            if (not parts or parts[0] != 'package' or '..' in parts
                    or not member.isfile() or member.name in names
                    or '\\' in member.name or PurePosixPath(member.name).as_posix() != member.name):
                raise ValueError('Unexpected runtime archive member.')
            if any(part in {'.git', '.local', '.tools', 'node_modules', 'research'} for part in parts):
                raise ValueError('Private/build dependencies do not belong in the runtime archive.')
            relative = '/'.join(parts[1:])
            if relative not in {'LICENSE', 'README.md', 'package.json'} and not relative.startswith(('dist/', 'examples/')):
                raise ValueError('Runtime archive contains an unreviewed public path.')
            total += member.size
            if member.size > 32 * 1024 * 1024 or total > 64 * 1024 * 1024:
                raise ValueError('Runtime archive exceeds its supported review budget.')
            data = bundle.extractfile(member).read()
            data.decode('utf-8')
            if SENSITIVE.search(data):
                raise ValueError('Runtime archive contains a potential private path or credential.')
            names.add(member.name)
        required = {'package/package.json', 'package/LICENSE', 'package/README.md',
                    'package/dist/index.js', 'package/dist/pixi.js',
                    'package/dist/types/packages/runtime/src/index.d.ts',
                    'package/dist/types/packages/runtime/src/pixi.d.ts'}
        if not required.issubset(names):
            raise ValueError('Runtime archive is missing its public entries/license.')
        package = json.load(bundle.extractfile('package/package.json'))
        if (package['name'] != '@fbones/runtime' or package['license'] != 'MIT'
                or package['version'] != expected['version']):
            raise ValueError('Unexpected runtime package identity/license.')
        if archive.name != f'fbones-runtime-{package["version"]}.tgz':
            raise ValueError('Runtime archive filename does not match its version.')
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    (directory / 'RUNTIME_SHA256SUMS').write_text(f'{digest}  {archive.name}\n')
    print(f'Runtime archive verified: {archive.name}, SHA256 {digest}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    args = parser.parse_args()
    try:
        prepare(args.directory)
    except (ValueError, OSError, KeyError, tarfile.TarError) as error:
        parser.exit(1, f'{error}\n')
