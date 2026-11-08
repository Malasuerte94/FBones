# Playwright no-listen transport DATA gate — 2026-11-07

Before harness code. Latest coordinator instruction resumes the user goal; the
STATE/TASKS pause paragraph is historical until the coordinator updates it.
Question: can a diagnosed virtual HTTPS origin, intercepted in Playwright and
fulfilled from current production `dist/`, replace only the forbidden HTTP listen
step while retaining the real Rust Session provider and every persistence guard?
This is a new bounded feasibility route, not another unchanged server-bind,
original-editor or platform retry. This note is read-only source inspection;
no browser/provider run or product source change is claimed.

## Existing provider and ownership contract

`scripts/e2e/native-host.mjs` spawns the opt-in `fbones-e2e-host --root <fresh own
sandbox>` with owned stdin/stdout/stderr pipes. Rust `e2e_host.rs` owns one real
production Session, queued relative/cancel dialog choices and SaveSnapshot tokens.
Its JSONL loop executes requests sequentially. Real Session methods retain all
revision, document/logical identity, geometry epoch, freeze lease, history,
resource and independent format guards. Commands/errors must never be reimplemented
as a JavaScript project/solver or replaced by browser-store fixture data.

The host rejects nonabsolute/symlinked sandbox roots, traversal/absolute choices
and unsafe embedded project roots. Generated PNG/WAV fixtures and every real Save/
Open remain inside that own sandbox. Close only the child created by this provider;
retain stdin-EOF cleanup and bounded owned-child termination, never other editor
processes/windows. Normal builds still exclude the feature-gated host. Stale source
binaries/dist must be rebuilt before tests; changing transport alone cannot certify
new product code. The coordinator owns all shared builds/runs/reports.

NativeHost already has random independent session ID/token, request IDs,32MiB
response-buffer limit,30second request timeout, unknown-ID/invalid-JSON/error/exit
failure propagation and5second close timeout. Preserve these behaviors. Replies
retain result versus `{code,message}` error, not a successful null fallback.
Transport ordering/parallel isolation must not merge hosts or reuse a Session
across tests. Existing simulation, epoch and stale-revision tests keep their
current assertions and timing policies.

## Boundaries the replacement must preserve

| Boundary | Existing observed source contract |
| --- | --- |
| POST `/__e2e/session` | fresh host,201 `{id,token}`, maximum8per service instance |
| session authorization | matching `x-fbones-session` and `x-fbones-token`; mismatched/unknown403 |
| DELETE `/__e2e/session` | removes owned registry entry, closes that child,200 `{closed:true}` |
| POST `/__e2e/rpc` | command string/object args,2MiB JSON request bound;200 `{result}` or `{error:{code,message}}` |
| Origin/Host | accepts only the configured owned test origin; no arbitrary-origin registry access |
| static dist | current bytes/MIME, exact desktop CSP, nosniff/no-store, GET/HEAD only, containment guard; missing404/method405 |
| negative zero | response serialization uses `stringifyNativeResponse`; ordinary request JSON semantics remain unchanged |

The virtual HTTPS origin is a test-provider address, not a listening server,
Tauri IPC endpoint or new product network capability. Fulfill only its intended
navigation/static paths from `dist/` with the exact CSP from `tauri.conf.json`;
do not add unsafe-eval, bypassCSP, new connect-src or an HTML script injection.
The browser's existing CSP test must still load its same-origin probe and reject
`new Function`. Unknown assets/endpoints must fail honestly rather than returning
index.html or mocked native success. Do not expose arbitrary filesystem paths.

Playwright page/context routing does **not** intercept Node's current
APIRequestContext calls. `NativeSession.create/invoke/close` and the direct request
permission/CSP test need a compatible Node transport adapter or shared endpoint
dispatcher retaining status/headers/body/error semantics above. Preserve the test
that pairs one session ID with another token and expects403. Avoid separate HTTP
and no-listen implementations of native commands. The new backend can share
existing endpoint logic; the provider remains NativeHost/Rust, never a JS model.

`attachNativeSession` already installs `__TAURI__` **before** production module
startup using an exposed Node binding. That binding forwards to NativeSession;
only the existing `frontend_ready` handshake is locally acknowledged. Keep native
RPC outside page fetch, because production connect-src intentionally excludes
the test HTTP/HTTPS origin. Browser-only tests must still have no `__TAURI__` and
must not acquire file/persistence capability from the route.

Default fixtures are insufficient for every context: the isolation test manually
creates two `browser.newContext` instances and attaches separate NativeSessions.
Both need the correct virtual baseURL/routes before navigation. Preserve their
independent UI/project identity and cleanup. A route on only the default page
would miss that test. Keep current page error collection, zero retries, exact
numeric assertions, input gestures and native-file comparisons.

PNG and WAV resources are returned by `get_image_data` / `get_audio_data` as
native-validated data URLs. They are not arbitrary HTTP filesystem requests.
Keep documentId/resource-generation checks and the existing native cache/path
validation. Production img-src already allows data/blob; no proxy asset fallback
or texture replacement is needed. Dist JS/CSS/fonts/icons retain normal relative
same-origin URLs. HTTPS/secure-context, CSP and WebGL behavior must be observed
on this route; static source review alone proves none of them.

## Feasibility and claim gate

Use one owned current browser/native-host instance with a pinned production dist
and binary. First establish intercepted initial navigation and actual module/CSP/
viewport readiness; then prove one real Session edit plus Save/Close/Open and
asset data URL rendering. Preserve failure phase/logs/PIDs/versions/source hashes.
A launch/navigation failure is not an editor observation. Stop the route after the
bounded feasibility window without a diagnosed useful capability; do not change
global browser settings, input other windows or relax app CSP to obtain a result.

If feasible, run focused ownership/error/negative-zero/CSP/isolation/resource and
persistence regressions, then coordinator-owned required integration. Virtual
routing cannot by itself prove native GTK, Windows WebView2, OS dialogs/drop,
macOS or original4.3.26 acceptance. Existing feature DATA/UI evidence is reused;
[E partial/nonmonotone guards](ANIMATION-E-TRIAGE-DATA-GATE-2026-11-07.md) remain
unchanged. A successful harness route changes test transport, not import profiles.

## Feasibility closed before harness implementation

The separate [owned pipe feasibility run](PLAYWRIGHT-PIPE-FEASIBILITY-2026-11-07.md)
now records Chromium failing in Crashpad `setsockopt` with EPERM/SIGTRAP before
CDP/page creation. The retained diagnosed crash-reporting-disabled route already
fails earlier than page creation at sandbox shutdown; its proposed unchanged
retry was withdrawn. No virtual route, harness rewrite or CSP change was made.
This source-derived contract remains a future design, not observed provider/UI
acceptance. A new concrete platform/provider capability datum is required before
reopening the route. Existing native/compiled-control evidence remains separate.
