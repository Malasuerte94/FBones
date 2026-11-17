# MCP UI gate — 2026-11-17

Question: where can an AI connection be configured quickly without displacing
the shared Setup/Animate workspace?

## Evidence and decision

**Direct local source observation:** `src/App.vue` renders a compact `h-8`
header containing brand, File, New/Open/Save, Undo/Redo, project name, Updates
and Views. `src/styles.css` defines the shared `editor-menu`, `dock-tab` and
popover appearance. There is no general Preferences screen to extend.
`src-tauri/src/lib.rs` builds native File/Edit/Help menus and forwards their
IDs through `editor-command`; `src/services/bridge.ts` receives them.

**Explicit FBones policy requested by the user:** put a compact labeled `MCP`
control immediately after File. Open a configuration panel with server state,
Start/Stop, connection configuration, Copy configuration and AI help. Keep it
available without a project, since an AI must also be able to create/open one.
Use text state (Stopped/Running/Error) in addition to a colored indicator.
Keep the existing shared central transform controls and Animate key controls.
This new interface has no claim of Spine 4.3.26 parity and needs no original
launch: MCP itself is the requested difference.

## Concrete implementation contract

- Native state owns the listener/transport, connection address and any secret;
  configuration display must reflect actual successful startup, not optimistic
  UI state. Show startup/bind failures with a retryable message.
- Make the common route one Start action followed by Copy configuration. A
  generated configuration must identify this actual app instance/endpoint and
  use absolute executable paths only at runtime, never committed examples.
- Provide exact JSON as selectable text with Copy and a visible success/failure
  result. Include concise AI docs covering discovery, revisions, IDs, history,
  Setup/Animate semantics, resource paths and trace preview/apply workflows.
- Match current compact dark controls and EN/RO i18n. Buttons need labels,
  focus indication, disabled busy state and accessible status/error text.
- Reuse the existing modal or small popover pattern. `ModalDialog.vue` traps
  button/input/[tabindex=0] focus but currently omits textarea/select/a; if the
  configuration uses one of those elements, fix its focus selector first.
  Escape must close the MCP panel without also triggering workspace commands.
- A native MCP menu command can use the same `editor-command` route. Opening
  settings should not cancel drafts or make document data dirty.
- In ordinary browser preview show an explicit desktop-required state. Do not
  simulate a listening server or report a copied runnable configuration.

## Shared Session integration

**Direct source observation:** native edit handlers update native menu state;
the frontend ordinarily accepts the returned `ProjectSummary` for its own
commands. `useWorkspace.initialize()` fetches only the current initial project.
There is no existing generic external-edit event subscription.

Remote edits therefore need an explicit native notification and controlled
frontend refresh of the same Session. UI must refresh project/dirty/history,
invalidate stale selection/trace/geometry epochs and preserve explicit Physics
Simulate Off. Local numeric/animation drafts must not silently overwrite a
remote newer revision; serialize or reject conflicting pending operations.
Do not create an unrelated headless document while claiming to control the
visible editor. Do not send full scenes every frame or pointer move.

Implementation policy selected by the coordinator: the first integration uses
explicit AI control mode. Start flushes/validates Setup fields and rejects active
geometry/creator dialogs and Animate mode (unkeyed animation poses stay intact).
The workspace becomes inert before native mutation readiness is enabled; native
menu commands and keyboard routes are guarded too. A body-teleported status
banner and modal keep Stop accessible outside the inert workspace. Stop restores
manual editing. A named simulation hold pauses Setup evaluation without changing
the user's explicit Simulate intent. This policy intentionally serializes manual
and AI authorship; concurrent manual editing is not claimed.

## Verification needed after implementation

