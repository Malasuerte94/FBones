# Animate reliability and developer runtime — integration

The user's X/Y release jump is fixed. Playback has three measured improvements,
and the first independent MIT developer runtime is packaged locally. Full
animation/runtime/Spine compatibility and public publication remain separate.

## Reference gates and implemented corrections

Paired [DATA](ANIMATION-DRAG-RELEASE-DATA-2026-11-08.md) and
[UI](ANIMATION-DRAG-PLAYBACK-UI-GATE-2026-11-08.md) audits reused accepted exact
4.3.26 evidence and local `animare/` screenshots before coding. New original
gestures were unnecessary; none were claimed or collected. The numerical-field
follow-up has its own [DATA gate](ANIMATION-NUMERIC-FOCUS-DATA-2026-11-08.md).

Direct product reproduction showed one extra26-unit transform at release.
Viewport previews already contained the gesture delta, while key conversion
applied it again. Frozen gestures now convert from retained native local bones
and world matrices. Positive/negative translation, group transforms, rotation,
scale/shear, Auto Key on/off, cancellation and stale epochs remain covered.
Setup data and unrelated keys are preserved; a completed gesture is one action.

Browser observation also exposed compact-to-precise numeric focus rewriting
that destroyed an existing text selection. An initial synchronous focus-write
attempt was independently disproved and retained as negative evidence. The final
input holds its exact value continuously; a noninteractive, accessibility-hidden
overlay provides the compact unfocused display. Focus never rewrites the value.
Replacement/Enter/Escape and working-pose retention after Sequence/resource
changes now pass real browser interactions.

## Measured playback changes

- Physics/IK/Transform recompute only affected descendants. The mascot evaluator
  median CPU mean changes1.0101→0.2526ms (4.00×).756complete frames/Physics states
  and48draft samples match exactly; broader retained solver comparisons remain.
- Static timeline metadata, stable props and row/Graph memoization avoid rebuilding
  unchanged keys. All-bone mascot custom-renderer CPU changes13.579→1.002ms
  (13.55×); this is a component CPU benchmark, not browser/Windows FPS.
- `setScene` performs one coherent draw instead of drawing once during no-op
  gesture cancellation and again for the new pose: two→one submissions per pose.

See [the aggregate performance report](../../analysis/animation-playback-performance-check.json).
No Physics equations, scheduling, native fidelity policy, project encoding or
full-scene-per-frame IPC were introduced. Whole-app mascot FPS remains a user
hardware observation, not an inference from these microbenchmarks.

## Developer runtime

[Package usage and limitations](../../packages/runtime/README.md) and the paired
[runtime gates](RUNTIME-DATA-UI-GATE-2026-11-08.md) describe `@fbones/runtime`
`0.1.0-beta.1`: a platform-free Node/browser entry and optional PixiJS8 entry.
It bundles our own animation/geometry/solver code, with no Spine runtime code,
assets or dependency. It supports the declared bounded FBones profile, including
weighted meshes/clipping/deform/Sequence/events and current constraints. Mixing,
direct binary-project loading and full Spine numerical parity are not claimed.

File → Export runtime creates a new unique `FBones-runtime-*` folder under the
native selected destination, containing `skeleton.fbones.runtime.json` and only
referenced PNG/WAV resources. Missing resources, inspection-only sources and
stale revisions fail. Export never marks saved, authors keys, copies source
metadata/native roots or changes binary `.fbones` persistence. Partial own
bundles are cleaned automatically on failure.

The local40,353-byte/31-file archive is
`WINDOWS_TEST/RUNTIME/fbones-runtime-0.1.0-beta.1.tgz`, SHA256
`3239fd388e5929766571d6fb6d6d066657e9e89fa8143e5857c664c4b30d1a61`.
Offline installation, Node playback and strict NodeNext TypeScript work with
only this package installed and no Pixi/editor dependency. GitHub source/releases
plus public npm is the proposed distribution; nothing was pushed or published.

## Verification and evidence limits

Final source: [single integration checkpoint](../../analysis/animation-reliability-check.json).
Commands pass: `pnpm test`416pass/one existing skip; `pnpm test:ui --no-build
--workers=2 --global-timeout=600000`114/114, zero failures/skips/retries, exact
production CSP and isolated real Rust Sessions; `pnpm test:runtime`16package
tests plus24native-export samples across three generated fixtures (maximum
matrix residual6.36e-7). One included browser case verifies shipped Pixi WebGL
pixels for Region/weighted Mesh/Clip/Sequence/two-color/topology swaps and texture
ownership. Product/UI TypeScript, web build, rustfmt and strict e2e-host Clippy
pass. Rust326desktop/two existing ignored,95legacy/one ignored,16default-format
and103Scene-format tests pass. Both delivery and both bootstrap tests pass.

The expanded browser suite exposed previously unrun fixture assumptions. Fixes
retain exact assertions: explicit vertex value rather than ambiguous label;
sample solid art clear of transform overlays; use Save As for an already saved
source; choose a fresh portable folder rather than collide with different host
PNGs; preserve source negative zero and compare session key IDs semantically.
The drag regression separately checks the exact stored f32 endpoint and nearby
presentation time (the retained0.000050545residual is independently reproduced).
No collision, codec, time-curve or CSP guard was weakened. Useful failures and
diagnostic traces remain under ignored research evidence.

Own Windows WebView2 QA on immutable`6ea2ad16…26d9e` passes two signed XY parent
drags, preview/release equivalence, one Undo/Redo each, playback without authoring,
native Open/SaveAs and native runtime folder export. Exact typed-f32 comparison
handles the observed direct-serializer81.6 versus exported81.5999984741211
spellings; integer payloads/references remain exact. The owned QA was saved and
closed normally without force killing or touching user windows.

Final selected Windows`80c71cc0…a1645` adds only the final numeric presentation
correction to that QA image; its full114-case browser results are current. Its
normal visible0.9.4frontend was actually opened and handed to the user. This
proves final Windows startup, not a second native gesture run of the HUD change.
Stable bootstrap/shortcuts remain byte-identical. No original editor was operated.

Cleanup and final disk measurements are in the single checkpoint/STATE. Retain
the runtime archive/current dist, current delivery, cited raw evidence and coherent
offline build caches; obsolete own QA copies/profiles and temporary sessions were
removed only after ownership/liveness verification.
