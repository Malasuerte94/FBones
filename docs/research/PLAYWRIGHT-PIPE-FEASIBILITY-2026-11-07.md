# Port-free Playwright provider feasibility — 2026-11-07

Research-only bounded pass after the user resumed the active goal. Question: can
page delivery through Playwright's pipe/routes avoid the retained server
`listen EPERM` and execute the current107UI cases under exact production CSP?
No product, test fixture, configuration, CSP or browser-security policy changed.
All24protected process receipts were reread before the own isolated-profile probe.
No existing user/original window or process was attached, signaled or automated.

## Actual current capability datum

One own persistent-profile Chromium launch uses the existing configured executable
and launch arguments, default Playwright `--remote-debugging-pipe`, headless mode
and `bypassCSP:false`. It creates no HTTP listener. The child exits with SIGTRAP
before CDP/about:blank becomes available: Crashpad's `socket.cc:45` reports
`setsockopt: Operation not permitted`. There is no browser page, navigation,
WebGL, UI or pixel result from this attempt. Playwright observes the exit and
completes its own child cleanup. Raw launch/profile/source/receipt pins remain
ignored in `browser-route-feasibility-2026-11-07/launch-v2-result.json` and log.

The first collector attempt stopped **before launching Chromium** because one
protected receipt has a UTF-8 BOM. Version2 only corrects that JSON read; the
failed script/log and unused own profile remain retained. It is not a second
browser flag experiment.

The retained earlier `lossless-import-2026-11-06/browser-feasibility.json` already
records the diagnosed crash-reporting-disabled variation. That variation aborts
at `sandbox_host_linux.cc:41` with shutdown EPERM/SIGABRT **before browser/page
creation**. Virtual asset routing cannot change that earlier startup failure.
An initially proposed repeat was withdrawn after rereading the receipt; the
coordinator canceled it and no version3 launch occurred. Do not retry unchanged
flags, loosen browser/CSP security, install global providers or build an untested
fallback harness on the assumption that eliminating a listener is sufficient.

## Transport contract if startup capability changes

The current `serve-e2e.mjs` serves production `dist` with the exact desktop CSP,
`nosniff`, MIME types, relative asset paths, GET/HEAD/404/path/method behavior and
no-store headers. Test RPC runs in Node through fresh isolated `NativeHost`
JSONL processes. Page CSP intentionally forbids ordinary HTTP fetch; the fixture
uses the existing exposed binding and does not need a connect-src change.

A future no-listen route could serve a fixed virtual origin via context routes
and preserve those responses, but routing the page alone is incomplete:
`NativeSession` and direct isolation tests call Node `APIRequestContext` methods.
A reviewed shared dispatcher/transport adapter would have to preserve session
POST201/DELETE200, identity+token/auth403, RPC200`{result|error}`, origin/host checks,
2MiB request limit,8session limit,32MiB native-response limit and30second timeout.
Keep `stringifyNativeResponse` at the Node response boundary so negative-zero
responses survive; ordinary request JSON semantics must remain unchanged.

One isolation test creates two `browser.newContext` instances directly, so routes
must cover both, not merely the default page. Keep separate native roots/child
ownership and existing page/runtime-error cleanup. Native assets remain data URLs
returned by guarded production commands, never a filesystem page bridge. Preserve
CSP violation probes, same-origin script/MIME/error behavior, real locators/mouse/
keyboard, reload/lifecycle and action assertions. Shared production dist/build and
full runs remain coordinator-owned. A changed virtual origin must be deliberate
and tested rather than an implicit security or URL relaxation.

These are source-derived design requirements, not implemented or demonstrated
routing. Browser startup is the first unsatisfied dependency. The next useful
trigger is changed platform/provider capability with a new concrete hypothesis;
then prove owned pipe launch, exact-CSP static startup/WebGL, native isolation and
only afterward the full rebuilt suite. Existing compiled-control/native checks
remain distinct and no new UI acceptance is claimed here.
