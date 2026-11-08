# Animate reliability and runtime export gate — 2026-11-08

The current user requests correction of Translate release jumps, investigation
of playback lag, and an independently authored developer runtime.

## Paired reference review before implementation

DATA auditor `data_drag` reused `ANIMATION-DATA-4.3.26.md`, the
constraint/event codec contract, draw/deform DATA, Sequence contract and mascot
DATA gate. Export must contain authored Setup local transforms, owned attachment
inventory/active selection/draw order, stable references and named animation
keys in frames with FPS. Never export evaluated matrices, Physics state, clocks,
editor selection, source-state snapshots, provenance or remembered source paths.
The existing canonical import/admission guard remains authoritative. Exporting a
model does not itself prove original runtime numerical parity.

UI auditor `ui_playback` reused `ANIMATION-UI-4.3.26.md` and the supplied
`animare/` layout. Playback remains local; no full scene IPC per frame. One
completed gesture is one history action. Preview and committed pose should agree;
the exact original release gesture is unknown. The runtime export action is an
explicit FBones feature, with pending valid field flush, busy/invalid/inspection
guards, a native destination dialog, clear errors and no editor project mutation.
No original export gesture parity is claimed.

## FBones runtime policy

An npm-ready ESM/TypeScript package with an independent headless entry point and
optional PixiJS 8 adapter uses our own existing animation/geometry/solver modules.
Separate versioned `.fbones.runtime.json` developer exports do not replace or
change the binary `.fbones` authoring format. The first export action creates a
new uniquely named bundle directory inside the selected destination, with JSON
and portable PNG resources. It never overwrites an existing bundle/source and
does not mark the project saved or bake unkeyed previews. Unsupported data and
renderer capabilities must fail explicitly. Physics remains FBones policy, not
a claim of exact Spine dynamics. Public registry publication is separate from
local implementation and package validation.

Official distribution documentation consulted: [npm public scoped packages](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/).
The proposed npm scope/name remains unreserved until publication. The repository
is MIT; no Spine runtime code, assets or runtime dependency is incorporated.

## Native Windows export comparison boundary

The own WebView2 QA completed both signed parent drags with preview/release
agreement and Undo/Redo, then playback without authored mutation. Its subsequent
export comparison initially failed because it compared different decimal
representations of the **same stored f32**, rather than typed float semantics.
For example, the direct native summary emits81.6 and2.6; the runtime export's
`serde_json::to_value` path emits81.5999984741211 and2.5999999046325684. Deformation
examples are−17.999998 versus−17.999998092651367. Each pair has identical
`Math.fround` value. This is a test-boundary issue, not evidence of a displaced
pose, a failed export or a needed product rounding change.

The targeted continuation retains the failed result and the three completed QA
groups without rerunning their mutations. It verifies the already-created game
export against unchanged authored state using f32 normalization **only for
declared float channels**: frames/duration, values/curve controls, transform and
constraint coefficients, binding coordinates/weights and event float fields.
Session IDs, owner references, integer Event payloads, topology/draw order,
packed colors and bit metadata remain exact; negative-zero sign is retained.
The pure comparator matches the entire existing export to the retained
post-drag snapshot, and separately retains ID16777217 and packed color4294967295
without f32 rounding. This read-only check does not claim the Windows
continuation has run. The coordinator owns its guarded OS SaveAs and normal
close, final receipt and platform acceptance.
