# Slot blending — proven 4.3.26 extension

The two prerequisite audits are the F304 sections of
`research/FEATURE-DATA-4.3.26.md` and `research/FEATURE-UI-4.3.26.md`.
Only the four controlled values below are editable. Dark tint and unrecognized
blend modes/settings remain outside the canonical profile.

Original Windows Spine **4.3.26 Professional** imported controlled own recipes
with three slots. Changing only the first slot's blend established Slot class
13, tag 7 as a generic-arena enum reference:

| Mode | Stored value | FBones Pixi mode |
| --- | --- | --- |
| Normal | 1 | normal |
| Additive | 2 | add |
| Multiply | 3 | multiply |
| Screen | 4 | screen |

Each distinct value has its own shared enum reference, independent of Slot tag
14's other enum. Normal retains the previous writer's sharing/order, so the
existing all-Normal profile does not gain any new bytes or metadata. The reader
now retains enum values rather than dropping their contents, extracts the blend
through its reference, rejects unknown values and still requires complete
payload equality against independent reserialization. A malformed reference
aliased to the other enum category is rejected by that complete equality guard.

The `BlendMode` enum belongs to `fbones-format::minimal::regions::Slot`.
Default constructors use Normal explicitly. Native `SetSlotBlend` validates a
named mode and changes that slot in one revision/history transaction, preserving
its RGBA tint and region/mesh data. Native views expose the mode string. The
SlotInspector offers the four audited names alongside existing RGB/opacity
controls. ImageLayer assigns the matching standard Pixi blend to both Sprite
and Mesh nodes and keeps the exact slot draw order; it does not regroup nodes
to reduce blend changes. Neither new custom project tags nor dark tint were
introduced.

## Independent generation and original acceptance

Ignored `.local/research/slot-blending/` contains a temporary research adapter,
independent candidates, original exports, logs and checker. The candidates are
constructed from our JSON recipes through the typed codec, without reading an
original payload as a template. Comparison reads the original solely as an
oracle. For Normal/Additive/Multiply/Screen, each generated payload equals the
original controlled import outside the established 16-byte identity block.
The actual decoder accepts the original only with complete byte equality,
including its original identity.

Unchanged `.spine` copies of all four generated `.fbones` files were then
accepted/exported by original 4.3.26. The resulting runtime JSON matches the
original export after excluding only its derived skeleton hash. The Normal
case has 1,297 decoded bytes; each nondefault case has 1,298, reflecting the
additional distinct shared enum value alongside Normal sibling slots.

A fifth independently generated candidate combines a two-influence weighted
mesh with Multiply and RGBA `4488cc99`, plus Additive and Screen region slots.
Original 4.3.26 accepted/exported it. Independent checks confirm all three
modes, tint, mesh UVs, topology, hull, edges, per-bone positions and weights.
No previously completed foundation, mesh or affine reference batch was rerun.

Commands use the established mapped workspace drive, pinned
`--update 4.3.26 --disable-audio --hide-license --input <candidate>.spine
--output <export-folder> --export json`. No original GUI or user's project was
manipulated. Aggregate evidence: `analysis/slot-blending-check.json`.
Recheck the existing artifacts with:

```sh
python3 .local/research/slot-blending/check.py
```

## Checks and remaining visual boundary

Mixed repeated enums, independent inventory/draw order, unknown values/enum
aliasing, RGBA/geometry preservation, no-op edits, stable slot focus, Undo/Redo
and atomic failures are covered by new Rust tests. ImageLayer tests cover
both region/mesh nodes, changing an existing mode, actual draw-order retention
and independent RGB/alpha/visibility. These are implementation checks, not
WebGL pixel comparisons.

Original CLI acceptance proves persistence and exported blend semantics. It
does not establish exact native-editor pixel composition. Standard GPU blending
sees GPU-rendered backdrop content; a CSS checker outside a transparent canvas
cannot serve as its destination. Root owns the viewport backdrop correction and
actual Windows pixel checks. Checker appearance itself is an explicit FBones
visual choice unless directly observed in the exact reference editor.

Actual Windows Normal/Additive/Multiply/Screen checks over owned opaque and
partially transparent images, tint/alpha, draw order, save/reopen and Undo remain
the integration gate. Transparent scene export must exclude an editor-only
viewport backdrop when that future export feature is implemented. F301's future
multi-slot color/blend selection must expose a true mixed state; this singular
SlotInspector does not claim a completed multi-slot color view.

## Final0.7.0 Windows bundle comparison

The nine recorded dedicated Windows interaction groups now have a fresh
independent comparison of their **final** saved project, including the later
weighted Screen attachment and Multiply tint/alpha edit. An unchanged `.spine`
copy was accepted/exported by actual original4.3.26. The checker verifies four
bones, nine slots, seven regions, two weighted meshes/eight vertices, all four
blend enums and RGBA`80ff8080`, every local binding/weight/UV/topology value,
independent world-space skinning and all three saved PNG hashes/dimensions.
The original JSON export rounds weights to five decimal places; the check
uses an explicit half-quantum allowance5.1e-6, not a claimed unrounded match.
The maximum compared weighted world component difference is6.3e-6.

All recorded GPU samples also match independent standard blend equations
using the decoded own PNGs' actual RGBA values, including weighted Multiply
and slot RGB/alpha. This is actual FBones GPU evidence versus those equations;
original CLI output does not establish original-editor GPU pixel parity.
The old dedicated QA process no longer exists when this final comparison is
run. The historical launch PID/port/hash match the UI report and the immutable
binary's current hash is verified; **no current live-process check is claimed**.
The GUI launcher did not publish a native exit code for this final export;
its fresh complete JSON and original `Complete.` log are the observed evidence.

Aggregate evidence: `analysis/qol-blend-ui-check.json`. The independent checker
is ignored `.local/check-qol-blend-ui-export.py`; it imports no production
codec/renderer math. Two owned hover screenshots that exposed local folder
paths were moved to ignored `.local/qa-private-screenshots/`; they are private
verification evidence and must not be used as distributable screenshots.
