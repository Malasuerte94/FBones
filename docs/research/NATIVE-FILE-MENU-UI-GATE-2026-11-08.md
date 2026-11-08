# Native File menu UI gate — 2026-11-08

Question before a dependent correction: why can native Save, Save As and Export
runtime all remain gray after Open, including when an inspection-only document
must still allow an unchanged copy?

## Existing behavior and evidence

Reviewed `App.vue` custom File buttons, `workspace::perform/open` and copy/save
guards, Rust `ProjectSummary`, `open_project`, `update_menu` and menu construction.
Reused existing lifecycle/inspection/loading evidence and 114-case browser
acceptance. No original or protected user instance was attached or operated.

Directly source-proven: the native root menu contains File and Edit submenus
(plus the application submenu on macOS). Save/copy/export items are children of
File; Undo/Redo are children of Edit. All start disabled. `update_menu` searches
the root with `menu.get(id)` and silently ignores misses.

The installed pinned Tauri2.11.5 implementation in `menu/menu.rs:363` implements
`Menu::get` as a search of `self.items()` only. `Submenu::get` at
`menu/submenu.rs:324` is likewise shallow. It does not recursively resolve nested
commands. Thus every current state update misses those nested items and leaves
their initial disabled state unchanged. This directly explains the native menu
symptom independently of which project was selected; actual OS verification of
the corrected menu remains separate from this source proof.

The web-rendered File menu is a different control. It already derives Save from
`project.canSave`, Save As from `project.canCopy`, and runtime export from desktop,
editable Scene and busy/valid-draft guards. Browser/native-host tests cover those
web controls and real Rust files, not the native OS menu tree. Passing those
tests did not prove the native items were enabled.

## Required state and interaction contract

| Document state | Save | Save As / unchanged copy | Export runtime |
| --- | --- | --- | --- |
| No document | Disabled | Disabled | Disabled |
| Supported editable project | Native `canSave` | Native `canCopy` | Scene editing enabled |
| Inspection-only project | Disabled | Enabled when `canCopy` | Disabled |

Keep all current codec, source overwrite, pending-field, invalid-draft, revision
and resource guards. Dirty=false is not a reason to disable Save As or runtime
export. Native and custom commands must still reach the same application command
handlers; enabled native items must not bypass those guards.

A correction may resolve nested native items recursively or retain the actual
item handles. It must update the existing commands rather than create duplicate
actions or change project admission. No original Spine behavior is being inferred
for this FBones/Tauri integration defect.

Verification should inspect native item enabled state after own New/Open/Close,
including an own inspection fixture's Save As capability, then exercise the
native Save As/runtime route in an owned desktop session. Never use the current
user's protected window for that check. Browser checks remain valuable for the
web menu but cannot replace native-menu observation.

If the *web* menu also shows all three disabled, its source predicates imply no
frontend document/capabilities (for example canceled/failed Open or publication
failure), not inspection-only alone. Read the actual loading/central error state
before changing that independent lifecycle. No such state is assumed here.

## Observed correction acceptance

The coordinator's own Windows QA completed on immutable image
`8f65102af7e78c6f0f970d2a8f10f5435205a936bb3f60841508e520d5e24dbf`.
The local result `.local/native-file-menu-qa-result.json` records six passing
groups with no exceptions:

- Actual WinAPI Save/Save As/Export items are disabled with no document.
- Native Open of an own editable fixture enables all three existing commands.
- Native Save As `WM_COMMAND` reaches the OS picker and writes a portable copy.
- Native Export `WM_COMMAND` reaches the OS folder picker, exports exact typed-f32
  JSON and preserves authoring state.
- An own inspection-only input enables Save As, writes byte-identical content,
  and retains disabled Save/export.
- Closing the own document restores all three commands to disabled.

Copying an inspection document advances the Session revision once under the
existing `project.rs` copy policy; it is not an authoring change. Earlier caption
and inspection-revision assertion failures remain evidence, corrected according
to the observed native caption and source policy. Successful mutations were not
repeated. The owned QA session was closed normally. No protected user/original
window was operated.

The final selected image `39efc9c1…03a58` differs only by the Sequence key guard.
Its normal visible frontend startup without a debugger port was observed and
ownership transferred to the user. Fresh rebuilt-production browser acceptance
passes114/114 without failures/skips/retries, including both Sequence Undo
boundaries. Native menu interaction acceptance belongs to the named QA image;
there is no final-image native-gesture, macOS or original-Spine acceptance claim.
Beta5 push, hosted CI and release publication remain pending at this checkpoint.

The user separately confirmed the actual mascot case: «da a mers, am testat io,
pot da export la runtime si merg si alelalte butoane». This is direct user-reported
acceptance of runtime export and the other File buttons in that loaded case,
not original-Spine equivalence or an additional automated native session.
