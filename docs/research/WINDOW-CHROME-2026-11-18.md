# FBones window frame and title bar

## Reference and implementation gate

The dedicated REA agent matched a second retained owned Spine Professional
4.3.26 screenshot and its companion receipt. Together with the accepted
Transform inspector capture, it shows one upper band containing document
actions, title, Views and window controls. The static captures establish visible
structure. Native dragging, resizing, Snap, default appearance and keyboard
behavior are still unobserved in the exact original. The private manifest is
`.local/research/window-chrome-2026-11-18/rea-spine-window-chrome.json`.
[Original controlled observations](FEATURE-UI-4.3.26.md#controlled-exact-version-original-gui-observations)

The current FBones app has a decorated Tauri main window, a native application
menu, and an in-window editor header. The paired audits locate the guarded Close
and Quit path in App and Session. The proposed FBones bar uses a dedicated
document-title drag region, the existing file/history/help controls and a small
caption-button cluster. The mode toolbar remains the editor's separate tool
surface. Caption move and minimize/maximize are independent of editor inertness.
Custom Close invokes the existing guarded quit action.

The Tauri 2.12.5 source exposes per-window `hide_menu` on Linux/Windows. Pinned
Muda hides the bar without detaching its accelerator bindings. Pinned Wry
installs native edge resize handling for an undecorated main window. On macOS,
an overlay titlebar retains traffic lights and the global application menu.
These are implementation facts and platform guidance. Native gesture behavior
will be recorded only where observed. [Tauri window customization](https://v2.tauri.app/learn/window-customization/), [Tauri configuration](https://v2.tauri.app/reference/config/#titlebarstyle), [Apple window guidance](https://developer.apple.com/design/human-interface-guidelines/windows)

## Native Linux shortcut correction

An owned GTK/Openbox trial verified the new geometry and window controls,
then timed out on physical Ctrl+N after hiding the GTK menu. An owned prior
decorated build opened New Project with the same key and window manager.
The paired follow-up assigns those Linux file shortcuts to the editor's guarded
command dispatcher and leaves the detached GTK bar out of Linux startup.
The dispatch precedes the focused-input exclusion so Ctrl+S can flush a valid
field through the existing Save guard. Windows and macOS retain their native
accelerators. Native evidence for those platforms remains open.

## FBones behavior

The window frame applies across desktop platforms. FBones places its File
menu, document title, history actions and Views in one 36-pixel header.
Windows and Linux use in-window caption controls. macOS uses Tauri's overlay
with native traffic lights, a reserved left inset and Cmd hints in File.
The title region moves the window. The separate Setup/Animate tool shelf still
switches editor modes and tools. Choose Images Folder is available in File.

The production-CSP regression runs with an owned Rust Session. Ctrl+N opens
the project creator. Ctrl+S commits a focused X value of 23.25 before its
canceled save dialog. Ctrl+W opens the unsaved-project prompt. Cancel preserves
the Session snapshot. Window Close exercises the same guard and Discard closes
the Session once. The browser fixtures exercise caption keyboard activation and
the MCP lock. The native gesture result is recorded separately below.

REA decoded the final focused Playwright trace under
`focused-current/test-results/` and independently pinned the owned native
after-Cancel capture. The trace contains 172 actions with matching begin/end
records and 25 successful captured HTTP requests. Its one console 404 resolves
to `/favicon.ico` on the browser test server in the raw trace. These observations
cover FBones only. Test assertions remain the source of the Session result.

## Owned native observations

The exact Linux build `0b0482fe…` opened with WebGL in a private GTK/X11
session with Openbox at device scale 1. The 1440×900 client reported zero
frame extents. Physical input on the title moved the window from (239, 77)
to (301, 120). The bottom-right edge resized it to 1512×949. Maximize filled
1920×1080 and Restore returned to the resized geometry. Minimize hid the client
and Openbox restored the same XID. Ctrl+N opened New Project and the Create
action produced an owned dirty project. Ctrl+W, Alt+F4 and the caption Close
each prompted. Cancel retained the dirty
project. A subsequent caption Close and Discard ended the exact process with
exit code 0.

The native driver encountered a stale FUSE portal during its final profile
cleanup. The raw geometry, screenshot digests and retained normal-exit receipt
were checked independently and the own scratch profiles were removed. See
`native-product-current/progress.json`, `native-terminal.json` and `review.json`
under the private research directory. Physical Linux Save, Wayland and
additional scaling configurations remain unobserved. The Save regression above
uses the production-CSP browser and the real Session.

The exact Windows x64 build `7372bd4b…` opened an owned WebView2 window with
WebGL, one 36-pixel editor header and no attached HWND menu (`GetMenu=0`).
CDP caption actions changed the live `IsZoomed` and `IsIconic` states and
Restore returned the original rectangle. A fresh owned copy used File New
and retained bone X=23.25 through File Close Cancel and targeted native
`WM_CLOSE` Cancel. Caption Close and Discard ended that process with exit 0.
The first automation attempt timed out after a CDP Ctrl+N. That route leaves
native accelerator delivery unobserved. Windows physical drag, edge resize,
shortcuts, Snap and scaling require separate coverage. The two Windows receipts
are under `windows-acceptance/` and `windows-acceptance-menus/` in the private
research directory. macOS overlay geometry and native gestures await an owned
macOS run.

The delivered frame passed all 132 production-CSP UI cases on its own build.
JavaScript passed 464 cases with one existing skip, desktop Rust passed 370
with two existing ignores, and 16 format tests passed. The protected Linux
handover reached WebGL. The original frame evidence and exact build receipts
retain their acceptance scope.
