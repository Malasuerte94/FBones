# Split Translate/Scale axes — pre-code UI gate

2026-11-06. Read STATE/TASKS, `ANIMATION-GENERIC116-DATA-2026-11-06.md`, accepted
animation UI/K/draft audits, and current domain/timeline/shared-HUD source.
Re-viewed `animare/Spine_xVO18OJIOB.png` and `Spine_m7wxCtUtTG.png`. No product
edit, shared runner, browser or original process operation occurred.

## Proven source versus unknown UI

The supplied images show23px bone/property rows, combined Rotate/Translate/Scale/
Shear labels, their green/blue/red/yellow identities, shared floating transform
controls, adjacent Graph/Dopesheet tabs and selected curve keys/handles. They do
**not** show separated-axis rows, a split toggle, conversion/merge gestures or
empty separated axes. Screenshot versions are not printed. Existing exact4.3.26
captures establish compact layout, not those unseen operations.

Generic116 DATA directly correlates per-animation Bone-reference/value1 with
Translate X/Y custom132 kinds14/15, and value2 with Scale X/Y kinds16/17 in the
observed partial fourth file. The initial runtime comparison accounts for114
tracks/638 keys; its version4.3.13 runtime is secondary grammar guidance applied
to internally4.3.26 data, not exact editor gesture proof. DATA's follow-up reports
24/57 axis pairs with different frame arrays and all three curve codes. Flattening
them into shared XY keys would invent key times/identities and lose independent
curve ownership. Integer3/bitmask combinations, split Shear, missing/empty axes,
varying Scale Y numeric fidelity and original split/merge UX remain unproven.

## Current source seams that must change together

- `domain/animation.ts` and `animationTimeline.ts` type only four combined
  channels. `sampleAnimation` treats every non-Translate/Rotate/Scale channel as
  Shear, so exposing scalar names without explicit scalar sampling would be wrong.
- `AnimationTimeline.vue` creates only those four bone rows; merely adding scalar
  tracks to props would not display them. Graph derives curve count from tuple
  length and `axisLabel` calls component0 X, so a scalar Y track could become a
  fake two-curve track or a mislabeled X editor if represented by a padded tuple.
- `AnimationTools.vue` intentionally has four shared Setup/Animate rows with X/Y
  numeric fields and one family Key button. Its capability check and
  `useAnimationWorkspace` manual/K/Auto Key routes currently identify combined
  channel names. Iterating a future global eight-channel capability list would
  risk authoring both combined and separated keys for the same changed field.
- `boneChannelFields` and retention currently consume XY together. Scalar X
  publication must not consume a pending Y edit. Key values, interpolation,
  tangent edits, clipboard controls and zero-Setup-scale checks also assume the
  old pair shape. Native owner metadata and IDs must remain authoritative.

## Coherent bounded FBones policy

Keep the four shared transform rows and existing placement. Separate **UI
families** from **stored channels**, choosing representation per bone and clip
from validated native data; never from the active tool or project-wide capability
list alone. New ordinary bones/clips continue using combined families. Existing
separated sources retain their known1/2 configuration. No split-toggle, implicit
merge, mode3, silent conversion or empty-axis authoring is needed for this slice.

| Interaction | Combined family | Existing separated family |
| --- | --- | --- |
| Edit X or Y with Auto Key off | Existing transient pose policy | Same pose fields, no metadata/key mutation |
| Auto Key / dirty-property K | Existing combined-key policy | Only each actually changed axis gets a scalar key |
| Manual shared Translate/Scale Key | One combined key | Explicitly key both scalar axes, one atomic command/history action |
| Timeline axis-row Key/value/curve edit | Existing combined row | Address just that scalar track/key/curve by stable ID |
| Clean K fallback | Existing active-family fallback | Key that family's two scalar axes explicitly |

A mixed bone selection may contain both representations; one native batch routes
each bone correctly and rejects unsupported targets atomically. Do not alter an
unselected bone or a sibling axis to make the batch fit. An X-only Scale key checks
only the X Setup denominator: unkeyed Y Setup0 must not block it. Before an axis's
first key, retain its own Setup field; Translate changes only its additive axis,
Scale only its multiplicative axis. These sampling defaults follow the paired
DATA/runtime policy, not a new exact editor observation.

In Dopesheet/Graph, replace a separated family's combined row with adjacent
**Translate X / Translate Y** or **Scale X / Scale Y** rows at existing density;
this explicit axis labeling is a FBones presentation policy. Preserve family
colors and textual axis identity, not color alone. Each scalar lane plots one
value and one outgoing curve/handle set; component0 of a Y lane must still be
labeled Y. Combined XY keys remain combined identities. View ordering X then Y
does not reorder stored owner/track provenance. Do not introduce new percent or
unit conversion merely for scalar channels; exact original Graph units are a
separate fidelity question.

Retain each axis's source frame/value/curve bits and selection identity through
numeric/tangent edits, retiming, copy/paste, history, Save and resource generation.
Clipboard may paste one axis into an existing compatible separated family; a new
or combined target requiring unknown conversion/empty configuration must reject
clearly rather than invent a sibling zero key. DATA must gate any explicit new
separated **pair creation** separately: that could be a labeled FBones action on
an unkeyed family with known1/2 mode, but no original gesture is established.
Likewise, deleting the last key of an axis requires a declared policy: conservative
pair-complete support rejects an operation leaving an unknown empty configuration,
instead of silently deleting metadata or manufacturing a replacement key.

DATA reports two scalar X Bezier control times outside their segment. Do not
clamp/rewrite them or claim complete scalar-curve fidelity; unsupported curve
profiles remain inspection-only until their sampling/serialization policy is
settled. Resolving split metadata alone admits none of the currently six rejected
projects: large-domain/caps and other families remain independent gates.

## Required interaction regressions before exposing support

Use asymmetric X/Y key times and distinct linear/stepped/Bezier curves. Verify
correct one-axis rows, labels, Graph cardinality and stable selection across tabs;
numeric edits and one-handle drag leave sibling keys/controls bit-identical; a
mixed marquee/move/delete/copy/paste preserves native axis identity. Test pause
before pointer capture, Escape and stale frame/clip guards.

Through actual shared HUD/manual/K/Auto Key routes, test X-only, Y-only, both-axis
and mixed-bone-representation edits; partial publication retains the other axis's
draft, newer clean reverts, all other families, Save/resource retention and explicit
discard guards. Test zero/negative Setup scale per addressed axis, invalid field
Save blocking, atomic collision/empty-axis rejection, native Undo/Redo/portable
reopen and Main/Preview sampling. Node/SFC checks prove routing only; original
independently encoded acceptance and visual/native interaction proof stay pending.

Coordinator triage now prioritizes the actual116-bone/112-slot project without
Generic116/scalars, whose dark-color/RGBA families and domain limits need paired
audit. This note retains the split findings without authorizing product work.