Use the real Rust Session and production CSP. Verify header placement, start /
stop / bind failure, selectable/copyable configuration, keyboard focus/Escape,
browser fallback and narrow header/panel sizing. Connect an MCP client, edit a
project and observe the visible editor update, dirty state and Undo/Redo. Cover
concurrent stale revision rejection and no loss of invalid local field drafts.
Browser checks do not prove OS clipboard/native-menu behavior on all platforms;
record those separately. No new screenshots/original gestures were collected.

## Native acceptance and remaining usability — continuation audit

Direct source reuse: `scripts/native-acceptance/linux.py` already uses the
actual GTK WebKit W3C driver, scoped element clicks, native screenshots and
PID/start-time/executable-hash/X11-window binding. Its existing entry point is
hosted-stock-only; it must not be pointed at a local user process. A separate
source-build harness can reuse this route with a fresh own private X display,
XDG profile and retained launcher child. The Nov17 normal launch receipt marks
that window transferred to the user and `DoNotAutomate`; do not attach to it.

Local package observation: WebKitGTK 2.52.6 is installed, WebKitWebDriver and
Xvfb are absent. Apt metadata identifies a matching 562152-byte driver package;
project-local extraction can supply it without changing the system installation.
No local native control capability is claimed until that provider actually
launches and binds a new own window. No original editor operation is needed.

Source-proven usability gaps: Start currently chooses a random port and token;
the copied URL/headers and stdio environment become obsolete after every Stop
or application restart. The optional source Node adapter is not bundled. A
stable private discovery-file configuration or a bundled adapter can allow a
single copied client configuration to reconnect while fresh runtime credentials
remain per-server. Acceptance must restart the app/server and reuse the same
client configuration; relabeling a new copy as reuse would not prove this.

Current image-data tools return resource images, not the composed visible
scene. No viewport capture exists in the catalog. An AI needs bounded visual
context in addition to authored geometry. A capture must be tied to document
and revision, wait for resource/renderer readiness and distinguish Setup view
from sampled animation/Physics state. A viewport PNG is not a full OS-window
screenshot; panel/chrome overlays and native dialogs need separate observation.

Planned dedicated native harness: click MCP/Start through W3C locators, obtain
the actual displayed connection privately, run an independent MCP client,
observe resulting project/dirty/history labels and a native screenshot, prove
Stop remains outside the inert workspace, then stop and normally close only
the exact own window with retained native exit0. Keep tokens out of stdout and
sanitize screenshots by closing the config panel before capture. Browser mocked
transport results remain distinct from this real app/client integration.

## User-supplied README project — source rendering gate

The user subsequently requested three real mascot-project screenshots for the
README (Setup, Dopesheet and Graph). A private supplied copy was opened through
the current real Rust Session on Nov17. It returns inspection-only, with no
editable/renderable scene, bones or animation DTOs. This is a direct native
observation, not a conclusion from the source JSON. No original/user instance
or original file was operated; the disposable probe copy was removed after EOF.

Do not stage a JavaScript scene or silently discard records to obtain attractive
captures. Diagnose the exact native refusal and preserve accepted data-integrity
guards before rendering this supplied project. The screenshot helper must reject
inspection-only responses and capture only the production frontend driven by
the real supported native scene. Source assets/projects remain private; only
the user's requested rendered screenshots are publication outputs. Provenance
must be updated after actual captures and visual inspection, not in advance.

## Actual Copy gesture acceptance prerequisite

The previous native driver read the displayed textarea and connected successfully,
but did not click Copy. That is connection/configuration evidence, not clipboard
gesture proof. The extended driver now issues an actual scoped W3C click on
`mcp-copy`, requires the product's visible `Copied` state, then independently
requests the GTK3 clipboard selection on its own private X display. It compares
the returned JSON with the displayed settings in memory; tokens never enter
public logs/report fields. No clipboard API mock, global input, user display,
focus change or injected clipboard write is involved. The local GTK GI provider
imports successfully; actual copy/read capability remains unproven until the
coordinator runs the real native case. A custom-protocol WebKit clipboard failure
must be recorded and corrected, rather than bypassed by reading textarea alone.
