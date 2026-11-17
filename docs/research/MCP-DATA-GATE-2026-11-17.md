# MCP DATA gate — 2026-11-17

Question: which existing native authority can expose the editor's complete current
authoring surface to AI clients without introducing a second document engine?

## Directly proven by current source inspection

- `src-tauri/src/project.rs`: `Session(Mutex<SessionState>)` owns the document,
  native history, revision, stable IDs, resource generations and evaluation cache.
  `summary()` returns bones, slots/attachment inventory, constraints, animations,
  events, resource libraries, inspection status and revision/document identities.
- `src-tauri/src/rig.rs:RigEdit` is a camelCase tagged serde enum. Its current
  variants cover bone creation/transforms/reparent/delete/colors, slots and
  attachment inventory, Region/Mesh conversion and mesh topology, triangulation,
  vertex strokes, weighted binding/Auto/Normalize/Direct/paint, clipping,
  IK/Transform/Physics creation/update/order/delete, Transform Match/ranges,
  animation lifecycle/FPS/bone/slot/constraint/deform/event/sequence/draw-order
  keys, key movement/deletion, audio roots/events and Undo/Redo.
- Other production Session methods cover PNG/PSD import, library roots/refresh,
  image/attachment placement, image/audio data, trace previews and commits,
  evaluation, binary project open/save and runtime export. They are currently
  reachable through Tauri commands in `src-tauri/src/lib.rs`.
- `edit` checks `expectedRevision` under the Session lock. `edit_in_pose` adds
  native pose-epoch interpretation and rejects unsupported/stale pose usage.
  Evaluation updates the transient cache/epoch, without authoring evaluated poses.
- `prepare_save`/`save_snapshot` preserve the native binary encoder and PNG/WAV
  bundle handling. Save holds the Session lock during replacement and rejects a
  changed revision before writing. `.fbones` extension, missing resource and
  inspection-only restrictions remain native checks. Original `.spine` is never
  an accepted save target.
- `src-tauri/src/e2e_host.rs` demonstrates broad JSONL dispatch into these methods,
  including trace and the entire `RigEdit` enum. It is an opt-in test transport,
  NOT MCP: it seeds fixture/audio data, queues synthetic dialogs and creates its
  own Session. Reusing that binary wholesale would expose test internals and
  would not operate the visible editor document.

Commands used: targeted `rg` and `sed` inspection of the named source files,
`src-tauri/Cargo.toml`, `docs/STATE.md`, F310 and F302 task notes. This audit ran
no original application and adds no exact-4.3.26 observation.

## Existing evidence and limits to preserve

F310 documents accepted authoring/history/persistence and explicit FBones batch
Physics defaults/naming policies. F302 documents topology-aware Auto Weights as
our algorithm with retained proprietary-distribution gaps. `trace.rs` explicitly
defines a bounded FBones tracer, max256 vertices and transparent bridges/filled
holes reporting. MCP exposure does not establish stronger original parity.
Physics/Match READY90 precision/phase gaps stay deferred under the current STATE.
Unsupported loaded records remain inspection-only; never convert to JSON or drop
records to make an AI mutation succeed.

## Recommended implementation contract (FBones policy)

1. Product MCP dispatch must call the SAME live native Session as Tauri; share a
   production dispatcher where useful, but keep e2e fixtures and synthetic dialog
   queues behind the existing test feature. A separate headless Session can be
   an explicit additional mode, not a substitute for controlling the editor.
2. Publish discoverable JSON schemas for every supported command and every
   RigEdit variant, including required fields, enums and units. A lone untyped
   execute-command tool would preserve internal reachability but would not meet
   the requested AI usability. Validate envelopes and return structured native
   error codes, fresh state/revision on success, and actionable stale errors.
3. Retain explicit expectedRevision and poseEpoch on their existing paths. Do not
   silently reread and retry mutations after conflicts. Read native IDs from
   returned state; never infer IDs from list indexes or names. A multi-call
   workflow is not atomic unless a native transaction explicitly guarantees it.
4. Provide path arguments for open/save/import/export instead of OS dialogs.
   Use native open/prepare/save/import methods and existing resource checks.
   A configured workspace/root and explicit local connection identity can bound
   access; do not silently impose e2e-only portable sandbox behavior as native
   parity. Do not offer arbitrary file/shell/process execution as an editor tool.
5. Coordinate live UI pending fields, save and document replacement: an MCP
   request must not clear a dirty UI draft, bypass invalid-field Save blocking or
   race outstanding pose/freeze leases. Publish document updates to the frontend
   after native mutations so UI and AI see the same authoritative revision.
6. Expose evaluated pose and image previews alongside authored state; label
   simulation/evaluation operations as transient. Keep Setup/Animate authoring
   contexts explicit. Trace preview followed by trace apply must retain original
   revision/epoch, with one native history entry for the successful apply.

## Required acceptance coverage for the coordinator

Use real native Session fixtures through an MCP client, not a mock JSON engine:
initialize/discovery/schema errors; binary Create/Save/Close/Open; stale edit and
stale pose rejection; dirty replacement/inspection-only protection; PNG/PSD and
resource round trip; trace preview/apply/Undo; mesh topology and weighted edits;
Physics create/update/evaluate with unchanged authored bone data; animation keys
and sampled poses; runtime export; live renderer state refresh; start/stop and
rapid client-config copying. Preserve production CSP and normal-build exclusion
of test-only controls. Cross-platform transport/package behavior needs actual
platform checks before a three-platform delivery claim.

## Continuation DATA addendum — remaining end-to-end gaps

2026-11-17, after the first source implementation and recorded 364-native/127-UI
acceptance. This is a read-only source/evidence audit; no original launch or new
product mutation. STATE and F313 remain ACTIVE. Existing tests prove native
semantics and the HTTP/protocol core, not a real editor/client handshake.

