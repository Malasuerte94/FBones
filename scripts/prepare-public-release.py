#!/usr/bin/env python3
"""Export an allowlisted, auditable source beta without copying local research."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import tarfile

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_TAG = 'v0.9.6-beta.1'
FILES = (
    '.gitignore', 'AGENTS.md', 'README.md', 'CONTRIBUTING.md', 'LICENSE',
    'THIRD_PARTY_NOTICES.md', 'Cargo.toml', 'Cargo.lock', 'package.json',
    'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'index.html', 'vite.config.ts',
    'tsconfig.json', 'tsconfig.e2e.json', 'playwright.config.ts',
)
TREES = ('.github', 'src', 'src-tauri', 'crates', 'tests', 'scripts', 'docs', 'packages/runtime')
SKIP_PARTS = {'gen', '__pycache__', 'node_modules', 'target', 'dist', '.git', '.local', '.tools'}
OWN_TEXT_FILES = {'packages/runtime/LICENSE',
    'scripts/native-windows-pointer/owned-rect-click.cs',
                  'scripts/native-acceptance/nul-gui-launch.cs',
                  'scripts/native-acceptance/native-updater-uia.cs',
                  'scripts/native-acceptance/legacy-metadata.cpp',
                  'scripts/native-mac-nonchild/own-nonchild.c',
                  'scripts/native-acceptance/legacy-metadata.cs',
                  'scripts/native-acceptance/mac.swift',
                  'scripts/native-acceptance/own-process-identity.c',
                  'scripts/native-acceptance/own-process-identity.h'}
EXTENSIONS = {'.md', '.json', '.rs', '.toml', '.ts', '.mts', '.mjs', '.vue',
              '.css', '.html', '.yaml', '.yml', '.py', '.sh', '.ps1', '.bat',
              '.svg', '.png', '.ico', '.icns'}
BINARY_ASSETS = {
    'src-tauri/icons/icon.png', 'src-tauri/icons/icon.ico',
    'src-tauri/icons/icon.icns', 'docs/screenshots/setup.png',
    'docs/screenshots/animate-dopesheet.png', 'docs/screenshots/animate-graph.png',
}
SENSITIVE = re.compile(
    rb'(?:-----BEGIN (?:OPENSSH |RSA |EC )?PRIVATE KEY-----|'
    rb'gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|'
    rb'AKIA[A-Z0-9]{16}|/(?:home|Users|mnt|media)/[A-Za-z0-9_.-]+/|'
    rb'[A-Za-z]:\\Users\\[^\\\s]+\\)'
)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def release_tag(value):
    if not re.fullmatch(r'v\d+\.\d+\.\d+-beta\.[1-9]\d*', value):
        raise ValueError('Expected a versioned beta tag, for example v0.9.6-beta.1.')
    version = value[1:].split('-beta.')[0]
    if json.loads((ROOT / 'package.json').read_text())['version'] != version:
        raise ValueError('Release tag must match the application package version.')
    return value


def selected_files():
    for name in FILES:
        yield ROOT / name
    for name in TREES:
        for path in sorted((ROOT / name).rglob('*')):
            relative = path.relative_to(ROOT)
            if any(part in SKIP_PARTS for part in relative.parts):
                continue
            # Historical user instructions stay private; written current findings remain.
            if relative.parts[:3] == ('docs', 'research', 'archive'):
                continue
            if path.is_symlink():
                raise ValueError(f'Symlink requires explicit review: {relative}')
            if path.is_file():
                if path.suffix not in EXTENSIONS and relative.as_posix() not in OWN_TEXT_FILES:
                    raise ValueError(f'Unreviewed extension: {relative}')
                yield path


def verify(repository):
    manifest = json.loads((repository / 'PUBLIC_SOURCE_MANIFEST.json').read_text())
    expected = {row['path']: row['sha256'] for row in manifest['files']}
    actual = set()
    for path in repository.rglob('*'):
        relative = path.relative_to(repository)
        if relative.parts[0] == '.git':
            continue
        if path.is_symlink():
            raise ValueError(f'Symlink in export: {relative}')
        if path.is_file() and str(relative) != 'PUBLIC_SOURCE_MANIFEST.json':
            name = relative.as_posix()
            actual.add(name)
            if name not in expected or digest(path.read_bytes()) != expected[name]:
                raise ValueError(f'Unexpected or changed exported file: {name}')
    if actual != expected.keys():
        raise ValueError('Export manifest has missing files')
    print(f'Verified {len(expected)} source/asset hashes; no extra files.')


def verify_archive(repository, archive):
    manifest = json.loads((repository / 'PUBLIC_SOURCE_MANIFEST.json').read_text())
    expected = {row['path']: row['sha256'] for row in manifest['files']}
    expected['PUBLIC_SOURCE_MANIFEST.json'] = digest((repository / 'PUBLIC_SOURCE_MANIFEST.json').read_bytes())
    prefix = f'FBones-{manifest["release"]}'
    actual = set()
    with tarfile.open(archive, 'r:gz') as bundle:
        for member in bundle:
            parts = Path(member.name).parts
            if not parts or parts[0] != prefix or '..' in parts:
                raise ValueError('Unexpected archive member path')
            if member.isdir():
                continue
            name = '/'.join(parts[1:])
            if not member.isfile() or name in actual or name not in expected:
                raise ValueError(f'Unexpected archive member: {name}')
            actual.add(name)
            stream = bundle.extractfile(member)
            if stream is None or digest(stream.read()) != expected[name]:
                raise ValueError(f'Archive does not match reviewed source: {name}')
    if actual != expected.keys():
        raise ValueError('Archive is missing reviewed source files')
    print(f'Archive contents match all {len(actual)} reviewed source/manifest hashes.')


def neutral_metadata(member):
    member.uid = member.gid = 0
    member.uname = member.gname = ''
    member.mtime = 0
    return member


def export(output, tag):
    tag = release_tag(tag)
    if output.exists():
        raise ValueError('Output already exists; choose a fresh directory.')
    repository = output / 'repository'
    repository.mkdir(parents=True)
    rows = []
    for path in selected_files():
        relative = path.relative_to(ROOT).as_posix()
        data = path.read_bytes()
        if relative in BINARY_ASSETS:
            if relative.endswith('.png') and not data.startswith(b'\x89PNG\r\n\x1a\n'):
                raise ValueError(f'Invalid PNG: {relative}')
        else:
            data.decode('utf-8')
            if SENSITIVE.search(data):
                raise ValueError(f'Potential secret or private path requires review: {relative}')
        destination = repository / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(path, destination)
        rows.append({'path': relative, 'bytes': len(data), 'sha256': digest(data)})
    manifest = {'release': tag, 'kind': 'source-only', 'files': rows}
    (repository / 'PUBLIC_SOURCE_MANIFEST.json').write_text(json.dumps(manifest, indent=2) + '\n')
    verify(repository)
    archive = output / f'fbones-{tag}-source.tar.gz'
    with tarfile.open(archive, 'w:gz') as bundle:
        bundle.add(repository, arcname=f'FBones-{tag}', filter=neutral_metadata)
    verify_archive(repository, archive)
    checksum = digest(archive.read_bytes())
    (output / 'SHA256SUMS').write_text(f'{checksum}  {archive.name}\n')
    print(f'Prepared source beta: {len(rows)} files, {archive.stat().st_size} archive bytes.')
    print(f'Archive: {archive.relative_to(ROOT) if archive.is_relative_to(ROOT) else archive.name}')
    print(f'SHA-256: {checksum}')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / '.local' / 'public-beta' / 'current')
    parser.add_argument('--tag', default=DEFAULT_TAG, help='New beta tag matching the application version.')
    parser.add_argument('--verify', type=Path)
    parser.add_argument('--archive', type=Path, help='Also compare an archive to the verified source.')
    args = parser.parse_args()
    try:
        if args.verify:
            verify(args.verify.resolve())
            if args.archive:
                verify_archive(args.verify.resolve(), args.archive.resolve())
        else:
            export(args.output.resolve(), args.tag)
    except (ValueError, OSError) as error:
        parser.exit(1, f'{error}\n')


if __name__ == '__main__':
    main()
