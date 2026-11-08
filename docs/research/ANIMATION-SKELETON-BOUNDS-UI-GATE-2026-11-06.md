# Skeleton11/tag24 source bounds — UI preservation gate

2026-11-06. Read current STATE/TASKS, the paired
`ANIMATION-SKELETON-BOUNDS-DATA-GATE-2026-11-06.md`, accepted lossless-import,
Sequence and viewport/fit policies, and current Preview/viewport/domain code.
This is source-metadata preservation only. No product edit, shared check/build,
platform probe, original process or browser operation occurred.

## Proven data and limited meaning

After the independently gated semantic fixes, the private proposed-capacity A
copy differs from its reserialization only in Skeleton11/tag24's16-byte payload:
four stored f32 values approximately
`[-3953.1514,-2130.6504,7801.1509,5059.0879]` versus the writer's four+0 values.
DATA retains the precise bits; these rounded display numbers are not replacement
input. The retained runtime header's x/y match and width/height differ by1ULP.
That corroboration is not permission to copy runtime-rounded values back, apply
the unrelated coordinateScale.5 conversion, or infer that the cache equals the
current evaluated geometry after editing. No original bounds-update or camera
gesture was observed.

The accepted local screenshots establish a checker viewport, independent
Preview and compact controls; they expose no authoring field for these four
source floats. There is no UI basis for introducing a Skeleton Bounds form,
size controls, export-size adjustment or a bounds repair action.

## Current view geometry stays authoritative

`AnimationPreview.vue::fit` explicitly builds points from visible
`worldRegions(renderedBones,viewSlots)`: Region transformed corners or Mesh world
vertices. It derives its local center/zoom from those points, with safe minimum
extent division and an empty-view fallback. Its fit/pan/zoom state is transient.
`createViewport` also keeps camera pan/zoom/reset local to the viewport and uses
actual scene/selected geometry. Image hit testing and selection use attachment
Region/Mesh geometry; source Skeleton bounds are not inputs. Existing zero-image
Mesh policy specifically depends on actual vertices rather than source image
size metadata. Keep all these paths unchanged.

`ProjectSummary` has no source Skeleton-bounds authoring/renderer field, and no
frontend command currently writes one. Native SceneWire is therefore an
appropriate private typed provenance owner. Its four finite values may roundtrip
without acquiring authority over viewport fitting, camera reset, selection,
attachment dimensions, Mesh vertices/UVs/weights, clipping, physics/evaluation,
Sequence resources or animation key duration. No frontend dependency requires a
product change for this correction.

## Bounded preservation policy and checks

- Retain the exact four source f32 bit patterns in typed
  `SceneWire.skeleton_bounds_24`, with explicit+0 defaults for new/canonical files.
  Preserve finite signed-zero/subnormal bits rather than testing numeric-zero
  equality to decide metadata presence. Do not impose positive-size/min-max-order
  geometry rules on this finite metadata array. No opaque payload or new container.
- Preserve these floats through ordinary edits, history, Save/Save As/reopen and
  image-resource generations. Do not recompute or bake them from rendered poses,
  PNG sizes, current selection, Setup geometry, camera position or cached bounds.
  A geometrically stale source rectangle remains source data; retaining it is
  distinct from claiming an exact original cache-update algorithm.
- Do not resize/recenter art on Open or Fit, treat these values as scene scale,
  feed them to the renderer, or expose them as editable UI. A different viewport
  after a genuine geometry edit should follow current geometry as before.
- Native/format owning checks must establish complete A payload equality after
  the16-byte correction, default canonical bytes unchanged, finite/raw-bit
  validation and preservation on unrelated edits/history/save. Product capacities
  remain separately gated; private raised-cap success is not public admission.

Exact4.3.26 cache recomputation, exported-header rounding and UI geometry parity
remain unclaimed. Coordinator owns format/native assignment and the current
STATE/task checkpoint. No UI implementation is necessary.
