# MCP requirements and acceptance evidence — 2026-11-17

The user requests quick MCP configuration near File, broad access to all current
editor functions (explicitly auto trace, mesh and Physics), and documentation for
AI agents. MCP is an FBones addition; existing reference fidelity limits remain.

| Requirement | Authoritative implementation/evidence | Acceptance scope |
| --- | --- | --- |
| Quick editor setup | Header `McpControl`, native MCP menu, actual Start/Stop/config commands; controller/UI tests | Final dedicated Linux driver observes actual panel/Start, W3C Copy click with independent GTK clipboard equality, AI control/Stop and final unlock. Windows/macOS menu/clipboard gestures remain untested. |
| Full existing authoring surface | `rig.rs:RigEdit` → generated 86-variant schema; native `fbones_edit` → same Session edit methods; generator drift check | All deserializable variants are discoverable. Native semantic tests retain each existing feature's bounds; representative SDK operations do not individually prove all86 variants' edge cases. Internal resource-only variants remain excluded. |
| Existing non-edit production commands | Generated catalog and native dispatcher: lifecycle, image/audio libraries and data, PNG/PSD import, placements, trace, evaluation, export, renderer capture | Final official SDK1.32.1 report passes all23 discoverable tool routes on one dedicated live editor; individual86 edit variants retain their native supported-profile tests. |
| Correct AI protocol | Official npm `@modelcontextprotocol/sdk`1.32.1 Client with StreamableHTTPClientTransport | Initialize/initialized, tools/resources/prompts discovery and reads, typed tool calls and ImageContent/AudioContent checked through independently implemented official client. Native self-RPC tests are additional evidence, not its substitute. |
| Auto trace and meshes | Native slot+attachment preview/apply, stale epoch guards, binding and Auto Weights | SDK client checks preview leaves revision unchanged; both trace routes; weighted dense rows sum1; stale pose failure without mutation. Proprietary tracer/weights parity remains outside scope. |
| Physics | Native addPhysicsToBones and reset/update evaluation | SDK compares authored bones/constraints before/after evaluation. Existing phase/precision limitations remain READY90/final100; transport success proves no stronger parity. |
| Animation | Existing animation edit enum and native evaluation | SDK authors keys and evaluates separate pose; validates Setup bones stay unchanged and duration retained after reopen. Full F105 scope remains tracked independently. |
| Data integrity | Session revision gates, dirty replacement guards, SaveSnapshot, binary codec and resource bundle handling | SDK checks stale revision, invalid schema, dirty close refusal, one-step Undo/Redo and stable IDs; exact own binary/PNG/WAV bytes after Save/Close/Open. No `.spine` source overwritten. |
| Live editor integration | Shared Session, external change event, UI refresh and AI authoring lock | Native driver observes visible external edits/dirty/history, renderer readiness and capture, then final refresh before manual control returns. SDK request success alone does not prove visible UI state. |
| Authentication and lifecycle | Loopback bearer auth, Host/Origin checks, bounded HTTP parser, serial stop/dispatch gate | Native transport tests plus actual client wrong-token/origin rejection and stopped/restarted endpoint behavior. Real Start/Stop observed separately from source inspection. |
| AI docs | Embedded `fbones://guide`, `fbones://edit-schema`, `fbones://project`, rig-image prompt; `docs/MCP.md` | Official client discovers and reads these. Revisions, stable IDs, units, paths, authoring/evaluation, error/retry policy and current limits must agree with source. |
| Client configuration persistence | Native per-profile connection settings and frontend status/config rendering | Final actual Stop/Start retains copied connection identity and reconnects; stopped Reset rotates credentials and old-token401 is observed. Native storage tests cover reading saved profile settings; a complete GUI process restart is not claimed. Session/project bytes do not store credentials. |
| Offline operation and packaging | No cloud dependency in product transport; optional source Node stdio bridge | SDK acceptance dependency is separate scratch tooling, never shipped. Normal three-platform builds/installers require their own CI and native observations. |

## Independent-client route

`scripts/mcp-client-acceptance.mjs` accepts `--connection <private.json>`,
`--output <fresh-existing-private-directory>` and `--sdk-root <installed-sdk>`.
The private connection file contains `{url, token}`; secrets are never written to
its semantic report/stdout. The script refuses an already-open document and
leaves its own clean `MCP acceptance rig` open for renderer/UI acceptance.
It never stops/closes the editor, changes global configuration or touches personal
projects. On failure, its partial report and sources remain useful negative evidence;
use a fresh output directory and diagnose before rerunning.

The SDK1.32.1 package was reused from existing npm cache, tarball integrity
`sha512-2DdE+SJDtzLEEWzY1ZjY7Q+VcPhcV1KisD3zI4u0XZyktsjHum1mwbMI+JaulUBi2OZk+KJAi2uPXzxichPkdw==`.
94 exact cached dependency tarballs were installed without network/scripts/product
dependency changes. The scratch lock pins cached compatible `zod`4.6.5 because
metadata's4.6.7 tarball was unavailable locally. This is acceptance-tool provenance,
not an app dependency. Package import was observed; actual live acceptance is
proved by the coordinator's private script report/native-driver receipts.


