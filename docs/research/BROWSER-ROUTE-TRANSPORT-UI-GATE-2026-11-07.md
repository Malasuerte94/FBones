# Socket-free browser test transport — pre-code UI gate

2026-11-07. Latest user/root resume supersedes the historical PAUSED checkpoint.
Read current STATE/TASKS, TESTING, accepted animation/slot/deform/Sequence/split
UI gates, supplied `animare/` layout findings, production startup/renderer code,
Playwright config/fixtures, static server and native host/response adapter.
Read the paired [no-listen DATA gate](PLAYWRIGHT-NO-LISTEN-DATA-GATE-2026-11-07.md)
before infrastructure implementation.
This is test-infrastructure review only: no product edit, shared test/server,
browser/original launch or new platform observation occurred.

## Decision and appearance/interaction scope

The proposed new route may serve the existing production `dist/` bytes through
Playwright context routing at one virtual HTTPS origin, while Node forwards the
existing native-test RPC envelope to the real feature-gated Rust Session host.
This avoids a listening socket; it does not by itself fix or prove browser
process launch. The feasibility agent must demonstrate that separately before
the coordinator runs the shared UI suite. Historical listen/browser EPERM
failures remain valid evidence and must not be relabeled as passes.

No panel, shared Setup/Animate HUD, Dopesheet/Graph row, ruler, key, pointer target,
inspector, renderer or application command needs to change. The same Vue/Pixi
production modules must run in real Chromium with existing locators, mouse,
keyboard, focus, pointer capture, resize and clocks. Browser screenshots/pixels
remain actual browser output. A route-fulfilled response is a transport adapter,
not a synthetic DOM/SFC host, JavaScript authoring model or alternate sampler.
Retained `animare/` layout/reference boundaries stay unchanged; this does not
establish new original4.3.26 gestures or exact-editor pixel parity.

## Startup, origin and CSP invariants

`vite.config.ts` builds ES2022 production assets with base`./`. Navigate with
`page.goto('/')` against a stable virtual HTTPS base URL, and fulfill the real
`dist/index.html` plus its relative assets. Do not substitute `setContent`,
`file:`, a dev server, rewritten inline scripts or a mocked application bundle.
Use the exact `src-tauri/tauri.conf.json` CSP response header, `nosniff`, current
MIME mapping and `no-store` behavior on the same responses as the old server.
JS modules/CSS must keep their proper content types and real URLs; missing files
remain404, unsupported methods405 and traversal/foreign authority rejected.
Read only bounded paths under production dist; native image/file paths belong
to the existing Rust APIs, not arbitrary static-file routing.

Production CSP is unchanged: scripts allow self without unsafe-eval; styles
retain their existing inline allowance; images allow self/asset/data/blob;
connect-src permits only ipc and ipc.localhost, **not** self HTTP/HTTPS RPC;
font/worker policies stay unchanged. No `bypassCSP`, web-security disable,
ignore-certificate switch, new network permission, eval allowance or product
setting is justified. Context routing needs no real TLS listener/certificate.
Preserve existing browser executable/launch flags, viewport, locale, theme,
timeouts, retries0, traces and screenshot policy. HTTPS origin is a browser-test
origin, not a claim that Tauri WebView/native protocol behavior was exercised.

Subsequent feasibility correction: the unchanged-flags own attempt died in
Crashpad `setsockopt EPERM` before CDP. The retained crash-reporting-disabled
probe had **already** failed before page creation with sandbox shutdown
EPERM/SIGABRT; its failure was not limited to HTTP navigation. After rereading
that receipt, root **cancelled version3 without running it**. No additional
flag fork or harness implementation occurred. The [pipe feasibility note](PLAYWRIGHT-PIPE-FEASIBILITY-2026-11-07.md)
records the actual version2 failure and retained older diagnostic. Startup
capability is unsatisfied, so virtual asset routing cannot currently enable UI
execution. No CSP, sandbox, web-security or product setting changed. Do not
repeat those flags or implement an untested fallback without materially changed
platform/provider capability.

`ProjectViewport` installs the pinned static Pixi implementations before renderer
creation, reports `frontend_ready` separately from viewport errors, and starts
its ordinary requestAnimationFrame clock. Preview imports the same static path
and owns its own normal readiness/error state. The test fixture's existing
frontend_ready no-op must not become a fake renderer success. Keep real canvas,
WebGL context and page-error assertions. IPC failure must still be distinguishable
from renderer initialization failure. Resource image strings continue through
`get_image_data`, `new Image().decode()` and the actual shared ImageLayer; do not
replace textures, returned data URLs or PNG validation with placeholders.

