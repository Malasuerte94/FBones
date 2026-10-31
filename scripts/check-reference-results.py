#!/usr/bin/env python3
"""Validate returned controlled fixtures; emit only aggregate format evidence."""
import argparse
import hashlib
import json
import math
import copy
from pathlib import Path
import zlib

VERSION_PREFIX = bytes.fromhex('48b020b020342e332e32b601')
MAX_FILE = 64 * 1024 * 1024
MAX_PAYLOAD = 256 * 1024 * 1024
CASES = [
    ('00-empty', 'root', {}),
    ('01-repeat', 'root', {}),
    ('02-root-x', 'root', {'x': 37}),
    ('03-root-rotation', 'root', {'rotation': 25}),
    ('04-one-child', 'root', {}),
    ('05-skeleton-name', 'root', {}),
    ('06-bone-name', 'root_changed', {}),
    ('07-unicode-name', 'rădăcină', {}),
]


def require(condition, message):
    if not condition:
        raise ValueError(message)


def crc64(data):
    value = 0
    for byte in data:
        value ^= byte << 56
        for _ in range(8):
            value = ((value << 1) ^ (0x42f0e1eba9ea3693 if value >> 63 else 0)) & 0xffffffffffffffff
    return value


def envelope(path):
    require(path.stat().st_size <= MAX_FILE, 'Oversized project')
    raw = path.read_bytes()
    decoder = zlib.decompressobj(-15)
    payload = decoder.decompress(raw, MAX_PAYLOAD + 1)
    require(decoder.eof and len(payload) <= MAX_PAYLOAD, 'Incomplete or oversized payload')
    trailer = decoder.unused_data
    require(len(trailer) == 20 and trailer[-4:] == bytes.fromhex('020b020b'), 'Invalid trailer')
    require(int.from_bytes(trailer[:8], 'big') == len(raw) - 20, 'Invalid stream length')
    require(crc64(raw[:-20]) == int.from_bytes(trailer[8:16], 'big'), 'Invalid checksum')
    require(payload.startswith(VERSION_PREFIX), 'Unexpected internal version/header')
    return raw, payload


def exported(folder):
    paths = list(folder.glob('*.json'))
    require(len(paths) == 1, 'Expected exactly one skeleton export')
    value = json.loads(paths[0].read_text(encoding='utf-8'))
    require(value.get('skeleton', {}).get('spine') == '4.3.26', 'Unexpected export version')
    return value


def verify_bones(document, case_id, root_name, transforms):
    expected = [dict(name=root_name, **transforms)]
    if case_id == '04-one-child':
        expected.append(dict(name='arm', parent='root', x=16, y=8, length=100, rotation=25))
    bones = document.get('bones', [])
    require(len(bones) == len(expected), 'Unexpected bone count')
    for actual, wanted in zip(bones, expected):
        for key in ('name', 'parent'):
            require(actual.get(key) == wanted.get(key), 'Unexpected bone name/parent')
        for key in ('x', 'y', 'length', 'rotation'):
            number = actual.get(key, 0)
            require(isinstance(number, (int, float)) and not isinstance(number, bool)
                    and math.isfinite(number) and abs(number - wanted.get(key, 0)) < 0.001,
                    'Unexpected bone transform')


def changed_ranges(base, other):
    """Aligned ranges only; variable-length cases require structural analysis."""
    if len(base) != len(other):
        return None
    spans = []
    for offset, (left, right) in enumerate(zip(base, other)):
        if left != right:
            if spans and spans[-1][1] == offset:
                spans[-1][1] = offset + 1
            else:
                spans.append([offset, offset + 1])
    return spans


