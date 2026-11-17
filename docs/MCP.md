# FBones MCP for AI clients

FBones exposes the **open editor Session** to an AI through a local MCP server.
The editor's native data model, binary encoder, history and validation remain in
charge. MCP adds no new Spine compatibility claim. Existing supported-profile
limits still apply, including the recorded Physics and Transform fidelity limits.

## Connect

Open **MCP** next to File, start the server and copy the connection configuration
into a client supporting Streamable HTTP. The panel reports the actual local
endpoint and authentication token. Keep FBones open. Stop disconnects the
listener. Its address and token are remembered in this user's native app profile
across Stop/Start and application restarts; Start is still explicit. Use **Reset
connection** while stopped to replace the credentials and update your AI client.
An occupied remembered port produces an error rather than silently changing the
client configuration. Nothing is exposed
on a public interface and no internet service is needed. Treat the token as a
credential: it grants access to the editor and its file operations.

Start from Setup after completing or cancelling local gestures and drafts.
While running, the editor displays AI control mode and suspends manual authoring
and live UI simulation. The AI can still author animations through native tools.
Stop returns control to the user after refreshing the final native state. The
MCP panel and the floating Stop control remain available throughout this mode.

For a client accepting only stdio, Node 22.12 or later can run
`node /path/to/FBones/scripts/mcp-stdio.mjs`. Configure the environment variables
`FBONES_MCP_URL` and `FBONES_MCP_TOKEN` using the running panel's URL and token.
The script forwards newline JSON-RPC to the editor; it does not open a separate
project or write diagnostics to protocol stdout. This optional adapter requires
the source script and Node; it is not a bundled native executable.

## Agent workflow

1. Initialize MCP, discover `tools/list`, then read `resources/list`. Read the
   edit schema and this guide before constructing authoring requests.
2. Call `fbones_get_project`, which returns `{project, revision}` even when no
   project is open. Use its stable IDs and current `revision`; never invent IDs
   or assume array indices are IDs. Selection and attachment inventory differ
   from the active visible attachment and draw order.
3. Supply `expectedRevision` on mutations. A stale revision means reread the
   project and reconsider the edit. Never blindly retry a relative edit, Match,
   Undo or Save after an ambiguous network failure: inspect state first.
4. Inspect each returned summary. Each normal native authoring operation is one
   history action. Undo/Redo use native history. Multiple requests are not an
   atomic transaction and failure does not roll back earlier requests.
5. Save explicitly to an appropriate `.fbones` destination, respecting dirty
   state and revision checks. Never overwrite an original `.spine` source.

The schemas describe native authoring requests: bones and transforms; slots,
alternative Region/Mesh/Clipping attachments; mesh topology and vertices;
binding, numeric/automatic weights and painting; IK, Transform and Physics;
animations, curves, events, draw order, colors, attachment/deform/constraint keys;
and history. Discovery is authoritative for the available tool names and fields.
Unsupported project records remain inspection-only rather than being discarded.

Call `fbones_capture_viewport` with `expectedRevision` and `documentId` for a PNG
of the actual editor viewport after visible textures load. The response includes
camera, document revision and current editor mode/frame. It captures the current
view; `fbones_evaluate_project` does not itself seek the visible editor. Source
images and WAVs are also returned as native MCP image/audio content blocks.

## MCP first development

New editor capabilities should enter through the native Session/API first and be
available to both the UI and MCP. Keep typed tool discovery, native validation,
revision/pose guards, history, persistence and AI instructions together. New UI
features must not quietly become mouse-only features: record their MCP operation
or a concrete reason that it is intentionally UI-only. See
[the contributor workflow](../CONTRIBUTING.md).

## Images, tracing and meshes

Choose/import image resources through the native resource operations, then place
an image on a bone or add an alternative to an existing slot. A resource key is
not a slot ID. Prefer attachment-ID operations for inactive alternatives.
Preview auto trace first; inspect the resulting geometry/budgets before Apply.
Trace options control alpha threshold, silhouette tolerance/spacing, internal
detail threshold/tolerance/spacing and maximum vertices. Alpha holes stay
texture-transparent but can be filled by geometry; disconnected islands can be
joined by transparent bridges. Preview is not a persisted edit.

Use native constrained triangulation and weight operations rather than a second
AI-side geometry engine. Binding uses stable bone IDs. Respect dense influence
rows and geometry epochs; reread after topology changes. PSD import preserves
positions/order within the supported flat RGB8 Normal RAW/PackBits profile;
groups, effects and other unsupported PSD data are rejected.

## Setup, animation and physics

Setup edits authored fields; evaluation produces a separate sampled pose.
Animation changes require explicit animation/key requests rather than writing
sampled values into Setup. If an operation uses evaluated coordinates, evaluate
first and pass the returned pose epoch where the tool supports it. Epochs expire
after edits and geometry changes. Never persist runtime matrices or velocities.

Physics evaluation is preview, not baking. Use authored constraints to configure
physics; do not infer exact Spine solver parity from a successful request.
Transform Match preserves its existing space/mix guards and numeric limitations.
Runtime export is the existing supported FBones runtime profile, not universal
Spine export. Explicit Physics Simulate Off in the UI remains a user choice.

## Protocol and limits

The server uses JSON-RPC 2.0 and MCP Streamable HTTP on IPv4 loopback with Bearer
authentication. Its implementation is based on the official
[2025-06-18 transport specification](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports).
Tool failures are returned as tool errors; invalid protocol calls use JSON-RPC
errors. Files are ordinary native resources and `.fbones` remains binary.
No shell execution, arbitrary JavaScript, plugin ABI, remote account or activation
bypass is provided. Client configuration formats differ: the copied URL/headers
are connection settings, and must be placed in the client's expected structure.

Cross-platform builds and actual client/native gestures require their own
verification; Linux tests do not establish Windows or macOS interaction success.
