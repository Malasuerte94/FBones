#!/usr/bin/env python3
"""FBones' restricted resource converter, with the LLVM-RC command interface.

Used only for offline Linux -> Windows builds without LLVM-RC. Supports exactly
the VERSIONINFO, ICON and inline manifest resources emitted by tauri-winres.
Unknown syntax is an error. Produces a real Win32 .res file, which the MSVC/LLD
linker accepts directly. Native Windows builds use the regular Windows SDK.

Binary layouts: Microsoft RESOURCEHEADER, VS_VERSIONINFO and icon resources:
https://learn.microsoft.com/windows/win32/menurc/resource-file-formats
"""
import re
import struct
import sys
from pathlib import Path
from xml.etree import ElementTree


def aligned(data):
    return data + bytes((-len(data)) % 4)


def wide(text):
    return text.encode('utf-16le') + b'\0\0'


def version_node(key, value=b'', children=(), text=False):
    data = aligned(bytes(6) + wide(key)) + value
    for child in children:
        data = aligned(data) + child
    value_length = len(value) // 2 if text else len(value)
    return struct.pack('<HHH', len(data), value_length, int(text)) + data[6:]


def resource(kind, name, data, language=0):
    identifiers = struct.pack('<HHHH', 0xffff, kind, 0xffff, name)
    header = struct.pack('<II', len(data), 32) + identifiers
    header += struct.pack('<IHHII', 0, 0x1030, language, 0, 0)
    return header + aligned(data)


class Parser:
    def __init__(self, source):
        source = '\n'.join(line for line in source.splitlines() if not line.lstrip().startswith('#'))
        pattern = re.compile(r'\s+|"(?:[^"]|"")*"|0[xX][0-9a-fA-F]+|[0-9]+|[A-Za-z_][A-Za-z_0-9]*|[{},]')
        self.tokens = []
        position = 0
        for match in pattern.finditer(source):
            if source[position:match.start()].strip():
                raise ValueError('Unsupported resource syntax')
            position = match.end()
            if not match.group().isspace():
                self.tokens.append(match.group())
        if source[position:].strip():
            raise ValueError('Unsupported trailing resource syntax')
        self.i = 0

    def pop(self, expected=None):
        if self.i >= len(self.tokens):
            raise ValueError('Unexpected end of resource definition')
        value = self.tokens[self.i]
        self.i += 1
        if expected is not None and value != expected:
            raise ValueError(f'Expected {expected!r}, got {value!r}')
        return value

    def peek(self):
        return self.tokens[self.i] if self.i < len(self.tokens) else None

    def string(self):
        value = self.pop()
        if not value.startswith('"'):
            raise ValueError('Expected a quoted string')
        return value[1:-1].replace('""', '"').replace('\\\\', '\\')

    def integer(self):
        return int(self.pop(), 0)

    def numbers(self):
        values = [self.integer()]
        while self.peek() == ',':
            self.pop(',')
            values.append(self.integer())
        return values

    def block(self):
        self.pop('{')
        children = []
        while self.peek() != '}':
            token = self.pop()
            if token == 'BLOCK':
                key = self.string()
                children.append(version_node(key, children=self.block(), text=True))
            elif token == 'VALUE':
                key = self.string()
                self.pop(',')
                if self.peek().startswith('"'):
                    children.append(version_node(key, wide(self.string()), text=True))
                else:
                    values = self.numbers()
                    children.append(version_node(key, struct.pack('<' + 'H' * len(values), *values)))
            else:
                raise ValueError(f'Unsupported version block token: {token}')
        self.pop('}')
        return children


def compile_resources(source):
    parser = Parser(source)
    # The Win32 resource stream starts with an empty 32-byte header.
    output = struct.pack('<IIHHHHIHHII', 0, 32, 0xffff, 0, 0xffff, 0, 0, 0, 0, 0, 0)
    while parser.peek() is not None:
        identifier = parser.integer()
        kind = parser.pop()
        if kind == 'VERSIONINFO':
            fields = {}
            allowed = {'FILEVERSION', 'PRODUCTVERSION', 'FILEOS', 'FILETYPE', 'FILESUBTYPE', 'FILEFLAGS', 'FILEFLAGSMASK'}
            while parser.peek() != '{':
                key = parser.pop()
                if key not in allowed:
                    raise ValueError(f'Unsupported VERSIONINFO field: {key}')
                fields[key] = parser.numbers()
            file_version = fields['FILEVERSION']
            product_version = fields['PRODUCTVERSION']
            if len(file_version) != 4 or len(product_version) != 4:
                raise ValueError('Expected four version components')
            fixed = struct.pack('<13I', 0xfeef04bd, 0x10000,
                (file_version[0] << 16) | file_version[1], (file_version[2] << 16) | file_version[3],
                (product_version[0] << 16) | product_version[1], (product_version[2] << 16) | product_version[3],
                fields.get('FILEFLAGSMASK', [0x3f])[0], fields.get('FILEFLAGS', [0])[0],
                fields.get('FILEOS', [0x40004])[0], fields.get('FILETYPE', [1])[0],
                fields.get('FILESUBTYPE', [0])[0], 0, 0)
            output += resource(16, identifier, version_node('VS_VERSION_INFO', fixed, parser.block()))
        elif kind == 'ICON':
            data = Path(parser.string()).read_bytes()
            reserved, image_type, count = struct.unpack_from('<HHH', data)
            if reserved != 0 or image_type != 1 or count == 0:
                raise ValueError('Invalid ICO file')
            group = bytearray(struct.pack('<HHH', 0, 1, count))
            for i in range(count):
                width, height, colors, reserved, planes, bits, size, offset = struct.unpack_from('<BBBBHHII', data, 6 + 16 * i)
                if offset + size > len(data):
                    raise ValueError('Truncated ICO file')
                image_id = i + 1
                output += resource(3, image_id, data[offset:offset + size])
                group.extend(struct.pack('<BBBBHHIH', width, height, colors, reserved, planes, bits, size, image_id))
            output += resource(14, identifier, bytes(group))
        elif kind == '24':
            parser.pop('{')
            lines = []
            while parser.peek() != '}':
                lines.append(parser.string())
            parser.pop('}')
            manifest = '\n'.join(lines).encode('utf-8')
            ElementTree.fromstring(manifest)
            output += resource(24, identifier, manifest)
        else:
            raise ValueError(f'Unsupported resource kind: {kind}')
    return output


def main():
    args = sys.argv[1:]
    if not args or '/?' in args:
        print('OVERVIEW: Resource Converter for FBones (LLVM-RC compatible restricted subset)\n/no-preprocess')
        return
    if '/fo' not in args or '--' not in args:
        raise ValueError('Expected /fo <output> [options] -- <input>')
    output = Path(args[args.index('/fo') + 1])
    source = Path(args[args.index('--') + 1])
    output.write_bytes(compile_resources(source.read_text(encoding='utf-8')))


if __name__ == '__main__':
    main()
