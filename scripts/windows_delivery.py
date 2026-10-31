"""Publish Windows executables without changing an image a process may map.

Windows/WSL can retain an image section for an old executable at the same path,
including after a Linux-side atomic rename. Each build therefore has its own
immutable path; the launcher selects that path from build-info.json.
"""
from pathlib import Path
import hashlib
import os
import shutil
import tempfile


def replace_binary(source: Path, destination: Path):
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=destination.parent, prefix='.fbones-build-', delete=False) as file:
            temporary = Path(file.name)
            with source.open('rb') as input:
                shutil.copyfileobj(input, file)
            file.flush()
            os.fsync(file.fileno())
        shutil.copystat(source, temporary)
        os.replace(temporary, destination)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def publish_binary(source: Path, directory: Path) -> tuple[str, str]:
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    relative = Path('builds') / digest / 'FBones.exe'
    target = directory / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists():
        if hashlib.sha256(target.read_bytes()).hexdigest() != digest:
            raise ValueError('An immutable Windows build was modified; refusing to overwrite it.')
    else:
        replace_binary(source, target)
    return relative.as_posix(), digest