**Directly proven, highest impact:**

1. **No rendered visual context.** `get_image_data` returns a source PNG; it does
   not show weighted deformation, clipping, colors, slot order or animation.
   `evaluate_project` returns native pose data, and deliberately sends no
   `mcp-project-changed` notification. `ProjectViewport.vue` consumes workspace
   `renderedBones`/`viewSlots`; it therefore cannot be assumed to display that
   external evaluated pose. `ViewportController` currently exposes no capture.
   `ImageLayer.ts` already renders Region/Mesh, clipping and colors with shared
   geometry helpers, but loads textures asynchronously with no await-ready API.
   A canvas extraction immediately after an edit could capture missing textures.
2. **Connection configuration expires on every Start.** `mcp_start` binds port0
   and generates a new token; `mcp_stop` drops the only stored values. There is no
   app-config persistence/discovery file. Even Stop/Start, without restarting the
   application, requires recopying client settings. The stdio adapter additionally
   requires a source checkout/script and Node, and its environment embeds those
   transient values. Current documentation states this limit honestly; it falls
   short of the requested very quick repeated use.
3. **Negotiated protocol is lost by the stdio adapter.** It always sends header
   `MCP-Protocol-Version: 2025-06-18`, even when an initialize exchange negotiates
   the server's supported2025-03-26. Its test uses a generic HTTP mock returning
   `{ok:true}` rather than an actual InitializeResult and cannot detect this.
4. **Protocol initialization is structurally underchecked.** `rpc_with` accepts
   `initialize` without required clientInfo/capabilities/protocolVersion, ignores
   `notifications/initialized` and permits tools before initialize. Stateless HTTP
   is a valid design and session IDs are optional; do not mislabel absent session
   IDs/SSE as defects. Validate initialize inputs and demonstrate the real
   initialized sequence with a normal client. A client-scoped lifecycle must
   distinguish multiple clients if server-side enforcement is added.
5. **Acceptance remains joined/incomplete.** Native socket tests call the real
   core/Session but not `AppHandle` Start/Stop/frontend refresh. The UI transport
   is mocked. The recorded normal app has WebGL startup, not a verified copied
   config, real-client mutation, visible refresh or stop/reconnect gesture.

**Documented protocol findings**, checked against pinned official
[Lifecycle](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle)
and [Transports](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports):
initialization exchanges version/capabilities/client information and the client
then notifies initialized. Subsequent HTTP requests use the negotiated version;
unsupported headers receive400. HTTP session IDs and SSE are optional; GET405
is permitted without SSE. Current origin/token/loopback and GET405 choices are
consistent with this transport profile. These are protocol documentation,
not exact-Spine evidence.

**Recommended next implementation policies, before coding:**

- Add a bounded scene-preview tool returning an MCP ImageContent plus native
  revision/documentId/poseEpoch and image/camera dimensions. Use the existing
  renderer/geometry semantics, explicit sampled native pose and an awaited
  texture-ready barrier. Prefer an isolated renderer capture rather than changing
  the user's camera or silently replacing the local animation selection. Reject
  stale metadata, missing assets and unsupported inspection-only scenes. No
  global desktop screenshot or separate AI-side physics engine is needed.
- Preserve a per-user connection identity (port/token) in the native app config,
  with atomic writes and ordinary owner-only credential permissions where the
  platform supports them. Start/Stop remains opt-in and Stop waits for active
  authoring. An explicit regenerate/reset operation revokes credentials. Reuse
  a saved port; if occupied, report actionable failure or require updated config
  rather than silently reconnecting a saved client to a different endpoint.
  Do not auto-enable the listener simply because settings exist.
- Make the stdio bridge follow the InitializeResult's actual protocol version.
  Add malformed initialize/notification handling and tests for both supported
  versions. A production client test must execute initialize → initialized →
  tools/resources → mutation/conflict → media → Stop/restart/reconnect.
- Verify rendered preview with an own nonuniform PNG, weighted mesh, clipping and
  nonzero sampled animation/Physics state; check pixels plus returned identity.
  Assert unchanged authored/native binary data after read-only preview. Preserve
  explicit current platform evidence limits and protect the handed-off window;
  use a new isolated owned instance for real application acceptance.

## Actual-client auth-rejection negative — before correction

The owned final0.10 native acceptance reaches the actual MCP controls, independent
SDK23-tool workflow, rendered result, Stop/Start with identical saved settings,
reinitialization using the copied client config and explicit stopped reset.
Its next old-token POST to the reset endpoint fails as ConnectionResetError104,
rather than an observable HTTP401. Private result/driver/terminal receipts retain
this negative; the owned native terminal is-15, not a normal exit claim. No
protected/original window was operated. This does not invalidate the completed
preceding workflow but prevents claiming the complete reset/revocation flow.

Current source directly explains the route: `serve` writes401/403 after reading
headers and drops the TCP connection without consuming a valid Content-Length
body. The previous socket test explicitly tolerated ConnectionReset while
retaining response bytes, so it could not prove normal HTTP-client rejection.
Closing with unread request data can reset TCP and lose the response for the
Python urllib client used by the actual native driver.

Correction policy before coding: reject before parsing JSON/dispatching, drain
only a known bounded request body within existing header/body/time limits, then
return the HTTP rejection and close orderly. Unknown/oversized/transfer-encoded
bodies must not trigger unlimited draining or authoring. Strengthen the genuine
socket regression to require error-free complete response reading and prove
zero dispatch for rejected POSTs. The coordinator reruns the owned native client
scenario; this source diagnosis alone is not a replacement acceptance result.
