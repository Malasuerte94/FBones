# Scoped Auto: UI integration and acceptance handoff

## Current implementation checkpoint — 2026-10-29

The implementation described below is now integrated. Store state separates
Bind membership, current brush influence, Auto candidates, explicit selected
vertices and transient per-attachment locks. Scope summary/clear controls,
Direct Ctrl/Cmd and box selection, Ctrl+A/Escape/Space, group numeric mixed
display and one captured batch/drag are present. Selected vertices have rings
on the actual Mesh or Clipping target, including inactive attachments.

Manual locks were exposed only after the paired NEW five-case manual audit:
`WEIGHT-LOCKS-VERTEX-DATA-4.3.26.md`. Explicit numeric locked targets stay
editable, other locked weights retain bits, selected-only-locked Auto is no-op.
Locks survive Save/attachment switches and clear actual Close/Open. Normalize
and brush target override are explicit FBones policies; original brush controls
were inconclusive, not a parity result. Membership-change clearing is also own
session policy. Existing coordinate fields are retained by typed weight edits.

Final `pnpm test:ui` rebuilt current production frontend and native host:
**27/27 pass,42.266s**, zero retries/skips/failures; three new scope and eight new
lock cases plus16 prior workflows. Strict test TypeScript passes. Full JS suite
175pass/1known Physics skip, native138default/93legacy and strict Clippy both.
Immutable results/source hashes: `analysis/scoped-weights-ui-check.json`.

Acceptance still open: new UI-authored scoped original export and targeted
current Windows immutable delivery. General multi-selection gestures are
documented, not exact original4.3.26 gesture proof. New-row creation is our
separate explicit policy; exact original insertion remains unknown. F302 stays
ACTIVE. The remaining sections preserve the original pre-implementation handoff.

Recorded2026-10-29 after the accepted Ubuntu Playwright conversion. This is a
handoff, not a claim that the new controls are implemented. Native core/API and
the TS command type are integrated; the Weights panel still sends the old
whole-binding command. Keep F302 ACTIVE until actual UI and persistence checks.

## Evidence gate already satisfied for the five measured cases

Read `AUTO-SCOPE-DATA-4.3.26.md`, `AUTO-SCOPE-UI-4.3.26.md` and
`analysis/auto-scope-reference-check.json`. Single B replaces unlocked outside
weights, selected vertex isolates the row, combined vertex1+B assigns old-zero
B, locked A protects its mass, and selected+locked B is no-op. All binding
position bits survive. Original locks disappear on reopen. Do not repeat these
accepted original actions. Multi-B+C/Ctrl/marquee gestures and new weighted
vertex dormant-coordinate creation remain unproven; the current official
Weights guide is patch-unpinned evidence for general multi-selection gestures.

The optional native/TS shape is:

```ts
{type:'autoAttachmentWeights',id,scope?:{
  vertices?:number[],bones?:number[],lockedBones?:number[]
}}
```

Bone values are stable session IDs. Omitted vertex/bone lists mean all;
explicit empty lists and duplicates/out-of-range/unbound refs reject. Locks
may be empty. No eligible unlocked candidate is true no-op after validation.
Scope is ephemeral command input, not a new canonical file field.

## Current frontend surface

- `workspace.ts`: singular `selectedVertex`, current brush `influence`, selected
  real binding/attachment and independent image/bone selections already exist.
  There is no selected influence subset, vertex multi-selection or lock state.
- `WeightsPanel.vue`: `chosen` checkboxes are pending Bind membership, and row
  name clicks currently choose a brush influence. Do not reuse Bind checkboxes
  as Auto selection or treat the default first brush bone as selected Auto scope.
- `createViewport.ts`: Direct currently selects one nearest vertex and vertical
  drag edits it; brushes affect every covered vertex. It has no weight marquee
  or multi-selected vertex overlay. `ImageLayer` receives only one selected row.
- `useWeightFieldEditor.ts`: stable draft identity is doc/attachment/vertex/bone;
  preserves precision, dedups Enter/change/blur and starts edit synchronously so
  Save waits. Preserve those invariants when adding multi-row input.

## Integration requirements and unresolved decisions

Keep separate state for bound membership, selected Auto influence subset,
selected vertices, active brush influence and transient per-attachment locks.
Scope must survive unrelated hover/paint repaint without changing project,
revision/history or active attachment. Clear on document replacement; prune
removed members and invalid vertex indices. Topology changes/history need an
explicit index-selection policy rather than applying old indices to new rows.

Use real list selection and viewport gestures with visible selected rows and a
scope summary. An empty UI selection maps to omitted native scope. Snapshot the
scope and revision before asynchronous pose preparation; never read a later
selection into an old command. Keep inactive clip/mesh editing separate from
slot activation and preserve one undo entry per completed action.

The official guide documents Direct Ctrl-click/box, Ctrl+A and Escape/empty-space
deselect, influence-list selection, and brushes limited to selected vertices.
These are documented rather than exact-patch gesture proofs. Implement/test
consistent selection behavior; do not draw a multi-selection whose manual
controls silently modify only a different single row without stating a scope.

Original Lock applies to weight adjustments as well as Auto. Native scoped
Auto alone does not yet provide manual/brush/Normalize lock protection. Before
exposing a general padlock, research/implement those paths or keep that missing
UI scope explicit; never display a lock that other ordinary weight tools ignore.
Do not add guessed wire tags for a lock. Any lock/selection history policy beyond
the measured reopen behavior needs its own evidence or explicit own assumption.

## Verification next

Rebuild with `pnpm test:ui` after core/API/frontend changes. The accepted16-test
snapshot predates scoped implementation; `--no-build` must not test a stale host.
Add new Playwright interaction cases for selected row/candidate/combined/lock/
no-op/cancel/history/save, observing actual real-Rust commands/results. Preserve
the accepted CSP/precision/hover/frozen-pose/active-vs-inactive tests. Use a small
new original comparison for newly UI-authored scoped output; do not repeat the
five original discovery actions or older foundation batches. Native Windows
delivery checks remain targeted platform evidence, not routine iteration.
