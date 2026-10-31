#!/usr/bin/env python3
"""Inspect 4.3.26 material without running Spine or exposing project contents."""
from pathlib import Path
from collections import Counter
import argparse
import hashlib
import json
import struct
import zlib

parser = argparse.ArgumentParser()
parser.add_argument('--root', type=Path, default=Path('updates'))
parser.add_argument('--output', type=Path)
parser.add_argument('--verify-checksum', action='store_true', help='Verify CRC64 as well as framing.')
args = parser.parse_args()
crc_table = []
for index in range(256):
    value = index << 56
    for _ in range(8):
        value = ((value << 1) ^ (0x42f0e1eba9ea3693 if value >> 63 else 0)) & 0xffffffffffffffff
    crc_table.append(value)
def crc64(data):
    value = 0
    for byte in data:
        value = crc_table[(value >> 56) ^ byte] ^ ((value << 8) & 0xffffffffffffffff)
    return value
package = args.root / 'updates' / '4.3.26'
data = package.read_bytes()
counts = Counter()
prefixes = Counter()
samples = []
projects = [*(args.root / 'backup').rglob('*4.3.26.spine'), *(args.root / 'fixtures').rglob('*4.3.26.spine')]
for path in sorted(projects):
    raw = path.read_bytes()
    try:
        stream = zlib.decompressobj(-15)
        decoded = stream.decompress(raw, 256 * 1024 * 1024 + 1)
        if not stream.eof or len(decoded) > 256 * 1024 * 1024:
            counts['incomplete_or_oversized'] += 1
            continue
        if decoded[:11] != bytes.fromhex('48b020b020342e332e32b6'):
            counts['excluded_internal_version_mismatch'] += 1
            continue
        trailer = stream.unused_data
        if len(trailer) != 20 or trailer[-4:] != bytes.fromhex('020b020b') or int.from_bytes(trailer[:8], 'big') != len(raw) - 20:
            counts['unexpected_trailer'] += 1
            continue
        if args.verify_checksum:
            if crc64(raw[:-20]) != int.from_bytes(trailer[8:16], 'big'):
                counts['checksum_mismatch'] += 1
                continue
            counts['crc64_verified'] += 1
        prefixes[decoded[:11].hex()] += 1
        counts['raw_deflate_complete'] += 1
        samples.append({'sha256': hashlib.sha256(raw).hexdigest(),
                        'compressed_bytes': len(raw), 'decoded_bytes': len(decoded)})
    except zlib.error:
        counts['not_raw_deflate'] += 1
report = {
    'target': '4.3.26',
    'editor_package': {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(),
                       'first_u32_be': struct.unpack('>I', data[:4])[0]},
    'project_observations': dict(counts), 'header_prefix_counts': dict(prefixes),
    'samples': sorted(samples, key=lambda x: x['compressed_bytes'])[:10],
    'limitations': ['Envelope/header inspection is not semantic project decoding.',
                    'No original Spine acceptance test has been run here.'],
}
out = json.dumps(report, indent=2) + '\n'
if args.output:
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(out)
print(out)
