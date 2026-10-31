#!/usr/bin/env python3
"""Archive completed controlled Windows results using read-only source access."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil


def snapshot(folder):
    files = {}
    total = 0
    for path in folder.rglob('*'):
        if path.is_symlink():
            raise ValueError('Result directories must not contain symlinks')
        if path.is_file():
            total += path.stat().st_size
            if total > 64 * 1024 * 1024 or len(files) >= 200:
                raise ValueError('Unexpectedly large result directory')
            files[path.relative_to(folder).as_posix()] = hashlib.sha256(path.read_bytes()).hexdigest()
    return files


def main():
    workspace = Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, help='Windows test folder mounted in Linux')
    args = parser.parse_args()
    try:
        source = args.source
        if source is None:
            settings = json.loads((workspace / '.local/windows-host.json').read_text())
            source = Path(settings['windowsTestDirectory'])
        folder = source / 'FORMAT_TEST'
        if not folder.is_dir():
            raise ValueError('FORMAT_TEST folder was not found')
        destination = workspace / 'updates/fixtures'
        destination.mkdir(parents=True, exist_ok=True)
        count = 0
        for source_dir in sorted(folder.iterdir()):
            if not source_dir.name.startswith(('reference-results-', 'candidate-results-')):
                continue
            if source_dir.is_symlink() or not source_dir.is_dir() or not (source_dir / 'report.json').is_file():
                continue
            report = json.loads((source_dir / 'report.json').read_text(encoding='utf-8'))
            if report.get('referenceVersion') != '4.3.26':
                continue
            expected = snapshot(source_dir)
            target = destination / source_dir.name
            if target.exists():
                if snapshot(target) != expected:
                    raise ValueError('Existing local results differ; refusing replacement')
                print(source_dir.name, 'already archived, identical')
            else:
                shutil.copytree(source_dir, target, symlinks=False)
                if snapshot(target) != expected:
                    raise ValueError('Source changed during archival; compare before using this result')
                print(source_dir.name, 'archived; source preserved')
            count += 1
        print(f'{count} controlled result folder(s) found.')
    except (OSError, ValueError, KeyError) as error:
        parser.exit(1, f'Import failed: {error}\n')


if __name__ == '__main__':
    main()
