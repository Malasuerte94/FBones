# F308 manual Transform range cells: bounded UI plan

2026-10-29. **Plan only, before any new original collection.** This UI worker
ran no original command, Windows input, application launch or test runner and
changed no production files. The coordinator alone may collect after the paired
DATA fixture/predictions and fresh ownership gates are frozen. User92096 and
all previous protected windows are excluded; completed QA2224 is not reusable.

## Existing exact evidence and remaining question

Reinspected own original4.3.26 captures before consulting documentation:
`match-properties-mixed-before.png` from the original eight-action batch and
`properties-inspector.png` / `properties-after-match.png` from the two new
Local-source/World-target actions. The accepted reports are
[the old eight](../../analysis/transform-match-reference-check.json) and
[the new two](../../analysis/transform-match-local-world-check.json).
None of those actions is repeated by this plan.

**Proven appearance:** the Properties foldout has six rows in Rotate, X, Y,
ScaleX, ScaleY, ShearY order. Each row has source Start/End at the left,
colored mapping endpoints/lines in the center, and destination Start/End at
the right. These numeric cells are separate from the global Offset sliders
and mix controls. Sparse mappings show Min/Max placeholders on unmapped sides.
Mapped cells can show numeric values while their saved nullable cells are all
absent. Source X can fan out to Rotate and Y simultaneously. Both Match buttons
exist separately and are **not used** in this new experiment.

**Unknown:** committing a manual range edit, materialization scope, untouched
cache preservation, source-end/runtime-scale coupling, reversed/zero spans,
empty Enter, Escape and original Undo behavior. Ten successful Match actions
do not prove those manual field handlers. Current FBones exposes runtime From
offset and To offset/max/scale plus a separate read-only24-cell Saved ranges
grid. That safe grid must remain read-only until the new edit/transport policy
is settled; ordinary mapping edits still preserve the nullable values.

