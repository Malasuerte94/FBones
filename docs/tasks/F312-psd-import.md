# F312 — Photoshop PSD layer import

Status: **READY90 supported source profile**, not yet in published0.9.6.

The user requests PSD import after the completed Physics/Match/native-upgrade
closeout, retaining layer positions and depth order. This is the next active
feature toward the general90% milestone; it does not reopen final100% probes.

Reference-first gates: [DATA](../research/PSD-IMPORT-DATA-GATE-2026-11-11.md)
and UI/parser findings recorded before their dependent implementation.
There is no measured exact4.3.26 PSD gesture. This operation is an explicit
FBones policy based on the Adobe file format and existing typed scene/resources.

The usable profile is PSDv1 RGB8 ordinary raster layers, normal blend, straight
alpha, layer opacity/visibility and RAW/PackBits channels. Import creates a
contiguous block of slots/Regions in bottom-to-top draw order, using one common
document center at the destination bone's local origin and one pixel per local
unit. Keep signed off-canvas positions, half-pixel centers and unique display
names/portable image keys. Reject unsupported appearance-changing constructs
before publishing any scene/cache/history mutation.

Use File → Import PSD… in an editable Setup project. One successful operation
means one native revision and one Undo/Redo action. Existing image-cache limits,
stale revision checks, safe PNG writes and binary Save/Close/Open remain required.
An external Images root requires portable Save As before importing generated PNGs.

The core acceptance covers own RAW/RLE and malformed fixtures, independent
signed geometry/order/opacity/visibility checks, a reflected/scaled/sheared
parent, stale/capacity/collision and late animation-remap failure atomicity,
whole-batch Undo/Redo and binary Session Save/Close/Open with exact PNG bytes.
The independently encoded browser fixture proves actual rendered overlap and
hidden-layer behavior through File → Import PSD, one Undo/Redo and portable
Save/Close/Open. The complete125-case UI suite also preserves existing Animate,
Physics and Transform Match integration. STATE owns final run counts/checkpoint.

Use a new or editable Setup project, select its destination bone, then
**File → Import PSD…**. All layers share the canvas center at that bone's local
origin. Existing content stays behind the newly imported block. Hidden layers
remain as inactive inventory and can be shown later; opacity stays separate from
pixel transparency. **Save** writes the generated PNG resources beside the binary
project; reopening does not need the original PSD. Import never writes to the PSD.

Current limits: max64MiB input,128 imported layers,4096px per canvas/layer side,
128MiB aggregate layer RGBA and the existing image-cache/scene capacity limits.
An external Images root requires **Save As** to a portable project first.
A project with explicit nonempty animated draw-order keys refuses structural
slot additions via the existing guard; no animation data is dropped or cleared.
Empty layers, PSB, ZIP, non-RGB8, embedded ICC, extra-channel display metadata,
groups/masks/effects/text/smart objects/adjustments and unknown appearance-changing
layer tags are refused. Some harmless modern metadata is conservatively refused
until reviewed; this is a supported import profile, not general Photoshop parity.

Native GTK/Windows/macOS PSD-picker gestures have not been observed for this
feature. The observed normal Linux working-build startup proves renderer
availability only; hosted browser dialogs are adapted. Windows/macOS source
compilation, new installers and release publication are separate next delivery
checks. Existing0.9.6 downloads do not include PSD import. Broader PSD codecs,
group/compositing/color fidelity and exact4.3.26 gesture parity remain explicit
later work under the general90% rule.