def inspect(root):
    report = json.loads((root / 'report.json').read_text(encoding='utf-8'))
    require(report.get('referenceVersion') == '4.3.26', 'Unexpected collection version')
    if report.get('caseSet') == 'regions-v1':
        return inspect_regions(root, report)
    if report.get('caseSet') == 'meshes-v1':
        return inspect_meshes(root, report)
    if report.get('independentGeneration') is True:
        return inspect_candidates(root, report)
    require(report.get('success') is True, 'Original collection reported failure')
    require(report.get('semanticEncoderVerified') is False, 'Unexpected semantic encoder claim')
    entries = {entry['id']: entry for entry in report['cases']}
    require(set(entries) == {case[0] for case in CASES} and len(report['cases']) == len(CASES),
            'Incomplete or duplicate cases')
    observations, payloads = [], {}
    for case_id, root_name, transforms in CASES:
        raw, payload = envelope(root / case_id / 'project.spine')
        entry = entries[case_id]
        require(entry['status'] == 'collected' and entry['error'] is None, 'Case reported failure')
        require(entry['bytes'] == len(raw) and entry['payloadBytes'] == len(payload),
                'Reported sizes do not match returned files')
        require(entry['fileCrc64'] == f'{crc64(raw):016x}', 'Reported file checksum mismatch')
        document = exported(root / case_id / 'export')
        verify_bones(document, case_id, root_name, transforms)
        payloads[case_id] = payload
        observations.append({
            'case': case_id, 'fileBytes': len(raw), 'payloadBytes': len(payload),
            'fileSha256': hashlib.sha256(raw).hexdigest(),
            'payloadSha256': hashlib.sha256(payload).hexdigest(),
            'changedRangesFromBaseline': changed_ranges(payloads['00-empty'], payload),
        })
    _, repacked = envelope(root / 'repacked-existing.spine')
    require(repacked == payloads['00-empty'], 'Repacked binary payload differs')
    require(exported(root / 'repacked-export') == exported(root / '00-empty/export'),
            'Repacked original-Spine JSON export differs')
    require(report['envelopeProbe'].get('acceptedByOriginalSpine') is True
            and report['envelopeProbe'].get('identicalJsonExports') is True,
            'Original acceptance was not reported')
    baseline = payloads['00-empty']
    repeat = payloads['01-repeat']
    return {
        'referenceVersion': '4.3.26', 'artifactValidationPassed': True,
        'originalSpineAcceptanceReported': True,
        'repackedPayloadIdentical': True, 'repackedExportsIdentical': True,
        'semanticEncoderVerified': False,
        'repeatEqualOutsideOffsets12To27': baseline[:12] == repeat[:12] and baseline[28:] == repeat[28:],
        'cases': observations,
    }


def inspect_candidates(root, report):
    if report.get('caseSet') == 'bones-v1':
        return inspect_bones(root, report)
    require(report.get('minimalProfileCliAccepted') is True,
            'Original candidate acceptance was not reported')
    require(report.get('applicationSavingEnabled') in (None, False),
            'Unexpected application-saving claim')
    entries = {entry['id']: entry for entry in report['cases']}
    require(set(entries) == {case[0] for case in CASES} and len(report['cases']) == len(CASES),
            'Incomplete or duplicate candidate cases')
    observations = []
    for case_id, root_name, transforms in CASES:
        raw, payload = envelope(root / case_id / 'project.spine')
        require((root / case_id / 'project.fbones').read_bytes() == raw,
                'Renamed Spine copy differs from generated FBones file')
        entry = entries[case_id]
        require(entry.get('originalSpineExportVerified') is True and entry.get('error') is None,
                'Candidate reported failure')
        require(entry['bytes'] == len(raw) and entry['fileCrc64'] == f'{crc64(raw):016x}',
                'Reported candidate metadata does not match file')
        document = exported(root / case_id / 'export')
        verify_bones(document, case_id, root_name, transforms)
        require(document.get('animations') == {'animation': {}}, 'Unexpected animation export')
        skeleton_name = 'renamed_skeleton' if case_id == '05-skeleton-name' else 'skeleton'
        require((root / case_id / 'export' / f'{skeleton_name}.json').is_file(),
                'Unexpected skeleton name')
        observations.append({'case': case_id, 'fileBytes': len(raw),
                             'payloadBytes': len(payload),
                             'fileSha256': hashlib.sha256(raw).hexdigest()})
    return {'referenceVersion': '4.3.26', 'artifactValidationPassed': True,
            'originalSpineAcceptanceReported': True,
            'scope': 'independent experimental empty-skeleton/bones profile only',
            'interactiveOpenVerified': report.get('interactiveOpenVerified') is True,
            'applicationSavingEnabled': False, 'cases': observations}


