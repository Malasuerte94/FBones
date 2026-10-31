# Controlled mesh/binding profile — Spine 4.3.26

## Proven observations

`minimal/meshes.rs` independently constructs mesh, binding and vertex records.
`minimal/reader.rs` extracts them and still requires complete byte-identical
reserialization. No original payload/template is used to generate a candidate.

All 14 `meshes-v1` cases were imported as controlled references, and separately
generated .fbones files were copied unchanged to .spine and accepted/exported
by original Windows Spine 4.3.26. Evidence:
`WINDOWS_TEST/FORMAT_TEST/mesh-results-1793209312688729200` (ignored).
Independent validation passed:

```
python3 scripts/check-reference-results.py WINDOWS_TEST/FORMAT_TEST/mesh-results-1793209312688729200 --output analysis/meshes-check.json
```

Cases cover a quad, deformed vertex, interior vertex, triangle, stored image
width, two-bone weights, sparse weights, mixed region/mesh slots, three-bone
weights, an explicitly weighted one-bone mesh, pentagon hull, internal edge,
rotated child slot owner and retained inactive mesh. Every original/generated
file is recognized by the strict reader and reserialized completely.

13 candidates also match the original import byte-for-byte outside identity
bytes 12–27. M08 uses a different binding-bone order: original [arm,root,hand],
generated [root,arm,hand], with corresponding weight/position columns permuted.
Both exports preserve identical per-bone influences. That order affects the
derived runtime skeleton hash. The research comparator normalizes only these
known columns and the derived hash for comparison; the codec NEVER normalizes
them and preserves the source's actual binding order with exact reserialization.
Do not claim all 14 generated/reference payloads are identical.

## Layout established for this profile

| Class | Arena | Observed structure |
| --- | --- | --- |
| Mesh 46 | Domain | 25 tagged fields; owner slot and image identity |
| Binding 71 | Domain | owner mesh; array of vertices; array of bound bone links |
| Vertex 54 | Domain | dense weight and local-position float lists |
| FloatList 17 | Generic | marker, count, float32BE values |
| ShortList 47 | Generic | marker, count, u16BE triangle indices |
| IntList 16 | Generic | marker, count, varuint edge values |

Vertex 54 is a DOMAIN record. A preliminary ignored parser incorrectly put it
in the generic arena; actual subsequent bone references disproved that.

Mesh field order is 16,12,13,27,26,36,17,34,14,30,20,21,8,31,28,7,19,37,1,32,
5,0,4,33,35. Known mappings: 16/17 stored width/height; 12 UV FloatList;
13 triangle ShortList; 14 path; 30 weighted boolean; 8 edge IntList;
31 white color; 28 Binding71; 7 raw uint=4*hull vertex count; 1 name;
0 typed Slot13 owner link. The remaining accepted defaults are null at 27/26,
false at 36/34/32/35, true at 5/33, float 1 at 20/21, float 0 at 19,
uint 8 at 37 and uint 0 at 4. Their wider meanings remain unknown.

Binding71 fields are 0 Object mesh link, 2 Object array of Vertex54, 1 Object
array of Bone12 links. Vertex54 fields are 0 Object weights FloatList17,
1 Object local positions FloatList17. Each vertex has B weights and 2B positions
over the same ordered binding-bone list. Sparse input expands to dense arrays;
absent influences have weight 0 and local position [0,0]. Unweighted meshes
still have one binding bone (the slot owner), weight [1] and position [x,y].
The weighted flag is independent of binding-list length (M09).

Edge values observed in the binary and public JSON are coordinate-pair offsets
(2*vertex index). Our typed model stores vertex indices and converts at the
codec boundary. This establishes the nonnegative mapping, not a general signed
serializer contract. Hull boundary edges and explicit internal edges persist.

M04 establishes that stored mesh width can be 96 while the current PNG is 32:
the .spine payload retains 96, while JSON export reports the PNG's 32. Vertex
geometry is unchanged. Binary comparison validates stored metadata; runtime
comparison validates geometry and current PNG dimensions independently.

## Limits, unknowns and integration

The typed region/mesh attachment enum preserves independent inventory and draw
order. Limits currently include 256 vertices per mesh, 4096 mesh vertices total,
128 bones/slots, bounded primitive lists, finite UVs in [0,1], valid indices and
nonnegative normalized weights. Unknown settings and richer profiles are refused
by complete reserialization equality; original bytes stay available unchanged.

Desktop mesh editing remains guarded until geometry, history remapping and UI
integration are complete. Region/PNG desktop editing is already verified in 0.4.0.
Only comparison code may canonicalize influence-column order; never do it in
the file recognizer to make an unsupported project fit. Physics, constraints,
animation, linked meshes, additional skins/colors and other records remain
outside this accepted controlled profile.

## Native editor integration acceptance

Windows 0.5.0 created a PNG-backed mesh with five vertices, an internal edge and
three bound bones. Vertex dragging, triangulation, numeric/painted weights,
undo/redo, a posed bone, a second hidden region and draw-order changes survived
native Save → Close → Open with the same canonical geometry and influences.
An unchanged .spine copy was accepted/exported by original Spine 4.3.26.
Independent comparison of bone transforms, slot order/visibility, UVs, triangles,
edge offsets and all per-bone local positions/weights passed. Aggregate evidence:
analysis/mesh-ui-check.json; local UI artifacts: .local/windows-mesh-lifecycle.json.
The runtime JSON exporter rounds weights, so comparison uses 1e-5 tolerance;
our binary save/reopen comparison checks exact dense arrays.
