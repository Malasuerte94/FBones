#!/usr/bin/env python3
"""Check public README navigation, image files and screenshot provenance offline."""
import hashlib
from pathlib import Path
import re
import struct

root = Path(__file__).resolve().parents[1]
readme = (root / 'README.md').read_text()
headings = {re.sub(r'[^\w -]', '', text.lower()).replace(' ', '-')
            for text in re.findall(r'^#{1,6} (.+)$', readme, re.M)}
for link in re.findall(r'\]\(([^)]+)\)', readme):
    if '://' in link:
        continue
    path, _, anchor = link.partition('#')
    if path and not (root / path).is_file():
        raise SystemExit(f'Broken README link: {link}')
    if not path and anchor and anchor not in headings:
        raise SystemExit(f'Broken README heading: {anchor}')
images = re.findall(r'!\[([^\]]*)\]\(([^)]+)\)', readme)
if len(images) != 3 or not all(alt.strip() for alt, _ in images):
    raise SystemExit('README needs three screenshots with useful alternative text.')
provenance = (root / 'docs/screenshots/README.md').read_text()
for _, name in images:
    payload = (root / name).read_bytes()
    if payload[:8] != b'\x89PNG\r\n\x1a\n' or struct.unpack('>II', payload[16:24]) != (1440, 900):
        raise SystemExit(f'Unexpected screenshot image: {name}')
    if hashlib.sha256(payload).hexdigest() not in provenance:
        raise SystemExit(f'Screenshot differs from recorded provenance: {name}')
print('README navigation, relative links, three PNGs and provenance hashes pass.')
print('Browser layout and live GitHub rendering require separate observation.')
