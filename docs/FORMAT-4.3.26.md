# Spine 4.3.26 project format — evidence

## Proven locally

- The installed log identifies Spine 4.3.26 Professional, launcher 4.3.06.
- The editor package is a non-ZIP binary container. Its first big-endian u32
  equals the file length (15,221,340 bytes). This does not establish encryption.
- Actual 4.3.26 `.spine` backups contain raw DEFLATE (`wbits=-15`) followed by
  a 20-byte trailer. The first 8 trailer bytes are the compressed stream length
  as a big-endian u64; the last 4 bytes are `02 0b 02 0b`. The intervening 8
  bytes store CRC64/ECMA-182 of the compressed DEFLATE stream, big-endian.
  The polynomial is `0x42f0e1eba9ea3693`, initial state zero, no reflection and
  no final XOR. This agrees with all 2,220 target backup files and the supplied
  empty reference project, using independent Rust and Python implementations.
- Decompressed sample headers begin `48 b0 20 b0 20 34 2e 33 2e 32 b6 01`.
  The bytes at offset 5 encode `4.3.26` with the last byte's high bit set.
- The payload is binary, contains structured objects and project-local paths,
  and is not the public Spine JSON export format.
- A filename ending in `4.3.26.spine` does not guarantee the internal version;
  the inspector excludes mismatches without using them as reference material.
- Corpus check: 2,220 backup files have the observed 4.3.26 header, complete DEFLATE
  stream, matching trailer length and trailer marker. Another 13 matching
  filenames identify a different internal version and are excluded.
- The controlled empty project has been supplied as
  `updates/fixtures/blank-4.3.26.spine`: 438 bytes compressed/container total,
  666 payload bytes. It contains default `skeleton`, `root`, and `animation`
  strings; it is not a zero-object serialization.

Reproduce using `python3 scripts/inspect-spine.py --verify-checksum` (aggregate
output only). The supplied fixture brings the checksum-verified count to 2,221.

The envelope API independently encodes compression/trailer framing around a
binary payload. Semantic project creation/recognition is separately implemented
by the minimal-profile codec described below.

## Inferred, not a codec contract

The high-bit-terminated strings resemble Kryo-style ASCII encoding. Neither
the serialization library nor object schemas have yet been established.

An exploratory local reader (`.local/research/parse-project.py`, not a shipped
codec) can walk the supplied blank payload from offset 28 to offset 654 of 666.
It treats the first record as 27 tagged fields; candidate class IDs 11, 12 and
18 have respectively 43, 21 and 10 fields and appear to represent skeleton,
bone and animation records. These names are hypotheses from their contents,
not established registrations. A second minimal target backup leaves the same
12-byte suffix; projects with attachments encounter unrecognized classes.

The 16 bytes at offsets 12–27 have unknown meaning. UUID and simple digest
assumptions were not established. The candidate root leaves the suffix
`01 0b 00 00 00 00 00 00 00 00 00 00` unexplained in the controlled blank.
Controlled references are accounted for by two independently numbered pools:
tagged project records use one pool, strings/arrays/colors/vectors and class 116
use the other. Markers 0/1 mean null/new; markers >=2 refer to index marker-2.
For example, a group refers to animation domain index 2, a child refers to its
parent bone at domain index 14, and its shared enum/string use generic indices
34/35. These indices follow serialization order, not fixed global IDs.
The local exploratory reader now walks all eight controlled cases after adding
character-count UTF-8 framing and a reference-capable varuint-shaped field.
It leaves the same 12-byte suffix in each case. This does not establish all
field types across arbitrary projects. The minimal writer has since passed
original-Spine CLI acceptance, as recorded below.

## Controlled original-application oracle

`crates/fbones-research` creates eight own import recipes: a minimal skeleton,
an identical repeat, translated root, rotated root, one child bone, renamed
skeleton, renamed root and a Unicode root name. Using the installed original
Spine console executable, it requests exact version 4.3.26, imports each recipe
and exports it back to JSON. It verifies the resulting binary envelope and
checks that exported bone names, parents and transforms match the recipe.

After collection it recompresses the existing minimal payload with our Rust
envelope codec and asks original Spine to export it. The report requires JSON
equality with the unmodified original. This is an envelope acceptance test,
not semantic project generation.

Windows results have now been returned in ignored
`updates/fixtures/reference-results-1793191428306`. All eight cases succeeded;
the collector reports that original Spine accepted the repacked file. Independent
artifact validation confirms all nine envelopes/checksums, the expected exported
bone changes, exact repacked payload equality and identical repacked JSON.
Reproduce with `python3 scripts/check-reference-results.py
updates/fixtures/reference-results-1793191428306 --output analysis/reference-check.json`.

