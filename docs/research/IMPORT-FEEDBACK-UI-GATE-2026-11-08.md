# Import/open feedback — pre-code UI gate

2026-11-08. Latest user feedback resumes work after the previous delivery pause:
opening a Spine project feels slow without feedback, and a Windows mascot copy
in the supplied test folder appears blank. Read current AGENTS/STATE/TASKS,
accepted lossless-import/real-project and image-path findings, current commands,
summary/store/viewport/resource UI, and viewed supplied `animare/Spine_vzdTlvDSE9.png`
and retained bone-inspector crop. No editor/original launch, user-window input,
shared test or implementation occurred before this gate was recorded.

## Evidence and current failure of communication

The supplied animation image proves compact dark panels, central canvas, floating
transform tools and dense Tree/Dopesheet/Preview placement. The retained crop
shows compact labeled controls. Neither is an import/loading observation or
proof of an original progress/cancellation/unsupported-state gesture. The loading
policy below is explicitly **user-requested FBones behavior**, not original4.3.26
parity. Existing independently measured path/size and import guards remain.

Direct current source findings:

- `workspace.ts::perform('open')` calls the shared `api.openProject` inside
  generic `run`. File menu, shortcut and native commands share `request('open')`.
  `busy` prevents competing requests and completed publication initializes Setup,
  selection and view reset only when native returns a summary. Cancel returns
  null; exceptions report an error; finally clears busy.
- App marks main `aria-busy` and a small footer says Working. There is no prominent
  file-open-specific feedback. ProjectViewport's Loading status is only renderer
  startup, not project decoding/resource scanning. A second open after renderer
  startup therefore has no central loading indicator.
- Native `open_project` wraps a native picker, bounded file/envelope/typed decode,
  resource scan and Session replacement in one command. UI receives no measured
  progress fractions or per-phase events, so percentages and stage claims would
  be fabricated. Native cancellation exists at the picker, not as an abort API
  for already-running parse/import work.
- `Document::Inspected` intentionally exposes empty bone/slot/animation arrays
  while preserving the original envelope. App removes the welcome card whenever
  any project exists and shows only a small inspection-only badge. The resulting
  checkerboard can look like a failed or empty import; empty DTO arrays are not
  proof that the source contains no authored data. No precise rejection reason
  currently reaches that summary.
- Editable missing-resource cases retain authored slots and report library
  root/count/warnings plus Choose Images Folder/Refresh. Texture loading happens
  asynchronously after native publication; image errors use the general notice.
  File-open completion must not promise all GPU images are rendered.
- Viewport Reset/F currently sets100% zoom and zero pan; it does not fit actual
  geometry. Do not describe it as Fit or claim it fixes an offscreen source.
  Actual missing mascot content/unsupported cause requires paired DATA evidence;
  source inspection alone cannot identify it.

## Approved bounded loading slice before implementation

Add an explicit transient `openingProject` state only around the existing Open
command, from the request through reply/publication, with a finally clear on
success, failure and picker cancellation. Generic edit/resource busy must not
show Opening project. Render a compact centered canvas status using existing
panel/text/accent tokens, an indeterminate decorative spinner and localized
Opening project / large-project waiting detail. Preserve shared Setup/Animate
HUD and dock placement. Keep old content until the returned summary is accepted;
do not author or prematurely clear the document to create a loading placeholder.

Use `role=status`, polite atomic live text, existing busy guards and visible
text independent of color/motion. Respect prefers-reduced-motion; the static
status text still communicates waiting. No fake percentage, elapsed estimate,
specific unobserved decoding phase, unsupported Cancel, forced focus, timeout
failure or new modal approval. Yield Vue/browser presentation before native work
if necessary without adding an arbitrary long delay. Clear an old notice only
on successful opening so an old resource error does not describe the new file.
Failure retains its new error; cancellation retains the prior document/notice.
The loading state is view-only and never enters authored data/history/Save.

## Diagnostic follow-up, separate ownership

A blank inspected source needs a persistent honest explanation: file opened in
inspection-only mode, display/edit not supported yet, original preserved and
Save a copy remains available. Do not state the source is empty or name a
specific unsupported feature without a native diagnostic. Editable no-attachment,
all-inactive/None, missing PNG, texture/renderer failure and offscreen geometry
are distinct states; never activate alternatives, change paths, fit from stored
Skeleton metadata or drop records merely to make something appear. Existing
Images Folder/Refresh can be offered only when native says the project supports
resource editing. Accessible status text and meaningful next actions should use
the same compact panel language, not a new import wizard.

