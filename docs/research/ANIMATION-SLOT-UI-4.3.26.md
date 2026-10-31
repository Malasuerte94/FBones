# Slot attachment and color animation — UI evidence and contract

2026-10-30. Reference audit recorded before dependent implementation. F105
continues beyond the delivered bone-animation profile. DATA owns the new wire
schema; this audit covers selection, controls and presentation. The UI worker
performed no original/Windows/process operations and made no product changes.

## Directly proven exact4.3.26 evidence, reused

Re-viewed the owned original captures under
`.local/research/feature-ui/multi/`: `slot-row-b-selected.png`,
`slot-paperclip-b-active.png`, `slot-paperclip-none.png`. The earlier exact-package
identity/guarded-input record is `FEATURE-UI-4.3.26.md`, section F222/F301.
These show **Setup**, not Animate; do not extend the gesture proof silently.

- Inactive B's row can be selected, showing Region B properties while A remains
  the rendered active attachment. Selection alone leaves the title clean.
- The separate **paperclip** activates B: only its blue image renders and the
  title becomes dirty. Clicking that active paperclip again sets active-none;
  both inventory rows remain and B stays selected. No alternate is substituted.
- The slot is a distinct parent row with a round slot icon; image alternatives
  are indented children. Attachment properties show Image path, Options, Mesh,
  Sequence and a setup Color swatch. That attachment tint is not slot color.
- Reuse the three accepted A/B/none raw/JSON cases in
  `../SLOT-ATTACHMENTS-4.3.26.md`: one nullable active pointer per slot, independent
  complete inventory and separate slot draw order. No accepted action is repeated.

All four `animare/` and three `spine_pictures/` images were already viewed for
`ANIMATION-UI-4.3.26.md`. The Animate full view shows slot/image Tree nesting but
its expanded Dopesheet rows are bone transforms. These images do **not** show
slot-animation row labels, row colors, slot key buttons or an Animate color
dialog. Their version is not printed. Keep their compact panels and bottom
Graph/Dopesheet geometry; do not invent a generic replacement.

The retained static inventory
`.local/research/transform-match-static-ui/read-only-inventory.json` identifies
the exact installed4.3.26 package hash4adf8cff and reports a non-ZIP package with
no plain class magic. It does not expose animation UI resource names or prove
slot-key controls. No repeated package scan, decompilation or guessed field
reader was performed for this audit. DATA found no slot animation in353 retained
own runtime-JSON animation files, so Setup evidence cannot substitute for the new
slot-timeline schema.

## Official documentation fallback, version unpinned