## Independently audited first native run

The coordinator's dedicated GTK/WebKitWebDriver run at
`.local/mcp-native-acceptance/first/` passes the official SDK1.32.1 client:
23 distinct tool routes,56 calls,11 groups. The four expected native failures
are ProjectChanged,UnsavedChanges,McpInvalidArguments andStalePose; each is
followed by state checks in the client. The native driver binds the exact own
executable/process identity and records actual MCP Start, rendered external
changes, accessible Stop outside the inert editor and normal native exit0.
Its receipts do not contain an original or protected-window operation.

Independent reinspection of the actual883-byte saved own binary confirms its
reported SHA256, complete raw DEFLATE, exact target4.3.26 internal prefix,
20-byte trailer and CRC64 `48362e9ef908dcd1` over its863 compressed bytes.
The1579-byte decoded payload is not JSON. This is independent envelope/resource
verification, not a second semantic decoder or original-Spine acceptance. Native
Save/Close/Open assertions supply the semantic checks; no stronger binary
compatibility claim follows.

The actual referenced PNG is `square_2.png` because earlier library placement
and import retain separate inventory identities. Both portable and runtime-export
referenced PNG bytes exactly equal the own110-byte source; their WAV resources
exactly equal the own204-byte source. The client originally also checks the
unreferenced library `square.png`; independent audit specifically checks the
referenced `square_2.png`, closing that narrower assertion limit. The scene has
2bones,1weighted mesh,1Physics constraint and2animations: the default empty
`animation` plus the authored30-frame `AI motion` clip. Calling this1total
animation would be inaccurate.

The actual MCP ImageContent was saved as an8926-byte678×787 RGBA PNG. Its digest
matches the report and visual inspection shows the orange own image, root and
child bone over the editor checkerboard; the separate full native screenshot
and rendered DOM show the named rig, constraint and animations. This proves the
live renderer supplied this scene image, not evaluation at arbitrary requested
times or screenshots from other platforms. The concise independent audit is
retained with the private run receipts as `independent-client-audit.json`.

An independent system `python-jsonschema` Draft202012Validator also accepts the
full edit schema and all23 inputSchemas. All5 targeted Node schema-contract
checks pass. Scratch offline npm cache and four installer helpers have been
removed; the installed29MiB SDK and exact manifest/lock remain temporarily needed
for the final-source native acceptance. Root STATE owns the final integration
checks/platform/publication checkpoint; this first run does not claim those.

## Version-label DATA gate before the final footer correction

Direct source/native evidence: `src/i18n.ts` at this gate stored literal
`appVersion: 'Version0.9.6'` (with a display space after Version), while current
`package.json`, `src-tauri/tauri.conf.json` and Cargo workspace version all read
0.10.0. Actual earlier native captures show the stale footer; that literal does
not report runtime/native version. Romanian has no appVersion override and uses
the declared English fallback. This is a source-of-truth labeling defect, not
an updater/native package version mismatch or a reference-parity change.

The existing `scripts/check-update-version.py:application_version()` independently
compares all3 package/Tauri/Cargo versions and rejects divergence before
publication. Its network-free function was run in this audit and returns0.10.0.
The CI workflow pins Node24. Current Node24.15.0 directly accepts
`import packageInfo from './package.json' with {type:'json'}` and reads0.10.0;
`tsconfig.json` already enables `resolveJsonModule` and `esModuleInterop`, with
ESNext modules and Bundler resolution. Therefore deriving the EN and RO footer
labels from the package JSON default import is supported by the configured
source/toolchain and uses the already-guarded application version. It requires
ordinary source typecheck/build plus actual final rendered-footer verification
before claiming the display corrected; those are coordinator integration checks.
No original app/process operation or shared build ran during this DATA audit.

## Prepared source snapshot review before final integration

Independent read-only review of the prepared v0.10.0-beta.1 source archive
(e8314004 SHA256 prefix) verifies996 source/own-asset file hashes plus its manifest
and exact997-member archive equality. No private-root path, original binary,
project/audio/PSD data, historical instruction archive, credential pattern,
local absolute user path, symlink or unapproved binary asset is present. Raster
assets are restricted to the explicit own app icons/README screenshot allowlist.

The earlier `export-diff.json` is a raw workspace-to-old-main comparison, not a
publication allowlist: it mentions historical `docs/research/archive` additions.
The actual exporter now explicitly excludes that tree, and this audit confirms
its absence in the manifest/archive. The prepared snapshot predates the footer
fix/current audit edits and must be regenerated and reverified before release;
its green result must not be attributed to later source bytes.


## Final prepublication evidence audit

