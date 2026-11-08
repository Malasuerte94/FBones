#!/usr/bin/env python3
"""Stage verified native packages and assemble a closed, checksummed beta release."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]
TARGETS = {
    'x86_64-unknown-linux-gnu': (['x86_64'], (
        'bundle/deb/FBones_{version}_amd64.deb',
        'bundle/appimage/FBones_{version}_amd64.AppImage')),
    'x86_64-pc-windows-msvc': (['x86_64'], (
        'bundle/nsis/FBones_{version}_x64-setup.exe',)),
    'universal-apple-darwin': (['x86_64', 'arm64'], (
        'bundle/dmg/FBones_{version}_universal.dmg',)),
}
CHECKS = ['architecture', 'executable-private-path-scan', 'package-structure']
DISTRIBUTION = 'experimental prerelease installer; native installation not validated'
SENSITIVE = re.compile(
    rb'(?:-----BEGIN (?:OPENSSH |RSA |EC )?PRIVATE KEY-----|'
    rb'gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|'
    rb'AKIA[A-Z0-9]{16}|/(?:home|Users|mnt|media)/[A-Za-z0-9_.-]+/|'
    rb'[A-Za-z]:\\Users\\[^\\\s]+\\)'
)


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def regular_file(path, root):
    # Check every component, including the root: a resolved symlink is not evidence.
    if any(part.is_symlink() for part in (path, *path.parents) if part == root or root in part.parents):
        raise ValueError('Symlinks are not accepted in release inputs.')
    if not path.is_file():
        raise ValueError(f'Missing regular release file: {path.name}')
    return path


def inventory(directory, names):
    if directory.is_symlink() or not directory.is_dir():
        raise ValueError('Missing regular release input directory.')
    if {path.name for path in directory.iterdir()} != set(names):
        raise ValueError('Release input inventory has missing or extra files.')
    return [regular_file(directory / name, directory) for name in names]


def metadata(commit):
    if not re.fullmatch(r'[0-9a-f]{40}', commit or ''):
        raise ValueError('Expected the full current source commit.')
    return json.loads((ROOT / 'package.json').read_text())['version']


def report_packages(report_path, target, commit, version):
    raw = report_path.read_bytes()
    if SENSITIVE.search(raw):
        raise ValueError('Build report contains a potential private path or credential.')
    report = json.loads(raw)
    if not isinstance(report, dict):
        raise ValueError('Expected a native build report object.')
    architectures, templates = TARGETS[target]
    expected = [template.format(version=version) for template in templates]
    signing = 'ad-hoc; not notarized' if target == 'universal-apple-darwin' else 'not verified'
    if (report.get('source_commit') != commit or report.get('target') != target
            or report.get('version') != version
            or sorted(report.get('architectures', [])) != sorted(architectures)
            or report.get('checks') != CHECKS
            or report.get('native_gui_validation') is not False
            or report.get('signing') != signing or report.get('distribution') != DISTRIBUTION
            or not re.fullmatch(r'[0-9a-f]{64}', report.get('executable_sha256', ''))):
        raise ValueError('Build report metadata does not match this verified release.')
    packages = report.get('packages', [])
    if (not isinstance(packages, list) or not all(isinstance(row, dict) for row in packages)
            or len(packages) != len(expected)
            or sorted(row.get('path', '') for row in packages) != sorted(expected)):
        raise ValueError('Build report package inventory does not match the target.')
    for row in packages:
        if (type(row.get('bytes')) is not int or row['bytes'] <= 0
                or not re.fullmatch(r'[0-9a-f]{64}', row.get('sha256', ''))):
            raise ValueError('Build report contains an invalid package size or digest.')
    return packages


def verify_package(path, row, root):
    regular_file(path, root)
    if path.stat().st_size != row['bytes'] or digest(path) != row['sha256']:
        raise ValueError(f'Package bytes do not match the build report: {path.name}')


def copy_new(files, output):
    names = [path.name for path in files]
    if len(names) != len(set(names)) or output.exists() or output.is_symlink():
        raise ValueError('Release output must be fresh with unique asset names.')
    output.mkdir(parents=True)
    for path in files:
        shutil.copyfile(path, output / path.name)


def stage(target, commit, output):
    version = metadata(commit)
    report = regular_file(ROOT / 'ci-reports' / f'{target}.json', ROOT)
    rows = report_packages(report, target, commit, version)
    release = ROOT / 'target' / target / 'release'
    files = []
    for row in rows:
        path = release / row['path']
        verify_package(path, row, ROOT)
        files.append(path)
    copy_new([*files, report], output)
    print(f'Staged {len(files)} verified installer packages and report for {target}.')


def checked_archive(directory, filename, checksum_name):
    archive = regular_file(directory / filename, directory)
    checksum = regular_file(directory / checksum_name, directory)
    if checksum.read_text() != f'{digest(archive)}  {filename}\n':
        raise ValueError('Source/runtime archive does not match its verified checksum.')
    return archive


def assemble(installers, source, runtime, output, tag, commit):
    version = metadata(commit)
    if not re.fullmatch(r'v' + re.escape(version) + r'-beta\.[1-9]\d*', tag):
        raise ValueError('Release tag does not match the application version.')
    expected_dirs = {f'installers-{target}' for target in TARGETS}
    if installers.is_symlink() or not installers.is_dir() or {p.name for p in installers.iterdir()} != expected_dirs:
        raise ValueError('Expected exactly the three native installer artifacts.')
    files = []
    for target in TARGETS:
        directory = installers / f'installers-{target}'
        report = regular_file(directory / f'{target}.json', installers)
        rows = report_packages(report, target, commit, version)
        inventory(directory, [report.name, *(Path(row['path']).name for row in rows)])
        for row in rows:
            path = directory / Path(row['path']).name
            verify_package(path, row, installers)
            files.append(path)
        files.append(report)
    source_name = f'fbones-{tag}-source.tar.gz'
    runtime_version = json.loads((ROOT / 'packages/runtime/package.json').read_text())['version']
    runtime_name = f'fbones-runtime-{runtime_version}.tgz'
    # The source exporter retains its reviewed repository beside the two assets.
    if source.is_symlink() or {p.name for p in source.iterdir()} != {'repository', source_name, 'SHA256SUMS'}:
        raise ValueError('Unexpected source release inventory.')
    if (source / 'repository').is_symlink() or not (source / 'repository').is_dir():
        raise ValueError('Missing reviewed source repository.')
    inventory(runtime, [runtime_name, 'RUNTIME_SHA256SUMS'])
    files.extend((checked_archive(source, source_name, 'SHA256SUMS'),
                  checked_archive(runtime, runtime_name, 'RUNTIME_SHA256SUMS')))
    copy_new(files, output)
    checksum_lines = [f'{digest(path)}  {path.name}\n' for path in sorted(output.iterdir())]
    (output / 'SHA256SUMS').write_text(''.join(checksum_lines), encoding='utf-8', newline='\n')
    print(f'Assembled {len(files)} payloads/reports and aggregate SHA256SUMS for {commit}.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    staged = commands.add_parser('stage')
    staged.add_argument('--target', choices=TARGETS, required=True)
    staged.add_argument('--output', type=Path, required=True)
    release = commands.add_parser('assemble')
    for name in ('installers', 'source', 'runtime', 'output'):
        release.add_argument('--' + name, type=Path, required=True)
    release.add_argument('--tag', required=True)
    for command in (staged, release):
        command.add_argument('--commit', default=os.environ.get('GITHUB_SHA'))
    args = parser.parse_args()
    try:
        if args.command == 'stage':
            stage(args.target, args.commit, args.output)
        else:
            assemble(args.installers, args.source, args.runtime, args.output, args.tag, args.commit)
    except (ValueError, OSError, KeyError, TypeError) as error:
        parser.exit(1, f'{error}\n')


if __name__ == '__main__':
    main()
