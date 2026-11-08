# Shared numeric focus DATA gate — 2026-11-08

Before dependent correction. Reuse the shared Setup/Animate HUD and focused
precision contracts in `ANIMATION-UI-4.3.26.md` and the unchanged transient/key
policy in `ANIMATION-KEY-DRAFT-DATA-2026-11-06.md`. Exact original4.3.26 focused
text selection gestures remain unknown. No original process was used.

Direct FBones browser trace proves the defect precedes model commit or resource
refresh. After `animate-bone-x.fill('11')`, the actual DOM input contains
`-24.66666666666666811`, not11. The focused field expands its compact value to
the precise value in a deferred Vue render, resetting a text selection made
between focus and that render. Replacement text appends to the restored value.
Converting that string to Number recovers the same old sampled value, so Enter
correctly makes no authoring action. The later resource-retention symptom is
therefore an input focus defect; the actual committer/workspace/resource path
independently retains an explicitly staged11.

Own source evidence: `AnimationTools.vue` input `:value`, inline `@focus` and
`compact`; native resource-preview trace action `eubz@428` after-fill, then
`eubz@430` Enter. Targeted records and source trace SHA are retained in ignored
`.local/animation-numeric-focus-trace.json`. This is product evidence, not an
original-editor compatibility or numeric-fidelity claim.

FBones correction: expand the focused input's DOM value synchronously inside
its focus event, before a subsequent text selection. The queued Vue render must
see that same value and leave the selection/caret intact. Keep precise focused
values, compact blur display, Enter/change dedup, Escape, shared Setup/Animate
layout, sampling, keys and persistence unchanged. The UI reference agent reviews
this focus correction separately. Required regression uses real DOM focus,
replacement fill and Enter on a fractional sampled value, then verifies the
working pose and unchanged authored native state with Auto Key off.

UI independently reviewed and concurred before code; see the numeric-focus
section of `ANIMATION-DRAG-PLAYBACK-UI-GATE-2026-11-08.md`. The correction now
changes only `AnimationTools.vue`'s focus handler: pause as before, assign the
precise DOM value synchronously only when different, then set focusedField.
No input/change events, select-all, new rounding or authoring are introduced.
`shared-transform-tools.native.spec.ts` adds the narrow fractional-value
replacement/Enter/exact-focus/compact-blur/Escape regression. The resource case
also asserts the working X before any Sequence edit or resource request.
Coordinator owns rebuilding, browser execution and the final result/checkpoint;
no browser pass is claimed here before that run.

## Failed synchronous mitigation and corrected boundary

The coordinator's rebuilt current-source browser run still produces the same
old-value-plus11 input. The synchronous mitigation above is insufficient and
must not be described as a successful fix. Targeted inspection of the installed
Playwright1.64.1 injected `selectText` implementation proves it calls
`input.select()` **before** `input.focus()`. A focus-time DOM value write thus
invalidates a selection that already exists, regardless of Vue scheduling.
This also bounds the earlier assumption that all selections follow focus.

Corrected FBones policy: keep the actual number input's value precise throughout
focus and blur; neither event may rewrite it. Render compact unfocused text as
a separate noninteractive, aria-hidden presentation over that input, removing
the presentation with CSS focus state. Preserve the existing cell dimensions,
semantic input/type/labels, disabled feedback and shared controls. This changes
only presentation, never authored values or the selection policy. The targeted
browser regression must assert exact DOM values and compact visible text as
distinct requirements, then exercise unfocused fill/Enter/Escape as before.
UI reference concurrence is required for that revised presentation before code.

The UI reference agent independently concurred before the revised code. Current
`AnimationTools.vue` now keeps the exact draft in every input and only pauses on
focus. A noninteractive `animation-transform-compact` span supplies unfocused
presentation; CSS `:focus-within` controls its visibility. Existing60/42px flex
cell dimensions, labels/test IDs, numeric type, disabled opacity and key handlers
are retained. No focus/blur value assignment remains. The compiled shared-HUD
suite passes7/7; rebuilt real browser verification remains coordinator-owned.
The failed4392425 mitigation evidence is retained separately in ignored
`.local/animation-numeric-focus-trace-v2.json`, without overwriting the first
finding's receipt.
