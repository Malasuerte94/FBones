#!/usr/bin/env python3
"""Configure path remapping and verify the packages built by native CI runners."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import struct
import subprocess

TARGETS = {
    'x86_64-unknown-linux-gnu': ('deb/*.deb', 'appimage/*.AppImage'),
    'x86_64-pc-windows-msvc': ('nsis/*.exe',),
    'universal-apple-darwin': ('dmg/*.dmg',),
}


def run(*args):
    return subprocess.check_output(args, text=True, stderr=subprocess.STDOUT).strip()


def configure():
    environment = os.environ.get('GITHUB_ENV')
    if not environment:
        raise ValueError('This configuration step requires a GitHub Actions environment.')
    roots = [
        (str(Path.cwd()), 'FBones'),
        (run('rustc', '--print', 'sysroot'), 'rust-toolchain'),
        (str(Path.home()), 'build-home'),
    ]
    flags = [f'--remap-path-prefix={source}={destination}' for source, destination in roots]
    if os.environ.get('CARGO_ENCODED_RUSTFLAGS') or os.environ.get('RUSTFLAGS'):
        raise ValueError('Existing Rust flags require review before CI remapping.')
    with open(environment, 'a', encoding='utf-8') as output:
        output.write('CARGO_ENCODED_RUSTFLAGS=' + '\x1f'.join(flags) + '\n')
    print('Configured checkout, toolchain, and home path remapping.')


def check_private_paths(data):
    # Check compiled ASCII and UTF-16 strings without printing matching private data.
    texts = [data.decode('latin-1'), data.decode('utf-16-le', errors='ignore')]
    patterns = [
        re.compile(r'/(?:home|Users)/[A-Za-z0-9_.-]+/'),
        re.compile(r'[A-Za-z]:[\\/]Users[\\/][^\\/\s]+[\\/]'),
    ]
    actual_roots = [str(Path.cwd()), str(Path.home()), run('rustc', '--print', 'sysroot')]
    for text in texts:
        if any(pattern.search(text) for pattern in patterns):
            raise ValueError('Executable contains a private absolute user path.')
        if any(root in text or root.replace('\\', '/') in text for root in actual_roots):
            raise ValueError('Executable retains an absolute CI build root.')


def verify(target):
    release = Path('target') / target / 'release'
    bundle = release / 'bundle'
    executable = release / ('fbones.exe' if target.endswith('msvc') else 'fbones')
    app = bundle / 'macos' / 'FBones.app'
    if target == 'universal-apple-darwin':
        executable = app / 'Contents' / 'MacOS' / 'fbones'
    data = executable.read_bytes()
    if target == 'x86_64-pc-windows-msvc':
        if data[:2] != b'MZ':
            raise ValueError('Windows application is not a PE file.')
        offset = struct.unpack_from('<I', data, 60)[0]
        if data[offset:offset+4] != b'PE\0\0' or struct.unpack_from('<H', data, offset+4)[0] != 0x8664:
            raise ValueError('Windows application is not an x64 PE.')
        if struct.unpack_from('<H', data, offset+24)[0] != 0x20b:
            raise ValueError('Windows application is not PE32+.')
    elif target == 'x86_64-unknown-linux-gnu':
        if data[:5] != b'\x7fELF\x02' or struct.unpack_from('<H', data, 18)[0] != 62:
            raise ValueError('Linux application is not an x64 ELF.')
    else:
        run('lipo', '-verify_arch', 'x86_64', 'arm64', str(executable))
        run('codesign', '--verify', '--deep', '--strict', str(app))
    check_private_paths(data)
    packages = []
    for pattern in TARGETS[target]:
        matches = sorted(bundle.glob(pattern))
        if len(matches) != 1:
            raise ValueError(f'Expected exactly one package matching {pattern}.')
        package = matches[0]
        payload = package.read_bytes()
        if package.suffix == '.deb':
            run('dpkg-deb', '--info', str(package))
        elif package.suffix == '.AppImage':
            if payload[:4] != b'\x7fELF' or payload[8:11] != b'AI\x02':
                raise ValueError('Invalid Type 2 AppImage header.')
        elif package.suffix == '.exe' and payload[:2] != b'MZ':
            raise ValueError('Invalid Windows installer header.')
        elif package.suffix == '.dmg':
            run('hdiutil', 'verify', str(package))
        packages.append({'path': package.relative_to(release).as_posix(),
                         'bytes': len(payload), 'sha256': hashlib.sha256(payload).hexdigest()})
    report = {
        'source_commit': os.environ.get('GITHUB_SHA'), 'target': target,
        'version': json.loads(Path('package.json').read_text())['version'],
        'rustc': run('rustc', '--version'), 'node': run('node', '--version'),
        'executable_sha256': hashlib.sha256(data).hexdigest(),
        'checks': ['architecture', 'executable-private-path-scan', 'package-structure'],
        'packages': packages, 'native_gui_validation': False,
        'signing': 'ad-hoc; not notarized' if target == 'universal-apple-darwin' else 'not verified',
        'distribution': 'build report only; installers require separate release acceptance',
    }
    output = Path('ci-reports') / f'{target}.json'
    output.parent.mkdir(exist_ok=True)
    output.write_text(json.dumps(report, indent=2) + '\n')
    print(f'Verified {target}: architecture, executable path scan, {len(packages)} packages.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest='command', required=True)
    subparsers.add_parser('configure')
    check = subparsers.add_parser('verify')
    check.add_argument('--target', choices=TARGETS, required=True)
    args = parser.parse_args()
    try:
        configure() if args.command == 'configure' else verify(args.target)
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        parser.exit(1, f'{error}\n')


if __name__ == '__main__':
    main()