## Required transport seams and isolation

`attachNativeSession` already exposes a Node binding before page startup, so
page-native calls do not need page fetch or CSP relaxation. Browser-preview
tests must still have no `__TAURI__`; native fixtures install only the existing
test bridge/window/event adaptation. All domain edits/evaluation/history/files
continue through dedicated real Rust Session processes and own generated PNGs.
OS window events/dialog presentation are already adapted and remain outside
these tests' proof.

There are two independent request surfaces:

1. Browser navigation/module/assets are intercepted by page/context routing.
2. `NativeSession` and the isolation/negative-token tests use Playwright's
   `APIRequestContext.get/post/delete`. Browser context routing does not service
   those Node requests. Supply a socket-free Node request adapter over the same
   endpoint/static handler, preserving status/headers/body/error semantics;
   do not turn native RPC into page fetch or return a JS project model.

Preserve `/__e2e/session` creation201/deletion200, health/static headers,
authenticated `/__e2e/rpc`, missing/foreign session-token403, unknown endpoints404,
native errors with their existing200 JSON error envelopes,2MiB request and32MiB
JSONL response bounds, session limit8, invoke timeout and owned-host shutdown.
Validate the selected virtual origin/authority instead of accepting arbitrary
URLs or file roots. Node callers with no Origin retain their current policy;
explicit foreign Origins remain rejected. Each test/context/session must retain
fresh native process/root/token identity, including when tests run in parallel.
Teardown closes only owned hosts, clears pending work and also runs on failure.

Reuse `stringifyNativeResponse`: Rust reply negative zero survives Node response
serialization/JSON parse, while request JSON keeps the product's ordinary
serialization semantics. Direct-object shortcuts must not erase response−0,
invent preserved request−0, round f32 values, remap IDs or change DTO/null/error
shapes. Preserve NativeSession.calls diagnostics and revision/document/epoch
guards; IPC latency must remain asynchronous enough to exercise pending/stale
cases rather than bypassing them with synchronous local results.

## Minimal fixture changes and acceptance

Make route mode explicit in test config and omit webServer startup/readiness only
for that mode. Share static/RPC handlers between listening and routed transports
where practical; do not maintain two behaviors. Existing test descriptions
claiming HTTP transport should become transport-neutral when the virtual HTTPS
adapter is used. Native build/normal app feature boundaries stay unchanged.

Install context routes before navigation. `native-authoring.spec.ts` explicitly
creates two `browser.newContext` instances: those also need baseURL and route
installation, not just the default page fixture. Preserve their independent
native bridges, localStorage and page-error collection. Do not share a persisted
browser context or inject product state to make these tests pass.

Installed Playwright1.64.1 primary type documentation records that page routes
take precedence over context routes, routing disables HTTP cache, and Service
Workers can prevent interception (`playwright-core/types/types.d.ts`, route API
comments). The existing page-specific same-origin CSP Function probe must still
win over the static context handler; unmatched routes must not swallow it.
The production app currently registers no Service Worker. Blocking test Service
Workers, if needed for deterministic interception, must be explicit test-context
policy, not a product capability claim. The old server's no-store policy already
means this is not a cache-performance experiment.

First prove real navigation and exact header equality, actual WebGL/canvas,
self-hosted `new Function` rejection as EvalError, separate readiness failure,
unchanged browser no-native mode and image data decode. Then prove two owned
Rust contexts, wrong-token rejection, native error propagation, response−0,
one real mouse/key edit, Undo/Redo and Save/Close/Open. Only after that feasibility
receipt should root run the existing full UI suite with failures/traces intact.
Discovery107/typecheck/build or the earlier compiled custom-host checks are not
execution of these scenarios. OS drag/drop/dialogs, GTK/WebView2/macOS and fresh
original independently encoded acceptance remain separate pending evidence.

Private source inspection manifest:
`browser-route-ui-gate-2026-11-07/source-manifest-v1.json`; v2 records the
subsequent cancelled-fork correction without overwriting the earlier receipt.
Coordinator owns the
shared UI runner, integration result and STATE/task checkpoint. No application
launch is required for this research-only UI gate.