The [Keys guide](https://esotericsoftware.com/spine-keys#Slot-attachment)
documents an attachment-visibility key button beside the **slot in Tree**, and
a color key button beside the **slot color swatch**. RGBA is keyed together by
default; optional separation exposes RGB and alpha independently. Auto Key and
manual keying remain distinct. Its attachment-visibility-dot wording differs
from the exact4.3.26 Setup paperclip captures: preserve the proven paperclip
distinction rather than replacing it with an assumed eye control.

The [Slots guide](https://esotericsoftware.com/spine-slots) distinguishes the
keyable active attachment and light color from temporary editor hiding. Hiding
a bone/slot via its visibility dot is not an animation key. Alpha zero also
does not clear the active pointer: fading and then deactivating are separate
operations. Attachment tint remains setup data; light-slot tint affects its
active attachment. Tint Black is a separate feature, not ordinary RGBA.

The [Slot Color view](https://esotericsoftware.com/spine-slot-color) edits selected
slots and, when an attachment is selected, its owning slot. Its compact color
chooser expands to expose RGB/alpha and related color controls. This supports a
small dock/inspector editor; it does not establish exact4.3.26 numeric units.

The [Dopesheet guide](https://esotericsoftware.com/spine-dopesheet) groups keyed
properties by their related bone, using distinct property markers. Attachment
keys have no interpolated connecting line. The [Graph guide](https://esotericsoftware.com/spine-graph)
describes four independent numeric curves/handles for combined RGBA. Neither
page proves exact4.3.26 slot row wording, marker hue or the Graph presentation of
discrete attachment names.

The actual linked official attachment/color/property-row PNGs were downloaded
and **viewed**, not used as product artwork, under ignored
`.local/research/animation-slot-ui-reference/`. The color example visibly places
a key icon directly beside its swatch and a Separate/Alpha row above it. These
are documentation images without patch provenance; the different Tree glyphs
must not override the controlled exact-version captures.

## New exact4.3.26 import/export observation

Root collected one new combined own reference, import55460 and export80452,
both retained-handle exit0 with exact4.3.26/Complete and no GUI input/render.
Input SHA`bb15ce6a767bedc50f973c6245541fea53b5afe4d1eb27026a33fd1d5d40a233`;
editor source SHA`9b7f4c7e4cab0972c4eb8e5248fa74a385c7a72664aab4dced63dd2adc8e9c23`.
Evidence: ignored `animation-timelines-reference-v1/collection.json` and
`original-export/skeleton.json`; recipe in `animation-slot-reference/`.

Independent UI-worker comparison of the actual primary JSON confirms:

| Owner | Setup active | Attachment keys in time order | Color keys |
| --- | --- | --- | --- |
| `switch` | A | A, B, none, A, B at0/.25/.5/.75/1seconds |5combined RGBA keys, linear/Bézier/stepped/Bézier/linear |
| `initial-none` | none | none, D, C at0/.5/1seconds |2combined RGBA keys |

All15 primary keys retain times and intended values. Export omits the `name`
field for none and time0 for the first key; it does not delete the key. All
seven exported color hex values match; each Bézier color segment retains16
control numbers, four per RGBA component. Maximum decimal control residual is
5.88236e-8. FPS24 and the two initial slot colors/active states remain as input.
This proves bounded import/export semantics, **not** interactive key creation,
editor playback, GPU blending or complete binary schema. DATA independently
audits class IDs/references/handle payloads before codec changes.

## Initial implementation contract and explicit policy boundaries

1. Keep the existing compact Tree hierarchy, paperclip selection/activation split
   and adjacent manual key icons. In Animate, active attachment and light color
   edits target the selected animation/current frame; they cannot author Setup.
   Selecting inactive inventory rows must remain read-only selection.
2. Resolve slot ownership from stable slot/attachment IDs, not image-library
   keys or bone names. Image assets are not animation keys. A keyed none value
   keeps every alternative, binding, UV, mesh/clip record and draw-order entry.
3. Slot selection or attachment selection must reveal the relevant owning-bone
   timeline group and the slot's own keyed properties. Give attachment and RGBA
   rows distinct identities and slot names. Exact4.3.26 nesting/order/labels and
   hues remain unknown; any provisional layout is an explicit FBones choice,
   retaining reference density and avoiding an invented extra panel/workflow.
4. Attachment is a discrete lane: attachment-name/None editor, temporal keys,
   move/delete/copy/paste; no numeric curve, Bézier handle or fake ordinal value.
   RGBA gets four real numeric component curves, preserving native stored
   values and controls. Graph visibility of the discrete lane itself is still
   unmeasured; use a labeled discrete presentation or Dopesheet-only policy.
5. Color editing addresses the slot even when its attachment is selected. Keep
   an alpha-aware/opaque swatch, adjacent manual key action and precise RGBA
   fields. Do not key the attachment's setup tint. Numeric units, marker colors
   and dialog placement require explicit policy until exact captures settle them.
   Separate RGB/alpha and Tint Black remain disabled until their typed families
   are supported; do not silently merge or discard them.
6. Auto Key off uses transient slot active/color drafts; manual keying commits
   the current draft. Scrub/clip changes discard unkeyed drafts. Preserve
   original Setup slots through history/save. This working-pose rule follows
   documented behavior and FBones' established bone workflow; exact4.3.26 slot
   Auto Key/undo behavior is not newly observed.
7. Every sampled active-pointer change must rebuild the active flattened
   Region/Mesh/Clipping projection used by picking, ImageLayer and clipping
   scopes. Changing only `activeAttachmentId` would display stale geometry.
   Color alpha0 preserves the pointer; active-none suppresses the attachment.
   Slot owner and draw order are independent and cannot change accidentally.
8. Use the native key/history/file path. Stable key identities must distinguish
   bone and slot tracks; a drag or mixed selection batch is one transaction.
   Invalid/stale/cross-slot references reject atomically. Existing key/frame
   collision and clipboard policies must remain explicit, not invented parity.
9. Before the first slot key, keeping Setup and holding the last key afterward
   is a proposed uniform FBones sampler policy, unless stronger direct evidence
   settles that branch. The collected time0 keys do not discriminate before-key
   behavior. No original clock/constraint/Physics conclusion follows.

## Minimum unanswered exact-original observations

The new schema fixture must not be re-imported just to repeat accepted data.
If root later needs an exact-interaction claim, use a fresh owned copy for one
small combined UI observation: select an inactive alternative without activating;
show manual slot attachment key action and active-none at another frame; show
slot-color swatch/key action with alpha0 while an attachment remains active;
capture expanded Dopesheet and Graph for those two tracks. A read-only capture
can settle row labels/hues and whether Graph includes the discrete lane. Auto
Key on/off can be checked only if that behavior affects a dependent decision.
Use current controls and stable saved data, not old pixel coordinates. Root alone
operates any such original session; no new collector is created by this audit.
When that check is unavailable, use the classified documentation/policies above
and keep the limitation explicit rather than blocking unrelated implementation.

Required local regressions: A→B→none→A image pixels and selection independence;
initial-none at/between keys; alpha0 versus pointer-none; RGBA linear/stepped/
independent handles; Setup/binding/draw-order preservation; Auto Key off/manual;
mixed key selection/history; invalid owner/ID; Save/Close/Open resources; both
primary and read-only Preview must reflect sampled slot state without stale
Region/Mesh geometry. Original UI-source comparison is separate from GPU proof.

## Initial implementation policy

The controlled timeline preserves bone API types and adds separate slot tracks.
Slot selection is primary even while the workspace retains a latent bone
selection. It shows the owning bone summary and two compact labeled slot rows;
attachment diamonds use the actual inventory name or None in the key inspector.
Attachment interpolation controls are unavailable and no numeric curve is
fabricated. RGBA plots four independently colored component curves and handles;
precise fields retain normalized native values. The compact Animate slot
inspector keeps structural Setup fields out of the animation path, uses an
adjacent manual color key and commits the completed opacity gesture once.
These presentation choices are explicit policies; exact slot row hues, numeric
units and Animate original gestures remain bounded by the evidence above.

## Stored-key precision and authoring identity

Paired DATA/UI review before the normalization fix: native slot key frames,
RGBA values and absolute Bézier controls are stored f32. Serde's shortest
roundtrip decimal identifies that f32 but JavaScript initially parses it as
f64; the UI must recover the stored value with `Math.fround` before sampling.
Do not round Setup byte/255 colors, the native sampled f64 slot pose or the
continuous playback frame. This is a transport representation correction, not
an interpolation or rendering tolerance change. A request frame and an existing
key identify the same editable key when their native f32 frames agree; use that
comparison when preserving an existing outgoing curve during manual/Auto Key,
including bone channels. Otherwise a fractional-frame re-key can replace its
curve despite addressing the same stored key. This preserves authoring
identity/resave behavior; no new exact original gesture parity is claimed.