def inspect_bones(root, report):
    require(report.get('minimalProfileCliAccepted') is True, 'Original Spine bone acceptance was not reported')
    ids = {'B00-chain', 'B01-branches', 'B02-reparent', 'B03-unicode'}
    entries = {entry['id']: entry for entry in report['cases']}
    require(set(entries) == ids and len(report['cases']) == len(ids), 'Incomplete bone suite')
    observations = []
    for case_id in sorted(ids):
        entry = entries[case_id]
        require(entry.get('originalSpineExportVerified') is True and entry.get('error') is None, 'Bone case failed')
        raw, payload = envelope(root / case_id / 'project.spine')
        require((root / case_id / 'project.fbones').read_bytes() == raw, 'Renamed copy differs')
        require(entry['bytes'] == len(raw) and entry['fileCrc64'] == f'{crc64(raw):016x}', 'Bone file metadata differs')
        expected = json.loads((root / case_id / 'expected.json').read_text(encoding='utf-8'))
        actual = exported(root / case_id / 'export')
        wanted = expected['bones']
        found = {bone['name']: bone for bone in actual.get('bones', [])}
        require(len(found) == len(wanted) == len(actual.get('bones', [])), 'Bone count differs')
        for bone in wanted:
            result = found.get(bone['name'])
            require(result is not None and result.get('parent') == bone.get('parent'), 'Bone parent/name differs')
            for key in ('x', 'y', 'rotation', 'length'):
                value = result.get(key, 0)
                require(isinstance(value, (int, float)) and math.isfinite(value)
                        and abs(value - bone.get(key, 0)) < 0.001, 'Bone transform differs')
        require(actual.get('animations') == {'animation': {}}, 'Unexpected animation export')
        observations.append({'case': case_id, 'bones': len(wanted), 'payloadBytes': len(payload),
                             'fileSha256': hashlib.sha256(raw).hexdigest()})
    return {'referenceVersion': '4.3.26', 'caseSet': 'bones-v1', 'artifactValidationPassed': True,
            'originalSpineAcceptanceReported': True, 'scope': 'generated chains/branches/reparented/Unicode bones',
            'cases': observations}


def inspect_regions(root, report):
    require(report.get('regionProfileCliAccepted') is True, 'Original Spine region acceptance was not reported')
    ids = {'R00-region', 'R01-empty-slot', 'R02-transform', 'R03-two-slots',
           'R04-child-bone', 'R05-hidden-region', 'R06-draw-order', 'R07-unicode'}
    entries = {entry['id']: entry for entry in report['cases']}
    require(set(entries) == ids and len(report['cases']) == len(ids), 'Incomplete region suite')
    observations = []
    def check_export(actual, expected):
        bones = actual.get('bones', [])
        require(len(bones) == len(expected['bones']), 'Bone count differs')
        for found, wanted in zip(bones, expected['bones']):
            require(found.get('name') == wanted['name'] and found.get('parent') == wanted.get('parent'), 'Bone graph differs')
            for key in ('x', 'y', 'rotation', 'length'):
                require(abs(found.get(key, 0) - wanted.get(key, 0)) < 0.001, 'Bone transform differs')
        slots = actual.get('slots', [])
        require(len(slots) == len(expected['slots']), 'Slot count differs')
        for found, wanted in zip(slots, expected['slots']):
            for key in ('name', 'bone', 'attachment'):
                require(found.get(key) == wanted.get(key), 'Slot order, binding or visibility differs')
        skins = actual.get('skins', [])
        expected_attachments = expected['skins'][0]['attachments']
        attachments = skins[0].get('attachments', {}) if skins else {}
        require(not skins or len(skins) == 1 and skins[0].get('name') == 'default', 'Unsupported skin')
        require(set(attachments) == set(expected_attachments), 'Attachment slots differ')
        for slot, regions in expected_attachments.items():
            require(set(attachments[slot]) == set(regions), 'Region names differ')
            for name, wanted in regions.items():
                found = attachments[slot][name]
                require(found.get('type', 'region') == 'region', 'Wrong attachment type')
                require(found.get('path', '') == wanted.get('path', ''), 'Region path differs')
                for key in ('x', 'y', 'rotation', 'scaleX', 'scaleY', 'width', 'height'):
                    default = 1 if key in ('scaleX', 'scaleY') else 0
                    value = found.get(key, default)
                    require(isinstance(value, (int, float)) and not isinstance(value, bool)
                            and math.isfinite(value) and abs(value - wanted.get(key, default)) < 0.001,
                            'Region transform or dimensions differ')
        require(actual.get('animations') == {'animation': {}}, 'Animation differs')
    for case_id in sorted(ids):
        entry = entries[case_id]
        require(entry.get('originalSpineExportVerified') is True
                and entry.get('canonicalReferenceMatches') is True and entry.get('error') is None, 'Region case failed')
        raw, payload = envelope(root / case_id / 'project.spine')
        require((root / case_id / 'project.fbones').read_bytes() == raw, 'Renamed copy differs')
        _, original = envelope(root / case_id / 'reference.spine')
        require(len(payload) == len(original) and payload[:12] == original[:12] and payload[28:] == original[28:],
                'Region reference payload differs outside identity')
        recipe = json.loads((root / case_id / 'recipe.json').read_text(encoding='utf-8'))
        for folder in ('original-export', 'export'):
            check_export(exported(root / case_id / folder), recipe)
        observations.append({'case': case_id, 'slots': len(recipe['slots']), 'payloadBytes': len(payload),
                             'fileSha256': hashlib.sha256(raw).hexdigest()})
    return {'referenceVersion': '4.3.26', 'caseSet': 'regions-v1', 'artifactValidationPassed': True,
            'originalSpineAcceptanceReported': True, 'payloadsEqualOutsideIdentity': True,
            'desktopImageEditingEnabled': False, 'cases': observations}


