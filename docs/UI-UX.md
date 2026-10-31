# FBones control design and Physics UX

2026-10-30. Research/specification only; no product changes or new original
launches. User priority: intuitive live Physics, compact functional color and
slider controls instead of a wall of numeric text boxes. Preserve the current
Spine-like workspace and authored/persistence behavior.

## Evidence and limits

**Direct exact4.3.26 evidence reused:** private
`.local/research/feature-ui/physics-inspector-observed.png`,
`physics-default-inspector-observed.png` and `physics-default-observed.json` were
read/viewed. They show compact label/value/horizontal-slider rows, paired
Translate X/Y, colored property icons, a blue enabled Simulate button and
separate Reset/Reset All controls. Rotation/Shear are ordinary numeric sliders,
including zero; no separate angular-enable checkbox. Defaults include Inertia50,
Damping15, Mass100, Mix100 and FPS60. The nontrivial capture shows Rotation70
and Shear52.5. See [retained UI findings](research/FEATURE-UI-4.3.26.md) and
[Setup evidence limits](research/PHYSICS-LIVE-SETUP-UI-HANDOFF.md).

These captures establish visible layout/values, not unobserved drag ranges,
fine-step modifiers, factory defaults, reset lifecycle or solver trajectories.
The user's screenshots in `spine_pictures/` support the dense Tree/inspector
direction; their exact patch provenance is not promoted to new proof.

