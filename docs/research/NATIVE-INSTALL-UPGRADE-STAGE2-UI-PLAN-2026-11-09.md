# Native0.9.5 →0.9.6: next UI acceptance scenario

Plan only, before implementation. The four-route v2 capability run is not yet
an observed pass. Reuse the [existing acceptance gate](NATIVE-INSTALL-UPGRADE-UI-GATE-2026-11-09.md)
and [diagnosed identity correction](NATIVE-INSTALL-UPGRADE-V2-UI-GATE-2026-11-09.md);
their frozen files remain unchanged. No native/process operation, browser,
installer or product modification was run by this UI worker.

Only a route with measured stock installation, native frontend/control access
and normal close may progress. New Stage2 jobs use fresh ephemeral hosted OS/
accounts, exact stock packages, profiles and own projects; a completed Stage1
job is not a reusable live process. Windows NSIS, Debian and AppImage remain
separate outcomes. macOS additionally needs actual Aqua/AX permission; a measured
permission block keeps that route open without TCC/security changes.

## One concrete own-project sequence

Use ordinary stock controls through the proved native provider. Mutations are
UI actions only: no test IPC, queued fake dialog, replacement browser, injected
updater transport or endpoint/key override. An explicitly reviewed read-only
shipped `get_project` snapshot may establish revision/dirty/state; it is not a
mutation shortcut. Retain visible labels, screenshots and independent saved
binary comparisons as separate evidence.

1. Bind the new installed0.9.5 PID/start/executable/package/window/profile.
   Create `Own upgrade <route>` through **New project**, **Project name** and
   **Create project**. In Setup, select the root and enter exactly37.5 in the
   existing `bone-x` field. Verify that authored value, project identity and dirty
   state. This tiny project needs no external assets or original source.
2. Observe the stock updater discover0.9.6 and download/verify to **Ready**.
   Use **Check for updates**/**Download** only if the actual state requires them; automatic
   discovery/download may already be complete. Record current0.9.5, offered
   0.9.6, actual status/progress and enabled **Install and restart**. Ready alone
   is not installed. A download/signature/network error stops this sample.
3. Click Install once while dirty. Require the normal **Leave this project?**
   dialog with usable **Cancel**, **Discard changes** and **Save and continue**. Choose
   **Cancel**. Verify the same old process/start/window,0.9.5, authored37.5,
   dirty project and Ready state remain; the UI is usable and replacement has
   not occurred. Do not choose Discard or repeat a failed install action.
4. Save through the ordinary toolbar **Save** into a fresh private `.fbones`
   path using the actual native Save picker. A new unsaved project makes this
   the native SaveAs path. Verify the returned destination, clean state/revision,
   saved file/hash and independently decoded project/37.5 before installation.
   This deliberately establishes a reviewable clean checkpoint before the final
   Install click. It does not claim native **Save and continue** acceptance;
   that combined branch remains separately bounded by existing local tests.
5. Click Install on the clean project once. Observe the actual stock installer/
   replacement, old-process lifecycle and automatic relaunch. Rebind the new
   PID/start/window/path and control provider, verify visible/current0.9.6 and
   independently established new package-member identity. Old exit0, installer
   exit0 or changed disk bytes alone cannot prove relaunch success. Do not launch
   a replacement process to hide a failed automatic relaunch.
6. Use normal **Open project** and its native picker to reopen the saved own
   file; do not assume automatic project restoration. Compare decoded saved
   data, project name and authored37.5, require clean state and unchanged file
   bytes. Close only this verified clean own app normally and observe its real
   terminal result. Preserve a failed step and stop; no force or blind retry.

All0.9.6 expected installed/native hashes must come from the separately verified
new stock payload/member chain before the run, not hashes first observed from
the new process. Keep the runtime package's independent version unchanged.

## Reusable Windows controls and fresh Linux question

Windows can derive its picker provider from the accepted private
`stabilization-2026-11-08/windows-qa-v2/file-dialog-classic-open.ps1` and the
actual `resume.mjs` SaveAs/Open sequence. Reuse inventory-before-input, exact
own parent/PID/start/image/dialog identity, unique visible filename/acceptance
controls, native plus UIA destination readback, a fresh nonexisting Save path
and one acceptance post. That helper's old PID, review records, PowerShell hash,
toy capability and geometry are historical; none authorize the hosted runner.
Inventory its actual dialog first. The modern Save FileNameControlHost shape
and classic Open1148 chain are accepted prior shapes, not universal fallbacks.
Never select the last Edit or use global typing/focus. Require the actual saved
destination/file after submission, preserving the earlier wrong-field failure.

GTK `FileChooserNative` from `src-tauri/src/dialogs.rs` is a modal native picker,
outside the WebDriver DOM. No accepted local GTK filename-input helper was found.
The single bounded missing-provider question is: **does this stock app's Save
picker expose a unique owned filename/location control and Save/Cancel actions
on the job's private accessibility bus, with exact path readback and an actual
saved own file?** Observe/inventory first; scope any accessibility action to
that dialog's verified process/window/parent. A portal/out-of-process picker
requires a proved ownership association, not a desktop-wide fallback. If the
provider is absent or ambiguous, stop with picker-capability blocked; do not
replace it with direct filesystem saving, feature IPC or a mock picker.

Linux also has an unanswered control-lifecycle detail: `app.restart()` may end
the existing WebDriver session. Preserve creation/terminal evidence and prove
the automatically restarted native PID/window and renewed control binding; a
fresh driver-created app is not that relaunch. AppImage replacement needs the
real image path; Debian must use the stock plugin's actual pkexec/graphical
sudo/terminal-sudo route. No auth shim, password logging or claim that initial
runner `sudo dpkg` proves updater authorization. Record any prompt/provider block
separately from installation and replacement.

Source contracts reused: `src/App.vue` new/dirty dialogs,
`src/components/organisms/BoneTransformHUD.vue`,
`src/components/organisms/UpdateNotice.vue`, `src/stores/workspace.ts`
`prepareForUpdate`/`saveAndContinue`, `src-tauri/src/dialogs.rs`,
`src-tauri/src/updater.rs` and pinned updater plugin2.14.1. Existing
`tests/e2e/app-updates.native.spec.ts` and
`tests/app-updater-workspace.test.mjs` prove local controller/guard behavior,
with injected updater replies; they do not prove this native installed upgrade.