The baseline and repeat both decode to 622 bytes and differ only at offsets
12–27. This rules out a deterministic hash of the rest of the payload alone
for that header block. The root-x case changes float32BE bytes at offset 453
from 0 to 37; the rotation case changes offset 417 from 0 to 25, besides the
header block. In the candidate bone record these correspond to tags 10 and 12.
The child adds 85 decoded bytes. Renaming the skeleton or root adds 8 bytes;
the Unicode name uses a character-count prefix followed by UTF-8 bytes. Offsets
refer only to this controlled baseline; they are not a fixed-layout codec.

## Accepted minimal-profile codec

`crates/fbones-format/src/minimal.rs` constructs the controlled minimal
profile from typed records and an own skeleton/bone model. It does not load
original files or an empty-project template. It supports names, ordered parent
links and bone transforms, plus the observed empty animation/editor defaults.
Header identity bytes are supplied separately; footer meaning remains unknown.
The research recipe adapter is separate; production persistence calls the typed
codec directly, without original Spine, source fixtures or JSON import recipes.

The research tool's `--compare-candidates <reference-results-folder>` mode
independently generates all eight cases and compares decoded payloads with
returned original fixtures. All eight match byte-for-byte outside offsets
12–27. This validates the observed profile structure and two reference pools,
and was followed by a separate original-Spine acceptance check.

`--verify-generated` is the Windows acceptance check. It writes our own
.fbones files, identical .spine copies, and asks original Spine to export each
copy, checking skeleton names, bone names/parents/transforms and animation.
No original import is used by this mode. General compatibility and unknown
records remain outside this acceptance scope.

The Windows batch `candidate-results-1793192829017044600` has now been read
directly from the mounted Desktop and archived under ignored updates/fixtures.
All eight independently generated cases have originalSpineExportVerified=true;
minimalProfileCliAccepted=true. Independent artifact validation confirms valid
envelopes/checksums, byte-identical .fbones/.spine copies and expected exported
names, bone graph/transforms and animation. Separately generated header values
were therefore accepted for these cases. Header/footer semantics beyond this
profile remain unknown. The user has now also confirmed interactive opening of
the generated project in original Spine and application startup via the shared
Windows shortcut. This permits enabling saving for the accepted minimal profile.

The bounded reader in `minimal/reader.rs` parses known tagged fields with two
reference arenas, size/depth limits, UTF-16-unit strings and validated indices.
It extracts the skeleton/bone model, then requires exact equality between the
complete decoded payload and reserialization of that model, including header
metadata, reserved fields/defaults and suffix. Unknown settings, field ordering,
records or other unsupported data remain inspection-only and retain original
bytes; they are never silently normalized or discarded.

Both encoder and semantic reader pass differential checks against all 16
returned original/generated fixtures. Automated coverage includes Unicode and
emoji names, parent graphs, finite transforms, every truncation of a controlled
payload, byte mutations, unsupported settings and filesystem roundtrip.

CLI usage follows the [official Spine command-line interface documentation](https://en.esotericsoftware.com/spine-command-line-interface):
`--update 4.3.26 --input recipe.json --output project.spine --import skeleton`,
then `--input project.spine --output export --export json`.

## Unknown / required for broader compatibility

The 0.3.0 bone editor uses the existing typed bone records; it introduces no
custom file header or editor-ID fields. Rename, position/rotation/length and
parent changes update that model; topological reordering preserves valid wire
references. Native editing tests cover file roundtrip and undo checkpoints.
The additional four-case `bones-v1` original-Spine comparison passed for
chains/branches/reparenting/Unicode; actual artifacts and exact payload matches
were verified in `candidate-results-1793201993246175300`. Root scale,
shear, nondefault colors/settings and richer structures are outside this profile.

- Header identity/footer semantics beyond the accepted minimal profile.
- Optional/richer attachment data, animation tracks and other unmodeled types.
  The opt-in region/slot profile is documented in FORMAT-REGIONS-4.3.26.md.
- Faithful editing/preservation of arbitrary original-project settings/layouts.
- Feature-specific controlled comparisons and roundtrip tests.

An unchanged existing document can be preserved as bytes. This is lossless
transport, not recovery of its schema and not proof of creation compatibility.
Never silently substitute a custom project container or serialize guessed data.
