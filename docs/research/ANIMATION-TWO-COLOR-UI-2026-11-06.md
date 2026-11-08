# Real-project A two-color slots — pre-code UI/render gate

2026-11-06. Coordinator triage prioritizes the real source profile with116bones,
112slots/attachments and12clips (reported2203tracks/6764keys), which has no
Generic116/scalar axes. Resolving scalar axes alone admits none of the six
remaining rejected projects. Read STATE/TASKS, the retained Generic116 DATA,
`ANIMATION-SLOT-UI-4.3.26.md`, `ANIMATION-SLOT-DATA-4.3.26.md`, F304 in
`FEATURE-UI-4.3.26.md`, and current color/model/render source. No product edit,
shared runner, browser or original process operation occurred.

## Evidence and corrected source question

Re-viewed the supplied `animare/Spine_xVO18OJIOB.png` and
`Spine_m7wxCtUtTG.png`: they establish compact transform HUD,23px timeline rows,
Graph/Dopesheet and right-side panels, but show bone transforms rather than a
two-color slot editor. Reuse exact4.3.26 Setup attachment captures: attachment
Color is separate from slot light color. They show no dark-color interaction.

Also re-viewed the retained official documentation image
`animation-slot-ui-reference/documented-color.png`. Its slot panel has Separate,
Alpha, Color, adjacent key, Blending and a **disabled Tint black** label/control.
This image is version-unpinned; it proves neither enabling behavior nor an
expanded dark picker, exact4.3.26 gestures, row naming or rendered pixels. F304
and the accepted slot UI audit already distinguish Tint Black from multiplying
the existing light color. No new original observation is claimed.

**DATA correction:** A has no custom timeline kind20. Its533 editor kind4 color
tracks have seven lanes and correlate with523 runtime RGBA plus10 RGBA2 tracks.
The earlier bounded own profile deliberately rejected nonzero last-three values;
that guard must not be bypassed by dropping them. Slot field8 is null in all112;
field12 is true in2 slots, and field11 is white in2/black in110. Their exact Setup
dark-enable/color relationship still needs DATA's targeted observation; these
correlations alone do not authorize a checkbox mapping, writer or renderer claim.

## Secondary runtime boundary, not editor parity

Targeted read-only inspection used the already installed/pinned official
`spine-core` and `spine-webgl`4.3.13: SlotPose, RGBA2Timeline, SkeletonRenderer and
the two-color shader. File hashes are retained in ignored
`.local/research/two-color-ui-2026-11-06/runtime-source-pin.json`; no extracted
source is copied here or distributed. This is secondary runtime guidance for
the internally4.3.26 source, not exact4.3.26 editor pixels or gestures.

The runtime distinguishes an optional dark RGB from light RGBA; dark alpha is
not an authored animation component. RGBA2 carries seven values at one frame,
with seven component curves. Before the first key its normal Setup path keeps
the Setup light/dark values. Its renderer remaps the texture's black endpoint
toward dark RGB while light colors control the white endpoint; it does not
simply multiply two tint colors. A nonzero dark color can lift black texels,
which a multiplicative `Sprite.tint` cannot do.

That runtime's premultiplied path uses combined skeleton/slot/attachment alpha
for light and dark contributions. Attachment RGB multiplies light RGB, while
the inspected dark RGB path is not multiplied by attachment RGB. These details
must be reconciled with Pixi's texture/PMA/color-space/blend pipeline before
implementation. They are not permission to reuse a straight-alpha equation on
premultiplied PNG samples or claim editor render fidelity. Neutral/absent dark
must preserve the accepted light-only output, including attachment tint and
precise sampled alpha. No dark-alpha UI or animation lane should be invented.

## Current implementation gaps

`SlotView`, SlotAnimationPose/Draft, native slot pose DTOs and the current slot
sampler expose only light RGBA. `useSlotAnimationWorkspace` validates exactly
four values, builds RGBA key input and copies four control axes. Shared retention
captures the color group; resource continuity validates those typed fields.
`SlotInspector` has one light swatch, opacity slider and RGB numeric controls;
`AttachmentColorEditor` separately edits Setup attachment tint and is disabled
in Animate. Neither represents dark slot RGB.