Coordinator owns the actual mascot DATA diagnosis and any diagnostic UI follow-up.
This implementer owns only the approved Open-loading store/App/i18n slice and
focused tests; App changes must be coordinated if a second slice touches it.

## Verification scope

Use delayed actual workspace transport to check flag/busy visibility through
reply, successful publication, cancellation, failure, duplicate Open, non-Open
operations and existing discard/dirty guards; successful Open clears stale
notice, failure reports its own error, cancelled Open preserves old state. Compile
actual App status rendering where feasible; test accessible roles/localized text
and reduced-motion class. Browser/native Windows loading paint, OS picker,
latency, GPU image readiness and actual mascot appearance need observed platform
evidence. Existing sandbox/browser/Windows transport failures are retained; this
gate authorizes no unchanged retry or original observation claim.

## Loading slice and focused evidence

The approved implementation adds `openingProject` around accepted Open only,
flushes Vue before native dispatch and clears it in finally after publication,
cancel or failure. Existing dirty/discard and busy guards remain authoritative.
Successful Open clears old notices; cancel preserves the prior document/notice
and failure reports its own message. Generic edit/resource operations use their
existing busy behavior. No authoring/history/native DTO field was added.

The visible centered panel is decorative to assistive technology; one localized
polite/atomic status sibling **outside the busy main subtree** announces the same
text. This avoids deferring its live announcement behind `aria-busy=true`.
Reduced motion stops the spinner while leaving text. No focus/modal/percentage/
abort control was introduced. These are source/semantic accessibility checks,
not an observed screen-reader result or a guarantee that a frame painted.

Coordinator's `ProjectInspectionNotice.vue` replaces the tiny badge with the
honest generic explanation and existing Open/Save a copy actions. It is hidden
during Open; canCopy/busy control the existing actions. It does not claim the
source has no bones, that PNGs are missing or that conversion succeeded.

`node tests/workspace-loading.test.mjs`: **7/7 PASS**. Actual workspace/delayed
transport, compiled actual App status fragments/command and compiled actual
inspection notice cover success, cancel/failure, duplicate request, dirty/discard,
non-Open operation, inspected publication, localized live/reduced-motion markup,
Open/copy emitted intents and disabled/capability state. The custom host proves
Vue lifecycle/routing; it is not browser/native import/pixel evidence.

`tests/e2e/import-feedback.spec.ts` adds an explicitly transport-only browser
scenario with a delayed own inspection DTO: visible loading, external live
announcement, final explanation, disabled Animate, copy cancellation without
edit commands, and repeated Open cancellation returning to the notice. It uses
no private mascot/assets, Rust fixture hook or filesystem-copy claim. Source is
ready for coordinator checks; it has not been executed by this worker. Coordinator
attempted the browser route once; server bind127.0.0.1:4173 failed with EPERM
before a page/test ran. The initial command's space-separated title filter also
did not match this hyphenated filename/title; future discovery should use the
filename or `delayed Open shows feedback`. No unchanged retry follows. Review
also corrected the test's copy transport assertion to actual `saveAs:true`.

## Conditional editor-preferences preservation gate

New DATA raw-v5 inspection confirms the mascot first differs at Project/tag30:
class38 map has three named keys (`exportDir`, `imagesDir`, `dirs`), while the
canonical writer emits an empty editor-directory map. Its values are known85
records with an86-record array and uint2;86 records contain text, a variable
integer exceedingu32 and false. Project/tag13 is generic string `json` instead
of canonical false; tag4 is a float array containing30.0 and tag8 is finite2.2051.
Those are direct primitive/record observations. Broader meanings as export/view
preferences are inferred, not measured original interactions or runtime geometry.
DATA also reports an unresolved class149 in Skeleton/tag51; complete typed parse/
equality is not yet established, so preferences alone cannot admit this mascot.

If paired DATA later proves complete known typed metadata retention, the source
should expose the existing scene/animation controls without new UI or special
import workflow. Preserve source variants/values/references as validated typed
provenance through unrelated edit/history/Save; keep old canonical own-file bytes.
Do not canonicalize source text/large integers, browse remembered directories,
read/write those paths, change the runtime Images root, apply source export/view
preferences to the current camera/grid, or create export-settings widgets from
these field names. Do not invent a rendering/size/root/transform fallback to make
the mascot visible. Unknown records and whole equality still fail closed; use
the generic inspection explanation until complete support is established.

This extension was recorded before any dependent preferences implementation.
No original launch or new Physics/Match probe is authorized or claimed.
