# Timing Shift in the exact Spine reference

The owned 30 FPS timing clip used separate Translate and Rotate tracks for
bone A, a Translate track for bone B and a Pulse event timeline. The dedicated
REA MCP agent authenticated the private Linux GUI captures and artifacts. The
stock editor identified itself as Spine 4.3.26 Professional. The GUI and
independent CLI exports ran on Linux with explicit owned files.

In Dopesheet, Shift became blue when enabled. One left drag moved the A
Translate key at frame 9 to frame 12. The same track's next key moved from
frame 18 to frame 21. Its earlier key, the other property of the same bone,
the other visible bone and the Pulse event keys kept their authored times
and values. Setup bones also matched. This compares the original baseline and
the saved edited state through two exact editor exports.

| Track | Baseline frames | Saved result frames |
| --- | --- | --- |
| A Translate | 3, 9, 18 | 3, 12, 21 |
| A Rotate | 6, 12, 21 | 6, 12, 21 |
| B Translate | 0, 15, 24 | 0, 15, 24 |
| Pulse | 6, 18, 27 | 6, 18, 27 |

The paired DATA and UI reviews support an FBones row-local implementation
using the existing atomic move command. Shift extends the moving key set
with later authored keys on each explicitly selected property row. The
earliest explicitly selected frame defines that row's suffix for multi-row
selection in FBones. The existing collision, bounds and authored Bézier
validation apply. Leftward crossing, same-time ties, multiple selected rows
and the original Graph handle modes remain unmeasured.

The current guide documents Alt/Option while dragging. Two fresh Linux copies
used an authenticated private window-manager config with its Alt+left bindings
removed. Holding Alt before pointer down or pressing it after the drag had
begun produced the same independently exported ordinary move
`[3, 12, 18]`. This establishes the two controlled outcomes. The experiment
does not establish what Alt event the original editor consumed. FBones wires
the verified toolbar toggle in Graph and Dopesheet. Alt/Option remains open.
[Spine Keys guide](https://en.esotericsoftware.com/spine-keys#Shift)

Exact artifacts and independently checked expected frames are retained in
`own-timing-shift-linux-visible-current` and
`.local/research/timing-shift-2026-11-18`. The earlier private display
startup failures were before any authored gesture.


## FBones acceptance

The Dopesheet and Graph share the Shift toggle. The transient previews update
later marks, row summaries and the applicable Bézier times while retaining
the original selection. Escape or a changed document, clip or revision
cancels the gesture. On release the Session expands the original stable IDs
inside the existing move operation. MCP can request the same operation with
`moveAnimationKeys` and `shift: true`, subject to native frame, key-count,
collision and curve validity checks. Ordinary requests can omit the flag.

Focused real-browser QA observed advancing a later key visually without a
native edit, Escape returning the mark to its original position, the single
native move in both views, the shared toggle, Undo, unchanged Setup and
unrelated keys, and the updated Bézier handles. The two focused native
cases additionally verify multiple source rows, a selected discrete timeline,
untouched value bits, stable IDs and atomic rejection.

Six focused UI cases passed. REA pinned the timing test trace and two product
screenshots. The trace includes 217 matched action pairs, 29 successful local
requests and no recorded console events. The three original evidence manifests
and separate product manifest are retained in the timing research directory.
All 137 full UI cases passed with disjoint shard coverage. The native suite
passed 375 with two existing ignored, JavaScript passed 464 with one existing
skip and the Scene format suite passed 105. A native Linux build started with
WebGL and a visible owned window, SHA-256
`0971f6bb2bfcda7c7354dcf61abe04d003bb31acd8617b33bff52a2e998bef3b`.
