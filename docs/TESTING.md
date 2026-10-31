# UI regression tests

Routine UI checks run on Ubuntu with Playwright. The old hand-written Chrome
CDP smoke runner is replaced by `pnpm test:ui`. Original Spine research and
targeted native-platform acceptance remain separate evidence categories.

## Commands

```sh
pnpm test:ui
pnpm test:ui --no-build
pnpm test:ui --no-build --grep 'weighted clipping'
pnpm test:ui --browser-only
pnpm test:ui:report
```

The first command builds the production frontend and `fbones-e2e-host` once,
then runs the suite. `--no-build` reuses those outputs: rebuild after changing
product Rust or frontend source. Tests themselves need no frontend rebuild.
`--browser-only` deliberately skips tests tagged `@native` and the Rust build;
it does not claim to check project persistence.

Playwright is pinned in `pnpm-lock.yaml`. The current workspace already has
system Chrome; `CHROME_BINARY` chooses another executable. No global browser,
agent or Windows configuration changes are required. The suite uses headless
Chromium with explicit SwiftShader software WebGL, two isolated workers,
automatic locator waits and zero retries. This software GPU configuration
proves rendering correctness within its tests, not hardware performance.

## Real Rust authoring without a desktop window

`scripts/serve-e2e.mjs` serves the actual `dist/` frontend on loopback and sends
the unchanged `src-tauri/tauri.conf.json` CSP. The page receives no new eval or
network permission. Native-test fixtures install a test transport before page
startup; Playwright's Node binding forwards commands to a dedicated JSONL host.

The host is the opt-in `e2e-host` feature of `fbones-desktop`. Normal editor
builds contain neither its module nor its executable. It calls the same native
Session methods for revision checks, bone/attachment edits, evaluated poses,
image resources, trace, history, canonical encoding and real file writes.
No JavaScript project model or alternate solver implements these commands.

Every test session owns a fresh Rust process and sandbox under
`.local/playwright/workspaces/`. Generated PNGs are original test assets.
Dialog fixtures queue relative choices or explicit cancellation; the actual
save/open/image operations then run in Rust. Native window events/title and
dialog presentation are adapted, so this does not prove OS dialog behavior.
Transport tokens keep parallel tests independent. Closing a session closes
only its owned host; existing editor windows and user projects are untouched.

## Evidence scope

- Browser preview tests check real DOM, keyboard/mouse, WebGL and production
  CSP, while preview drafts deliberately have no native persistence.
- Read-only scene fixtures inject their own input into Pinia to inspect real
  controls/rendering. They do not pretend to be loaded by the native codec.
- `@native` tests drive the rendered UI and observe the real Rust Session and
  actual `.fbones` Save/Close/Open. Direct native commands may arrange fixtures;
  operations claimed as UI interactions use Playwright locators or mouse/keys.
- Rust unit/comparison tests continue to check the full numeric/format corpus.
- Native Linux GTK, Windows WebView2, system dialogs, real OS drag/drop and
  macOS require their own targeted integration checks. A browser mouse drop
  is not proof of Windows native mouse drag/drop.
- Proprietary Spine behavior still comes from controlled original4.3.26
  observation, then primary documentation, then an explicit assumption.

The shipped Windows build remains the previously verified immutable image
until a product change is built, tested on that platform and published.

The16 Linux cases establish the new primary regression harness; they do not
correspond one-to-one to the broader historical16 Windows groups plus7 weighted
groups. Additional tool/gesture/pixel cases should be ported when touching those
features, while preserving the accepted original/platform evidence. Consult
`research/LINUX-E2E-COVERAGE-HANDOFF.md` for the current coverage audit.

## Failure reports and focused iteration

The suite writes `.local/playwright/results.json`, an HTML report, per-failure
screenshots and traces. Use the report's trace viewer to inspect the DOM,
screenshots and actions. These ignored artifacts contain only owned test data.

The server refuses to reuse an occupied port, so one coordinator owns suite
runs. Parallel agents may edit distinct specs; they must not launch competing
runners against the same server/report directory. `FBONES_E2E_PORT` selects a
different loopback port when needed.

An initial Chrome147 diagnostic established that adding
`--disable-crashpad-for-testing` alone caused HTTP navigation `ERR_ABORTED`,
while the same browser/server without it succeeded. That argument is omitted;
no app CSP or assertion tolerance was weakened to make navigation pass.
