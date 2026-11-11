"""Read-only, narrow own-project checkpoint verifier; never launches an app.

Place our unchanged parse-project.py beside this file on a hosted runner.
Unknown records/fields fail closed; this is not a general scene importer.
"""
from pathlib import Path
import argparse
import hashlib
import importlib.util
import json
import math
import struct
import zlib

PARSER_SHA = '59f49f8a6b09d01aaf02a55f26caad923368c6d41a9357ca44ebf56c66f85284'
sha = lambda raw: hashlib.sha256(raw).hexdigest()
bits = lambda value: struct.unpack('>I', struct.pack('>f', value))[0]


def crc64(data):
    value = 0
    for byte in data:
        value ^= byte << 56
        for _ in range(8):
            value = ((value << 1) ^ (0x42F0E1EBA9EA3693 if value & (1 << 63) else 0)) & ((1 << 64) - 1)
    return value


def verify(path, project_name, bone_name, x, parser_path=None):
    path = Path(path)
    assert math.isfinite(x) and 0 < path.stat().st_size <= 1024 * 1024
    raw = path.read_bytes()
    decoder = zlib.decompressobj(-15)
    payload = decoder.decompress(raw, 1024 * 1024 + 1)
    assert len(payload) <= 1024 * 1024 and not decoder.unconsumed_tail and decoder.eof
    tail = decoder.unused_data
    assert len(tail) == 20 and int.from_bytes(tail[:8], 'big') == len(raw) - 20
    assert int.from_bytes(tail[8:16], 'big') == crc64(raw[:-20]) and tail[16:] == bytes([2, 11, 2, 11])
    assert payload[5:11] == b'4.3.2\xb6'
    parser_path = Path(parser_path) if parser_path else Path(__file__).with_name('parse-project.py')
    assert sha(parser_path.read_bytes()) == PARSER_SHA
    spec = importlib.util.spec_from_file_location('own_checkpoint_raw', parser_path)
    parser = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(parser)
    # Exact independently observed wire scalars, as in the accepted raw reader.
    parser.schemas['Project'][42] = 'vu'
    parser.schemas[12][126] = 'vu'
    arena = parser.Reader(payload)
    project = arena.domain_ref(lambda: arena.tagged('Project'))
    assert payload[arena.p:] == bytes([1, 11]) + bytes(10)
    def resolve(value):
        visited = set()
        while isinstance(value, dict) and len(value) == 1 and ('ref' in value or 'domain_ref' in value):
            key = next(iter(value.items()))
            assert key not in visited
            visited.add(key)
            source = arena.refs if key[0] == 'ref' else arena.domain_refs
            assert 0 <= key[1] < len(source)
            value = source[key[1]]
        return value
    project = resolve(project)['fields']
    assert resolve(project[20]) == '4.3.26' and bits(project[2]) == bits(30)
    skeletons = resolve(project[0])
    assert len(skeletons) == 1
    skeleton = resolve(skeletons[0])['fields']
    assert resolve(skeleton[1]) == project_name
    assert all(resolve(skeleton[tag]) == [] for tag in [6, 8, 10, 13, 14, 16, 22, 23, 36, 41, 49, 51])
    bones = resolve(skeleton[4])
    assert len(bones) == 1
    bone = resolve(bones[0])['fields']
    assert resolve(bone[1]) == bone_name and bone[3] is None
    expected = {9: 0., 10: x, 11: 0., 12: 0., 13: 1., 14: 1., 23: 0., 25: 0.}
    assert all(bits(bone[k]) == bits(value) for k, value in expected.items())
    classes = [obj['class'] for obj in arena.domain_refs if isinstance(obj, dict) and 'class' in obj]
    assert classes.count('Project') == classes.count(11) == classes.count(12) == classes.count(18) == 1
    assert set(classes) <= {'Project', 11, 12, 18, 108, 80}
    animation = resolve(resolve(skeleton[7])[0])['fields']
    assert resolve(animation[1]) == 'animation' and resolve(animation[2]) == []
    return dict(passed=True, scope='OWN_ONE_ROOT_NO_ATTACHMENTS_CONSTRAINTS_OR_KEYS_CHECKPOINT_ONLY',
                bytes=len(raw), sha256=sha(raw), decodedBytes=len(payload), version='4.3.26',
                envelopeCrc64AndFullTypedParse=True, exactTrailingCheckpoint=True,
                projectName=project_name, fps=30, boneName=bone_name, boneCount=1, rootParent=None,
                rootChannelF32Bits={str(k): bits(value) for k, value in expected.items()},
                animations=[dict(name='animation', authoredBoneTimelines=0)],
                parserSha256=PARSER_SHA, targetExecutions=0,
                limitation='Saved-file semantics only; no original acceptance or app/session/restart evidence')


if __name__ == '__main__':
    cli = argparse.ArgumentParser()
    cli.add_argument('path', type=Path)
    cli.add_argument('--project-name', required=True)
    cli.add_argument('--bone-name', required=True)
    cli.add_argument('--root-x', required=True, type=float)
    cli.add_argument('--parser', type=Path)
    cli.add_argument('--out', required=True, type=Path)
    args = cli.parse_args()
    result = verify(args.path, args.project_name, args.bone_name, args.root_x, args.parser)
    result['checkerSha256'] = sha(Path(__file__).read_bytes())
    with args.out.open('x') as stream:
        stream.write(json.dumps(result, indent=2) + '\n')
    print(json.dumps(dict(passed=True, sha256=result['sha256'], report=str(args.out))))