def mesh_vertices(data, owner):
    values = data['vertices']
    count = len(data['uvs']) // 2
    if len(values) == count * 2:
        return [{owner: (values[i * 2], values[i * 2 + 1], 1)} for i in range(count)]
    result, offset = [], 0
    for _ in range(count):
        size = values[offset]
        require(isinstance(size, (int, float)) and math.isfinite(size) and size == int(size)
                and 1 <= size <= 128, 'Invalid influence count')
        offset += 1
        vertex = {}
        for _ in range(int(size)):
            bone, x, y, weight = values[offset:offset + 4]
            require(isinstance(bone, (int, float)) and math.isfinite(bone) and bone == int(bone)
                    and 0 <= bone < 128 and bone not in vertex, 'Invalid influence bone')
            vertex[int(bone)] = (x, y, weight)
            offset += 4
        result.append(vertex)
    require(offset == len(values), 'Unexpected influence data')
    return result


def normalize_mesh_export(document):
    result = copy.deepcopy(document)
    result['skeleton'].pop('hash', None)
    bone_ids = {bone['name']: i for i, bone in enumerate(result['bones'])}
    owners = {slot['name']: bone_ids[slot['bone']] for slot in result['slots']}
    for skin in result.get('skins', []):
        for slot, attachments in skin.get('attachments', {}).items():
            for attachment in attachments.values():
                if attachment.get('type', 'region') == 'mesh':
                    attachment['vertices'] = [sorted(vertex.items()) for vertex in mesh_vertices(attachment, owners[slot])]
    return result


