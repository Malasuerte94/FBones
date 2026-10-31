# F304 — Slot color and blending modes

Status: DONE for four blend modes and slot light RGBA. General Scene integration
and the rest of the advanced goal remain separately active.

## Requested end state

Expose and persist slot light RGBA color and exact4.3.26-supported blending modes, with correct image/mesh rendering and draw-order interaction. Existing tint alone does not complete blending.

## Mandatory evidence gate

Two reference agents inspect behavior/data and UI/interaction before dependent
implementation. Priority: original Spine **4.3.26** reverse engineering → official
primary documentation → explicit assumption. Reuse completed evidence; never
repeat accepted oracle batches or use older editor versions.

Behavior/data findings: `../research/FEATURE-DATA-4.3.26.md` (F304 section complete).
UI findings: `../research/FEATURE-UI-4.3.26.md` (F304 section complete).
Code audit: `../research/FEATURE-CODE-AUDIT.md` (F304 section complete).
Record each conclusion as directly proven, documented, inferred or unknown.

## Acceptance and failure cases

Determine enum values/defaults and binary field with controlled original cases. Compare Normal/Additive/Multiply/Screen and every additional actual supported mode over transparent and opaque backgrounds; alpha/color/linear-premultiplication semantics; undo/save/reopen; no silent downgrade of unknown blend modes.

## Implementation and verification surface

Format slot model/codec, native edits/view, SlotInspector, Pixi ImageLayer and rendering tests with own assets.

Persistence changes must include bounded parsing plus exact complete
reserialization, atomic revision-checked edits, history and independent new
original4.3.26 comparison. UI claims require actual Windows interactions and
visual inspection where relevant. Keep unknown files inspection-only.

## Evidence / handoff

Both F304 audits completed before implementation. The four Slot13/tag7 values
are directly proven by new original4.3.26 imports/exports; current primary UI
documentation supports the control names/layout with its exact-patch limit.
See ../FORMAT-SLOT-BLENDING-4.3.26.md for the binary mapping and limits.

Implemented: typed BlendMode/defaultNormal, bounded enum decoding and exact
canonical reserialization, enum value reference sharing, named SetSlotBlend
transaction/native view, four-mode inspector selector, strict frontend mapping,
and actual Sprite/Mesh blend assignment without changing slot draw order. Light
RGBA remains independent; no dark tint or unknown blend fallback was added.

Five independent candidates accepted/exported original4.3.26: four modes match
their original controlled imports outside identity and runtime exports; fifth
combines weighted mesh Multiply+RGBA with Additive/Screen sibling regions.
Independent checks preserve positions/weights/UV/topology/color. Aggregate
analysis/slot-blending-check.json, ignored .local/research/slot-blending/ logs,
recipes/adaptor and candidate exports. No accepted older oracle batch repeated.

Local checks passed: 83 Rust tests (60desktop,16format,7research; one optional
ignored benchmark), 77 JS tests, pnpm typecheck and strict workspace Clippy.
Logs .local/f304-{native-tests,js-tests,clippy}.log. New cases cover mixed enum
references, unknown enum/alias safe rejection, RGBA+mesh preservation, native
focus/history/no-op/failure, renderer draw order, mode changes and alpha.

WAITING: root-owned GPU checker backdrop integration plus actual Windows pixel
and UI checks of all four modes, color/alpha, weighted mesh/region paths,
Undo/Redo and native save/reopen. CSS checker outside transparent canvas does
not participate in GPU blend destination; root is correcting that separately.
No exact-Spine pixel, checker-color or full visual parity claim is made here.
F301 future multi-slot inspection needs a true mixed state, not reuse of a
singular selected-slot value presented as a batch value.

Source handoff/freeze follows the candidate check and local checks above. Root
may now take regions/reader/rig/projectDTO ownership for F222, retaining this
blend field through every attachment inventory migration and history frame.

The Windows gate above has now passed: nine actual native UI/rendering/lifecycle
groups, four mode pixels over own opaque background, weighted-mesh Multiply and
RGBA80ff8080, Undo/Redo and native save/close/reopen. The GPU backdrop is rendered
inside Pixi, not only CSS. A fresh export of the final weighted/tinted .spine
copy in actual original4.3.26 passed the independent semantic checker:
analysis/qol-blend-ui-check.json (4 bones,9 slots,7 regions,2 weighted meshes,
3 complete PNG byte hashes; max measured world error6.3e-6).
GPU pixels are independently checked against the solid PNGs and blend equations;
no original-Spine GPU pixel parity claim follows from its CLI export. Runtime
JSON weight rounding is bounded at its measured5decimal export quantization.
