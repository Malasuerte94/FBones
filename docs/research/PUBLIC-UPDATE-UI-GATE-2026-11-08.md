# Public update UI/distribution gate — 2026-11-08

Reviewed before changing public-facing documentation. Sources: current
`README.md`, `CONTRIBUTING.md`, `docs/releases/v0.9.4-beta.2.md`,
`scripts/check-public-readme.py`, `.github/workflows/desktop.yml`,
`packages/runtime/README.md` and `docs/STATE.md`.

Directly source-proven: pushes to `main` start the build/check matrix, while
release publication is currently restricted to the exact beta.2 tag. The public
release attaches source/checksums/build reports, not desktop installers. No
installed-application updater is configured or proven by this workflow. A source
push does not automatically replace a user's already installed/running editor.

The current README still names beta.2, says game-runtime export is unavailable,
describes only four bone channels and reports an older 95-case checkpoint. The
new current checkpoint proves a bounded independent Node/browser/Pixi runtime,
native separate game export and 114 final browser cases. Public copy must state
the bounded preview and its limits, not full Spine/runtime compatibility or npm
availability. `.fbones` authoring files remain binary.

FBones publication policy: beta.3 documentation will describe source and runtime
archive downloads only after the gated tag release succeeds. Platform packaging
and structural reports remain distinct from native install/GUI/notarization
acceptance. The runtime tarball can be installed as a file; npm scope ownership
and registry publication remain separate. No desktop auto-update claim is made.

The three existing README screenshots and their provenance stay unchanged.
They are actual own FBones examples, not evidence of new native platform or
original-editor behavior. Documentation-only edits need local navigation,
content and screenshot-integrity checks; no original launch or fresh app build.

## Windows helper import follow-up and beta.4 candidate

The coordinator observed beta.3 Windows CI stop in
`tests/support/scene-slots-fixture.mjs`: `compile()` passes the absolute output
pathname directly to dynamic `import()`. The inspected helper compiles the actual
SceneTree/SlotHierarchy/AnimationTimeline components with the production Pinia
workspace; its filename is an owned `.local` test artifact. On Windows a drive
prefix is interpreted as a URL scheme rather than a file-module URL.

UI review before the DATA-owned correction: importing
`pathToFileURL(outfile).href` preserves the same compiled component module,
fixtures, assertions, workspace and cleanup path. This adapts only the test
module's filesystem address to Node's URL-based import API. It does not change
editor appearance, pointer/keyboard behavior, source persistence, a test
tolerance or the production renderer. Existing test helpers already use this
portable pattern; no original editor observation is needed.

Keep the failed beta.3 tag/evidence intact and prepare beta.4 as a new candidate.
Public documentation must not imply beta.3 assets were published or that beta.4
is available before the unchanged release gates pass. README screenshots remain
unchanged; documentation edits require link/content checks only.

## Hosted Sequence interaction finding

The retained main-job Sequence trace shows Enter submitting Setup index2 at
revision2, then the backend reporting revision3/index2. Clicking Undo submits
the same Setup index2 at revision3; no native Undo request follows. The repeated
request is a native no-op, but its busy/disabled transition consumes the intended
button click. This is direct browser/transport evidence, not a failed native
Undo or a timing tolerance.

DATA independently identified the equality defect in `SequenceInspector`:
`settings` constructs the four fields in start/count/digits/setupIndex order,
while native JSON presents count/digits/setupIndex/start. `JSON.stringify`
therefore reports different strings for identical settings. Comparing those
four numeric fields with explicit null handling corrects only semantic no-op
detection. The Sequence fields, enabled state, Enter/change handling, validation,
revision rejection, layout and one-action history policy remain unchanged.

UI concurrence before DATA implementation: an unchanged Setup value must not
start a native edit or disable another control when focus leaves the field.
Cover the actual compiled inspector with native-ordered settings and assert no
extra request plus unchanged Undo/Animate interactions. Keep exact existing
conditions; do not add retries, sleeps or relaxed assertions. Exact original
Spine gestures are not claimed by this FBones reliability correction.

Raw action evidence is retained privately under the beta.3 Sequence failure
artifacts; this public note contains only the aggregate observation. Source
commands: inspect `SequenceInspector.vue` and the retained trace's Enter/Undo
actions and JSONL command arguments.

## Hosted Sequence key-editor follow-up

The beta.4 main trace proves that Setup Undo/Redo now issue their intended native
commands. The same scenario subsequently reaches the Graph's Sequence key editor.
Enter changes key12/index2 to index1 at revision8. The next Undo click issues
the identical key12/index1/delay0.25 edit at revision9, with no native Undo
request afterward. Thus the Setup correction worked, and a distinct unchanged
key submission still consumes a later history click.

Reviewed `SequenceKeyEditor::commit`, Timeline's Sequence commit forwarding and
`useSequenceAnimationWorkspace::updateSequenceAnimationKey`: neither the shared
editor nor the selected-key update path currently excludes an unchanged pose.
UI concurrence before the DATA-owned correction: compare the three authored
working-pose values before repeating an accepted edit. Mode/index compare as
integers; delay compares as f32 because native exact decimal presentation and a
typed shorter decimal can represent the same authored scalar. Keep validation,
context/key identity, actual changed edits, disabled state and Enter/change
interaction unchanged. No generic store/history rewrite is indicated.

The field must not disable a clicked Undo or mode action just because an
unchanged blur fires. Cover native-presented delay precision and the actual
compiled control/update route, while retaining the exact Graph edit/Undo/Redo
assertions. Do not hide the event ordering by retries, sleeps or looser tests.
The raw trace is private; this note claims only the observed command sequence
and source-inspected missing no-op check, not an original Spine gesture.