Timeline creates an Attachment and Color row per selected/keyed slot. Its RGBA
Graph palette/labels assume R/G/B/A only; merely accepting seven values would
give undefined colors/ambiguous component labels. Numeric edits, handles,
interpolation conversion, mixed clipboard and manual/Auto Key need known
cardinality and stable identity, not truncation or a second invented key object.

Both Main and Preview use `viewSlots` and the same `ImageLayer`. The latter
currently applies one multiplicative light/attachment tint plus alpha to Sprite
or Mesh, then slot blend and clipping. There is no dark-color shader/attribute
path. Successful decoding alone would therefore render A incorrectly. Region,
zero-metadata Mesh, clipping, missing PNG, Sequence-selected frames and inactive
attachments all need the same honest capability gate.

## Bounded interaction/model policy after DATA proof

- Preserve Setup dark **presence** independently of black RGB and light alpha;
  absent and explicitly black must not be canonicalized together unless DATA
  proves their wire equivalence. Keep slot dark RGB distinct from attachment
  Setup tint, clipping outline, slot blending and attachment activation.
- Keep the existing slot inspector and shared transform HUD placement. Once
  Setup mapping is proven, a compact **Light / Dark** pair of named swatches,
  RGB precision controls and the existing light-opacity slider is a reasonable
  FBones policy. There is no dark-opacity slider. A dark-enable control may only
  operate the proved nullable/flag model; do not infer its destructive effect on
  existing keys or silently zero/drop dark values when disabling it.
- Preserve current light-only files unchanged. For a proved joint seven-lane
  kind4 record, one manual Color key addresses the slot's sampled light RGBA and
  dark RGB together, retaining one key ID/time. Do not manufacture a separate
  dark key timeline merely because the UI has two swatches. Exact original
  separated RGB/alpha/dark-toggle gestures remain outside this gate.
- Auto Key off stages valid live color values without changing Setup. Manual/
  Auto Key and numeric/handle edits must preserve every unedited component and
  its curve, as well as attachment/other-slot drafts and newer live intent. No
  source7→4 truncation, byte quantization of interpolated values, or automatic
  curve clamp is allowed. Save/resource retention must include the full typed
  color group under their existing lifecycle/stale guards.
- Keep one Color Dopesheet row for one joint native key family. Graph exposes
  seven individually labeled **Light R/G/B/A, Dark R/G/B** curves/handles with
  shared native key identity. Reuse axis colors and a textual/dash distinction
  for light versus dark; exact original row labels/palette are unobserved.
  Selection, marquee, move/delete/copy/paste and history address that real record.
- Unsupported Setup mapping, record/curve identity or renderer behavior remains
  inspection-only with a clear reason. Do not expose controls that only change
  a swatch while Main/Preview still apply ordinary multiplicative tint.

## Acceptance follows the actual project profile

Use an independently authored black/white/midgray/colored/transparent checker to
separate black lifting from ordinary light multiplication. Check dark absent,
black, nonblack RGB, alpha0/.5/1, nonwhite attachment tint, Region and Mesh, every
existing blend mode, clipping and draw order; both GPU views must share the
result. Transparent-edge/PMA tests and an independent pixel calculation are
required before any numeric render claim. CPU helper tests alone are insufficient.

Actual compiled UI tests should exercise both named swatches, precise values,
one-action slider gestures, Enter/Escape, readonly/narrow layouts and invalid
Save/resource blocking. Native tests must preserve all seven values/curves and
Setup presence through manual/Auto Key, Graph edits, partial/newer publication,
Undo/Redo, resource generations and portable Save/reopen without touching
attachment tint or active pointers. The actual A profile then needs complete
payload equality, semantic comparisons, every clip's sample/author/history/
save/reopen coverage and native UI/render checks. Existing domain/track/key/
cache budgets and performance must be audited from A's real shape; no blanket
cap relaxation or convenient toy-profile success counts as admitting A.

