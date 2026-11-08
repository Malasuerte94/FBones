# Project Open / Save / runtime capability DATA gate — 2026-11-08

Question: why would File → Save project, Save As and Export runtime all remain
disabled after the user selects a `.spine` file? This is lifecycle/capability
diagnosis, reusing accepted 4.3.26 bounded parsing and unchanged-copy policy.
No original or user window/file was operated by this auditor.

## Direct source evidence before any correction

`Document::summary` in `src-tauri/src/project.rs` publishes these capabilities:

| Current document | `canSave` | `canCopy` | `inspectionOnly` | Runtime export |
| --- | --- | --- | --- | --- |
| None | no summary | no summary | no summary | disabled |
| Editable supported profile | true | true | false | allowed by profile; normal busy/draft guards still apply |
| Inspected unsupported profile | false | true | true | disabled |

`ProjectSummary` uses serde camelCase names. Both the DOM File menu in
`src/App.vue` and native `update_menu` in `src-tauri/src/lib.rs` enable Save and
Save As directly from those flags. Busy state alone does not disable File → Save
As. Therefore all three disabled controls are not the normal inspected-document
case. They suggest that no document was published, or another presentation/state
failure; the actual file and displayed Open error are needed to distinguish them.
This inference does not prove the user's actual Open failed.

`open_document_profile` first validates the extension, envelope and decoded
payload. A canonical unsupported profile, unsupported active clipping, or unsafe
image-name/profile condition becomes `Document::Inspected`, preserving original
bytes and allowing an unchanged `.fbones` copy. Invalid envelope/decompression
and codec errors other than `UnsupportedProfile` propagate as failures. Missing
image scan resources are warnings and do not by themselves suppress the project.

Native `open_project` replaces the Session and updates menu capabilities only
after successful decode. Picker cancellation returns `None`; failed decoding
does not replace the old Session. Frontend `perform('open')` likewise assigns
the returned summary only for a successful non-null result, preserves the old
project for failure/cancel, reports failures through `run`, and always clears
`openingProject`. If there was no earlier project, a failed/canceled Open leaves
all three unavailable.

Existing regression evidence: `tests/workspace-loading.test.mjs` covers
successful delayed publication, failed/canceled Open retaining the previous
project, and an inspected summary with `canCopy=true`; native
`unsupported_settings_are_inspected_and_copied_without_rewriting` proves that
inspection copies exact source bytes and rejects authored Save. This audit reads
those tests; it does not claim a new run or reproduction of the user's case.

## Decision and next discriminating observation

Keep all parsing/editing/export guards. Do not enable runtime export for an
unparsed or inspected source. Coordinator to inspect an owned copy of the actual
reported file and its precise failure, then distinguish a rejected file from a
lost publication/menu state before coding. No product change is justified by
the disabled-control report alone. UI reference review proceeds independently.

## Independent native-menu cause proven before correction

UI audit found a separate native presentation defect; DATA independently read
the installed pinned `tauri-2.11.5/src/menu/menu.rs` and `submenu.rs` implementations.
Both `get` functions search only `self.items()` and do not descend. FBones creates
Save/copy/export/close/import under File, Undo/Redo under Edit, but `update_menu`
calls `get` on the root. Those misses silently retain initially disabled items
even when Session and frontend successfully publish an editable project. Thus
the prior inference for all-disabled native controls has this additional, directly
proven explanation; it does not require an invalid source or absent Session.

DATA concurs with [the paired UI gate](NATIVE-FILE-MENU-UI-GATE-2026-11-08.md):
resolve existing normal menu items through nested submenus, preserving every
current enabled predicate, command handler and file admission guard. Native
Windows enabled-state verification on an owned instance remains required;
browser regression alone cannot observe this integration. No product edit had
been made when this concurrence was recorded.

## Bounded implementation handed to integration

`src-tauri/src/lib.rs` now resolves existing normal menu items recursively through
`MenuItemKind::Submenu` before setting their enabled state. All seven existing
capability predicates are unchanged; no new command, decoder admission, file
mutation, resource policy or UI-layout change was added. `rustfmt --check` passes.
Coordinator owns compile/tests and an actual native-menu check on a separate own
Windows instance. This auditor makes no native enabled-state or corrected launch
claim before that observation; a fake tree test would not establish Tauri/OS
integration behavior.
