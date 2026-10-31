# Region/slot profile — 4.3.26

## Proven for the controlled profile

The independent opt-in codec is in
`crates/fbones-format/src/minimal/regions.rs`. It constructs records from a
typed model; generation never reads a source project or a binary template.
It covers default-skin region attachments, one attachment per slot, empty
slots, setup visibility, local transforms, bone links and setup draw order.

Original Windows Spine 4.3.26 imported our controlled recipes and separately
opened/exported unchanged `.spine` copies of our independently encoded
`.fbones` files. All eight cases passed in ignored
`WINDOWS_TEST/FORMAT_TEST/region-results-1793203596996756100`:

| Case | Controlled feature | Decoded bytes |
| --- | --- | --- |
| R00 | One 32×24 region | 749 |
| R01 | Empty slot | 677 |
| R02 | Translation, rotation and unequal scale | 749 |
| R03 | Two slots; second region uses a path override | 882 |
| R04 | Region bound to a rotated child bone | 834 |
| R05 | Region retained but inactive in setup | 748 |
| R06 | Reversed setup draw order | 882 |
| R07 | Unicode slot name and renamed region | 758 |

For every case the complete decoded payload matches the controlled original
import outside the unknown identity bytes 12–27. Both original/candidate JSON
exports preserve the expected graph, transforms, dimensions, names, paths,
visibility and slot order. Independent Python validation verifies compression,
checksums, unchanged renamed copies and the actual exported files:

```
python3 scripts/check-reference-results.py WINDOWS_TEST/FORMAT_TEST/region-results-1793203596996756100 --output analysis/regions-check.json
```

Reproduction uses `fbones-reference.exe --verify-regions` on Windows through an
existing mapped drive. It creates fresh ignored results with eight own recipes
and an own generated checker PNG. Spine refuses UNC input paths; use W: on the
current host. The two earlier incomplete result folders are failed attempts,
not passing evidence. The accepted suite need not be repeated without changes.

## Observed record layout

These mappings are proven within the above canonical profile by independent
construction and original-application acceptance. They are not a general schema
for arbitrary Spine projects.

| Record / tag | Observed role |
| --- | --- |
| Skeleton class 11, tag 13 | Slot array; setup draw order |
| Skeleton 11, tag 6 | Attachment inventory array; independent order |
| Skeleton 11, tag 45 | Shared slot group, or an empty group when no slots |
| Slot class 13, tag 1 | Slot name |
| Slot 13, tag 2 | Typed Bone 12 reference; can inline the bone |
| Slot 13, tag 16 | Shared Group 108; its items reference all slots |
| Slot 13, tag 9 | Active Region 43 reference, or null |
| Slot 13, tag 0 | Typed Skeleton 11 reference |
| Region class 43, tag 1 / 13 | Attachment name / image path override |
| Region 43, tags 6 / 7 / 10 | Local x / y / rotation, float32BE |
| Region 43, tags 8 / 9 | Local scale X / Y, float32BE |
| Region 43, tags 11 / 12 | Width / height, float32BE |
| Region 43, tag 0 | Typed Slot 13 owner reference |

Slot defaults are written in observed field order: 1,5,2,16,12,14,9,15,13,3,8,7,
0,11,126. Colors are white/black; the two generic enum-shaped values are 3 and
1 in separate reference caches. The remaining default booleans, integer 1,
float32 1/12 and reserved zero remain fixed. Their wider meanings are unknown.

Region field order is 10,15,11,8,9,14,6,13,12,7,1,32,5,0,4,33,35. Color is white;
tag 15 is null; tags 32/5/33/35 are false/true/true/false; tag 4 is zero. Wider
semantics of these defaults are unknown and are not silently generalized.

Records have two reference arenas as described in FORMAT-4.3.26.md. Typed links
can be null/new/back-reference, without a class prefix. A slot can first emit
its child bone, whose parent is then emitted inline. Its group can first emit
other slots, and its active attachment can appear before the inventory array.
The writer registers the construction graph and emits each labeled record once;
the bounded reader validates the expected class at typed links.

R06 establishes that attachment inventory order must not be derived from draw
order. The typed model stores both explicitly. These controlled imports have
alphabetical attachment inventories; that observation does not establish a
general sorting rule. The binary reader preserves the actual inventory order.

## Integration boundary and remaining work

`decode_regions` extracts the typed model and requires full canonical
reserialization equality. The desktop now uses it with native PNG resources
and slot-aware history. `decode_minimal` remains the skeleton/bones-only API.
Unknown settings/records and unsupported image paths stay inspection-only.

Desktop 0.4.0 bounds PNG decoding (16 MiB file, 4096 pixels per side), shares
immutable bytes in resource/save snapshots, preserves slot bindings through
bone reorder/deletion/history, and writes collision-safe image bundles before
atomic project replacement. Save As copies resources; missing PNGs prevent
moving to a different folder. Existing different images are never overwritten.

The actual Windows application imported our own 256×192 checker PNG, rendered
it through WebView2/WebGL, saved it and the .fbones project through native
dialogs, closed and reopened the project. UI Automation observed the restored
slot/inspector and a viewport-only capture contained the expected checker colors
before and after reopening. Evidence is ignored `.local/windows-image-lifecycle.json`
and `artifacts/fbones-images-viewport.png`; the screenshot contains no local path.

The UI-produced `.local/ui-demo/native-ui-image.fbones` was copied unchanged to
.spine and accepted/exported by original Windows Spine 4.3.26. Its actual export
has root, checker slot bound to root, checker attachment and 256×192 dimensions.
The actual source/copy envelopes and PNG resource were independently inspected.
This is progressive region-profile compatibility, not full-project acceptance.

Multiple attachments, custom skins/colors, meshes, weights, sequences and
animation tracks remain outside the region profile. Local tests cover malformed
records, PNG validation, collisions, missing images, revision safety, copying,
history, binding remapping, frontend drag commits and CSP. A local 128-bone
inline-chain test is not an additional original-Spine acceptance case.