**Documented, patch-unpinned:** Spine describes numeric typing with Enter/Tab,
wheel/drag adjustment and Shift precision, plus Ctrl/Cmd selection. These are
documentation-backed candidates, not newly verified4.3.26 gestures.
[Spine numeric entry](https://en.esotericsoftware.com/spine-tools#Numeric-entry).

Spine documents Physics channel sliders and distinct Simulate/reset controls,
and warns when every affected channel is zero or an angular channel has no bone
length. Preserve these distinctions; Gravity is a force, not a second simulation
switch. [Spine Physics](https://en.esotericsoftware.com/spine-physics-constraints).
The separate guide titled “Sliders” describes animation-slider constraints,
not a generic numeric-widget specification; do not confuse these features.

**Platform guidance, not Spine parity:** Microsoft recommends sliders for
relative values/feedback, numeric inputs for precision, labels and keyboard
support. [Windows sliders](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/slider).
Apple likewise recommends a paired text field/stepper where precision matters,
consistent directions and live feedback.
[Apple sliders](https://developer.apple.com/design/human-interface-guidelines/sliders?changes=l_8_2).
Color should convey hierarchy/interactivity without being the sole signal;
retain visible focus and keyboard access.
[Windows color](https://learn.microsoft.com/en-us/windows/apps/design/signature-experiences/color),
[Windows accessibility](https://learn.microsoft.com/en-us/windows/apps/get-started/best-practices#accessibility).

## Concrete component changes

| Existing component | Change | Boundary |
| --- | --- | --- |
| `ConstraintInspector.vue` | Shared compact label + exact number + horizontal slider for Physics channels/properties and IK/Transform mixes; pair X/Y rows | Keep native values/conversions, sparse mapping rows and nullable angular defaults intact |
| `PhysicsPreviewControls.vue` | Clear selected Simulate button with text/icon and pressed state; compact Reset beside it; Step remains a paused operation | Live Setup stays default-on without Play; preserve explicit off and transient state |
| `AppButton.vue` | Consistent active/toggle and destructive visual states, plus icon+short label | Neutral command buttons stay neutral; never color every action the same |
| `WeightsPanel.vue` | Reuse the paired range/number pattern for consistency | Preserve mixed-selection empty state, locks and native normalization policies |
| `BoneTransformHUD.vue` | Maintain centered compact numeric fields; axis labels/icons make X/Y distinguishable | Translation/scale/shear are precise signed values, not arbitrary0–100 quantities |
| `styles.css` | Scope numeric-row styles, visible range thumb/focus, responsive narrow-panel stacking | Current `.inspector-form ... input:not([type='checkbox'])` styles also match range inputs; exclude ranges from text-field padding/min-height rules |

Introduce one small reusable range+number component rather than copy event
handlers into every inspector. Keep existing string-draft/native semantic
commands; no second value engine or universal forced rounding. A typical desktop
row is24–28 CSSpx high, with aligned short label, tabular numeric value and a
flexing track. At narrow dock widths, stack the track below rather than hiding
the number or shrinking the thumb into a difficult target. These dimensions
are proposed FBones policies, not measured Spine pixel parity.

| Field family | Appropriate control |
| --- | --- |
| Mix and normalized channel influence |0–100 display slider plus precise percentage entry; retain backend mapping |
| Physics Damping | Percentage-loss display plus slider; preserve existing `display=(1-retention)*100`, inverse on commit |
| Inertia/Mass | Preserve existing percentage display and exact authored scale; do not assume100 is a hard maximum |
| Strength/Limit/FPS | Units and precise number; optional bounded useful slider interval after DATA review; FPS must stay positive |
| Wind/Gravity | Signed numeric value plus centered bipolar slider with a visible zero mark; positive and negative values remain possible |
| Bone transform/Transform endpoints | Exact numeric input, optional measured scrub behavior; preserve negative scale, zero signs, subnormal values and nullable endpoints |

**A slider's convenient drag interval is not a new format limit.** If an existing
valid value exceeds that interval, show its actual numeric value and an explicit
edge/out-of-range indication, or expand the presentation range. Never clamp or
rewrite it merely on mount/focus/selection. Do not guess original Strength,
Mass, signed-force or FPS slider maxima from a thumb's position in a screenshot.
Treat angular UI percentages separately from normalized effective runtime
channels; reuse the current accepted angular encoding/conversion.

## Interaction and persistence contract

- Keep precise numeric entry available next to the slider. Tab follows visual
  order; Enter commits once, Escape restores the current field/gesture and
  consumes that key so selection is not also cleared. Arrow keys adjust the
  focused slider; coarse/fine steps are explicit per-field policies until measured.
- Keep temporary text such as an empty string or minus sign while editing.
  Invalid text shows a field-level error; native state remains unchanged. Never
  convert mixed/empty/automatic to numeric zero incidentally.
- A pointer gesture has an identity/revision, initial value, draft and final
  commit. Draft/readout follow pointer input. Release commits once; cancel restores
  the initial draft, and release outside the control still finalizes correctly.
  Group held-key adjustment until keyup/blur rather than losing focus after the
  first key. No duplicate change+blur+Enter commit.
- **No native history entry per input/pointer frame.** The current Weights range
  updates draft on input and commits on change/blur. That gives numeric feedback,
  not continuous scene feedback. The current constraint editor has no equivalent
  transient constraint-preview API: do not implement live feel by issuing an
  authored `editConstraint` for every input. First scoped delivery may update the
  scene on release; genuine live constraint feedback needs a shared native
  transient-preview/one-final-commit path, reusing existing Session safety.
- Preserve Save/Match pending-field flush and synchronous in-flight edit tracking
  in `createSceneFieldCommitter`. Save must await the final valid value; invalid
  drafts block it. Do not bypass native revision validation or introduce a
  separate JavaScript persistence path.
- Keep focused slider/number DOM nodes stable across selection/preview refreshes.
  Async `fieldset :disabled="w.busy"` may remove keyboard focus mid-adjustment;
  test that interaction rather than assuming native range defaults solve it.
  Never let viewport shortcuts consume keys while a numeric control owns focus.

## Functional color and understandable Physics

Reuse current gray shell/panel/raised surfaces and existing accent/deep-accent,
warning and danger tokens. Active Simulate/tools use a filled accent, outline,
icon/text and `aria-pressed`; idle controls have a neutral surface. Use warning
for an actual condition needing attention and danger for delete/errors. Reset
can have a small warm reset icon without becoming a permanent warning banner.
Keep authored bone/slot colors separate from these interface-state meanings.
Axis color always has X/Y text or a distinct axis icon as well.

Every range and number needs a unique accessible label, current value/unit,
disabled state and visible keyboard focus. Associate both with their property;
distinguish “Gravity slider” from “Gravity value” for assistive navigation. Test
grayscale/high-contrast rendering and enlarged UI text; compact must remain readable.

Explain effect blockers near Physics controls: all influence channels zero;
angular/scale/shear requested on a zero-length bone; Simulate explicitly off.
Use short actionable text, retaining current values. Do not silently activate
channels or change solver settings to make a demonstration move. A setup with
nonzero influence must react while its parent is dragged, without Play; keep
authored bones, dirty state and history unchanged during simulation.

## Focused acceptance

Use Ubuntu Playwright +real Rust Session first: slider mouse drag/release outside,
keyboard repeat/Tab/focus retention, exact numeric override, cancel, mixed/outside
range display, invalid text, Save during a pending gesture and one-step Undo/Redo.
Check existing conversion bits, earlier constraints and Save/Close/Open. A Physics
fixture should visibly react during a parent drag without Play, then distinguish
Simulate off from zero influence. Check narrow dock layout and keyboard-only use.
Native WebView checks remain targeted to affected integrations/delivery. No fresh
original batch is needed for the already-observed control layout; unmeasured
scrub/range behavior must remain labeled.

Suggested standing-rule addition for the coordinator: “Use `docs/UI-UX.md` for
new controls. Choose sliders for bounded relative adjustments, preserve an exact
numeric path, semantic color and keyboard focus, and keep one native authoring
transaction per completed gesture. Audit existing4.3.26 evidence first; record
unmeasured ranges/steps as FBones policies.” AGENTS is not edited by this worker.