def inspect_meshes(root, report):
    require(report.get('meshProfileCliAccepted') is True, 'Original mesh acceptance was not reported')
    ids = {'M00-quad', 'M01-deformed', 'M02-center', 'M03-triangle', 'M04-width', 'M05-weighted',
           'M06-sparse', 'M07-mixed', 'M08-three-bones', 'M09-one-bind', 'M10-pentagon',
           'M11-internal-edge', 'M12-child-slot', 'M13-hidden'}
    entries = {entry['id']: entry for entry in report['cases']}
    require(set(entries) == ids and len(report['cases']) == len(ids), 'Incomplete mesh suite')
    observations = []
    for case_id in sorted(ids):
        entry = entries[case_id]
        require(entry.get('originalSpineExportVerified') is True and entry.get('canonicalReferenceMatches') is True
                and entry.get('error') is None, 'Mesh case failed')
        folder = root / case_id
        raw, payload = envelope(folder / 'project.spine')
        require((folder / 'project.fbones').read_bytes() == raw, 'Renamed mesh copy differs')
        _, reference = envelope(folder / 'reference.spine')
        exact = len(payload) == len(reference) and payload[:12] == reference[:12] and payload[28:] == reference[28:]
        require(entry.get('payloadEqualOutsideIdentity') is exact, 'Mesh byte comparison report differs')
        require(exact or entry.get('bindingOrderEquivalent') is True, 'Unexplained binary mesh differences')
        original, actual = exported(folder / 'original-export'), exported(folder / 'export')
        require(normalize_mesh_export(original) == normalize_mesh_export(actual), 'Original/candidate mesh exports differ')
        recipe = json.loads((folder / 'recipe.json').read_text(encoding='utf-8'))
        require(len(actual['bones']) == len(recipe['bones']), 'Mesh bone count differs')
        for found, wanted in zip(actual['bones'], recipe['bones']):
            require(found['name'] == wanted['name'] and found.get('parent') == wanted.get('parent'), 'Mesh bone graph differs')
            for key in ('x', 'y', 'rotation', 'length'):
                require(abs(found.get(key, 0) - wanted.get(key, 0)) < 0.001, 'Mesh bone pose differs')
        require(actual['slots'] == recipe['slots'], 'Slot order, owner or visibility differs')
        bone_ids = {bone['name']: i for i, bone in enumerate(recipe['bones'])}
        owners = {slot['name']: bone_ids[slot['bone']] for slot in recipe['slots']}
        expected = recipe['skins'][0]['attachments']
        found = actual['skins'][0]['attachments']
        require(set(expected) == set(found), 'Attachment slots differ')
        vertices_total, weighted_count = 0, 0
        for slot, attachments in expected.items():
            require(set(attachments) == set(found[slot]), 'Attachment names differ')
            for name, wanted in attachments.items():
                value = found[slot][name]
                require(value.get('type', 'region') == wanted.get('type', 'region')
                        and value.get('path', '') == wanted.get('path', ''), 'Attachment kind/path differs')
                if wanted.get('type') != 'mesh':
                    require(value['width'] == wanted['width'] and value['height'] == wanted['height'], 'Region dimensions differ')
                    continue
                for key in ('uvs', 'triangles', 'hull'):
                    require(value[key] == wanted[key], f'Mesh {key} differs')
                expected_vertices = mesh_vertices(wanted, owners[slot])
                found_vertices = mesh_vertices(value, owners[slot])
                require(len(expected_vertices) == len(found_vertices), 'Mesh vertex count differs')
                for a, b in zip(expected_vertices, found_vertices):
                    require(set(a) == set(b), 'Influence bones differ')
                    for bone in a:
                        require(all(math.isfinite(y) and abs(x - y) < 0.0001 for x, y in zip(a[bone], b[bone])), 'Influence positions/weights differ')
                if 'edges' in wanted:
                    require(value.get('edges') == wanted['edges'], 'Explicit edges differ')
                if 'width' in value:
                    require(value['width'] == 32 and value['height'] == 24, 'Exported PNG dimensions differ')
                vertices_total += len(expected_vertices)
                weighted_count += len(wanted['vertices']) != len(wanted['uvs'])
        require(actual.get('animations') == {'animation': {}}, 'Unexpected mesh animation')
        observations.append({'case': case_id, 'vertices': vertices_total, 'weightedMeshes': weighted_count,
                             'payloadBytes': len(payload), 'payloadEqualOutsideIdentity': exact,
                             'bindingOrderEquivalent': not exact, 'fileSha256': hashlib.sha256(raw).hexdigest()})
    return {'referenceVersion': '4.3.26', 'caseSet': 'meshes-v1', 'artifactValidationPassed': True,
            'originalSpineAcceptanceReported': True, 'scope': 'controlled mesh/binding profile',
            'cases': observations}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('results', type=Path)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    try:
        result = inspect(args.results)
    except (OSError, ValueError, KeyError, TypeError, zlib.error) as error:
        parser.exit(1, f'Reference validation failed: {error}\n')
    output = json.dumps(result, indent=2) + '\n'
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(output, encoding='utf-8')
    print(output, end='')


if __name__ == '__main__':
    main()