Primary fallback, checked after local captures: the current
[Transform guide](https://en.esotericsoftware.com/spine-transform-constraints)
does not describe this observed four-column4.3 editor's manual cell rules.
The [4.3 release article](https://esotericsoftware.com/blog/Spine-4.3-released)
documents cross-property mapping and numeric expressions, not null/clear or
degenerate-range commits. Neither identifies exact4.3.26 handlers. The
separate Sliders-constraint guide is **not** evidence for Transform cell edits.
No older editor is used to infer behavior.

## New fixture and four discriminators

The DATA worker owns a new canonical fixture and independent f32 predictions;
no original import is required from this UI worker. Use one Transform
constraint, Local/Local, Additive=false, Clamp=false, all six mixes0, ordered
distinct targets, nonzero old global offsets and all24 stored cells absent.
Use these exact-integer sparse routes:

- Source X offset2 → Rotate20..28 scale2 and Y35..47 scale3. Both imply source2..6.
- Source ScaleY offset.5 → ScaleX1..3 scale2 and Rotate20..28 scale8, both
  implying source.5..1.5. Rotate is shared by two incoming source rows.

First save one new original-canonical baseline and have DATA compare it before
forking. Opening/foldouts alone must not alter authored bones, mappings, offsets
or cells. The baseline display must confirm the expected derived source ranges;
if it differs, stop and classify the discrepancy before typing.

| Case | Own before source | Single intended edit and commit | Discriminator, not an observed result |
| --- | --- | --- | --- |
| Source End | Fresh canonical baseline | Source X End6→10, Enter | If destination endpoints remain fixed, new shared source span8 implies Rotate scale1 and Y scale1.5. Compare competing scope/cell-materialization outcomes. |
| Destination Start | Fresh canonical baseline | Rotate destination Start20→32, Enter, with End28 held | Reversed destination span. If both source spans are held, incoming X→Rotate scale−1 and ScaleY→Rotate scale−4, while X→Y3 and ScaleY→ScaleX2 stay unchanged. Compare whether derived source Ends or other routes change instead. |
| Equal endpoints | Fresh canonical baseline | Source X End6→2, Enter, with Start2 held | Zero source width: accepted finite fallback, field rejection/restore, adjustment, error or unsaved state are distinct unknown outcomes. Do not impose division-by-zero behavior. |
| Clear explicit End | Fresh copy of accepted Source End AFTER | Select that now-explicit Source X End10, remove text, Enter | Only run if DATA confirms that exact edited cell became present. Distinguish absent storage, explicit0, preserved10/rejected empty or another fallback. |

The clear case has a **dependent** before source: it is not a fourth fork of
the original baseline and does not rerun Source End or Match. If the first edit
does not persist that cell, defer clear instead of manufacturing an explicit
cell or silently adding more edits. These four cases do not cover all finite
Start/End directions, arbitrary fan-in, mapping deletion or general24-cell UI
parity. The coherent extra Rotate incoming route is deliberately part of the
new baseline so the same destination edit can discriminate per-channel coupling
without adding another original action. Original baseline save must first prove
that both incoming routes survive unchanged.

## Fresh process, controls and typed input method

Prepare a new ignored `transform-manual-ranges-ui/` ledger/helper directory.
Reuse the **design** of the latest Local/World launch/common/capture/snapshot/
normal-close modules; leave their accepted artifacts/helpers unchanged.
Never reuse their process IDs, handles, captions, branch names or coordinates.
One fresh owned original process per edit fork is preferred. The new gate must
bind fixture/prediction/package/launcher hashes and a unique own working copy.
Refuse forwarding into an existing original GUI. Verify fresh PID/start/image
hash, HWND owner, clean expected caption, no modal and captured rectangle before
every input. Explicit Owned/no-handover checks and current protected ledgers are
required, including92096; a hardcoded historical PID list alone is insufficient.

Root selects the Transform constraint in Tree, opens Properties and captures
the full selected source/targets, flags, mixes and six-row table. Identify the
intended text-cell interior from this **fresh** capture. Do not hit the colored
connector dot/line or use old absolute positions. Compact target cells can clip
text; widen only the own inspector/window deliberately, then recapture and
re-identify every target. Never scale coordinates from an old layout.

Reusable input mechanism exists in private `auto-scope-ui/owned-numeric.ps1`:
targeted own-child synthetic double-click selects a numeric field, WM_CHAR
enters replacement text, and scan-coded WM_KEYDOWN/UP commits Enter. That method
was validated for Weights numeric fields; **range-widget compatibility is not
yet proven**. Copy only its mechanism into new guarded code, not its old ledger
or broad input/focus helpers. Do not invoke old input.ps1 Activate/end behavior.

For each finite edit, double-click only the verified text interior, type the
frozen decimal, then capture **before Enter**. Require visible exact replacement
text: an appended value such as610 is an input failure, not a range outcome.
Record whether the title becomes dirty before Enter; live intermediate updates
are unknown and must not be mislabeled as Enter-only transactions. Then issue
one targeted Enter and recapture. Posted messages alone prove nothing.

Clear is a separately gated new method: after selecting the existing numeric
text, send one targeted WM_CHAR backspace (character8), then capture and require
an actually empty field **before** Enter. If that does not clear the field,
stop this case as an input limitation rather than trying global Ctrl+A/Delete,
focus takeover or alternative key loops. Empty draft is not assumed equivalent
to null storage. The numeric helper must permit an empty clear action explicitly
instead of accepting it through the finite-text path.

No global mouse/keyboard input, Alt/AttachThreadInput/SetForegroundWindow,
foreign-window restoration or user window input. Minimized/occluded/modal/rect
failures stop collection under their actual guard. Any separately approved
own-window reversible visibility recovery must have a new receipt and fresh
capture; it is not permission to reactivate a protected window.

## Save, independent comparison and stop rules

After the intended commit, capture field values/selection/title and any error.
Use only the own normal Save icon; keep its fresh capture/target receipt. Wait
for a clean title and stable size/hash before immutable before/after copies.
DATA independently compares every nullable cell and runtime route, including
unrelated routes, all bones/world matrices, old offsets, mixes, flags, ordered
targets and topology. Preserve f32 bits, null versus±0 and reversed endpoints;
do not regenerate the cache from runtime JSON or round screenshot text into
expected bits. Runtime JSON, if later needed, cannot prove editor cache values.

The equal/empty cases may validly produce rejection/no change. Capture visible
readback and unchanged saved bits before calling that an observed no-op. A
dirty title or failed save alone is not successful persistence. If the editor
shows a modal, nonfinite display, unexpected ownership/source or an unresponsive
process, preserve evidence and stop; do not guess confirmations or repair data.
Close only a freshly verified clean own branch normally. No force termination.

For each case, report synthetic targeted input separately from real OS pointer
fidelity, widget readback separately from persisted bits, and actual findings
separately from the frozen hypotheses. Record all attempted/blocked actions;
no extra retries, Match actions or undocumented parameter search are automatic.
This plan does not authorize collection by itself, offer a production field
editor or mark manual Transform ranges complete.

Before collection, root fixes the clear mechanism to one scan-coded Backspace keydown/up (MRKey8), never WM_CHAR8 or a fallback combination. Enter requires independently visible EMPTY draft for clear, or exact intended finite text, bound to a fresh capture and the single numeric attempt; one Enter commit attempt per branch. If empty text is not established, stop that clear branch.