Root/DATA own the next targeted Setup-dark observation and product assignment.
Original independently encoded acceptance and exact editor visual proof remain
pending; this gate authorizes no product code by itself.

## Frozen UI implementation boundary after DATA proof

`ANIMATION-TWO-COLOR-DATA-GATE-2026-11-06.md` now proves the targeted A Setup
relationship: slot12 enable and slot11 stored RGB correlate with runtime dark
presence/RGB; stored alpha255 is retained separately and is not dark alpha UI.
Enabled tracks are initially Linear-only, matching A's18 enabled-color keys.
Disabled light-only profiles retain their accepted curves unchanged. Setup edits
preserve dormant RGB when disabling, and native rejects incompatible toggles
rather than dropping animated dark lanes. Unknown original toggle gestures remain
unclaimed. The coordinator assigns components/i18n/timeline-view types to this
worker, with DTO/sampling/commands/retention and renderer owned separately.

Implement Setup Tint Black plus a separate Dark RGB swatch, Animate three dark
precision fields/swatch, and the existing joint Color key action. Enabled Color
Graph carries seven labeled curves under one ID. Stepped/Bezier actions on a
selected enabled-color key (including a mixed selection) must be disabled with
a visible FBones profile-limit explanation; do not silently downgrade curves.

## Independent source review findings

A production-composable probe found a concrete dormant-state bug: disabled Tint
Black with retained Setup RGB336699 still seeded sampled dark=[.2,.4,.6], and a
light-only Auto Key command sent those nonzero dark lanes. The disabled light-only
profile requires canonical zero lanes. The ignored
`two-color-ui-2026-11-06/dormant-rgb-key-probe.mjs` and adjacent result reproduce
it; the coordinator owns the correction/regression. Dormant metadata must survive
without becoming active sampled/key color.

Source review otherwise finds separate light/dark draft groups and affected-key
consumption, full seven-lane projection, shared-ID numeric updates, clipboard
value/control retention and exact resource-continuity comparison. Root adds
newer-clean light/dark intent cases. These are source findings, not a blanket
runtime-pass claim.

Applied the PixiJS router and filters skills before reviewing the renderer.
Pinned Pixi8.8.1 ColorMatrixFilter source unpremultiplies positive-alpha input,
transforms RGB and premultiplies again. White input plus combined slot/attachment
opacity and the chosen black/white-end matrix is algebraically coherent;
normal input blend with the slot blend on the filter avoids applying output
blend twice. Neutral dark keeps the previous one-pass path. Per-slot filter
ownership is cleared/destroyed with node type replacement, deletion, resource
clear and layer destruction; detached neutral filters are bounded cached state.
Masks, order and actual Sprite/Mesh filter assignments are recorder/source
checks. No GPU transparent-edge, clipping, blend or original pixel pass follows
from this algebra or the recorder tests.

## Owned UI implementation evidence

Compiled `slot-two-color-controls.test.mjs` passes4/4: Setup enable/RGB and dormant
retention, failed-toggle DOM rollback, pinned stale/busy target guards, actual
Animate dark draft staging/invalid-input Escape/shared manual-key route, and
seven Graph components with full payload/shared identity. A mixed bone+enabled
color selection blocks Stepped/Bezier as one action. The existing five Sequence
controls regressions also pass. The seven-value footer wraps compactly; native
narrow-layout/pixels remain unobserved. Root owns the native/composable/renderer
proof and full source admission.

`tests/e2e/slot-two-color.native.spec.ts` is written and unrun: generated opaque
black PNGs, actual Region/Mesh Setup controls and black lifting, unkeyed fields,
invalid Save, joint color key, seven-component Graph editing/history and portable
reopen. This is a bounded own control/render specimen, not A admission or a
translucent-edge/PMA/reference result. UI TypeScript checking passes after the
coordinator's renderer typing correction; no browser run is claimed.
