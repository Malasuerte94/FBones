# FBones tasks

Current user priority (2026-11-19): finish the basic production workflow
before detailed UI work. Prioritize gravity, game export, and the minimum
Spine project compatibility needed for real work, starting with Linked Mesh
in the current mascot. Verify a real project from open and edit through
save/reopen and a game runtime loading the exported bundle. GIF is a separate
preview export after the core gate. UI and performance work enters the core
queue when it blocks the workflow. Keep finer visual and numerical fidelity
tracked for later. The user paused work on 2026-11-20 once the four production
priorities reached the verified milestone. Preserve the queue for a later resume.

REA MCP inspection of Spine Professional 4.3.26 on Linux remains the source
of truth for reference behavior. Reserve a dedicated REA agent. Attribute
retained screenshots and documentation separately. Use the existing
read-only reference workflow.

Current priority order, shared with the editable project board.

<!-- project-board:priorities -->
1. `F307-gravity-rea` — [Gravity rework](#gravity-rework)
2. `F109-spine-atlas-export` — Game export: JSON, atlas and PNG
3. `F004-linked-mesh` — Linked Mesh compatibility
4. `F000-core-workflow` — Verify the basic production workflow end to end
5. `F109-gif-export` — GIF preview export after the core gate
<!-- /project-board:priorities -->

Group FBones checks at each 15-point implementation checkpoint. STATE tracks the
last accepted round and queued checks. [Test cadence](../AGENTS.md#test-cadence)

Current user priority (2026-11-17): current-editor MCP with quick setup near File,
AI docs, MCP-first contribution policy and real-project screenshots (F313) is
complete and published as v0.10.0-beta.2/app0.10.0. Preserve accepted90% limits.

Previous priority (2026-11-11): general90% usable delivery milestone, then
move on; remaining fidelity/edge cases return in the final100% pass. Physics F307
and both Transform Match actions F308 are READY90. Native upgrade closeout is
accepted: Debian/AppImage full profiles; Windows x64/macOS ARM64 clean90.
F312 PSD import now reaches the supported-profile READY90 source milestone:
layer positions/stacking and atomic history/persistence verified; included in0.10
published installers. Native PSD picker gestures and broader profiles remain separate.
Skins remain at the end. STATE owns evidence limits and the next reproducible step.

Statuses: TODO, ACTIVE, WAITING, READY90, DONE. READY90 is an agreed usable planning
milestone, not90% measured compatibility or complete parity. External checks
remain unaccepted until observed. Reference: Spine4.3.26 only. Historical counts
retain their named delivery; they are not a new combined test run.

| ID | Status | Dependencies | Acceptance |
| --- | --- | --- | --- |
| F000-project-board | DONE | TASKS, STATE and AGENTS | English cards show distinct Updated and Moved activity with exact times in Details. Activity filters the past 24 hours and sorts newest first within each status column. It combines with search and status. Isolated HTTP and Chrome checks pass, including status/priority writes, expiry and restart persistence. Live Chrome verified at 390 px on the existing service. [Run locally](DEVELOPMENT.md#normal-setup) |
| F000-board-hierarchy | DONE | F000-project-board | Live dashboard shows explicit collapsible parent/child branches, unread backgrounds and read controls. Status board drag and priority editing remain available. Four isolated integration cases and live 390px Chromium passed. Read state is browser-local. [Run locally](DEVELOPMENT.md#normal-setup) |
| F000-windows-newspine | DONE | F107-tree-view-settings | Windows x64 0.10.0 delivered to Desktop NEWSPINE as FBones-2026-11-19-dd4e9c50.exe. Verified PE32+ GUI, tested embedded assets and matching Windows-side copy hash. The existing executable and project files were preserved. Native startup remains untested for this image. |
| F000-core-workflow | READY90 | F307-gravity-rea, F004-linked-mesh, F109-spine-atlas-export | The current mascot opened editable, accepted a Setup move, signed gravity and new Animate keys, saved and reopened. The real browser played with Physics and rendered separate RGB/alpha. Stock Spine reopened an independently encoded edited copy through Linux CLI. Dice Drop played the 37-region bundle and checked the new keys. |
| F109-spine-atlas-export | READY90 | Existing File export route and paired DATA/UI plus REA review | File exports skeleton JSON, a matching atlas and PNG pages. Browser verifies cancellation, unchanged authored data, atlas pixels and Physics +10 at 20 Hz. Dice Drop Spine 4.3.13 loaded the current edited mascot with 37 regions on one PNG, 16 clips, 8 linked meshes and new keys. Comparison to the stock export passed 1,816 RGB and alpha samples. |
| F109-gif-export | READY90 | F000-core-workflow and paired DATA/UI review | File exports an animated GIF from the selected clip with output-FPS range, loop and clip-end controls. Exact Spine 4.3.26 CLI through REA establishes range, nominal frame timing and loop semantics. Chromium and Pillow decode the saved real-rendered output. Native cancellation, unchanged project and atomic save pass. Palette tuning, frame coalescing and fractional endpoint fidelity remain open. |
| F005-updater | DONE | Publishedinstallerpipeline | Strictsignedversion/HTTPS/nativeownedupdates;quietstartup/backgrounddownload/progress/manualcheck/disable;Save/Discard/Cancel+cleanrevisionmutex. Native6+guard,13controller/6Pinia/3UI,independentCLI/Node/Rust4publishedpayloadsignatures and16assetmanifest pass. Beta2Latest438536371/1913f20/tag42524571053+main42524571125success. Old0.9.4needsoneinitialinstaller;actualinstalledupgrade trackedseparately. |
| F005-updater-native | READY90 | F005-updater,firsthigherappversion | Actual0.9.5→0.9.6 accepted: Debianfull42679060912/AppImagefull43001332547; macARM64clean90 43015214283/Windowsx64clean90 43022013711. Allactualold/automatic/freshnormal0 andexactpublishednativeidentity; freshdirectWebGL+version/diskintegrity. LinuxfullnativeSave/Openstrongerscope retained. WindowsbundledUIfooter+registry/hashversion, noauto/freshCurrentpanel; Win/MacprojectOpen/reopen/persistence UNTESTED, final100%. See STATE. |
| F005-upgrade-appimage | DONE | F005-updater | Actual stock0.9.5→0.9.6/FUSE outer+member/dirtyCancel+Save/old0/automaticCURRENT0.9.6+wait0/onlythenfreshnativeOpen+unchangedbinary/semantic+normal0 accepted43001332547; independentDATA/UI pass. |
| F005-upgrade-macos | READY90 | F005-updater | Actual ARM64 stock0.9.5→0.9.6 clean upgrade accepted43015214283/05ce6f1: retainedold0, uniqueautomaticNSWorkspace/nativeacdc0088+Current0.9.6/registeredSDKnormal0, thenfreshdirectWebGL+Current0.9.6/retained0; exact405Be74 CRC/typed disk checkpoint unchanged. DATA96e6ddc5/UI26c40fe3 pass. Project Open/reopen/New/edit/dirtyCancel/Save and native project persistence explicitly UNTESTED; final100%. |
| F005-upgrade-windows | READY90 | F005-updater | Actual stockx64 clean0.9.5→0.9.6 accepted43022013711/65c74bb: oneSDKInstall, retainedold8268/installer5932/genuineJobautomatic6984/fresh5836 allactualexit0; exactf012installer/f8dnative/registry0.9.6; completeownedbundledfooter0.9.6, strictautodefaultprofile2absencechecks+Jobchain, freshdirectWebGL and405Be74 CRC/diskintegrity. Automatic/freshCurrentpanel/projectOpen/reopen/persistence explicitly UNTESTED; final100%. |
| F005-native-final | TODO | Final100%pass | Windows/macOS native project Open/reopen/New/edit/dirtyInstallCancel/Save and project persistence; Windows automatic/fresh Updates Current-panel gesture; remaining native/platform coverage, macOS Intel/publisher signing/notarization/physical OS-mouse routing require their own observations. Reuse accepted full Debian/AppImage flows; no API-return/staticcompile→native-success inference. |
| F313-mcp | DONE | Current native Session | MCP-first current-authoring API:23tools/86edits, remembered connection/reset, viewport images, AI/contributor docs and3real-project screenshots. Local127UI/370native/464JS pass with retained skips; actual official SDK/nativeGTK Copy/StopStart/reset/401/normal0 pass. Immutable44fa099/v0.10.0-beta.2 publishedLatest448882264; main44111143311all4green, tag44111143281attempt2all5green. Independent16asset/15checksum/4signature/5route/source1004/runtime32 checksPASS. Temporaryopsbranchdeleted, historicalfailuresretained. Win/MacnativeMCP/0.10upgrades unclaimed; seeF313/STATE. |
| F312-psd-import | READY90 | F102, F222, completed90 closeout | Supported flatPSDv1RGB8Normal/RAW-RLE preserves commoncanvaspositions, stacking, visibility/opacity; oneatomicnativecache/history/revision andportablebinarySaveCloseOpen. PairedDATA/UI/parser gates, full125UI+finaltargetedPSD/nativechecks; includedinpublished0.10, notold0.9.6. NativePSDpickergestures andbroaderprofilelimits explicit in docs/tasks/F312-psd-import.md/STATE. |
| F311-constraint-multiedit | DONE | F309,F310,F105 | DistinctIK/Transform/Physicsglyphs;Ctrl/Cmd/Shiftcohorts;Mixed/rawf32/nullpreservation;typedatomic42fieldhomogeneousSetup+supportedAnimatekeys/drafts,oneUndo. Native7/JS5/UI3passwithfull120UIregressions. OwnWindows94293013native4groupspass;normalcurrent0.9.5launchverified+publishedbeta2;additionalpointerSlider5cohort/oneUndo passes. Originalgestureparityunknown. |
| F000-announcement | DONE | Publishedbeta6 | English ready-to-post message in docs/FBONES-ANNOUNCEMENT.md: MIT/community, implementedfeatures,platform/runtime support and bounded Spine4.3.26 compatibility. Shortened peruser from629to289words; checked projectdocs/license/liveLatest; Markdown2links pass. Superseded ownROdraft removed; no external publication/app changes. |
| F000-public | DONE | Validated stabilization, signed installer pipeline | Published Latestv0.10.0-beta.2/app0.10.0, runtime0.1.0-beta.1, immutable44fa099/release448882264. Main44111143311all4green; tag44111143281attempt2all5green afterretainedmacrunnercapacitycancellation. Independent16uploadedassets/15checksums,4Nodeverifiedsignedupdaterpayloads/5routes, exactsource1004files/runtime32members PASS. Actual0.9.5→0.9.6nativeupgrades retain their accepted90%scope; no0.10installed-upgrade orWindows/macOSnativeMCPgesture orfullSpineparity claim. SeeSTATE. |
| F000-ci-health | DONE | F000-public | User-requested live audit: fresh normalmain51b38f7 workflow_dispatch43026304209 SUCCESS, Windows/Linux/universalMac builds andUbuntu123UI/README/runtime allPASS; releasejobcorrectlyskipped. Initial58runs35historicalfailures; current4nativeupgradeprofilesgreen. OldLegacyPress/macNewSave remainconsumed/final100%, notnewmainregressions. No newcodefix/historydeletion/native-or-originalrerun; seeSTATE/privateaudit. |
| F001 | DONE | — | Instructions, continuation notes, ignored research data; remove exactly the three obsolete editor packages and update inventory. |
| F002 | READY90 | F001 | Shell/viewport implemented; Windows user-confirmed, Linux GTK/X11/WebGL and packaged upgrade profiles observed. macOS ARM64 installed0.9.6 fresh direct WebGL/nativeCurrent/normal0 now pass43015214283. Broader native interactions and Intel execution remain final100%; no pixel parity claim. |
| F002-window-chrome | ACTIVE | F002 | One FBones title/menu row on desktop, with in-window caption controls on Windows/Linux and a macOS overlay. Linux GTK/X11 scale 1 verified through physical move, resize, window controls, project shortcuts and dirty Close. Windows WebView2 exercises real HWND state changes and dirty Close. Physical Windows drag/resize, shortcuts, Snap, additional scales, Wayland and macOS native acceptance remain open. [Evidence](research/WINDOW-CHROME-2026-11-18.md) |
| F003a | DONE | F001 | Reproducible 4.3.26 corpus inspection; distinguish proven format facts from unknowns. |
| F003a-golden | DONE | F003a | User supplied a controlled empty 4.3.26 project; framing, internal version and CRC64 verified. |
| F003b | DONE | F003a, F003a-golden | Independent minimal-profile writer and bounded canonical reader integrated in fbones-format; both match the 16 returned fixtures. General project compatibility remains future scope. |
| F003b-reference | DONE | F003a-golden | All eight Windows original-Spine cases returned successfully. Independently verified envelopes, reported checksums, exported bone changes and repacked payload/JSON equality. Envelope accepted by original Spine; semantic encoder remains pending. |
| F003b-candidate | DONE | F003b-reference | Eight independent generations accepted/exported by original Spine; artifacts independently verified and interactive opening confirmed by user. Do not repeat tests. |
| F003c | DONE | F003b | User confirmed generated .spine copy opens correctly in original Windows Spine 4.3.26. Minimal-profile compatibility only. |
| F004a | DONE | F002 | Windows native new/save/open dialogs and lifecycle confirmed by user. Linux/macOS verification stays tracked separately under F005. |
| F004b | DONE | F003b, F004a | User confirmed Windows 0.2.0 New → Save .fbones → Close → Open. Safe writes, revision guards and filesystem roundtrip tests pass. |
| F004-linked-mesh | READY90 | F004b, F222, paired DATA/UI and exact REA evidence | Direct cross-slot Linked Mesh passes codec, native history/remap and stock Spine synthetic weight checks. The current mascot opened editable with all 8 links and its edited file was accepted by stock Spine. The direct weighted animated Deform profile has its own verified child task. |
| F004-inspection-reasons | READY90 | F004b and paired DATA/UI and REA audits | Inspection shows the diagnosed Linked Mesh chain, first independently re-encoded byte difference or relevant scene/resource guard. The real browser and Session verify the chained input stays protected with a byte-identical copy. The direct control opens editable and checksum failures preserve the active project. [Evidence](STATE.md#inspection-mode-rejection-reasons-ready90) |
| F004-linked-repair | READY90 | F004-inspection-reasons, F004-linked-mesh and exact REA reference | Inspection can open a separately saved edit-ready copy when one supported chain has full byte proof. New file protection, cancellation and editable reopening passed. Both repaired payloads and stock exports match the stock flat control; a repaired Session produced the three-file game bundle. [Evidence](STATE.md#explicit-linked-mesh-chain-repair-ready90) |
| F004-path-attachment | READY90 | F004-import and paired DATA/UI and REA audits | Seven exact stock 4.3.26 projects opened editable and independently re-encoded byte for byte. The mixed Path and Region fixture passed rename, slot reorder, Save As, reopen, exact stock acceptance, and JSON/atlas/PNG loading in Dice Drop. Path constraints, Path Deform, creation and control-point editing remain open. [Evidence](STATE.md#static-path-project-compatibility-ready90) |
| F004-linked-deform | READY90 | F004-linked-mesh, F105-deform-interior-key and paired DATA/UI and REA audits | Three exact Spine 4.3.26 projects opened editable and saved unchanged byte for byte. Source and independent child key authoring passed browser, Save As and reopen. The stock CLI accepted both edited saves, and Dice Drop 4.3.13 loaded all three bundles and confirmed the intended weighted motion. [Evidence](STATE.md#direct-linked-mesh-animated-deform-ready90) |
| F004-linked-inheritance | READY90 | F004-linked-deform and paired DATA/UI and REA audits | Setup edits the existing direct Linked Mesh timeline inheritance with Undo and Redo. Existing child Deform is protected. Both saved directions exported byte-identical JSON from exact stock Spine, and the emitted FBones bundles matched 128 posed coordinates in Dice Drop. The current mascot copy restored its full payload after one link was toggled off and on. Stock binary chain repair proved direct-link flattening for one measured case. [Evidence](STATE.md#linked-mesh-timeline-inheritance-ready90) |
| F004-linked-create | READY90 | F004-linked-inheritance and paired DATA/UI and REA audits | Tree New creates same-slot and different-slot direct weighted or unweighted links in Setup. Browser verifies selection, cancellation and Undo/Redo. Both saved projects passed exact 4.3.26 CLI acceptance and Dice Drop runtime checks, preserving geometry, original keys and existing activation. Imported zero-size sources stay outside the creator profile. [Evidence](STATE.md#setup-creation-of-direct-linked-mesh-ready90) |
| F004-linked-sequence | READY90 | F004-linked-inheritance, F004-linked-create and paired DATA/UI and REA audits | Direct links preserve independent Image Sequence settings and both saved key tracks. Browser and native preview verified source inheritance and child-owned playback after disabling it. Five stock controls re-encode exactly. Seven FBones saves passed stock CLI and seven game bundles passed installed Dice Drop with exact region and PNG checks. [Evidence](STATE.md#linked-mesh-image-sequence-ready90) |
| F004-sequence-modes | READY90 | F004-linked-sequence and paired DATA/UI and REA audits | Ping Pong, Once Reverse, Loop Reverse and Ping Pong Reverse preserve exact 4.3.26 mode fields and receiving frame behavior. Graph editing and Undo passed in browser. Stock accepted both native saves and Dice Drop confirmed both exported bundles, including source-hidden linked playback. [Evidence](STATE.md#image-sequence-direction-modes-ready90) |
| F004-linked-slot-color | READY90 | F004-linked-mesh supported codec slice and paired DATA/UI review | The current mascot's 128 split-mode entries, 24 RGB2 and 120 alpha lanes survive byte-exact roundtrip, preview and edited save/reopen. RGB is linear with Tint Black disabled in this profile, Alpha preserves linear/cubic curves. Imported lanes are read-only. Game export reproduces the optimized stock bundle's color sampling. |
| F004-animation-folders | READY90 | F004-linked-mesh supported codec slice and paired DATA/UI review | The mascot's one-level folder, clip ownership, flat clip order and editor hierarchy survive byte-exact roundtrip, edit, save/reopen and stock CLI. Both qualified names work in the existing selector and game runtime. Deeper folder profiles remain open. |
| F004-import | WAITING | F004b | Actual mascot now typed/editable:125bones/24slots/22PNGs/2clips/79constraints; all223769payload bytes independently regenerated. Source metadata/Slot8/known source-state retained with native stable-ID remap, no guard bypass. Real workspace Setup/key/history/Refresh/portableSaveCloseOpen pass; independent43075f32/195string/ref/22PNG preservation.324native/103Scene/16default/95legacy/406JS;111UI discovered0run(serverEPERM). User now reports working import; latest114UI and Windows80c71cc0normalstartup are tracked under F105-reliability. Fresh original4.3.26 acceptance remains pending. Earlier source-proof/cleanup limits retain their named checkpoint; current results live in STATE. |
| F005a | READY90 | F002 | Published0.9.6 CIbuilds/packagechecks plus actual LinuxDeb/AppImage full installed-upgrade profiles, Windowsx64/macOSARM64 clean90 upgrades and fresh nativeWebGL/version/normal0 now accepted. Expanded native gestures/Intel execution/signing/notarization stay final100%; exact scope in STATE. |
| F005b | READY90 | F004b, F005a | Native install/upgrade closeout accepted: Debianfull42679060912, AppImagefull43001332547, macOSARM64clean90 43015214283, Windowsx64clean90 43022013711. Win/Macclean90 prove actual signed replacement/automatic new identity/old-auto-fresh0/freshstartup andunchangeddiskbinary, notnativeprojectpersistence. Broaderinteraction/current-panel/Intel/signing rows remain final100%; all consumed negative routes retained. |
| F005-win | DONE | F001 | Actual Windows x64 release executable built using LLD, cached SDK and a strict resource writer. Portable WINDOWS_TEST folder assembled; PE/resources/imports checked. Native Windows launch with an active FBones window is now observed through W:. |
| F005-csp | DONE | F005-win | Strict-CSP failure reproduced and fixed; actual viewport entry passes the restriction, renderer/IPC errors separated, Windows 0.1.1 rebuilt. User confirmed application opens successfully. |
| F005-ui-linux | DONE | F005-csp | Routine UI regression moved to Ubuntu Playwright:16 real Chromium tests pass, including isolated production Rust Session authoring/history/binary Save/Close/Open, clipping/IK/Transform/Physics frozen placement; exact production CSP and strict test TypeScript. Snapshot in analysis/playwright-linux-check.json. Native OS checks remain distinct. |
| F005-linux-smoke | DONE | F005-ui-linux | Actual current0.8.2 debug Linux GTK/X11 window observed viewable with frontend renderer=webgl, PID829352/window0x600003, then handed to user. This is startup only; packaged-release and native-dialog lifecycle acceptance remains open under F005a/F005b. |
| F005-shared | DONE | F005-win | Desktop app/folder shortcut targets independently parsed; user confirmed app launch via shared UNC workspace. Builds/results no longer need copying. |
| F101 | DONE | F004b | User confirmed Windows creation, dragging and parenting; all four extended cases accepted/exported in original Spine. Independent artifact checks and canonical equality pass. Undo/redo and persistence pass automated tests; scale/shear remain outside scope. |
| F102 | DONE | F101 | 0.4.0 PNG import, slot binding/visibility/transforms, draw order, viewport sprites, history and resource-safe persistence implemented. Eight codec cases and the actual native Windows import/save/close/reopen flow pass; the UI-saved project is accepted/exported by original Spine. |
| F102-codec | DONE | F101 | Eight regions-v1 cases accepted/exported by original Spine; decoded payloads match controlled original imports outside identity. Slots, hidden regions, transforms, bone binding, independent inventory/draw order and Unicode covered. |
| F102-assets | DONE | F102-codec | Native PNG validation/cache; safe relative image resources, missing images, collision protection and Save As copying; include failure tests. |
| F102-ui | DONE | F102-assets | Import PNG, slot hierarchy/inspector, binding, visibility, draw order and viewport sprites; integrated history/save/reopen tests. |
| F103 | DONE | F102 | Vertex/edge editing, constrained triangulation, soft selection, mesh rendering, history and persistence. Fourteen original-Spine cases and actual Windows UI save/reopen passed. |
| F104 | DONE | F103 | Multi-bone binding, auto/normalized/numeric weights, brush modes and skinning. Windows stroke/drag undo, posed save/reopen and original-Spine export of the UI-created file passed. |
| F104-ui | DONE | F104 | Compact gray Setup workspace matching the supplied layout; resizable Weights/Mesh Tools, combined Tree/Properties, draw-order tab and Views controls. Actual Windows screenshot inspected. |
| F005-images | DONE | F005-win | Immutable per-build Windows image path and launcher without anonymous stream pipes; separate build paths keep previous running images intact. Two Python delivery tests, two native-bootstrap tests and actual launch/lifecycle passed. The stable root launcher preserves existing EXE shortcuts without Desktop writes. |
| F200 | DONE | F104 | Folder-backed Images tree with subfolders, browsing creates no slots, drag into viewport/bone creates slot+attachment; no Import PNG toolbar; persistence and safe Save As. |
| F201 | DONE | F103 | Contextual bottom Mesh Modify/Create/Remove toolbar, connected point/edge creation by click/drag, setup-vs-deformed semantics and live preview. |
| F201-mesh-display | READY90 | F201, paired display DATA/UI and REA audit | Setup Mesh Triangles, Dim and Isolate work on the inspected attachment, including inactive alternatives. Browser pixels confirm manual guides, half-opacity artwork, inherited clipping and hidden hit targets. Save and mode changes retain the settings. Close/Open resets them. No authoring IPC during toggles. Exact Linux defaults and mask effects remain open. [Display result](#mesh-edit-display-controls) |
| F201-mesh-new-outline | READY90 | F201, paired Mesh New DATA/UI and REA audit | Setup New draws on the full inspected image and commits one outline. Contextual Reset restores a quad. Concave replacement, rejection, Escape, an inactive target, Undo and portable reopen passed. Exact Spine Linux behavior remains open. [Outline result](#mesh-new-outline-and-reset) |
| F201-mesh-draft-points | READY90 | F201-mesh-new-outline, paired DATA/UI and REA audit | Drag repositions any point. Double-click removes a non-closing point and Shift-click removes any point. The browser fixture verified a canceled held gesture, outside release, exact surviving point order, one native commit and Undo. Exact Spine Linux first-point precedence remains open. [Draft point result](#mesh-outline-draft-points) |
| F201-mesh-wireframe | READY90 | F201-mesh-display, paired DATA/UI and REA audit | The Setup mesh inspector has per-attachment Wireframe. Browser pixels verify weighted-mesh guides after deselection, inactive siblings, clipping, Show Images, Isolate and independent Triangles. Save keeps the setting and reopen clears it. Exact Spine persistence remains open. [Wireframe result](#mesh-wireframe-property) |
| F201-mesh-property-transform | WAITING | F201-mesh-new-outline, paired DATA/UI and REA audit | Reset deformation and Freeze are visible and disabled for one inspected Setup mesh. Browser checks verify their accessible descriptions, selection scope, unchanged history and the working Edit Mesh quad Reset. Wiring awaits stock action evidence. [Result and limits](#mesh-inspector-freeze-and-reset) |
| F202 | DONE | F201 | Smart outer alpha contour trace with shadow-ignore threshold, tolerance, spacing, budget, preview/apply/cancel and persistence. |
| F202-stock-trace | ACTIVE | F202, paired DATA/UI and REA audits | Optional Padding and separate Generate reach READY90 in their supported FBones profiles. Exact Linux wire evidence covers inset and border hulls and distinguishes authored manual edges from other face edges. Stock Trace and Generate geometry, defaults and parameter storage remain open. [Scope](#spine-informed-mesh-generation) |
| F202-trace-precise-outline | READY90 | F202-stock-trace, paired DATA/UI and REA audits | Precise Alpha ignore, Padding, Tolerance, Spacing and Vertices max fields use the native ranges. Browser checks verify 127/128 geometry, stale preview rejection while invalid, same-value recovery and one Apply/Undo. Exact stock threshold equality remains open. [Result](#precise-trace-outline-controls) |
| F202-trace-apply | READY90 | F202-trace-precise-outline, paired UI/DATA review | Trace Apply pins the target and parameters and locks conflicting controls until acknowledgement. Held preview cancel, retryable pre-dispatch failure, successful commit with one Undo and genuine Rust stale revision rejection passed. Exact stock pending behavior remains open. [Result](#trace-apply-transaction) |
| F202-trace-stock-controls | WAITING | F202-stock-trace, paired UI/DATA review | Detail, Concavity and Refinement appear in Planned. Refresh is disabled. Browser checks cover narrow layout, accessible descriptions and zero requests from disabled Refresh. Wiring awaits stock control and geometry evidence. [Presentation result](#planned-trace-controls) |
| F202-trace-padding | READY90 | F202-stock-trace, paired DATA/UI and exact Linux REA audit | Trace slider and numeric entry apply 0–32 source px within the texture. Zero preserves existing geometry and Inner uses the original source pixels. Scene, Legacy, MCP schema and 18 real-session CSP cases passed. Stock Padding metric and bounds remain open. [Padding result](#trace-padding-in-fbones) |
| F202-mesh-generate | READY90 | F201, paired Generate DATA/UI and exact Linux REA audit | Setup generates interior vertices on the explicit unweighted Mesh, preserving original rows, hull, edges and face-local texture mapping. Inactive selection, repeated Generate, per-operation Undo, binary reopen, stale leases and live or stored Deform guards pass. Production CSP passed all 20 cases. Exact stock placement remains open. [Generate result](#mesh-generate-in-fbones) |
| F203 | DONE | F202 | Inner trace: image detail/straight structure and surface points, threshold/tolerance/spacing controls, bounded constraints and transparent areas. |
| F203-inner-contrast | READY90 | F202, F203, paired DATA/UI and REA audits | Optional detail recovers all 720 opaque and 665 visible rim samples in the paired dense controls. Texture-only controls have zero explicit edges. Exact Outline keeps all 20 notched hull vertices in both modes at cap 24. Scene/Legacy, nine production UI checks and Linux WebGL handover pass. Stock Outline numeric behavior and broader texture coverage remain open. [Acceptance](#optional-contrast-detail) |
| F204 | DONE | F201 | Metric-aware constrained triangle quality; avoid gratuitously long/slender edges, recalculate while defining setup geometry. |
| F205 | DONE | F101 | B creates; click existing bone selects creation parent; empty click creates small bone; dragging draws; Escape cancels/selects translation. |
| F206 | DONE | F101 | Bottom Translate/Rotate/Scale/Shear/Pose/Length tools with full affine persistence and image/skinning transforms. |
| F207 | DONE | F101 | Explicit Enter property commits, blur dedup, invalid fields block save; Escape discards a staged edit. |
| F208 | DONE | F206 | Ctrl/Shift/marquee bone selection; hierarchy-aware atomic group translate/rotate and other transforms. |
| F209 | DONE | F206 | Pose changes orientation without stretching; length edit is a distinct setup tool. |
| F210 | DONE | F206 | Saved bone/slot colors and optional automatic related child hues, no invented binary auto-color tag. |
| F211 | DONE | F207 | Rename bones via Name, F2 or tree double-click with persistence/history. |
| F212 | DONE | F208 | Tree drag-and-drop bone reparent and slot reassignment preserving world appearance and preventing cycles. |
| F213 | DONE | F104 | Draw-order drag-and-drop, front/back semantics and persistence. |
| F214 | DONE | F200–F213 | Focused tests, new controlled 4.3.26 comparisons, actual Windows interactions/save/reopen, final current app opened and continuation docs updated. |
| F215 | DONE | F214 | Images Ctrl/Cmd toggle and Shift range selection; drag selected assets together, preserve destination bone, atomic batch placement/history/save. |
| F216 | DONE | F215 | Fix actual Windows HTML5 mouse drag/drop; verify real mouse gestures, not just constructed DOM DataTransfer events. |
| F217 | DONE | F214 | Explicit Individual/Group multi-bone rotation with equal angular delta, stable hierarchy/world math, undo and persistence. |
| F218 | DONE | F217 | Interactive constant-screen-size rotate radius/ring, independent local Scale axes and explicit World Shear handles with hover/drag feedback. |
| F219 | DONE | F217 | Compact X/Y/rotation/length/scale/shear fields centered at viewport bottom; explicit Enter/blur/save/Escape and responsive layout. |
| F220 | DONE | F215–F219 | Focused tests, actual Windows interactions/save/reopen, build delivery, visual inspection, final app launch and updated continuation notes. |
| F221 | DONE | F214 | Two reference audits: three new original-4.3.26 A/B/none cases prove two attachments owned by one slot and one nullable active reference; primary documentation/UI evidence classified separately. Current codec safely rejects the broader profile. |
| F222 | DONE | F220, F221 | Bounded canonical Scene inventory/active A/B/none, ownership, existing-slot placement and direct Region/Mesh raw image-path editing accepted; empty fallback, exact loaded PNG keys, inactive alternatives, stored geometry/bindings and portable history retained. Linux39/39,150native/93legacy and Windowsa067 three WebView2/native-dialog groups pass. New source537d passes original JSON structure and stored96×96 current-pose PNG rendering; differing runtime JSON dimensions remain explicit, original GUI swap semantics unproven. Unknown structures remain inspection-only; see analysis/f222-path-original-check.json and paired size reports. |
| F222-creation-controls | DONE | F222, paired Setup DATA/UI evidence | Tree New includes six disabled planned creation entries in Setup. Narrow keyboard/disabled interaction and native snapshot pass, 129 distinct suite cases pass. REA trace and owned Linux WebGL launch retained. [Evidence](research/SETUP-TREE-CREATION-CONTROLS-2026-11-18.md) |
| F300 | DONE | F220 | White transient Tree/Weights hover, retained cyan influence, guarded lifecycle/focus and no history/RPC; actual Windows pixels/interactions plus original4.3.26 reference checked. Evidence in docs/tasks/F300-hover-highlight.md and analysis/qol-blend-ui-check.json. |
| F301 | DONE | F222 inventory | Visible/inactive/hidden Region/Mesh/Clipping groups, real inventory previews/gizmos, movable pivot, atomic transforms/history; five new Windows groups plus ScaleY annex and fresh original export accepted. See docs/tasks/F301-scene-image-multiselect.md. |
| F302 | DONE | F220 | Bounded topology Auto, selected vertex/influence scopes, group Direct/transient locks/new-row binding policy accepted. Scoped UI e346 passed one new original export and independent binding checks, Linux27+saved-artifact test and Windows83e5 four groups; retained in finalF30935-test suite/currentbe1bc. Proprietary numeric/brush/insertion parity remains explicitly unknown; see docs/tasks/F302-auto-weights.md. |
| F303 | DONE | F222 | Combined Tree category/search/collapse projection, latent selection and source-aware hover cleanup; no native mutation. Actual Windows filters and cleanup pass; see docs/tasks/F303-tree-filters.md. |
| F304 | DONE | F220 | Four exact blend enums and independent RGBA, Sprite/weighted Mesh GPU pixels, Undo/Redo/native reopen, final original4.3.26 export independently checked. Evidence in docs/tasks/F304-slot-blending.md and analysis/qol-blend-ui-check.json. |
| F305 | DONE | F222 inventory | Canonical clipping range/polygon/whole transforms plus real dense weighted authoring, inactive editing, Direct/brush/history/save and deformed concave-mask comparison accepted in0.8.2; seven Windows groups and1,082,200 pixels, zero mismatches. See docs/tasks/F305-clipping.md for profile/limits. |
| F306 | DONE | F220 | One/two-link IK, separate authored/evaluated pose, target dragging/skinning, controls, ordering/persistence; self/descendant targets rejected atomically at every boundary. Supported profile verified numerically and on Windows; see docs/tasks/F306-ik.md. |
| F307 | READY90 | F220 | Accepted37static/990dynamic retained; moving-parent residuals3.35184/2.24952step and1.26276ramp unchanged. Consumed memory/PSS/debugtransportnegatives retained; strictcontroller7 notcapabilityPASS. BoundedinstalledLinuxinventoryae256STOP: runtime2 unchangedSIGSEGVsnotrepeated; runtime1 exacteditorbindingUNKNOWN. No identifiedcallertimingprovider; no originalrerun/solver/clock/boundschange. Remaining phase/caller fidelity deferred to final100%; milestone90%accepted2026-11-11. See STATE. |
| F308 | READY90 | F220 | Deliveredselectedexclusion/extendedMixguard retained123UI+6Windows. ActiveLocalWorld/WorldLocal/WorldWorld Offset+Props observed; WWOffsetfrozenpredictorUNCLASSIFIED(existinginverseSourceomitted), retrospectivemodelseparate. CachedWW15requests/rawDTO/history/SaveCloseOpen/EOF0: Offset2/6exact/max0.00048828125, Props11/48/max0.0000457764, unchanged0.0005. SaveOnlyattempt openedOpen bycoordinateerror; negative/noSaveproof, separateowncleanupnormal0. Precision/Additive/Physics/suffix/manualfidelity deferred to final100%; milestone90%accepted2026-11-11. No mathfit. See STATE. |
| F307-final | TODO | Final100%pass | Resolve moving-parent phase/timing with a new identified direct caller observation; reuse37static/990dynamic and all useful negative routes. Do not reopen at90% milestone. |
| F308-final | TODO | Final100%pass | Revisit exact World arithmetic/span precision, Additive/Physics/suffix choices and fresh Save-only probe after diagnosed coordinate correction; preserve all original/native evidence and authoring guards. Do not reopen at90% milestone. |
| F309 | DONE | F222 inventory | P group picking via Tree/viewport, usable New, parent-tip guides, no Project metadata, tapered bone icon/projected hierarchy, explicit constraint Views and movable/two-axis-resizable docks. Linux35/35, native145/93, one original P-source comparison and five Windowsbe1bc groups; actual normal user82772 opened. Authored-space/slot-isolation/dock policies explicit; docs/tasks/F309-parenting-tree-docking.md. |
| F310 | DONE | F220, F309 | Product delivered2688a874: selected B/C/D create3 independent Physics in one history action without Target modal; generated names follow bone rename/custom names persist. Active preset, colored sliders+precise fields, live Setup A-drag reaction/settling before Save/Reset and explicit Off/non-baking persistence pass63/63 LinuxUI,200native/93legacy/28Scene,225JS+1knownskip and5actualWindows groups/native OS SaveCloseOpen. ONE new sourceab9e now passes exact original4.3.26 export and independent105Physics/32bone/24child-bit comparison; original gestures/phase remain outside this bounded authoring scope. See docs/tasks/F310-physics-authoring.md and analysis/physics-batch-delivery-check.json. |
| F105 | WAITING | F222 | Full Animate/timeline scope stays open. Supported release-drag/playback/numeric corrections pass F105-reliability; runtime preview tracked F109-runtime. Current114UI/416JS/326native/95legacy/16default/103Scene checks pass with existing skips distinct. Mascot/source-profile evidence retained; remaining curves/inheritance/budgets/Path/original/macOS/mixing/onion-skin fidelity remain. See STATE and F105. |
| F105-workspace-controls | DONE | Paired Animate DATA/UI evidence | Persistent Graph and Timing groups reuse existing commands, with disabled Favor/Presets/Adjust. Production-CSP toolbar, narrow plot alignment, keyboard, Store/Swap, Shift and Offset checks passed the grouped round. [Evidence](research/ANIMATION-WORKSPACE-CONTROLS-2026-11-18.md#persistent-timeline-controls) |
| F105-ghosting | ACTIVE | F105-workspace-controls, paired DATA/UI and REA audits | Frame/key-frame ghosts, direct slot-owner Lock/Refresh, Region/Mesh vectors and independent fill/outline modes. Solid, Silhouette and X-ray pass clipped, mirrored and alpha-zero pixel checks. Grouped 510 JavaScript, 50 of 51 initial UI and all three affected Ghosting cases after the shader correction. Simulated Physics and exact 4.3.26 effects remain open. [Evidence](research/GHOSTING-2026-11-18.md#attachment-fill-and-outline-reference) |
| F105-preview-tracks | ACTIVE | F105-workspace-controls, paired DATA/UI and REA audits | Additive, mute, Setup docking, Hide controls and local Show bones retain their verification. Grouped CSP/Rust UI verifies Play current animation on independent track 0, upper track retention and unchanged editor playback and project state. Exact Linux settings interactions and mixer behavior remain open. [Evidence](research/PREVIEW-TRACKS-2026-11-18.md#preview-view-settings) |
| F105-graph-tools | ACTIVE | F105-workspace-controls, paired DATA/UI and REA audits | Store/Clear/Swap, filtering and guide alignment acceptance retained. Favor/Blend for visible bone curves and Flat/Ease In/Ease Out passed grouped staging, working-pose, native history and adjacent-handle checks. Exact numeric behavior, additional modes, Bézier breakdown insertion and other timeline families remain open. [Graph evidence](research/GRAPH-TOOLS-2026-11-18.md#favor-and-presets-reference-gate) |
| F105-graph-selection | ACTIVE | F105-graph-tools, paired DATA/UI and REA audits | Curve-first and all-shown selection of keys or live Bézier handles, focus, Frame and scoped right-click visibility passed the prior 162 production-CSP UI and 483 JavaScript cases. Handle marquee and grouped tangent slices are READY90. Exact transitions and Deform handle scope remain open. [Selection evidence](research/GRAPH-TOOLS-2026-11-18.md#graph-key-and-handle-selection-gate) |
| F105-graph-handle-marquee | READY90 | F105-graph-selection, paired DATA/UI and exact REA geometry | Seeded Ctrl/Cmd-drag selects rendered Bézier handles in the originating Graph pane. Stacked scrolled selection, key and handle origins, Escape rollback, Frame, preserved Current and zero native edits pass. Linux WebGL handoff verified. Exact stock additive selection remains open. [Marquee evidence](research/GRAPH-TOOLS-2026-11-18.md#graph-handle-marquee-gate) |
| F105-graph-grouped-tangents | READY90 | F105-graph-handle-marquee, paired DATA/UI and REA audits | Group drag previews normalized handle placement and merges the selection into one native Undo. Mixed bone/RGBA, same-owner controls, cancellation, Current, and Linux WebGL handoff pass. Exact stock transfer and modifiers remain open. [Grouped evidence](research/GRAPH-TOOLS-2026-11-18.md#grouped-bézier-handle-drag-gate) |
| F105-graph-delete-splice | READY90 | F105-graph-tools, paired DATA/UI and exact REA exports | The shared Delete command reconnects the surviving Rotate curve after an isolated Stepped key deletion. Exact fixture, other keys, Current, Store, one Undo/Redo, portable reopen and Linux WebGL handoff pass. Other families and deletion patterns remain open. [Delete evidence](research/GRAPH-TOOLS-2026-11-18.md#rotate-delete-tangent-gate) |
| F105-ordinary-bone-key | READY90 | F105-graph-tools, paired DATA/UI and REA audits | Row Key, viewport Key and K use one native Bézier subdivision edit. Stepped continuation, sibling drafts, stable predecessor and Current pass with Linux WebGL handoff. Exact stock rounding and viewport Auto Key remain open. [Insertion evidence](research/GRAPH-TOOLS-2026-11-18.md#ordinary-bone-key-insertion-reference) |
| F105-auto-key-interior | READY90 | F105-ordinary-bone-key, paired DATA/UI and REA audits | Numeric and viewport Auto Key subdivide Bone Bézier at Current. Live drag preview, clean lanes, frozen pose, stale cancellation and one native Undo pass with Linux WebGL handoff. Stock interaction and rounding remain open. [Auto Key evidence](research/GRAPH-TOOLS-2026-11-18.md#auto-key-interior-follow-up) |
| F105-light-rgba-key | READY90 | F105-graph-tools, paired DATA/UI and REA audits | Slot color Key and numeric Auto Key subdivide light RGBA Bézier at Current in one edit. Clean lanes, signed zero, stable IDs, Undo/Redo, portable reopen and Linux WebGL startup pass. Exact stock insertion remains open. [RGBA evidence](research/GRAPH-TOOLS-2026-11-18.md#light-rgba-keying-follow-up) |
| F105-constraint-interior-key | READY90 | F105-graph-tools, paired DATA/UI and REA audits | Key and Auto Key subdivide IK, Transform and scalar Physics Bézier at Current. IK flags, clean signed-zero lanes, Physics Reset, Undo/Redo, portable reopen and Linux WebGL startup pass. Stock insertion and rounding remain open. [Constraint evidence](research/GRAPH-TOOLS-2026-11-18.md#constraint-interior-key-gate) |
| F105-deform-interior-key | READY90 | F105-graph-tools, paired DATA/UI and REA audits | Explicit Deform Key normalizes Bézier progress at Current. Dense Mesh offsets, numeric draft, one native edit, Undo/Redo, portable reopen, signed Clipping progress and Linux WebGL startup pass. Exact stock insertion and extreme overshoot rounding remain open. [Deform evidence](research/GRAPH-TOOLS-2026-11-18.md#deform-key-interior-follow-up) |
| F105-deform-vertex-autokey | READY90 | F105-deform-interior-key, paired DATA/UI and REA audits | Mesh drag and numeric Clipping Auto Key subdivide Bézier at certified Current. Scratch preview, dense offsets, one Undo, portable reopen, stale rejection and Linux WebGL startup pass. Exact stock interaction and extreme-curve rounding remain open. [World vertex Auto Key evidence](research/GRAPH-TOOLS-2026-11-18.md#world-vertex-deform-auto-key-follow-up) |
| F105-key-shown-deform | READY90 | F105-deform-interior-key, F105-timeline-row-controls, paired DATA/UI and REA audits | Filtered Dopesheet Deform and the live Graph progress curve key the sampled pose. One mixed Undo, hidden owners, repeat, atomic rejection and Linux WebGL startup pass. Exact stock row eligibility remains open. [Deform scope](research/GRAPH-TOOLS-2026-11-18.md#key-shown-deform-follow-up) |
| F105-key-shown-sequence | READY90 | F105-key-shown-deform, paired DATA/UI and REA audits | Shown Sequence rows support aligned Loop keying, mixed atomic phase rejection and explicit draft restart. Hidden rows, Graph filtering, one Undo and Linux WebGL startup pass. Exact stock eligibility, extreme rounding and derived preview tails remain open. [Sequence scope](research/GRAPH-TOOLS-2026-11-18.md#key-shown-sequence-follow-up) |
| F105-curves-view | ACTIVE | F105-graph-selection, paired DATA/UI and REA audits | Independent Curves covers bone, light RGBA, IK, six Transform, scalar Physics and Deform progress, with terminal fallback and mixed selection. Named presets and explicitly picked group handles use atomic edits. Automatic, Separate, Bounce and exact original interactions remain open. [Curves evidence](research/GRAPH-TOOLS-2026-11-18.md#independent-curves-view-gate) |
| F105-curves-deform | READY90 | F105-curves-view, F105-deform-interior-key, paired DATA/UI and REA audits | Scalar progress, terminal fallback, same-frame drafts in Curves and Graph, dense words, one mixed preset Undo and Linux WebGL startup pass. Exact stock Curves behavior remains open. [Deform Curves scope](research/GRAPH-TOOLS-2026-11-18.md#independent-curves-deform-follow-up) |
| F105-curves-grouped-handles | READY90 | F105-curves-view, F105-curves-deform, F105-graph-grouped-tangents, paired DATA/UI and REA audits | Explicit handle picks, Rotate and Deform transfer, one pointer or keyboard edit, Escape, incompatible-peer rollback and Linux WebGL startup pass. Exact stock behavior remains open. [Grouped Curves scope](research/GRAPH-TOOLS-2026-11-18.md#grouped-handles-in-curves-follow-up) |
| F105-graph-display | ACTIVE | F105-graph-tools, paired DATA/UI and REA audits | Exact Linux root evidence covers Setup offsets, both Scale percentages and eleven handle centers. FBones projection, inverse gestures and signed-zero transport passed the grouped round with 469 JavaScript, 380 desktop Session and 144 UI cases. Translate Y, parented and exact input observations in Spine remain open. [Evidence](research/GRAPH-TOOLS-2026-11-18.md#setup-adjusted-display-evidence) |
| F105-graph-repeat | ACTIVE | F105-graph-display, paired DATA/UI and REA audits | REA confirms dim exterior Scale X repeats independent of Store and a visible pre-zero arrow. FBones authored clip period, off-state holds, pre-zero origin and unchanged native state passed the grouped UI round. Sparse period, exact Repeat-off appearance and arrow interaction in Spine remain open. [Evidence](research/GRAPH-TOOLS-2026-11-18.md#repeat-and-unkeyed-extensions) |
| F105-timeline-row-controls | ACTIVE | F105-workspace-controls, paired DATA/UI and REA audits | Lock, Refresh, Select and per-tab filters retained. Scoped Key Shown supports Bézier splits and mixed atomic history, including live Deform progress and phase-preserving Sequence. Exact reference eligibility, trigger tracks and signed-zero dark colors remain open. [Evidence](research/GRAPH-TOOLS-2026-11-18.md#key-shown-reference) |
| F105-timing-adjust | ACTIVE | F105-timeline-row-controls, paired DATA/UI and REA audits | Captured viewport Adjust supports a constraint-free single bone, Rotate, local Translate and Scale, split axes, cancellation and one native Undo. Full 151 UI and final 16 targeted cases passed. Active exact gestures, adjacent Bézier and multi-bone scope remain open. [Evidence](research/ANIMATION-WORKSPACE-CONTROLS-2026-11-18.md#dopesheet-adjust-reference) |
| F105-timeline-click-navigation | ACTIVE | F105-timeline-row-controls, paired DATA/UI and REA audits | Exact Dopesheet click advances Current, three key drags preserve it, and Graph and both Swap states retain it. Independent local Jump to Key and Jump to Frame preferences passed 475 JavaScript and 153 UI cases, including clean release, zero-result drag, scrolled fractional seek and same-frame working-pose preservation. Direct Graph key clicks, original defaults and marquee remain open. [Evidence](research/ANIMATION-WORKSPACE-CONTROLS-2026-11-18.md#timeline-click-navigation-gate) |
| F105-dopesheet-selection | ACTIVE | F105-timeline-click-navigation, paired DATA/UI and REA audits | Two-stage Ctrl/Cmd+A, additive retained boxes and atomic timing scale passed seven targeted UI checks and 384 native cases. The full run passed 154/156 and both Sequence request timeouts passed on the same build in isolation. Positive linear/stepped bone scale and linear reversal are supported. Exact Spine gestures, affected Bézier and non-bone retiming remain open. [Selection gate](research/ANIMATION-WORKSPACE-CONTROLS-2026-11-18.md#dopesheet-selection-gate) |
| F105-dopesheet-sync | ACTIVE | F105-timeline-row-controls, paired DATA/UI and REA audits | Both Sync directions in tabs passed the grouped 159 UI and 480 JavaScript cases. Exact leading control placement retained. Live axes, selected Dopesheet keys, empty source, Off restore, scoped Key Shown and one Undo verified. Stacked alignment and selection passed F105-stacked-timelines. Exact original active settings and simultaneous axes remain open. [Sync gate](research/ANIMATION-WORKSPACE-CONTROLS-2026-11-18.md#dopesheet-sync-gate) |
| F105-stacked-timelines | ACTIVE | F105-dopesheet-sync, paired DATA/UI and REA audits | Optional stacked Graph and Dopesheet share one transport and link their time axes with Sync. Two-pane alignment, independent Off cameras, active pane focus, selection source, one native drag and Undo passed. Grouped 483 JavaScript, 159/160 full UI, and final 17 affected UI checks passed after fixing tangent dispatch. Linux WebGL handover verified. Exact original stacked geometry and open Rows/Toolbar settings remain open. [Stacked gate](research/ANIMATION-WORKSPACE-CONTROLS-2026-11-18.md#stacked-timelines-gate) |
| F105-view-settings | ACTIVE | F105-stacked-timelines, paired DATA/UI and REA audits | Rows and Toolbar per-view preferences, linked gutter, keyboard settings, marquee, default migration and reload passed 161 production-CSP UI and 483 JavaScript cases. Native snapshot unchanged. Linux WebGL startup verified. Exact 4.3.26 menu contents and original persistence remain open. [Rows and Toolbar gate](research/ANIMATION-WORKSPACE-CONTROLS-2026-11-18.md#rows-and-toolbar-gate) |
| F105-timing-shift | ACTIVE | F105-workspace-controls, paired DATA/UI and exact Linux REA audit | Exact Dopesheet toolbar Shift moves the selected property row’s later keys. FBones shares the native atomic move through Graph, Dopesheet and MCP. All 137 UI cases and 375 native cases pass. Both exact Linux Alt sequences produced plain Move. Modifier delivery, multi-row reference scope and edge policies remain open. [Evidence](research/TIMING-SHIFT-2026-11-18.md) |
| F105-timing-offset | ACTIVE | F105-workspace-controls, paired DATA/UI and exact Linux REA audit | Full-range closed bone-row Offset in Graph, Dopesheet and MCP. Two FBones saves accepted and exported by the stock Linux Spine CLI. First phase maximum value error 0.00002, repeat exact measured fields. 138 UI and 379 native cases pass. REA pins the two prior explicit Loop exports and the regenerated exterior handle times. The general rule, explicit Loop wiring, modifier and other timeline families remain open. [Evidence](research/TIMING-OFFSET-2026-11-18.md) |
| F105-timing-offset-explicit-loop | READY90 | F105-timing-offset, floating viewport tools, paired DATA/UI and exact Linux REA audit | Both f6–24 replays match the stock seam values and handles within 0.00005. Selected f21 wraps to f9, Current holds at 24, changing bounds or pressing Escape cancels, and one Undo restores the input. Native exact continuation, history and imported exteriors pass. All 23 scoped real-session UI cases and Linux WebGL startup pass. Asymmetric exterior placement and one-sided bounds remain open. [Explicit Loop result](research/TIMING-OFFSET-2026-11-18.md#explicit-loop-offset-fbones-result) |
| F105-reliability | DONE | F105 supported slices | Frozen baseline fixes release delta, stable input fixes selection loss; subtreeCPU4×/timelineCPU13.55×/viewport2→1draws, no whole-appFPS claim. Beta5 semantic mode/index/authored-f32-delay no-op prevents unchanged Graph-key blur consuming Undo; recursive native-menu lookup restores capability states. Fresh local114/114UI nofail/skip/retry,418JS+oneknownskip,runtime16+24samples(residual6.36e-7) pass. OwnWindows8f65102a native-menu6groups pass with OS SaveAs/Export/inspection copy/Close, then normal close. Final39efc9c1 selected/startup observed; onlykeyguard differs from menuQAimage, no final-image native gesture claim. Prior drag/native checks retain their named image bounds. User mascot window protected. Source/profile/original limits and fullF105 remain open; see STATE and paired gates. |
| F105-playback-performance | READY90 | Paired DATA/UI and REA audits | WSLg software Skia fallback in desktop build `334ea331cffd` gives 19–20 ms Play p95 with Preview visible on X11 and Wayland. The X11 override gives 56–62 ms on the same build. Raster parity, clock, project snapshot and file bytes pass. The fallback is automatic only on matching WSLg displays without `/dev/dri`. Stock Play timing and hardware-accelerated Linux, Windows and macOS cadence remain open. [Evidence](research/PLAYBACK-PERFORMANCE-2026-11-18.md#wslg-software-painting) |
| F105-playback-mascot | READY90 | F000-core-workflow, F105-playback-performance and paired DATA/UI | The current mascot uses less JavaScript time per frame in Chromium. The same current native binary measured 29 ms warmed Play p95 with automatic WSLg X11 CPU painting and 63 ms with the explicit off control. Clock, full authored snapshot, source bytes and six paired rasters passed. Remaining native slow frames and Windows/macOS cadence stay open. [Evidence](research/PLAYBACK-PERFORMANCE-2026-11-18.md#current-mascot-playback) |
| F105-playback-mesh-batching | WAITING | F105-playback-mascot and paired DATA/UI | Native draw suppression isolated a partial Preview cost. The 101–256 vertex batching trial passed Chromium on the current mascot, then hit two native inspector timeouts applying the loaded project before Play. The verified prior renderer and complete build assets were restored. Reopen this route with a new discriminator for the native render/inspector failure. [Evidence](research/PLAYBACK-PERFORMANCE-2026-11-18.md#native-webgl-submission-on-the-current-mascot) |
| F105-playback-position-upload | READY90 | F105-playback-mascot and paired DATA/UI | Retain identical finite projected Float32 positions. Native `control/culoare_lumina` eliminated 20 direct uploads and 21,632 bytes per RAF across both canvases. `anticipation` had zero repeated vertex payloads and remains a separate performance case. Warm cadence results varied. Exact clock, authored data and functional mesh, Deform, clipping and GIF regressions passed. [Evidence](research/PLAYBACK-PERFORMANCE-2026-11-18.md#exact-projected-position-uploads) |
| F105-playback-artwork-group | DONE | F105-playback-mascot, F105-playback-position-upload and paired DATA/UI | Closed native experiment. Separate main artwork instructions reduce `anticipation` index traffic from 48,552 to 44,341 B/RAF with one extra draw and no demonstrated cadence gain. Six paused rasters matched exactly and clock/Session integrity passed. Restored the verified renderer. Retained the new Ghosting On top raster assertion. [Evidence](research/PLAYBACK-PERFORMANCE-2026-11-18.md#isolated-artwork-instructions) |
| F302-auto-weights-rea | WAITING | F302, paired DATA/UI and REA audits | Exact Linux REA confirms `Editor` and `s/bbl` on the same worker and JNI loader in one owned boot. Automatic cybersecurity review rejected the follow-up JVM method-instrumentation step. That step stopped. Retained authored artifacts and public evidence remain available. The stock method and sample construction are unresolved. [Evidence](tasks/F302-auto-weights.md#native-input-layout-and-remaining-discriminators) |
| F302-weights-swap | READY90 | F302, paired DATA/UI and historical exact controls | Swap exchanges two selected unlocked influence words across the inspected Mesh or Clipping, with active sibling, binding positions and other weights preserved. Exact native binary, Undo/Redo, Save/Reopen, inactive Mesh UI, MCP schema and Linux WebGL launch pass. Original numeric and lock behavior remain open. [Evidence](tasks/F302-auto-weights.md#swap-weights-gate) |
| F302-auto-row-history | DONE | F302, paired DATA/UI and scoped Auto evidence | Production UI verifies Undo/Redo of an equal-count Trace replacement clears vertex scope and focus, preserves influences, locks and sibling scopes, and retains picks after weight-only history. Uses committed UV rows, so in-place UV history also clears scope. [Evidence](tasks/F302-auto-weights.md#vertex-scope-across-history-changes) |
| F302-update-bindings | READY90 | F302, paired DATA/UI and historical exact controls | Setup recapture passes on inactive Mesh and Clipping with exact weight words, dormant coordinates, frozen pose guards, Undo/Redo and Save/Reopen. Production UI verifies live Physics freeze/resume and retained selection. Linux WebGL launch verified. The exact stock-saved probe is inspection-only. [Evidence](tasks/F302-auto-weights.md#update-bindings-gate) |
| F302-weights-prune | READY90 | F302, paired DATA/UI and retained Prune controls | Threshold and cap, viewport preview/count, stale-reply rejection, Cancel and multi-attachment Apply/Undo pass. Native Mesh/Clipping preview and commit agree, invalid clipping rejects the batch, and Tauri plus MCP use the shared read-only preview. Linux WebGL launch passed. Exact stock ties, locks and redistribution remain open. [Evidence](tasks/F302-auto-weights.md#prune-gate) |
| F302-weights-clipboard | READY90 | F302, paired DATA/UI and publisher order clarification | Equal-count Copy/Paste by vertex selection order, stable ID remapping, exact locks, no-op and one Undo pass. Native Mesh/Clipping Save/Reopen, focused viewport shortcuts and numeric field bypass, 28 UI cases and Linux WebGL launch pass. Exact stock clipboard words remain unmeasured. [Evidence](tasks/F302-auto-weights.md#vertex-weights-clipboard-gate) |
| F302-weights-weld | WAITING | F302, paired DATA/UI and retained Weld control | Publisher documents All and Overlapping and at least two shared bones. REA has a discriminating exact-authored geometry fixture. Observed stock correspondence, cutoff, and numeric output remain unconfirmed. [Evidence](tasks/F302-auto-weights.md#weld-correspondence-gate) |
| F302-weights-display | DONE | F302, REA and paired UI/data | Pies, Selected and selected-influence emphasis follow the inspected Mesh or Clipping and keep viewport picking aligned with enlarged charts. Grouped checks and Linux WebGL launch pass on `bc450a1fefdc`. [Evidence](tasks/F302-auto-weights.md#weights-viewport-display) |
| F302-weights-overlay | DONE | F302-weights-display, REA and paired UI/data | Independent Pies/Overlay toggles and selected influence fill pass pixel checks for gradients and the raw concave notch. Production CSP, snapshots and native GTK WebGL restoration pass. Enabled behavior follows the version-unpinned publisher guide. [Evidence](tasks/F302-auto-weights.md#weights-overlay) |
| F307-gravity-rea | READY90 | F307, paired DATA/UI and REA audits | Exact Linux stock confirms scene-Y gravity. Existing solver retained. Actual UI default Physics passes signed live Setup, Animate Play, save/reopen and non-bake checks. A separate game export preserves +10 gravity and a 20 Hz step in the installed runtime. Moving-parent and internal startup phase remain deferred. [Evidence](tasks/F307-physics.md#scene-axis-gravity-in-exact-linux-4326) |
| F109-runtime | WAITING | F105 supported data/solver slices | Independent MIT0.1.0-beta.1 headlessNode/browser+optionalPixi8 and native authored JSON/referencedPNG/WAV export delivered. GitHub beta5 source+40,373-byte archive published/independently verified31files.16package/24native samples, shippedWebGL pixels and prior offlineNode/strictTS pass. NativeFile-menu6groups+useractualmascot export/buttons pass. Full runtime/mixing/directbinaryloader/fidelity/npm remain open; scope unreserved. See docs/tasks/F109-runtime.md and STATE. |
| F106 | TODO | F105 | IK/transform/path constraints, then gravity/inertia/damping; numerical comparison. |
| F106-path-constraint | READY90 | F004-path-attachment and paired DATA/UI and REA audits | Five exact stock projects opened editable and re-encoded byte for byte. Ordered Setup/Animate evaluation and read-only inspector are wired, including both Path/IK orders. Stock Spine accepted the renamed save, and Dice Drop verified the JSON/atlas/PNG bundle. Settings editing, creation, keyed Path and animated target-slot activation remain open. [Evidence](STATE.md#static-path-constraints-ready90) |
| F106-path-animation | READY90 | F106-path-constraint and paired DATA/UI and REA audits | Stock Position, Spacing and Rotate/X/Y Mix round-trip byte for byte, play in Animate and appear in Dopesheet, Graph and the inspector. Retiming and Undo passed in the browser. Stock accepted the retimed save and Dice Drop verified the actual bundle. Direct GUI value/tangent editing and exact-editor subframe pose evidence remain open. [Evidence](STATE.md#keyed-path-constraint-compatibility-ready90) |
| F106-path-deform | TODO | F004-path-attachment and paired DATA/UI and REA audits | Exact Linux 4.3.26 accepted signed sparse Path Deform offsets and a Bézier progress curve. REA observed Track132 kind 6 with a Path69 target and 18 dense coordinate values. Extend sampling before constraint evaluation, persistence and game export. |
| F107-audit | DONE | Retained 4.3.26 evidence and FBones 0.10 inventory | [Feature comparison](research/FBONES-SPINE-4.3.26-FEATURE-GAPS-2026-11-18.md) records controlled observations, visible differences, FBones policies and open validations. New REA inspection confirms static package/launcher facts. Next discriminating original observation is under F105. |
| F107-file-io-controls | DONE | Paired File DATA/UI audits and dedicated REA pass | In-window File groups nine planned entries with working Project, PSD and FBones Runtime commands. Nine focused cases and all 130 suite cases pass. REA identifies both original PNG settings artifacts and separately decodes the owned FBones trace. Linux WebGL startup verified. [Evidence](research/FILE-IO-CONTROLS-2026-11-18.md) |
| F107-viewport-options | ACTIVE | Paired viewport DATA/UI audits and dedicated REA pass | Prior zoom, Fit, rulers, Name Tags and clipping selection acceptance retained. Setup Pixels for one active Region passed the grouped 157 UI and 386 native cases. Local rounding, preview, axis locks, Undo and binary roundtrip are verified in FBones. Exact original camera and rounding behavior and enabled tag persistence remain open. [Pixels gate](research/VIEWPORT-OPTIONS-2026-11-18.md#pixels-and-compensation-observations) |
| F107-viewport-compensation | ACTIVE | F107-viewport-options, paired DATA/UI and dedicated REA audit | Local, Parent and World Setup translation each pass on their own axes. Rotate, Scale and Shear pass with independent switches for one unconstrained bone. Native checks cover weighted geometry, inactive Regions, Clipping, Store, stale revision and history. Constraint, group, Animate and exact stock compensation remain open. [Compensation gate](research/VIEWPORT-OPTIONS-2026-11-18.md#compensation-translation-gate) |
| F107-numeric-compensation | READY90 | F107-viewport-compensation, paired DATA/UI and REA review | Local numeric Setup Translate applies Bones and Images in one native edit. Reflected parent, untouched signed-zero axis, child and active/inactive artwork, four toggle states, Enter/blur, Escape, Undo and pointer regressions pass. Exact stock armed numeric behavior remains open. [Numeric result](research/VIEWPORT-OPTIONS-2026-11-18.md#numeric-translate-with-compensation) |
| F107-parent-compensation | READY90 | F107-numeric-compensation, paired UI/DATA and REA review | Parent remains available with Bones or Images armed. Reflected and sheared Parent X drag and numeric Y use the exact native axis edit. Held geometry, inactive Regions, Escape and one Undo pass in production-CSP UI. Exact stock armed gestures remain open. [Parent result](research/VIEWPORT-OPTIONS-2026-11-18.md#parent-axes-with-compensation) |
| F107-world-compensation | READY90 | F107-parent-compensation, paired UI/DATA and REA review | World stays selected through Bones and Images toggles. Native one-axis f64 edit passes both axes, all switch states, preserved dependents and byte-exact Undo near a 900,000-unit offset. Production-CSP input, one edit, held world-axis preview and Escape pass. Stock numeric precision and armed gestures remain open. [World result](research/VIEWPORT-OPTIONS-2026-11-18.md#world-axes-with-compensation) |
| F107-rotate-compensation | READY90 | F107-world-compensation, paired DATA/UI and REA review | Numeric Local and world-delta ring preserve compensated child affines and supported artwork. Held preview, Escape, Undo, Region refusal, weighted Clipping and Store protection verified. The shared fit accepts the anisotropic-parent f32 case. Exact armed stock behavior remains open. [Rotate result](research/VIEWPORT-OPTIONS-2026-11-18.md#rotate-compensation-candidate) |
| F107-scale-compensation | READY90 | F107-rotate-compensation, paired DATA/UI and REA review | Sparse authored X/Y and projected local factors share preview and commit. Signed reflection, singular rejection, held axis gesture and Undo pass. Native uniform rounding, tall Region fit, weighted Clipping and Store gates pass. Exact armed stock behavior remains open. [Scale result](research/VIEWPORT-OPTIONS-2026-11-18.md#scale-compensation-candidate) |
| F107-shear-compensation | READY90 | F107-scale-compensation, paired DATA/UI and REA review | Local axis fields and world-delta diamonds preserve the pivot and supported dependents. Native and CSP browser checks cover distinct bases, weighted geometry, Region fit, singular failure, Escape and Undo. Exact armed stock behavior remains open. [Shear result](research/VIEWPORT-OPTIONS-2026-11-18.md#shear-compensation-candidate) |
| F107-rotate-axes | READY90 | F107-shear-compensation, paired DATA/UI and REA review | Parent shows the authored Local angle. World displays signed heading and commits absolute f64 with optional compensation. Reflected ancestry, wrap/no-improvement no-op, independent tool preferences, Escape and Undo pass. Exact stock Setup numeric gestures remain open. [Rotate axes result](research/VIEWPORT-OPTIONS-2026-11-18.md#rotate-numeric-axes-candidate) |
| F107-scale-axes | READY90 | F107-rotate-axes, paired DATA/UI and REA review | Parent shows Local. World displays signed projected Scale and focuses the authored Local draft with a visible cue. Reflected ancestry, focus/blur, ordinary and compensated Local edits, independent axes and Undo pass. Exact stock reflected fields remain open. [Scale axes result](research/VIEWPORT-OPTIONS-2026-11-18.md#scale-numeric-axes-candidate) |
| F107-local-translate-axes | READY90 | F107-scale-axes, paired DATA/UI and REA review | Local fields and handles use signed bone axes. Native and CSP browser tests distinguish Local, Parent and World and verify sparse f64 input, reflected oblique drag, compensation, Escape and Undo. Exact stock axis transitions remain open. [Local Translate result](research/VIEWPORT-OPTIONS-2026-11-18.md#local-translate-axes) |
| F107-constrained-rotation | READY90 | F107-local-translate-axes, paired DATA/UI and REA review | The Parent pin displays evaluated IK rotation in Animate Local Rotate. A moving target, draft protection, keyboard and narrow layout, unchanged pose/history and separate explicit FK key pass. Exact stock toggling, Parent and World behavior remain open. [Pin result](research/VIEWPORT-OPTIONS-2026-11-18.md#constrained-value-pin-reference) |
| F107-animate-weights | READY90 | F107-constrained-rotation, paired DATA/UI and REA review | The Animate dock shows authored Mesh influences. Marker motion and inactive suppression, independent Deform selection, mode, history, clean-field IPC and Setup Auto are verified. The original Animate scope and editing remain open. [Weights result](research/VIEWPORT-OPTIONS-2026-11-18.md#weights-in-animate-reference) |
| F107-selection-hierarchy | READY90 | F107-animate-weights, paired DATA/UI and REA review | The passive HUD path follows the selected bone, slot or attachment's authored ownership. Inactive Mesh, animated activation, filters, multi-selection and narrow accessible layout pass with exact project equality. Exact Linux UI and ancestor activation remain open. [Hierarchy result](research/VIEWPORT-OPTIONS-2026-11-18.md#selection-hierarchy-reference) |
| F107-attachment-values | READY90 | F107-selection-hierarchy, paired DATA/UI and REA review | Setup Region shares an owner-local transform draft with Properties. Sparse bits, inactive sibling, Escape, f32 display and one Undo pass. An inactive influenced Mesh shows its evaluated world hull center. Stock display formula and unsupported axes remain open. [Attachment result](research/VIEWPORT-OPTIONS-2026-11-18.md#contextual-attachment-values-reference) |
| F107-clipping-values | READY90 | F107-attachment-values, paired DATA/UI and REA review | Setup Clipping row labels activate whole Rotate/Translate/Scale and retain selection through tool and contour edits. Inactive contour, active mask sibling, one geometry Undo and Animate Deform pass. Numeric values, Shear, Reset and Freeze remain unavailable. [Clipping result](research/VIEWPORT-OPTIONS-2026-11-18.md#clipping-center-reference) |
| F107-toolbar-position | READY90 | F107-clipping-values, paired DATA/UI and REA review | A centered session lock and horizontal grip move the normal HUD with its selection path. Pointer cancellation, keyboard movement, scroll-free ruler bounds at 960×640, stable Animate playhead and exact scene equality pass. Stock drag limits and persistence remain open. [Toolbar position result](research/VIEWPORT-OPTIONS-2026-11-18.md#floating-toolbar-position-reference) |
| F107-previous-tool | READY90 | F107-toolbar-position, paired DATA/UI and REA review | Right click switches between two explicit compatible tools with one selected bone in Setup or paused Animate. The gate covers latched secondary pan, Escape, numeric focus, multiple-bone pan fallback and exact native data/frame stability. Broader stock context and gesture arbitration remain open. [Previous-tool evidence](research/VIEWPORT-OPTIONS-2026-11-18.md#previous-viewport-tool-reference) |
| F107-relative-entry | READY90 | F107-previous-tool, paired DATA/UI and REA review | Bone HUD fields accept relative addition, multiplication and division against the active editable axis. Setup Tab, Undo, invalid Save blocking, focused stepping and direct Save pass. Animate full turns survive working pose, Key, Auto Key and binary reopen. Exact 4.3.26 parser and timing remain open. [Numeric entry result](research/VIEWPORT-OPTIONS-2026-11-18.md#relative-transform-entry-reference) |
| F107-incremental-entry | READY90 | F107-relative-entry, paired DATA/UI and REA review | Hover wheel previews a bone HUD field, uses 1 or Shift 0.1, and makes one edit per burst. Setup axis, focus and camera stability, Escape and equal-value selection change, direct Save flush and paused Animate Auto Key pass. Exact 4.3.26 step sizes and grouping remain open. [Incremental entry evidence](research/VIEWPORT-OPTIONS-2026-11-18.md#incremental-numeric-input-reference) |
| F107-numeric-drag | READY90 | F107-incremental-entry, paired DATA/UI and REA review | Vertical drag previews one editable bone field and commits at release. Caret and horizontal selection, fine Shift, one Undo, capture loss, held Save and equal-value target and frame changes pass. Exact Spine drag threshold, acceleration and cancellation remain open. [Numeric drag evidence](research/VIEWPORT-OPTIONS-2026-11-18.md#numeric-field-drag-reference) |
| F107-toolbar-alignment | READY90 | F107-toolbar-position, F107-numeric-drag, paired DATA/UI and REA review | Views offers Left, Center and Right over the measured travel. The gate covers keyboard and held-grip cancellation, path and lock continuity, narrow rulers, zero travel then widening, fixed Animate frame and exact saved bytes. Exact 4.3.26 switching and persistence remain open. [Toolbar alignment evidence](research/VIEWPORT-OPTIONS-2026-11-18.md#toolbar-alignment-presets-reference) |
| F107-toolbar-labels | READY90 | F107-toolbar-alignment, paired DATA/UI and REA review | Automatic measures the full action-label footprint. Views also offers Show and Hide. Stable dock resizing at fixed window width, accessible compact actions, the distinct Pose icon, numeric fields, path, alignment, lock, option matrix and exact native state pass. Exact stock threshold and live transition remain open. [Automatic labels evidence](research/VIEWPORT-OPTIONS-2026-11-18.md#automatic-toolbar-labels-reference) |
| F107-minimize-views | READY90 | F002, paired DATA/UI and REA review | F9 and the title control temporarily hide side docks and the Animate bottom workspace. The gate verifies exact layout and saved bytes, viewport expansion, focused draft protection, restored Graph selection and continuous editor Play. Exact Linux activation and mode-change behavior remain open. [Minimize views result](research/VIEWPORT-OPTIONS-2026-11-18.md#minimize-docked-views-reference) |
| F107-minimize-view | READY90 | F107-minimize-views, paired DATA/UI and REA review | Side panes minimize through their menu or right-click and restore at their saved positions from the title strip. Tests cover size, focus, sole-column space, menu Close, per-mode state, F9, frozen Preview draws, unchanged project bytes and active editor Play. Exact stock individual restore and persistence remain open. [Individual view result](research/VIEWPORT-OPTIONS-2026-11-18.md#individual-view-minimization-reference) |
| F107-timeline-pane-actions | READY90 | F107-minimize-view, paired DATA/UI and REA review | One trailing menu is visible in tabbed and stacked Timeline. Minimize and Close are unavailable. Escape and F9 preserve keys, clip, Current and panel layout. Exact Linux Graph and Dopesheet share a menu glyph. The original action target remains open. [Lower menu result](research/VIEWPORT-OPTIONS-2026-11-18.md#individual-view-minimization-reference) |
| F107-selection-history | READY90 | F107-audit, paired DATA/UI and REA review | Setup Page Down and Page Up navigate deliberate Tree and viewport scene selections. The browser verifies deselection, focus, one marquee entry, branching, skipped stale slots and separate authored Undo. Exact Linux shortcuts, wider Animate scope and numbered groups remain open. [Selection history result](research/VIEWPORT-OPTIONS-2026-11-18.md#viewport-selection-history-reference) |
| F107-weights-shortcut | READY90 | F107-animate-weights, paired DATA/UI and REA review | G enters Setup Weights for a single explicit Mesh or Clipping target. The gate verifies unbound Mesh, inactive selection with active sibling, reopening a closed or minimized pane, preserved focus, F9, held pan and unchanged native data. Exact G activation and Animate ownership remain open. [Weights shortcut result](research/VIEWPORT-OPTIONS-2026-11-18.md#weights-tool-shortcut-reference) |
| F107-tree-reveal | READY90 | F107-selection-history, paired DATA/UI and REA review | Auto scroll follows the active typed viewport pick. Right-click and Shift+Enter reveal once. The browser verifies two collapsed ancestors, scoped scrolling, focus and zoom, search and F9 guards, and unchanged Session data. Exact Linux defaults, gestures and multi-selection rules remain open. [Tree reveal result](research/VIEWPORT-OPTIONS-2026-11-18.md#tree-auto-scroll-and-reveal-reference) |
| F107-tree-expand | READY90 | F107-audit, paired DATA/UI and REA review | Collapse and Expand recurse over the active projected branch. Empty selection and double-click address the complete projected scene. Row context action, sibling and latent selection, search and 180px bounds pass with unchanged Session data. Exact stock scope and activation remain open. [Tree expansion result](research/VIEWPORT-OPTIONS-2026-11-18.md#recursive-tree-expansion-reference) |
| F107-tree-find-replace | READY90 | F107-audit, paired DATA/UI and REA review | Tree previews literal Setup Bone names, checks duplicates and applies included rows in one revision-guarded Undo action. Browser and native tests cover stable IDs, Undo/Redo and save/reopen. Exact Linux confirms the command icon. The open dialog and wider original scope remain open. [Find and Replace result](research/VIEWPORT-OPTIONS-2026-11-18.md#tree-find-and-replace-reference) |
| F107-tree-search-navigation | READY90 | F107-tree-find-replace, paired DATA/UI review | Previous and Next cycle direct visible matches from the buttons and keyboard. Browser checks cover focus, filtered scope, local scroll, existing tools, animation selection across a hidden dock and unchanged Session data. Exact Linux REA confirms both static controls. Populated behavior and wrap remain open in the original. [Tree search result](research/VIEWPORT-OPTIONS-2026-11-18.md#tree-search-navigation-reference) |
| F107-tree-filters | READY90 | F107-tree-search-navigation, paired DATA/UI review | The Tree menu supports temporary type bypass, exact mask restoration, Reset and independent text highlighting. The browser verifies the inactive Mesh selection, Weights visibility, query, collapse, focus and equal Session snapshots. Exact Linux REA confirms the closed funnel. Original menu activation, defaults, subtype behavior and persistence remain open. [Tree filter result](research/VIEWPORT-OPTIONS-2026-11-18.md#tree-filter-menu-reference) |
| F107-tree-draw-order-key | READY90 | F107-audit, accepted Draw Order animation command, paired DATA/UI review | Animate Tree can key the working Draw Order at Current. The browser verifies one explicit order transaction and one Undo, with Setup content, unrelated keys and slot selection preserved. Exact Linux REA confirms the row glyph in Graph and Dopesheet. Exact activation and glyph state remain open. [Draw Order key result](research/VIEWPORT-OPTIONS-2026-11-18.md#tree-draw-order-key-reference) |
| F107-tree-view-settings | READY90 | F107-audit, paired DATA/UI review | The Tree header opens View Settings. Hide skeleton names shortens exact decoded prefixes in the supported Scene profile. Browser verifies raw search and rename, accessible full names, exact prefix boundaries, mode/F9 continuity and no native edits. Six unsupported settings are discoverable. Exact Linux REA confirms the closed settings glyph. [Tree View Settings result](research/VIEWPORT-OPTIONS-2026-11-18.md#tree-view-settings-reference) |
| F107-tree-bone-visibility | TODO | F107-audit, paired DATA/UI review | Review and expose the per-bone Tree visibility control. Exact Linux REA confirms the static root bone dot in Setup and Animate. Toggled rendering, descendants and persistence remain open. [Tree bone visibility evidence](research/VIEWPORT-OPTIONS-2026-11-18.md#tree-bone-visibility-reference) |
| F107-ui-first | WAITING | F107-audit | Verified slices include Animate tools, Setup creation, in-window File, Viewport Options, Ghosting, Preview tracks, Graph tools, Timing Shift/Offset, Setup compensation, distinct transform axes, the Parent pin, Animate Weights inspection, selection ownership paths, typed attachment controls, toolbar movement, previous-tool switching, relative entry, hover wheel, numeric drag, toolbar alignment, automatic labels, compact Pose, global and side-view minimization, the lower menu, Setup selection history, and G for Setup Weights. Tree Auto scroll, recursive branch actions, Find and Replace, search navigation, type filters, Animate Draw Order key and Tree View Settings are READY90. Detailed UI work is deferred until the basic production workflow passes. Per-bone Tree visibility remains queued. App frame tracked in F002-window-chrome. [Tree visibility evidence](research/VIEWPORT-OPTIONS-2026-11-18.md#tree-bone-visibility-reference) |
| F107 | TODO | F106 | Full 4.3.26 compatibility matrix with explicit passing coverage. Use F107-audit to select unresolved comparisons. |
| F108 | TODO | F107 | Additional tool modules using shared project/viewport. |

## Optional contrast detail

For mesh generation, prioritize FBones' contrast-based interior detail.
Track the Spine-informed mode as a separate optional addition.

The base Trace starts with the outline path. The existing Inner Trace option
adds FBones contrast features to that same mesh, with matching preview/apply
data and one native transaction. Retain closed contours, canonical topology
and native Undo, including the existing weighted rebind notice. On owned
fixtures, require identical outlines with Inner off, no effect from RGB under
ignored alpha, and coherent own contrast detail within the vertex budget.
Use straight, curved, interrupted and flat-texture controls to measure
candidate selection and constrain any algorithm expansion.

Retained exact 4.3.26 captures establish the stock Trace entry. The current
publisher guide describes outline tracing and a separate Generate action.
Exact Linux Trace settings and original output geometry remain open. FBones
keeps its outline entry off by default and provides the Inner shortcut for
the optional color stage. [Spine Mesh Trace guide](https://en.esotericsoftware.com/spine-meshes#Trace)

REA baseline
`ev_40a335f3e222dc10615e137691251c8b084cc1942d17fbfcf2eb876c7fb0d5f4`
observed 21 versus 23 inner points on two own PNGs with identical visible RGB
and alpha. Only RGB in the transparent hole changed. The new filter uses
the visible center for alpha-ignored diagonal samples and thresholds the
winning channel's Euclidean Sobel magnitude. The outer path and existing
vertex and constraint limits remain the baseline. Scene and legacy tests
verify near-threshold vertical and diagonal responses. Candidate REA
`ev_2ede18df2969063c58ba38ef257abece034d13840911ec8f39d37b43a691b961`
reproduces both own PNGs. Inner geometry agrees in every field, with 28
hull and 21 inner points. Apply matches Preview on both and Undo restores
the native source state. Private `inner-trace-alpha-2026-11-19/` retains the
paired receipts and reproducer.

In controlled 128×128 fixtures with a 60-level grayscale step, the previous
FBones host produced eight connected explicit edges on the straight step and
zero qualifying rim edges on a radius-34 disk. The optional stage now links
curves after retaining dominant straight edges and validates that each new
segment lies on the final triangulation. REA
`ev_c4fa82f3d2326900b046020de6799eaa13be12d5d94d39a40c93b487009c8ad6`
measures one connected 16-edge disk component covering all 720 consecutive
rim samples within three pixels, above the 180-sample target. The mesh uses
68 of the 192 available vertices, including 24 hull vertices. Both opaque
Outline payloads and the straight Inner payload are identical to the
baseline, and the interrupted straight case retains both components with
zero edges crossing its alpha-ignored gap. Private
`inner-trace-alpha-2026-11-19/` retains the paired REA captures and reproducer.

Scene and Legacy tests cover the curve, deterministic geometry and a curved
alpha gap at a 64-vertex cap. The production UI with a real Rust Session
renders a warm highlight on the explicit curve only in Preview, writes the
preview geometry on Apply, and preserves it across Undo/Redo and portable
Save/Close/Reopen.

The dense product baseline on host `590d002e4f25`, REA
`ev_619f244c05f6556ae10d7ceeca889ff5f91d34a0aa144fd8b09e3997af315f8c`,
adds a 12 px tile texture to the controlled disk, once in an opaque image and
once on a shaped silhouette with an alpha-ignored interruption. Clean arcs
cover 720 and 665 consecutive rim samples. Both textured seam cases drop to
zero. The texture-only negatives have zero explicit internal edges. A separate
uniform-color four-notch fixture at cap 24 changes from 20 to 14 hull corners
when Inner is enabled, with tolerance rising from 0 to 9.61084. Preserve the
exact Outline in both modes, and give Inner the remaining vertex capacity.
For texture recovery, require one connected arc covering at least 180 of 720
samples on each textured seam, alongside the fixed clean, texture-only and
alpha-gap controls. Private `rea-fbones-dense-sprite-baseline.json` records
all nine inputs and the pinned host result.

The candidate native host `6cd2f7f61b99` uses a second, broader masked color
pass when dense fine contrast produced no explicit candidates. Its position
and alpha guards match the existing curve path. REA
`ev_d776f8ff8db68343c179e9c3481c883b6d054549b400f4a4262d6524bb7876b0`
recovers 720 of 720 rim samples from 20 connected explicit edges and all
665 visible rim samples from 19 edges on the shaped alpha fixture. No
explicit edge length leaves the measure's rim band or crosses an ignored
alpha cell on those two results. The texture-only and flat controls have
zero explicit internal edges. All 11 Outline geometries and the fixed clean,
straight and interrupted Inner geometries match the preceding host. The
notched cap-24 result keeps all 20 hull points at tolerance zero in both
modes, with 22 total vertices in Inner. Runtime Preview repeats exactly and
leaves project state unchanged. The private candidate receipt retains the
input, topology and process checks.

REA `ev_fee11f44335069910bd215ea668d3088bf82e406c11a284e71b5b86c377e6fee`
finds no tested Outline-specific export or Trace marker in the exact Linux
editor's mapped native library. The stock image-to-outline geometry and numeric
settings remain open.

REA `ev_e402e095fa8696591184e33aebbd5e77461121048cf92a0bbbed58b03bdd744a`
observed exact Linux Spine 4.3.26 Professional importing and exporting an
owned authored interior bend. The two explicit segments retained their
order, both have two incident faces, and all seven UV rows and eight
oriented faces match the authored input. This establishes format acceptance
for the small bent path. FBones contrast-chain detection remains a custom
optional stage.

REA MCP `capture_process_scenario` result
`ev_f199d3d78d1c495356fce5b32a866a65467d258a56b18a3e273a60772623689d`
analyzed the same exact Linux authored fixture. Its unconstrained interior
diagonal 1–4 survived the roundtrip. The four surrounding UVs are exactly
cocircular and diagonal 0–6 has the same squared length in the scaled UV
coordinates. The case proves preservation of the supplied tie choice.
Trace or Generate selection of a diagonal in that case remains unmeasured.

## Spine-informed mesh generation

Offer an optional mesh generation mode informed by Spine 4.3.26 Professional
on Linux. The retained captures establish the Trace entry. Before deciding
which settings and geometry behavior to implement, use REA MCP on that exact
editor or its owned artifacts. Record the behavior the evidence establishes
and leave unmeasured settings and output fidelity open.

REA MCP `capture_process_scenario`
`ev_4e98c2158b9421824acd734a2cb8a020ab2b404d987da99d93dd8ce968af6939`
compares the authored bend fixture with its exact Linux 4.3.26 CLI
import/export. UVs, edges and triangles are equal with seven vertices and
four hull vertices. The mesh was authored before import. The exact Linux
Setup capture has no selected mesh, and the retained exact Windows images
show the Trace entry with the dialog closed. Exact generation, defaults and
parameter persistence remain open. The publisher documents Padding, Alpha
threshold, Detail, Concavity and Refinement, and a separate Generate action.
[Spine Mesh Trace guide](https://en.esotericsoftware.com/spine-meshes#Trace)

The paired Padding implementation uses 0–32 whole source pixels in FBones.
The outline expands with a circular pixel mask clipped to the texture. The
contrast pass uses the original alpha mask and RGB values. Zero uses the
existing outline path. The stance follows the persisted FBones profile.
REA MCP `capture_process_scenario`
`ev_d445681f888eb68ac1f16abe3ad068f3e2ca80a7ae94797a85d6a3f7cab647b2`
confirms exact Spine 4.3.26 Linux ordinary mesh exports with hull points on
all four texture borders and entirely inset hulls. Generated stock Padding
ranges, pixel metric and behavior at the image border remain open.

An owned Trace comparison can use a 48×40 PNG with an opaque notched rectangle
and an attached alpha-128 tab, comparing two observed thresholds around 128/255
with all other controls fixed. Require source hashes, an observed Trace
operation and typed output before attributing results to stock behavior.

For Concavity, use one owned PNG with two unequal notches and hold Detail,
Refinement, threshold and Padding fixed. Compare notch-center containment,
depth from each mouth chord and signed hull turns at two observed settings.
The retained exact Linux concave candidates checked at this checkpoint are
clipping attachments. The historical Windows 228-vertex export is based on
FBones-authored geometry. No stock Trace Concavity output is qualified.

### Precise Trace outline controls

The historical exact capture shows the Trace entry with its dialog closed.
The publisher documents Alpha threshold and describes Detail, Concavity,
Refinement and Refresh as separate controls. Exact stock slider ranges and
alpha equality remain open. FBones retains its existing outline concepts
and uses the native alpha comparison `alpha > threshold`.
[Spine Mesh Trace guide](https://en.esotericsoftware.com/spine-meshes#Trace)

REA MCP `capture_process_scenario`
`ev_75b6baf88fa987f10df4d0b199edb89c553251a6f0d46ab1a44f65223790f938`
found only alpha 255 in the bend and six-overlap fixtures linked to the
retained exact Linux exports. They have no witnessed Trace operation.
The alpha-128 tab below is a separate FBones verification fixture.

The existing sliders pair with precise numeric entry for Alpha ignore
(0–254), Padding (0–32), Tolerance (0–128 px), Spacing (0.5–4096 px) and
Vertices max (3–256). Invalid drafts invalidate pending and displayed
candidates and block Apply. Correction to the same committed value queues
a new preview. Inner Contrast keeps its separate controls.

On the production-CSP fixture, a real alpha-128 tab extends the hull to
x = 32 at threshold 127 and is excluded at 128, leaving x = 24. A delayed
real Rust reply delivered during an invalid draft stays unpublished. The
session retains the original project until Apply, which writes the exact
displayed mesh in one edit. One Undo restores the prior mesh. The same group
accepted independent Padding and optional Inner Contrast cases.

### Trace Apply transaction

The exact retained Trace launch captures and the publisher dialog do not
establish pending commit behavior. REA `ev_dc42a7628db0` shows the exact Linux
Setup viewport without a selected mesh and the historical exact Trace entry
with the dialog closed. The publisher sample shows Cancel and OK.
[Spine Mesh Trace guide](https://en.esotericsoftware.com/spine-meshes#Trace)

FBones separates cancellable Preview from the pending native commit. Apply
pins the target, options and expected revision. The panel shows Applying
trace and locks its fields and cancel controls. Conflicting file, mode and
selection actions are guarded during Apply. A retryable current-context
failure restores the same candidate. A stale revision or pose clears it.

In the production-CSP Session fixture, title close canceled a held preview.
An injected transport failure before dispatch retained the candidate. A
real Rust Apply committed once while the held result kept the panel locked
through Escape, mode and Tree attempts. Releasing the result closed Trace
and one Undo restored the prior mesh. A genuine Rust stale-revision error
then verified candidate invalidation and restored Cancel, with the owned
browser adapter restoring Tauri's structured error shape.

### Planned Trace controls

The publisher sample shows separate Detail, Concavity and Refinement
sliders with numeric readings and a Refresh command near the vertex count.
The sample is patch-unpinned. It cannot establish editable ranges, defaults
or Linux 4.3.26 output. Keep the planned settings visible without assigning
unproven values. The existing FBones outline and Inner controls retain their
own meanings. [Publisher Trace sample](https://en.esotericsoftware.com/spine-meshes#Trace)

The owned receipt inventory has no Trace settings snapshot for exact Linux
4.3.26. The retained Trace entry capture is pinned by REA
`ev_dc42a7628db062f0cf62434012c06d43faf394bc2a7f2b35e93d4121158bfe2f`.
An opened exact dialog with a verified clean preference baseline and one
recorded control change before reopen would distinguish a factory value
from a remembered value.

FBones shows the three unavailable setting names without numeric fields or
sliders. Refresh is a disabled button. The focused browser fixture verifies
accessible descriptions, a narrow layout and zero preview or authoring
requests from the disabled action. Padding, precise outline, Inner and the
Apply transaction passed on the same assets.

### Trace Padding in FBones

Trace and Inner Trace share optional Padding and preview the exact native
candidate. The input and MCP schema accept 0–32 whole source pixels. The
bounded kernel unions pixel-center disks before the usual contour
simplification. The rounded mesh follows the existing tolerance and vertex
budget. Padding has no effect outside the texture. The Inner pass samples
original visible pixels. No format record was added for the setting.

The owned fixtures verify identical zero-padding geometry, clipped borders,
identical geometry after hidden RGB changes, and a visible contrast seam beside
transparent pixels. Browser tests verify slider and numeric input, the authored
revision during preview, rejection of 33 px, identical preview and applied mesh,
and one Undo.
The Legacy session reopens the padded mesh with exactly the applied geometry.

### Separate mesh Generate action

An exact historical selected-mesh screenshot shows Generate and Trace as
distinct controls. The retained exact Linux Setup capture has no mesh
selection. The publisher describes adding vertices without moving existing
ones and repeated grid densification from a four-corner mesh. Exact Linux
placement, boundary changes and manual edge retention remain open.
[Spine Mesh Generate guide](https://en.esotericsoftware.com/spine-meshes#Generate)

REA MCP `capture_process_scenario`
`ev_0801176066d35f7c86a56174125f175e0829bf996139f163f0cd60db616535d9`
inspected the retained exact Linux 4.3.26 CLI bend export. The four ordered
hull edges each bound one face, and the two explicit inner edges each have
two faces. An additional two-sided diagonal appears in the faces alone.
This establishes the distinction between serialized manual constraints and
the derived face edges in an ordinary exported mesh.

For the next paired audit, use the existing unweighted mesh topology and an
owned concave L fixture with two interior vertices joined by a manual edge.
Compare the authored positions and ordered boundary after adding vertices.
Keep use of original controls within the authorized reference workflow.

FBones places Generate in the Setup Mesh toolbar. The
initial profile uses a single explicit mesh attachment without weights or
Deform keys. Subdivide individual existing triangles with interior vertices
interpolated from the same faces. Preserve authored vertex order, hull,
explicit edges and original face boundaries. Verify that both the original
and generated faces sample the same UV-to-local mapping and that undo
restores the original topology in one step. FBones uses the centroids of
existing faces where a new point is representable. Exact stock interior
placement is open.

### Mesh Generate in FBones

One native/MCP edit selects a mesh by stable attachment ID. The candidate
preserves the exact authored vertex prefix, hull and edge indices, each
source face boundary and the active sibling. The selected unweighted mesh
may be inactive. Stored and authored Deform tracks for the same attachment
prevent the edit. The Setup lease is checked when supplied. The source must
have a planar UV tessellation consistent with its hull and constraints.

The owned concave L fixture has a non-affine local field and signed-zero
vertex data. The two incident faces at its manual edge remain incident.
New points use the barycentric interpolation of the serialized f32 UV in
their source face. The unchanged notch, winding, existing words, one Undo
and Redo, binary reopen and untouched source file all passed. Browser
checks used two Generate clicks and two separate Undo actions on an
inactive mesh, and verified the weighted and Deform controls and Animate
toolbar. Exact Spine placement and generation on weighted or animated
meshes remain open.

### Mesh Edit display controls

REA MCP `capture_process_scenario`
`ev_dc42a7628db062f0cf62434012c06d43faf394bc2a7f2b35e93d4121158bfe2f`
pins the exact Linux Setup frame and historical exact Windows Edit Mesh
capture. The Linux frame has no selected mesh. The historical Modify frame
shows Triangles and Isolate checked, with Dim unchecked. Exact Linux defaults,
opacity, persistence and toggle effects remain open. The unversioned publisher
guide describes triangle lines, dimmed mesh artwork and hidden other
attachments. [Spine Mesh Edit guide](https://en.esotericsoftware.com/spine-meshes#Triangles)

FBones groups these controls in the existing contextual Mesh toolbar. The
defaults are Triangles on, Dim off and Isolate off. Keep the values
within the logical document session, effective only for the inspected Setup
Mesh. Triangles switches derived face lines while leaving edit handles and
manual edges visible. Dim halves the inspected artwork's combined opacity.
Isolate uses the actual inspected attachment ID and its drawable geometry.
It retains masks from earlier slots. A projected alternate shares no mask
with the active clipping attachment in its own slot. The retained Linux
fixtures lack a joint inactive mesh and clipping witness for this behavior.

In the owned browser fixture, turning Triangles off hides a generated line
while preserving the explicit line, hull and handle. Dim changes the focal
raster to half the authored slot-and-attachment opacity, and unrelated art
retains its color. Isolate displays the inactive mesh, hides both its active
sibling and an unrelated Region, retains the earlier clipping mask and
leaves hidden-area clicks outside the selection route. Mode changes restore
the authored drawing, Save keeps the settings for the same logical document,
and Close/Open returns them to defaults. The original slot activation,
authored revision and Undo/Redo state remain during all toggles.

The production-CSP round used the previously accepted native host. The
first pass accepted 19 of 20 cases. The existing Deform test cached a
pointer coordinate before the Mesh Tools panel resized the canvas from 902
to 678 px. The retained trace shows the 112 px discrepancy. It passed in
both isolated and parallel rechecks on the same assets. After adding an
explicit renderer-size check before sampling the pointer, the Deform and
Mesh Display cases passed together.

### Mesh New outline and Reset

The REA-pinned historical 4.3.26 Edit Mesh capture shows separate New and
Reset controls. The retained Linux mesh exports have no causal New or Reset
operation. [Mesh Edit evidence](#mesh-edit-display-controls)

The publisher describes closing a new contour with the first point or with
New, and documents four-corner Reset inside Edit Mesh separately from the
attachment properties Reset.
[Spine New vertices guide](https://en.esotericsoftware.com/spine-meshes#New-vertices-mode)

FBones uses a separate outline draft in Mesh Setup, with the full image on an
affine plane fitted to the existing local UV mapping. Clicks on that plane
produce normalized UVs. The native command validates the serialized points
and rebuilds local positions and triangulation on the same fitted plane.
Use stable attachment and revision ownership and keep the current mesh
through invalid input, Escape and stale rejection. Commit one validated
in-image polygon for an unweighted Mesh without authored or stored Deform
keys. Reuse the existing quad command for its supported Reset workflow.
The production-CSP run verified the full texture outside the old cropped
mesh, ignored clicks outside the image, rejected a crossing outline, and
restored the old view on Escape. Clicking the first vertex committed a
concave six-point outline on an inactive mesh in one native command.
Contextual Reset and Undo preserved the active sibling. Scene tests verified
portable reopen and rejection for stale pose leases and existing Deform keys.
The draft supports removing the last point with Backspace. Exact original
placement, close/cancel rules and topology loss remain open.

### Mesh outline draft points

The exact Linux artifacts contain completed meshes. The historical Edit Mesh
capture was taken in Modify mode. No retained original witnesses moving or
removing a point while drawing. The publisher documents drag to move and
double-click to remove, with a click on the first point closing the outline.
The guide gives no precedence for a double-click on that first point.
[Spine New vertices guide](https://en.esotericsoftware.com/spine-meshes#New-vertices-mode)

REA MCP `capture_process_scenario`
`ev_1778a57ef0ea6712894db69fa68ed65b15926d8e72b3debd0a579aac89fd09eb`
read the retained exact Linux 4.3.26 six-overlap export
`567b57e1d924079dc7eda2a90c5a36278a59eee01b67084b4da617742f486c0a`.
Its ordered hull gives an independent fixture for a point move and non-last
deletion. The expected source identities after moving index 4 and deleting
index 2 are `0, 1, 3, 4, 5`, with only index 4's position changed.

In FBones a click on the first point closes a contour of at least three
points. A drag beginning on any existing point repositions it. A double-click
removes a point other than an eligible closing point. Shift-click removes
any point, including the first. A drag released outside the image or canceled
leaves that point in place. Pointer changes remain in the draft until Finish.

The grouped real-session test moved the first marker while the outline had
seven points. An out-of-image release preserved another marker at its source
position. A double-click removed a middle point and Shift-click removed the
temporary first point. The final closed outline kept ordered identities
`0, 1, 3, 4, 5` and the updated coordinates for point 4. One native edit
committed all changes, and one Undo restored the original. Escape during a
held drag canceled the draft and restored the existing mesh.

### Mesh Wireframe property

The publisher documents an attachment property that displays mesh vertices
and edges after deselection. Its guide gives no persistence or defaults.
REA MCP `capture_process_scenario`
`ev_03ffe9a79a3520b962a7348e8003c0824a9342cf53cd27a852863090eed047fd`
found no named Wireframe field in three CLI JSON exports from exact Linux
4.3.26. The exports have mesh edges, UVs and faces and no witnessed Wireframe
toggle. They leave editor `.spine` persistence unresolved.
[Spine Wireframe guide](https://en.esotericsoftware.com/spine-meshes#Wireframe)

A separate REA MCP `capture_process_scenario`
`ev_f064f28390f0f16407b8ec05fa9f9dfead2936e52d8c40db6a5dddf58dd404d0`
compared Mesh46 records from two exact Linux 4.3.26 projects. The source
hashes start `41b43750ba51` and `f532bcc82f79`. Boolean tags 5, 32, 33, 34
and 35 matched. Tag 30 differed between the unweighted and weighted mesh.
Neither source has a witnessed Wireframe toggle. None of these tags can be
assigned to Wireframe from this comparison.

The historical exact 4.3.26 Professional inspector shows Wireframe separate
from the floating Edit Mesh Triangles, Dim and Isolate controls. The captures
show one unchecked instance. Exact Linux defaults and toggle effects remain
open. [Historical Edit Mesh capture](#mesh-edit-display-controls)

FBones keeps this preference off by default and keyed by mesh attachment
for the current logical document session. The Setup main viewport draws
vertices, hull and authored edges for opted-in active visible meshes, with
the same evaluated positions as the artwork. The selected Mesh Edit and
Weights guides take precedence. Passive guides honor Show Images and
Isolate. Artwork keeps its clipping mask and passive guide geometry spans
the whole editor mesh. The preference leaves revision, history and file
data unchanged. Removing or converting a mesh clears its preference.

The production-CSP fixture opted in a weighted active mesh and an inactive
sibling. Only the active mesh drew guide pixels after deselection. The case
verified stable visible and masked artwork, an unaffected second active mesh,
visibility switches, isolation and independent Edit Mesh Triangles. The
native snapshot and authoring calls stayed unchanged during display toggles.
Save retained the preference and Close/Open reset it.

### Mesh inspector Freeze and Reset

The publisher describes Freeze as resetting the displayed rotation and
scale baseline while preserving current vertex positions. Inspector Reset
changes the vertex positions to match their UVs and clears weights and
Deform. Edit Mesh Reset is the separate four-corner topology operation.
[Spine Mesh properties guide](https://en.esotericsoftware.com/spine-meshes#Freeze)

The retained exact 4.3.26 Professional capture shows Inspector Reset and
Freeze together below Edit Mesh. In the open Edit Mesh capture, the
viewport Reset remains visible separately. The retained control state does
not establish which operations are enabled or what they mutate.
[Historical Edit Mesh capture](#mesh-edit-display-controls)

REA MCP `capture_process_scenario`
`ev_af9194e59048ed6b8959d92db3f9218667c66a21e485e23036ee90db649fc4f4`
found Mesh46 float tags 19, 20 and 21 at `0, 1, 1` in the two exact Linux
projects cited above. They are separate from the dense vertex records.
An earlier source contains finite nonzero tag 19 values. FBones already
preserves that field as unmapped source metadata. No retained Freeze
operation identifies any field's UI meaning. Present the planned inspector
actions together with their unavailable states until their behavior is
wired. Freeze needs a discriminating same-mesh witness with nonzero
rotation, unequal scales and unchanged vertex words after the action.
[Earlier tag 19 evidence](research/MASCOT-CLASS149-REFERENCE-REVIEW-2026-11-08.md)

REA MCP `capture_process_scenario`
`ev_60af6d044af7f962829922c41cb4a0ef16eb9a63859389c1fe5bc962a0b47fe1`
verified UV alignment in the owned exact Linux 4.3.26 stock bend project
and its paired CLI JSON. All fourteen local position words in the 32 px
root-aligned mesh equal `(32u − 16, 16 − 32v)`. The mesh still has seven
vertices, eight faces and manual edges `4–5` and `5–6`. This is an
authored endpoint with no observed Reset gesture. It establishes a case
that distinguishes alignment from the four-corner operation. Use a copy
with one non-affinely moved interior vertex and compare UVs, local position
words and topology in separately witnessed actions before extending the
case to weights or Deform.

FBones exposes two disabled inspector actions with distinct accessible
descriptions. Browser verification covers single active and inactive Mesh
selection in Setup, multi-selection, Region and the same Mesh in Animate.
The working viewport Reset remains a distinct action and still restores
the four vertices. The disabled controls leave the native snapshot and
history unchanged.

## Animation Play performance

Use the same owned animation and display conditions before and after the
change. Record frame-time percentiles, dropped frames and animation-clock
drift in production desktop FBones. Attribute renderer and CPU costs
separately across sampling, constraints, skinning, timeline updates and
draws. Use exact stock Linux REA evidence for the renderer and for any
supported playback observations. Preserve timeline accuracy, Preview
independence and animation events. Keep browser-only measurements distinct
from native desktop acceptance.

## Auto Weights rework

Use REA and owned exact-stock fixture exports to compare influence selection
and normalized weights for asymmetric geometry, overlapping bones and
selected-subset binding. Reuse F302 evidence for unchanged cases. Verify
dense binding integrity, untouched weights outside the selection, one undo
action and portable save/reopen on the reworked implementation.

## Gravity rework

Use REA and owned exact-stock trajectories to compare gravity direction and
response, timestep, motion under a parent and settling. Retain F307's
accepted static and dynamic witnesses and known unsupported inspection
routes. Use new observable evidence to resolve the solver changes and
verify default-live Setup, Animate playback and save/reopen without
baking the simulated pose. Exact phase issues remain separately tracked
in F307-final.

F002 may proceed while F003 is researched. Copying existing original bytes is
not completion of independent encoding/lifecycle compatibility.

Historical task rows retain their named acceptance evidence. Prior session
narratives and delivery checks are retained in the
[TASKS archive](research/archive/TASKS-2026-10-30-before-workflow-review.md).
Current state/next steps live in STATE rather than duplicated delivery logs.
