# Native next questions: DATA findings before new tooling

The consumed v2 run42645345499 remains immutable. Debian and AppImage each
pass actual stock0.9.5 GTK/WebKit control, visible owned window, updater labels,
one Updates toggle and retained launcher exit0. Their independently pinned
native hashes are1829501f… andf53aa2fb… respectively. This is Stage1 capability,
not native Save, installation of0.9.6 or an installed upgrade.

Windows NSIS installation/version/bundled image aa57d9bc… match. Its first
nonzero MainWindowHandle is followed by a combined visible-window identity
assertion failure; guarded catch closes only its owned app with exit0. The
failed combined predicate does not reveal which conjunct failed. macOS installs
the expected universal image6824b30a… on arm64; Aqua and AX trust are true, but
the same direct Process launch never satisfies the owned-app tuple. Its logs,
early exit code and partial tuple were not recorded. Causes remain unknown.

## New Linux picker feasibility: one missing provider

The existing source `src-tauri/src/dialogs.rs` creates a GTK FileChooserNative,
modal and parented to the main GTK window. Save uses title **Save a project**,
Save/Cancel, a *.fbones filter, suggested current name and overwrite confirmation.
Only Accept returns a filename. `save_project` returns None on picker cancel;
otherwise it saves the already prepared snapshot to the chosen path, appending
.fbones only when no extension is present. Native `save_snapshot` owns revision
and successful clean-state publication. These source contracts are unchanged
from the stock0.9.5 profile; actual picker exposure is still unobserved.

One10–15minute feasibility question is justified: can the stock app's actual
native Save dialog expose an unambiguous owned filename control, exact path
readback and a scoped Save action, producing one fresh own binary checkpoint?
Use fresh ephemeral Linux jobs and the already proved native WebKit provider.
Create the tiny own project through ordinary DOM New/name/Create controls;
use ordinary Save for its first SaveAs. No native command mutation, injected
dialog result, e2e-host, product/security setting change or installer update.

Before native input, retain a bounded AT-SPI inventory on the job's private bus.
Require get_process_id == the retained own app PID/start, a unique visible modal
Save dialog, and X11 transient-parent association to the verified main window.
The locally inventoried AT-SPI interfaces supply process ID, Text,
EditableText and Action mechanisms; they do not prove this dialog's controls.
Require one visible editable Entry labeled **Name**, with a scope confined to
that owned dialog. Observe its exact current value before setting a complete
fresh own absolute .fbones path; read it back exactly through the same native
Text interface. Recheck identity and then perform ONE unique scoped Save action.

The destination must be under the fresh private run root and must not already
exist; overwrite prompts or another location/control shape stop this sample.
A portal/out-of-process picker, missing bridge, ambiguous Entry/action, changed
PID/start/window, absent transient relationship or differing readback yields a
bounded negative inventory. No desktop-wide enumeration/input, last-Entry,
global typing, focus/keyboard fallback or filesystem save replacement follows.

Success requires the actual expected file at the selected destination, stable
bytes/hash, visible clean project state and independently decoded own name/
authored fields. A nonempty file or submitted click alone is insufficient.
Record native dialog association/readback, Save submission, resulting UI and
binary semantics separately, then close only the clean owned app normally and
observe its retained exit0. This one Save proves no Cancel branch, native Open,
Save-and-continue updater branch, replacement authorization or full upgrade;
those remain separate unanswered checks.

## New Windows readiness diagnostics: same predicates, bounded wait

Keep the exact stock package/member/installation and NUL-owned launch route.
Replace the old stop-at-first-nonzero-handle poll with a bounded poll of the
complete readiness predicate: live retained PID/start, exact bundled image,
candidate own main handle, owning PID and visibility. Record each observed
component, relevant WinAPI failure/error, expected/actual image path or file
identity, and terminal status before raising the combined error. No assertion
is weakened and no control is used until the full predicate passes. If identity
or ready state never passes, retain diagnostics and use only the existing
verified-own normal-close cleanup; no alternate process/window or force.

## New macOS launch diagnostics: preserve the existing Process route

Keep the same stock installed bundle/image and direct Process.run invocation.
Collect direct owned stdout/stderr prefixes, Process PID/isRunning/early
termination reason/status, and the actual NSRunningApplication tuple while the
existing bounded poll runs: PID, bundleURL, executableURL, bundle identifier and
launchDate. Preserve missing/mismatching values rather than substitute them.
Retain Aqua/AX evidence and actual image hash. Logs are bounded retained prefixes,
not an unclaimed hard quota on runtime spool files.

This diagnostic must answer why the current guard is unsatisfied before changing
to LaunchServices/open, extra arguments, activation or another launch provider.
No TCC/security change, preemptive re-signing, fake bundle identity, manual
replacement process or native0.9.6 claim. An early exit and a live but unregistered
app are distinct outcomes. Normal own cleanup and its terminal status remain
separate from the failed capability. Root alone runs remote CI; new v3 source/
manifests do not overwrite consumed v2 artifacts.