The final dedicated Linux GTK/W3C run is
`.local/mcp-native-acceptance/final-clipboard/`. Its bound app8f00ebef process and
retained terminal identities match, with actual normal exit0. The official
SDK1.32.1 client passes23 tool routes/56 calls/11 groups; the strengthened
`verifiedAuthoredSemantics` assertion compares normalized authored bones,
mesh/binding, constraints, keys and event payloads across native binary reload.
The expected four negative results remain distinct and state-preserving. This
scene contains2bones,1weighted mesh,1Physics and2animations including default.

The actual W3C Copy click reports success and a separate GTK3 selection read on
the dedicated own display exactly matches the displayed configuration. Actual
Stop/Start reuses those settings and the original connection reinitializes.
Explicit stopped Reset changes settings, its new connection initializes, and
the old token receives401 at the new listener. Actual native DOM contains
Version0.10.0, confirms AI authoring lock and reachable Stop outside the inert
workspace. These observations establish Linux controls/clipboard, not Windows/
macOS gestures or a full process-restart profile observation. Native per-profile
storage tests separately retain their narrower scope.

Independent rereading of the final own882-byte saved binary confirms SHA256
9f4e573f prefix, complete raw DEFLATE with1579decoded bytes, exact target4.3.26
prefix/trailer and CRC64 `20f2daf93243d56f`. The referenced `square_2.png` and
WAV bytes match source/portable output, and the actual678×787 viewport PNG
matches its report hash. Native DTO comparison proves this supported authored
round trip; the independent framing check is not a second semantic decoder or
original-Spine compatibility observation.

The final current-source logs independently confirm127production-CSP UI cases,
370native tests/2existing ignored,463JavaScript passes/1existing skip,
105Scene-format/16default-format and103legacy/1existing ignored. Seven research
crate tests also pass in the workspace run. Runtime16tests and24native sample
comparisons, typechecks/web build and strict Clippy retain their own final logs;
these are local integration results, not hosted platform/package checks.

The final screenshot capture manifest reports the actual source profile:
71bones/26slots/32attachments/14animations, supported editable Scene. All32
private source files still match their recorded hashes. The independent native
verify_scene log reports complete715855-byte payload reserialization equality
without dropped data. This is this source's lossless native-codec result, not a
new original-editor oracle or universal compatibility claim. All3public images
exactly match their accepted1440×900 source captures/hashes; sources/revision are
unchanged. Only authorized rendered editor images are public; raw project and
art stay private. Full Animare/Physics/Match final-pass limitations remain open.

The new v0.10.0 release notes correctly distinguish these local native/SDK results
from the release workflow's required checks. They retain exact proprietary/
platform limits and do not relabel accepted0.9.5→0.9.6 installations as0.10.0.
Root must replace stale preintegration STATE/roadmap text, finalize README PSD
inclusion wording, regenerate/audit the final source archive, and observe actual
commit/push/CI/release assets and signatures before claiming publication. The
older reviewed996-file source snapshot stays historical; its digest never proves
the current later source tree.

## Windows schema-checkout DATA gate

Hosted main/tag Windows JavaScript checks exposed a tooling-only failure: the
checked-out generated JSON begins with CRLF, while the generator compares the
entire text against `JSON.stringify(...,null,2)` with LF. Direct source inspection
confirms the current `--check` uses exact unnormalized `assert.equal` and the
repository has no root `.gitattributes` overriding checkout behavior. The reported
failure is line-ending conversion, not a native/product/schema semantic failure;
Windows product/native checks had not yet run at that failed stage.

Chosen correction: normalize only CRLF pairs to LF in the text read for drift
comparison. Keep generation LF-canonical and preserve exact comparison of every
other character. Do not parse/reformat the checked-in JSON, ignore arbitrary
whitespace, change schemas, edit global Git settings, move the beta1 tag or infer
a passing Windows build. A disposable relocated checkout containing CRLF Rust
sources/script/JSON must pass; separate altered-semantic and other-formatting
fixtures must still fail. This choice affects contributor verification only,
with no new editor behavior/appearance or reference-parity claim. Hosted reruns
and a new immutable beta2 release remain coordinator work after the local fix.

The paired [UI checkout gate](MCP-SCHEMA-CHECKOUT-EOL-UI-GATE-2026-11-17.md)
confirms no visual/control/native contract change. The new relocated CRLF checkout
regression was first run against the unmodified generator and reproduced the
same `mcp_edits.json is stale` failure with actual CRLF versus expected LF. After
the one readback-normalization fix, all6 schema tests pass. Its real generator
subprocess now accepts CRLF Rust/script/JSON input without rewriting files and
still rejects semantic changes independently in both generated schemas, a lone
CR and extra indentation. `--check` also passes the ordinary checkout. Canonical
mcp_edits/catalog JSON bytes are independently equal to the previously prepared
release clone; no regeneration/contract/native source modification occurred.
The disposable relocated checkout is removed by the test on success or failure.
Hosted Windows reruns and beta2 publication remain unproven until observed; the
failed immutable beta1 remains unchanged.
