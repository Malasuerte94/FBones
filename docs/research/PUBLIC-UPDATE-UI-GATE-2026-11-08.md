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
