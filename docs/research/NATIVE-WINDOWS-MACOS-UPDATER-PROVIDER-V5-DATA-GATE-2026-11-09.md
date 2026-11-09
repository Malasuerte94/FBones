# Native v4 findings: separate updater-control capability

Pre-code DATA finding. Preserve consumed v4/run42652761185 and its failures.
No new provider/native process/network operation was performed by this audit.
The question changes from a combined viewport/provider assertion to one bounded
question: can stock installed0.9.5 expose and operate its actual Updates control
through its owned native accessibility subtree? This is not installed-upgrade
acceptance or a retroactive pass for an earlier viewport assertion.

## Actual v4 evidence

Mac own SDK fixture1533 has repeated identical kernel PID/start/path/file tuple
and retained normal exit0. Stock app1542 then has the exact6824b30a… image,
kernel start1794240923.414147, expected file identity, matching bundle, an own
on-screen window and guarded normal close0. Its actual32-byte output is
`FBones UI ready; renderer=webgl`. The failed assertion is the conjunction of
AXWebArea and Viewport accessibility labels. No AX inventory was retained, so
which term is absent and why are unknown. The failure does not establish a
blank renderer, missing frontend or unavailable Updates button.

Windows retained native6160/start134387145041163253 passes the complete live/
start/installed-aa57d9bc-image/HWND262626/owner/visible predicate and guarded
normal close. The100 port polls report ordinary CIM NotFound,0listener rows.
Its actual own WebView descendants carry the private profile but do not carry
the requested debug-port flag. Why the flag is absent is unknown. This is a
bounded negative for the consumed CDP route, not permission to alter policy,
debug flags, WebView security, the app or provider ownership assertions. Stop
that route; do not repeat it unchanged or query another process's listener.

## macOS: diagnose AX shape and measure Updates independently

Keep the proved actual-SDK identity provider, direct Process launch, full stock
bundle/image/kernel/window/Aqua/AX guards and actual normal terminal. Before
any action, retain a bounded inventory rooted only at AXUIElementCreateApplication
for that exact retained app. Record roles, relevant title/value/description,
enabled/action availability, traversal relationships, API errors and all
node/time/string/byte truncation flags. Keep an inventory on failure as well as
success. Absence inside a truncated/failed tree is unknown; it cannot prove
no startup error or a unique button throughout the intended scope.

Record AXWebArea-present and Viewport-label-present separately. Missing either
does not block a separately qualified updater-control action. Require the same
owned visible native window, exact actual product renderer-ready output from
this launch, accessible frontend version0.9.5, no observed startup-error state,
and exactly one live enabled Updates button with qualified AXPress action in
the complete relevant owned scope. Recheck PID/start/image/window before one
press. The app's normal ProjectViewport path sends renderer=webgl only after
createViewport, scene synchronization and startup completion; the native handler
logs the supplied value. This is source-backed initialization evidence from the
unaltered app, not a pixel capture, ongoing render/frame fidelity or AX viewport
shape proof. Do not inject a readiness command or forge its log.

After ONE press, independently observe the stock Current version0.9.5 panel
transition in the same owned AX tree; merely returning AXPress success is not
functional proof. Record unsupported-updater or startup-error labels, actual
before/after evidence and retained normal exit0. If a control is absent,
ambiguous, disabled or unsupported, retain metadata and stop without fallback.

## Windows: a new UIA provider, no CDP recovery

Reuse actual NSIS/package/member/registry/created-handle/full native window
identity. Derive a new bounded UI Automation inventory from the verified own
main HWND, rather than a desktop-wide name search. A hosted WebView provider
may expose child elements from a different process: any such PID must be tied
to the observed owned WebView descendant tree and retained app's HWND/root;
do not assume an arbitrary PID0, foreign browser or same-name control is owned.
Record raw provider PID/root/ancestry and pattern availability for interpretation.

Before input require the exact visible/current0.9.5 frontend, no startup error,
and one enabled/offscreen-false Updates button in the complete qualified subtree
with InvokePattern. Recheck the retained app PID/start/image/HWND and the chosen
element's current owner/root/action immediately before invoking it once. A
returned Invoke alone is not success: require the actual same-owned Current
version0.9.5 panel transition, supported updater state and normal retained exit0.
No coordinate/global keyboard fallback, replacement browser, feature IPC, test
transport, policy/registry/debug-argument or security modification is authorized.
An unavailable UIA shape is a useful negative, not a reason to resume CDP.

## Honest result fields

Report installation/native identity, product renderer-ready output, AX/UIA tree
shape, accessible frontend/version, one functional Updates transition and
normal close separately. A new `updaterControlCapabilityPassed` may pass without
AXWebArea/Viewport labels, while `viewportAccessibilityShapeVerified` stays
false/unknown. Neither implies native pixel parity, project controls/pickers,
installed replacement/restart,0.9.6 frontend or actual upgrade. The historical
failed combined assertion remains failed. This newly declared narrower control
contract is explicit; do not silently rename the old full native-GUI gate.

### Source-backed dynamic button-name grammar, before final freeze

The unchanged stock UpdateNotice.vue toggle has no fixed aria-label. Its child
text contains Updates, plus a downloading percentage when total is known; in
Ready, a child carries aria-label `Version 0.9.6 is ready to install.`. The
published0.9.5 EN strings match the current source. Therefore an exact equality
to Updates can reject the same valid live button as state changes. This is a
DOM-source finding, not an observation of how either native accessibility
provider actually composes the name.

Normalize whitespace and accept only these full-name alternatives: Updates;
Updates followed by one integer0..100 and percent sign; Updates followed by
exactly `Version 0.9.6 is ready to install.`. Permit the explicit child boundary
with or without a separating space, because native name composition is not yet
measured. Do not use arbitrary startsWith/prefix/substring matching or a general
version/suffix wildcard. Preserve the raw name and which closed alternative
matched. When downloading total is null, the source instead uses byte-count
progress text; that unclassified shape may be inventoried and bounded-waited
past, but is not accepted for an action by this grammar.

Between capture and action, the name may change between these allowed variants
while the bound button remains the same. Recheck role, current qualified name,
enabled/action, own root/window/provider identity and unchanged UIA runtime ID
or retained AX element/root association; require uniqueness in the qualified
inventory. The actual panel transition remains mandatory. No existing failed
receipt is relabeled, and no new action on an unmatched label is authorized.

Private evidence pins: Mac capability `7b7b646555c87079e6576508cf0c1f3db6a946e72aaeed5ef74911389e204514`;
SDK provider proof `436770313b43ad38950b7b48fdf3b2c0f0e5b3d2cbc87098169e6ef82c833d57`;
actual output `4f0ae90438c970559a713013f4a1494ddfd260b506ba41d12a5a6c705e16251a`;
Windows capability `4b1dc899a7bc2509cdb14ebc5f4c02dc016445980547b282b44fed886589c746`.
Readiness source: ProjectViewport.vue `e5577f809a78ce6a06304f140c01fb2afd2cf47b9ee7449b24011f42f88d6f95`,
native lib.rs `801e3ea6571ff04620a921cb3dad108d37f86fef91549de84690af6229f0bb73`.
Toggle source: UpdateNotice.vue `5e16264da6d73210dcb7e6f59a67981f6a3d841bf0d23d8b61bb08e52448c1e2`.
Reuse the [v4 provider finding](NATIVE-MAC-PROCESS-IDENTITY-AND-WINDOWS-CDP-DATA-GATE-2026-11-09.md)
and [overall installed-upgrade contract](NATIVE-INSTALLED-UPGRADE-DATA-GATE-2026-11-09.md).
