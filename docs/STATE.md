# Current state — 2026-11-20

## Current checkpoint — Production priorities reached, paused

The user defined the pause gate as GIF export, game JSON/atlas/PNG export,
opening Spine projects for production work, and Gravity. The current mascot
passes editable Open with all eight direct Linked Meshes, Setup and Animate
edits, save/reopen in FBones and original Spine, and Dice Drop loading the
game bundle. Signed live Gravity and the exported solver step passed. The
latest browser round rechecked GIF, the game bundle and Physics. These are
READY90 results within the listed profiles. Unsupported project features
can still enter Inspection. Resume only on user instruction.

### Keyed Path constraint compatibility READY90

The pinned Spine 4.3.26 keys-only control in REA
`ev_38f2e5082397134069353b019832a11b32dbd1189a1e2ab3fbc90c0055b50ef0`
independently re-encoded all 1,912 decoded bytes in FBones. Track132 kinds
9, 10 and 11 preserve Position, Spacing and Rotate/X/Y Mix, including
independent absolute Bézier controls under the target slot's bone group.
The native Session verified eleven pose sample times, stable key retiming,
stale rollback, Undo/Redo, portable Save As and reopen. The MCP input schema
is regenerated and checked for the three channel payloads.

Spine reopened the edited save and exported the expected final Position key
at 1.6 s, with other values, times, curves and Setup unchanged. REA
`ev_31701ddcfcb6a31bb489cd39e9b1c82a55aa0b2a35fd2ec9c483ffd4a9f34441`.
Dice Drop loaded the actual game bundle. It verified 105 channel values,
504 affine components and 192 source pixels, with a maximum position delta
of 0.00000246 against stock JSON with the intended retime. REA
`ev_a6d172800e7dc6c100013683e286e32be7f6f6f2571ebdef04cb083afafa9455`.
Exact-editor animated PNG pose evidence remains unavailable. That exporter
reported `No current animation` in the owned probe. Native and browser
sampling use mathematical inversion of the measured curves. Dice Drop uses
a ten-segment approximation, so off-center game and editor poses can differ.

The grouped round passed 458 desktop Scene, 116 desktop Legacy, 114 Scene
format, 17 legacy format, 600 JavaScript and seven browser tests. The keyed
browser case verifies Dopesheet/Graph identity, sampled inspector and pose,
one timeline drag and Undo. Both TypeScript checks and the web build passed.
Existing ignores and skips remain. Host `7b1b569c45e2`, web index `4189962fae7c`.
Receipts are in private `path-keys-2026-11-20-bhTfLM/`. Cleanup removed six
browser workspaces (1,646,592 allocated bytes), five staged outputs (6,426
logical bytes) and 155,648 allocated bytes of reference scratch. Linux has
790 GiB free, C: 55 GiB and G: 3.6 GiB. Path Deform, animated target-slot
activation, and direct GUI editing of value and tangent fields can resume
from the retained controls when requested.

### Static Path constraints READY90

Exact Linux Spine Professional 4.3.26 produced five owned controls covering
Tangent, Chain, Chain Scale, negative Fixed spacing, independent mixes and
both IK execution orders. The normal FBones Session opened them editable and
independently re-encoded 1,490 to 1,561 bytes per project with complete equality.
REA `ev_f999dcebff7e3f7cab7da4f27daf3226be8fecbb8ad9db994889df686c2568f8`
confirmed PathConstraint72 and its ordered bone references and target slot.
REA `ev_a2b5c7a1938bcb621d116b22188c1ad126930313b9a817ddef17e5a66548f363`
separates Skeleton11 tag 23 declarations from the common reversed execution
group. The mixed files' alternative IK56 field order is retained per constraint
and follows its stable ID. Stock fixtures are in `path-constraint-2026-11-20-oracle/`.

The Tree and inspector expose the imported settings for consultation. Setup
and Animate evaluate them against the active Setup attachment, including an
inactive slot. The native Setup matrices matched the independent Dice Drop
oracle within 0.001 across the five fixtures. The browser also compared its
evaluated matrices with native and a stock Chain Scale artwork registration.
REA `ev_07adbdb9560c84145c4d4ae56845d1c204dd8393f986f05d8baf3f1a17452747`
observed the exact stock pose PNG exports on a private display without input.
The measured follower shift is about (+9.836, +6.672) world units.

The Session verified collision rollback, stable constrained-bone rename,
Undo/Redo and portable Save As/reopen. Original Spine opened the edited copy
and exported the intended rename with unchanged constraint values and geometry.
REA `ev_6fec4cceb8977ec45b1ac1d5efd977faca191e64e96fb61f8cb65e96bf72c48b`.
Dice Drop loaded the actual FBones JSON, atlas and PNG. Across Setup, changed
root, translation-only and hidden target cases, all 54 checked Path coordinates
and all 192 source pixels matched. The maximum matrix component delta was
0.00000142. REA `ev_435a0a9371bbfdc7807437f7c7c92407cba280c2221007c93fd0e394a1ef4afa`.

The grouped round passed 113 Scene format, 17 legacy format, 456 desktop
Scene plus two focused Path tests, 116 desktop Legacy, 599 JavaScript and 14
browser tests, with existing skips and ignores. Both TypeScript checks and the
web build passed. Host `fb00c727e3e6`, web index `e72b91c2ce5f`. This is the
next grouped baseline. Receipts are in `path-constraint-2026-11-20-9m2jZr/`.
Removed twelve browser workspaces (3,256,320 allocated bytes), 291,834,165
logical bytes of REA scratch and 4,167 logical bytes of staged test outputs.
Reference fixtures and receipts remain. Linux has 790 GiB free, C: 55 GiB
and G: 3.6 GiB.

Settings editing, creation, Path constraint animation, Path Deform and animated
target-slot activation remain open. The next import step is to independently
decode Track132 kinds 9, 10 and 11 from the owned keyed fixture under
`path-animation-2026-11-20-oracle/`, then validate playback and export.

### Static Path project compatibility READY90

REA on original Spine Professional 4.3.26 on Linux established the Path69
field layout and the difference between stored and exported lengths. The
format round passed 112 checks. Seven owned stock files opened editable through
the real FBones Session and independently re-encoded their complete decoded
payload byte for byte. The controls cover open, closed, default flags and
explicit Constant Speed values, one weighted path and one mixed artwork project.
All originals remain unchanged. The receipts are `native-session-static.json`
and `native-session-mixed.json` in the private
`path-attachment-2026-11-20-3dHvwg/` checkpoint.

The mixed stock file uses an alternative Region43 field order observed by REA
`ev_43f6173047444706575de320eb4ee2db20bef3857211450c15912d501026e85e`.
The alternate format is preserved per existing Region and follows its stable
identity on slot reorder. The Session verified the full 1,121 decoded bytes,
Path rename, Undo/Redo, slot reorder, portable Save As/reopen and unchanged
stored lengths. Owner changes and destructive slot removal are guarded.
Original Spine Professional 4.3.26 opened the independently edited copy through
its Linux CLI, via REA
`ev_2e6463b8ded32575a8cdb3bae6f1260af20c5461d1ea2eb99330062d18fa2d54`.
Its complete JSON matched the stock control after accounting for the rename,
reordered slots and the derived skeleton hash.
Dice Drop's Spine runtime 4.3.13 loaded the actual FBones game bundle through
REA `ev_fe8f208f0ce3ab7f46a9564b8db64fa6c049e2a35e6fc0951a02269a38d8c69f`.
It confirmed the renamed active Path, exact local and world points, one atlas
region with all 192 artwork pixels, and maximum length error of 0.0000228.
This is CPU runtime evidence. Path constraints, Path Deform, Path creation and
control-point editing remain open.

The frontend build and both TypeScript checks passed. The grouped round
passed 597 JavaScript tests, 456 Scene desktop tests, 116 Legacy desktop
tests and eight browser tests, including editable Path rename. Existing
skips and ignores remained. The final mixed pass used host `3bc19f07c445` and
web index `910d5a82618e`. This is the baseline for the next 15-point batch.
Removed twelve owned browser workspaces, recovering 3,424,256 allocated bytes,
104,318,281 logical bytes of REA scratch, and 2,826 logical bytes of
temporary edited/exported inputs. Reference fixtures and evidence receipts
remain. Linux has 791 GiB free, C: 55 GiB
and G: 3.6 GiB. Continue the next unresolved production blocker from the board
and reproduce it on an owned copy before changing the editable profile.

### Explicit Linked Mesh chain repair READY90

Inspection offers Open a repaired copy when the chain can be normalized
and independently re-encoded. Recovery accepts one two-hop leaf-to-middle-
to-source relationship with proven shared Mesh46/Binding71 references.
The typed writer must reproduce all bytes outside the leaf source field
and write that field as the already-defined ordinary source reference.
Regular open still reaches the Inspection gate for the original. The
repair creates a new .fbones directory entry without replacing an
existing file. The picker starts in the original folder and the copy
uses that folder, so the unchanged image and audio roots retain meaning.

The exact stock-derived case independently re-encoded 1,727 decoded bytes.
The only difference from the chained input is offset 816, which redirects
the leaf source. Native cancellation, stale revision, outside-folder
selection, invalid extension, and collisions preserve the original and
current Session. The real Session opened and edited repairs of both
.spine and .fbones sources. The browser verified cancellation, original
name refusal and successful editable reopening. The normal unchanged
copy path is still available.

Both FBones outputs were accepted by the exact Linux Spine Professional
4.3.26 CLI. Their full stock JSON matched the direct control, including
the leaf inheritance and the source and middle Deform tracks. REA
`ev_cd79381dabe7e1644926ee494f6f218839db99aa7215cb8df58478290574a5db`
records this stock acceptance. The CLI comparison used the retained
synthetic control without artwork. The copied project format is
compatible within the proven repair scope.

A real Session also repaired the owned .spine case and immediately
exported JSON, atlas and PNG using three generated source images. Both
direct links, the four authored Deform keys and the three atlas regions
were verified. The source and repaired file hashes stayed unchanged.

The grouped round passed 111 Format, 456 Scene desktop, 116 Legacy
desktop, 597 JavaScript and five browser cases. The frontend build and
both TypeScript checks passed. Existing skips and ignores remained.
Host `4980ba622017` used web index `375a0fcdc7ea`. Native desktop picker
behavior is unverified on Windows and macOS. Private results and
reproducers are in `linked-repair-2026-11-20-sgPdUb/`. This is the
next grouped baseline. Use the live priority board and retain the
actual unsupported structure when a different real project needs repair.

Removed three owned browser workspaces (0.9 MB allocated), the two
temporary repaired projects (1,530 logical bytes) and stock CLI
scratch (16.5 KB reported). Reference and result receipts remain.
Linux has 791 GiB free, C: 55 GiB and G: 3.6 GiB.

### Inspection mode rejection reasons READY90

When an intact project cannot enter the editable profile, the native open
path now returns a diagnostic through the normal ProjectSummary. The
English and Romanian Inspection notice explains the observed refusal.
It can distinguish a chain of Linked Mesh sources, a differing typed
re-encode, active clipping limits, attachment profile, image resource
limits, and unportable or case-conflicting image paths. Unknown content
has a generic structure reason. The offset, when available, is zero-based
in the decoded payload, and marks the first independent encode difference.
The reader still uses the same acceptance and re-encode gate. Invalid
checksums, damaged envelopes and other editor versions remain open errors.

REA `ev_20a2fd4da02b9c8f3ff2ab3000167ad6d26ff2fe3aa340f5a8fe8d152c92dec7`
verified the owned linked-chain and flat pair: both decoded payloads are
1,727 bytes and differ only in the leaf's Mesh46 tag26 source reference at
offset 816. The chained input enters Inspection while the stock flat
control is editable. The prior exact Linux 4.3.26 output repaired the
owned chain to the direct root. FBones provides the diagnosed reason and
keeps the immutable project and Save a copy path.

The real Session and browser both verified the diagnosed chain and an
editable direct control. The browser copied the chain with exactly the
original bytes and opened the control. A valid envelope with unknown
payload suffix received the generic reason. An invalid checksum left
the active project intact. Cancel, normal Save refusal, edit/export
refusal, source overwrite protection, and lossless copy reopen all
passed. The format tests cover the exact decoded difference in both
decoder profiles. The compiled notice covers the typed reasons, both
languages and fallback for an unknown discriminator.

The grouped round passed 110 Format, 456 Scene desktop, 116 Legacy
desktop, 595 JavaScript and five browser cases. The frontend build and
both TypeScript checks passed. Existing skips and ignores remained.
Host `1d6491484632` used web index `0c3bfd07244d`. No new Windows build
was delivered. Private evidence is in `inspection-reasons-2026-11-20-mmcEbX/`.
Follow the priority board and use the diagnostic on an owned project
copy to select a new compatibility slice.

Removed three owned browser workspaces (0.9 MB allocated) and REA probe
scratch (22.7 MB reported). The private Session sandbox and all its
copies were removed. Linux has 791 GiB free, C: 55 GiB and G: 3.6 GiB.

### Image Sequence direction modes READY90

Editable Image Sequence now covers all seven observed 4.3.26 modes.
Ping Pong, Once Reverse, Loop Reverse and Ping Pong Reverse round-trip
the exact kind22 mode lanes and remain selectable in the existing
Animate and Graph controls. The shared FBones sampler drives Main,
Preview, Ghosting, GIF and the package runtime. A linked child applies
the source phase with its own receiving count. Repeating preview tails
cover a full cycle; Once Reverse includes the terminal frame.

Key Shown tests the current and next receiving sample before inserting
a key during a reflected leg. When possible it uses the equivalent
start direction. An insertion with unrepresentable receiving phase
is rejected as one transaction. Manual keys restart the chosen mode
from the shown image. These are FBones editing policies. Exact stock
editor gestures remain unmeasured.

The exact four-clip stock fixture re-encodes all 1,664 decoded bytes.
The real Rust Session checked Setup and 19 sample times per clip on
source count 3 and linked child count 4, saved both baseline and edited
copies, and kept all eight key IDs through Undo and Redo. Stock Spine
4.3.26 accepted both files. Baseline stock JSON matched byte for byte.
After excluding its generated skeleton hash, the edited stock JSON
changed exactly one key's mode at 0.875 s, with index and delay intact.
REA `ev_f5b482b1a191f486c69db2f21a49198790cab337bf5bd4422d71786e9d8e42c2`
records those checks.

The installed Dice Drop 4.3.13 runtime loaded both actual FBones bundles.
REA `ev_6d9b648933f2d1832df9e10257e6f9a2090df3c5d64911f37e5d7538d80843ce`
records 344 named-frame assertions, including the inheriting child with
the source hidden, and 14 fully decoded atlas PNG crops. Normal game
animation time clamps at the authored last key. The comparator samples
the later interval through the runtime timeline directly as a separate
phase check. [Exact mode and IO evidence](FORMAT-SCENE-4.3.26.md#image-sequence-direction-modes)

The grouped round passed 109 Format, 456 Scene desktop, 116 Legacy
desktop, 594 JavaScript, 16 package-runtime tests plus native export
checks, and nine browser cases. The owned stock browser case changed
the mode of one key in Graph and verified that Undo restored it.
Both TypeScript checks, web and runtime builds, and the generated MCP
schema passed. Three existing native ignores and one JS skip remain.
Host `5d712e2b0c78` used index `73732ac29851`. No new Windows build was
delivered. Private receipts are in `sequence-modes-2026-11-20-beToyq/`.
This is the next grouped verification baseline. Follow the priority board
and isolate the first unsupported typed record if a real project opens
in Inspection mode.

Removed eight owned browser workspaces (2.5 MB allocated), 22 staged
verification files (0.12 MB allocated) and 40 KB of reference and stock
acceptance scratch (reported). Raw stock oracle and aggregate receipts
are retained. Linux has 791 GiB free, C: 55 GiB and G: 3.6 GiB.

### Linked Mesh Image Sequence READY90

Direct Linked Mesh now preserves separate source and child Image Sequence
settings and tracks. An inheriting child uses its source timing and its own
numbered images, Setup index and count. Hold and Once cap against the receiving
count, while Loop wraps within it. A static child keeps its image. Turning
inheritance off makes a stored independent child track active again.
Stored dormant child keys can be inspected, edited by ID, moved or removed.
Convenience controls for new inherited keys point to the source. Key Shown
checks the receiving frame and phase before adding an automatic source key.
Playback and GIF preview extents include the receiving Sequence tails.

Exact Spine 4.3.26 charted five cases and the inline stock CLI Sequence123
ordering. FBones re-encodes the complete decoded 1,340, 1,340, 1,402,
1,402 and 1,330-byte files. The real Rust Session verified separate settings,
all stored owner tracks, source-visible and source-hidden pose sampling,
editable roundtrip, toggle without track loss, and positive plus rejected
native edits. It saved, reopened and exported seven variants including both
toggle directions. Original PNGs and project copies were preserved.
[Stock and consumer evidence](FORMAT-SCENE-4.3.26.md#linked-mesh-deformation)

Setup can now create a direct link from a sequenced source with positive
mesh image dimensions. FBones initializes it with a copy of the source
settings and shared image path. Exact stock GUI creation defaults remain
unobserved. The existing zero-dimension creator stays outside this profile.
Additional direction modes are covered above. The prior direct Deform
safety guard remains.

Original Linux Spine 4.3.26 accepted all seven independently FBones-saved
files. Their complete stock JSON matches the corresponding stock controls,
including both switch directions. REA
`ev_8d546d642d5af149b85357f7e37d48ec75939d4f4ddbd5f826723b0220e213b4`
records those results. Installed Dice Drop 4.3.13 accepted all seven
FBones game bundles. REA
`ev_4ee921a6f83e209a5d6339c43db928605ff0638cb47bdd5d4302d3e76e5b8e9f`
records 91 CPU poses, 140 named-region assertions, and 46 fully decoded
PNG region crops. Both tracks remain in the exported JSON while inheritance
determines the visible child frame. A browser probe switched inheritance
off and verified the child's own rendered image selection and available
key control without changing either stored track.

The grouped round passed 109 Format, 455 Scene desktop, 116 Legacy
desktop, 590 JavaScript, 16 package-runtime tests with native export
checks, and 12 browser cases. Both TypeScript checks and the web and
runtime builds passed. Three existing native ignores and one existing JS
skip remain. Browser host `d3b2320c6abb` used index `78f4bd0a8f6f`.
Private receipts and reproducers live in `linked-sequence-2026-11-20-j0jyFj/`.
No new Windows delivery was built. This is the next verification baseline.
Follow the live board. An actual project in Inspection mode should first
be checked on an owned copy to isolate its unsupported typed record.

Removed 11 owned browser workspaces (3.3 MB allocated), 74 staged
verification files (0.4 MB allocated), and 103.4 MB of exact-oracle
scratch (reported). Raw reference and aggregate receipts are retained.
Linux has 791 GiB free, C: 55 GiB, and G: 3.6 GiB.

### Setup creation of direct Linked Mesh READY90

The native Setup command creates a direct Linked Mesh in the selected
destination slot with its own stable ID. It starts from the source image,
shares source geometry and weights, inherits timelines, and has independent
white tint. Existing slot activation is preserved, including occupied
hidden slots. An empty slot activates the new child. These name and
activation choices are FBones policies. Imported zero-size mesh metadata
stays outside the creation profile. The initial Sequence limitation is
covered by the current checkpoint above.

REA using exact Linux Spine Professional 4.3.26 establishes the same-slot
weighted/unweighted and different-slot unweighted wire shapes in addition
to the accepted cross-slot weighted case. Stock CLI confirms the source
reference, default inheritance, shared geometry and binding arrays, and a
distinct self-owned Binding71 record. All three new exact stock fixtures
re-encode their whole payloads (1,181, 1,139 and 1,199 bytes).
[Reference evidence](FORMAT-SCENE-4.3.26.md#linked-mesh-deformation)

The real Rust Session created same-slot and different-slot links on weighted
and unweighted stock projects, kept active attachments, source image and
keys, preserved child identities through Undo/Redo, and saved/reopened
both projects. The unweighted child is posed by its destination bone while
its stored geometry is shared with the source. Both FBones-saved projects
were independently accepted by original Spine through the pinned CLI. REA
`ev_f2053b05695096ab4574e073fa716b27846b7f962ca0a58d79fa48fab90760a8`
verified four new links, active references, original keys and effective
image paths. The exact stock GUI creator defaults remain unobserved.

Dice Drop Spine 4.3.13 accepted both FBones game bundles. REA
`ev_a3b828ea4ab2e1d30988a48d987af154b16f2d7a50fbbfc84e33a395aab3b9d0`
records 192 independently calculated world coordinates, including source
deformation while the weighted child was active and the source hidden,
and the unweighted child's destination-bone offset. Both links reuse the
source atlas region. The PNG and both regions were decoded. These are
CPU runtime and image checks. Original project fixtures stayed unchanged.

The grouped round passed 454 Scene desktop, 116 Legacy desktop,
587 JavaScript and nine browser cases. The new browser case used the
normal Tree command, Escape and focus restoration, one cross-slot creation,
selection of the new child, Undo and Redo. Both TypeScript checks, the
frontend build and the generated 110-variant MCP schema passed. Three
existing native ignores and one JS skip remain. Host `994ae3f79dbd` used
web index `0b662d33a560`. No new Windows delivery was built. Private
receipts and reproducers are in `linked-create-2026-11-20-Y1iD5W/`.
This is the next verification baseline. Follow the live board and inspect
the first unsupported typed record on any new real project that opens in
Inspection mode.

Removed eight owned browser workspaces (2.2 MB allocated), the staged
projects and bundles (9.2 KB logical), and the REA oracle scratch
(103.1 MB reported). Reference and acceptance evidence remains retained.
Linux has 791 GiB free, C: 55 GiB and G: 3.6 GiB.

### Linked Mesh timeline inheritance READY90

Setup's Linked Mesh inspector now edits the existing `Inherit timelines`
flag for direct links. The native transaction changes one flag, keeps the
source, geometry, binding and keys, and participates in Undo and Redo. The
same action is included in the generated MCP edit schema. FBones rejects
enabling inheritance when the child has authored Deform keys in any clip,
including a stored comparison. The initial Sequence rejection has since
been replaced by verified preservation of the independent Sequence profile.
The Deform guard is a data-preservation policy. The stock GUI's transition with
existing independent keys remains unobserved.

The real Rust Session verified both transitions, unchanged source tracks,
same-value no-op, Undo/Redo, Save As, reopen and binary ownership. Switching
one of the eight links off and back on in the current mascot copy restored
all 308,755 decoded bytes. The personal original stayed unchanged.
Exact Linux Spine Professional 4.3.26 accepted the two FBones-saved
transitions. Its complete JSON exports match the independently generated
stock ON and OFF oracles. REA
`ev_e17f7bf4871c0e49ea3d489a7e276fa56d9d3da0c9893448831c2b5bca21e6b3`
records those comparisons.

Dice Drop Spine 4.3.13 loaded both new game bundles. REA
`ev_359a5ab28f9b302fe5afbb3fed11382dabb4d358e3f29030c9f3835ff791ac65`
records 128 independently calculated coordinate checks, one unchanged
source Deform track and the same atlas and decoded PNG across directions.
With inheritance off the child stayed at Setup. With it on the child
followed the source. This was CPU pose and atlas/PNG verification.

The stock CLI rejects JSON chains for all four flag combinations. One
owned binary with a chained reference was repaired to a direct link on
load, while preserving the independent middle keys and the leaf's flag.
The guarded noncanonical binary remains separate from editable profiles.
[Exact chain evidence](FORMAT-SCENE-4.3.26.md#linked-mesh-deformation)

The grouped checkpoint passed 453 Scene desktop, 116 Legacy desktop,
586 JavaScript and 16 browser cases, including the owned checkbox and
Undo/rejection cases. A targeted keyboard Space rejection rerun also
passed. The frontend build, both TypeScript checks and the
109-variant MCP schema passed. Three existing native ignores and one JS
skip remain. Test host `e9de996d0209` used index `9adce53e514a`.
The product check did not include a new Windows installer. Receipts and
reproducers are in private `linked-inheritance-2026-11-20-HwiPss/`.
This is the new grouped verification baseline. Next use the live board
and reuse the direct-link oracle for any Setup link-creation work.

Removed 14 owned browser workspaces (3.8 MB allocated), the two staged
projects and bundles (9.5 KB logical), and the private chain probe
work area (102.9 MB reported). Required reference and reported results
remain retained. Linux has 791 GiB free, C: 55 GiB, and G: 3.6 GiB.

### Direct Linked Mesh animated Deform READY90

The current production priorities retain the working mascot, live gravity,
runtime bundle and GIF gates. This grouped compatibility slice adds editable
direct, weighted cross-slot Linked Mesh with animated Deform from Linux
Spine Professional 4.3.26. It uses the exact record layout found in three
owned stock CLI projects. Each independently re-encodes its entire decoded
payload (1,364, 1,364 and 1,472 bytes respectively). REA
`ev_f3831f007d4a40a659c3a62eda2b7cbf31bd1ad4c81059dd8abe1f3eb20568ed`
established actual owner, geometry and curves. REA
`ev_9c5fdb447ee7243e67d18cf016c50053bb4d9fffee7e773cdf541ebd188efe9a`
authenticated the full-byte match and preservation of the alternate order.
The real mascot copy still independently re-encodes its 308,755 decoded
bytes exactly and the personal original hash stayed unchanged.

The real Rust Session opened all three files editable and preserved complete
payload equality on unchanged saves. Eight poses per attachment and variant
matched the stock-derived weighted world coordinates before and after Save As
and reopen. A new source key also moves its inheriting child. An independent
child can key its own deformation without changing the source. Browser checks
verify that the inherited child's Key control is disabled, Edit source mesh
selects the source, and an independent child adds exactly one key to its own
track. Session export verifies ownership and writes JSON/atlas/PNG files
for all three variants. REA
`ev_62541989b34b76cb09ea936066203c427adde1288bbf2f989d8dae9fd9699f74`
verified both independently saved projects in the exact Spine CLI. The
original editor exported the new keys at their intended owners, with the
old tracks intact. Separately, the installed Dice Drop Spine 4.3.13 runtime
loaded all three FBones game bundles and matched 384 independently calculated
world coordinates. The inheriting child moved with the new source key, the
non-inheriting child with no keys kept its Setup geometry, and the independent
child played its own new key. The atlas and decoded 20 × 14 PNG matched both
image regions. REA
`ev_94c77b8adfa4d58525904aab12d2bf7168da77e69551eea6b9307dda11fefb67`
records CPU pose and atlas/pixel checks.

This first delivery supported the direct weighted profile above. Inheriting
children key through the source. Independent linked Sequence timeline
behavior remains open. No new OS-native window or installer acceptance was
run for this slice.

The grouped implementation checkpoint passed 109 Format, 452 Scene desktop,
116 Legacy desktop, 586 JavaScript and 31 browser cases, including two
owned stock-linked UI cases, plus the direct three-variant Session gate.
There were three existing native ignores and one JavaScript skip. The
frontend build and both TypeScript checks passed. Host `ac9e833aee68`,
web index `b4dcc7c50781`. Private receipts and reproducers live in
`linked-deform-2026-11-20-N0noZO/`. This batched workflow is the baseline
for the next cadence checkpoint.

For a new real project that opens in Inspection mode, run the exact codec
check on an owned copy and identify the first unsupported typed record before
selecting another compatibility slice. Use the board priority order.

Removed 29 owned browser workspaces (7.8 MB allocated), 182.6 MB allocated
from stock-order diagnostics, and the unused fallback build scratch
(103.4 MB reported), plus the staged edited and game files. The raw reference
fixtures and aggregate receipts are retained. Linux has 791 GiB free,
C: 48 GiB and G: 3.6 GiB. The [task board](http://127.0.0.1:4180/) serves the
updated status and original priority order.

### Retained priority acceptance — Current mascot basic production workflow READY90

The current Spine 4.3.26 mascot opens editable with 76 bones, 33 slots,
35 constraints, 16 clips and eight cross-slot Linked Mesh attachments.
Its 308,755 decoded bytes round-trip exactly. REA
`ev_7b89c14399caaf680372197c894f0129e2d1d5c3157f80e5ff2aa1e258347083`
authenticated source geometry, binding aliases and child identity.
`ev_9990fff95128e00a5eb8111c14f79a9e8d4ecf515914fd2c0fe1d5074edabfa3`
measured the color key records and reserved words.
`ev_e13223c9a9eed7379805779c0dbfe25d3af20b8870a4d8948067f1a2a8034dcc`
closed the full independent encode including the observed root folder,
four editor group values and exact Project0/tag32 bits.

The grouped browser gate used an owned copy with the real Rust Session.
Setup loaded with simulation enabled, accepted gravity 12.5 in its
inspector and advanced the preview clock. Animate created exactly one
manual key and played with Physics. The two qualified `control/` clips
preserved the untouched color components and produced independently
visible RGB and alpha changes. A private direct Session run made a
basic Setup bone edit, authored gravity +10 and added two root keys in
`control/lumina_teal`. It saved as a new file, reopened and exported.
The normal-save unchanged-copy check preserved the exact decoded payload.
The original mascot source SHA was verified unchanged.

REA `ev_af74937f6d028d2be072bc78f325f637a95b6fb533b4a8be6f11ad4b1fb42739`
verified that exact Linux Spine 4.3.26 Professional accepted the independently
encoded edited copy via CLI and exported the intended Setup, Physics and
Animate changes, 8 linked meshes, 16 clip names and all 120 alpha tracks.
This stock CLI probe covered the project binary and JSON. The independent
FBones game output supplies the PNG and atlas proof.

File → Export Spine game bundle writes skeleton JSON, atlas and PNG pages.
Dice Drop's installed Spine 4.3.13 runtime loaded the current edited
mascot's 37 regions on one PNG and played the authored clip with finite
posed data. It verified the new root keys, eight linked meshes and both
qualified names. The output matched the companion stock bundle across
1,816 RGB/alpha samples with a maximum difference of 7.86e-8. The original
companion omits 15 default-only RGB channels. The new unoptimized stock CLI
JSON retains them. FBones omits them when another timeline preserves the
duration and keeps all authored channels in the project.

This milestone covers direct linked meshes, one-level animation folders
and imported separate linear light RGB plus linear or cubic alpha. Split
lanes are read-only for authoring. Deeper folders, split Tint Black and
constrained projected Local/World transform editing remain open. The ordinary
authored Setup fields work in constrained projects.
The existing gravity solver passed live Setup and Animate, including the
mascot's 20 Hz scene and save without baking. Its deferred moving-parent
and startup phase fidelity stays tracked.

The grouped round passed 107 Format, 450 Scene desktop, 116 Legacy
desktop, 578 JavaScript and 19 production-CSP browser tests, plus one
real-mascot browser proof. Both TypeScript checks and the frontend build
passed. Three existing native ignores and one JavaScript skip remain.
E2E host `294be26fe6da` used web index `fb3791d29339`. The private
`current-mascot-priority-2026-11-20-bbrxsR/` holds receipts and the
reproducible workflow. The earlier checkpoint is retained under
`core-priorities-2026-11-20-0AlaH1/`.

Removed 20 owned browser workspaces and seven unused incremental caches,
about 970 MB allocated, as well as the temporary edited copy and private
probe artifacts. Older browser workspaces of uncertain ownership total
80 MiB. Linux has 791 GiB free, C: 53 GiB, and G: 3.6 GiB. The
[task board](http://127.0.0.1:4180/) remains running.

GIF preview export is READY90. File → Export animated GIF opens the
current clip with explicit output-frame range, FPS, continuous loop and
the clip's final-frame option. The isolated artwork renderer uses the
editor's animation and Physics evaluator, with a fixed crop and shared
resource generation. The native save path rechecks document identity and
revision and writes atomically. Cancel preserves the chosen range.

Pinned Linux Spine 4.3.26 Professional used an authenticated private
Xvfb display for CLI export. REA
`ev_62d70c3eb5d18f0e7c8b044a1175dee82c975b2af988b4a1bf0a338794b7e9d8`,
`ev_3114042dc51bc0579a82e20084aa287a025604f3559e0eb23c725eab75f570a7`
and `ev_5d0221574c20cecaf44aa6ee96b0fe3fe3cc85cda97c0e686d9d63a1a394115a`
establish output-rate indices, inclusive ranges within the clip, terminal
clamping, integer centisecond delays and loop extension behavior. REA and
Pillow independently decoded the FBones browser-exported 136 × 232 GIF
into four distinct 100 ms images, with transparency, continuous loop and
the authored motion of the selected range.
`ev_3c942945f4009a5a4a092df78da1dc1a026f9582ec7dc72e76cb798bfbc9e53b`
records that result. Palette choices, duplicate-frame coalescing, repeat
warm-up cycles and a fractional terminal pose remain fidelity work.

The GIF checkpoint passed 452 Scene and 116 Legacy native tests, 584 JS
tests and four production-CSP browser cases including GIF, File and game
bundle, with final cadence and GIF rechecks after the last clamp fix. The
private `gif-export-2026-11-20-bmM0M3/` holds receipts and build pins.
Removed nine owned browser workspaces (2,347,008 allocated bytes) and
the isolated stock CLI scratch (308,555 logical bytes). Linux has 791 GiB
free, C: 53 GiB, G: 3.6 GiB.

Current mascot Play optimization is READY90 for the browser scope. The
animation evaluator prepares the immutable graph and Physics layout once
per configuration. Pixi retains unchanged visibility, stencil geometry
and filters across redraws. The owned pinned mascot pair at 1440 × 900
showed 1.043 → 0.787 ms script/RAF with Preview visible, and 0.919 → 0.873
after reopening Preview. Uninstrumented p95 stayed at 16.7–16.8 ms.
Reopened p99 moved from 16.8 to 33.4 ms with one additional callback above
25 ms. Clock and full Session snapshot were stable, with no evaluation or
edit IPC, and the source file remained unchanged. Existing browser pixel
regressions cover masks, colors, related attachment transitions and GIF.

An isolated 76-bone, 35-constraint Node comparator measured 0.1975 →
0.1462 ms per evaluated frame, with exact agreement across 1,472 frames
and 20 temporary drafts. The grouped frontend build, test TypeScript,
585 JavaScript and 25 production-CSP Playwright tests passed. The native
Session host `b4dece31eed` was reused with web index `688786f6183`.
Private `mascot-play-2026-11-20-gKOb4p/` retains the pinned comparison.
Removed 25 owned browser workspaces (6,410,240 allocated bytes) and the
temporary comparison inputs. Stock Spine interactive cadence remains open.
[Evidence](research/PLAYBACK-PERFORMANCE-2026-11-18.md#current-mascot-playback)

The current mascot is now measured in native WSLg X11. Debug desktop
`2894d6d98835` embeds all ten exact JS/CSS payloads from the verified
frontend and equivalent HTML. Same-binary automatic CPU painting versus
explicit off gives 29 → 63 ms p95 on repeated warmed Play with Preview
visible, 24 → 58 ms when closed, and 17 → 17 ms paused. WSLg had no render
device handle, and the WebProcesses reported `1` and `0` respectively.
Both runs preserve the full authored Session snapshot, original and
read-only copy. Main, Preview and full WebView pixels match exactly at
frames 0 and 30 across both modes. This pair attributes the difference
to the current paint configuration. A direct native before/after pair
for the frontend optimization and Windows/macOS cadence remain open.
The same mascot with automatic painting measured 34/34/29 ms p95 in a
visible/CSS-hidden/restored diagnostic with both canvases still drawing.
The synchronous RAF callback p95 was 3/2/2 ms. The follow-up kept clock
and Session live while separately suppressing draw submission. The
private `mascot-native-play-2026-11-20-DnVG4d/` and browser checkpoint retain
the build, timing and comparison evidence. Removed five owned temporary
profiles, 4,046,848 allocated bytes of superseded images and 17,109,599
bytes of reference copies. Native test windows and listeners were closed.
[Evidence](research/PLAYBACK-PERFORMANCE-2026-11-18.md#current-mascot-playback)

The current mascot native A/B/A probe measured 34/27/34 ms p95 when
Preview draws were suppressed and restored. Suppressing both canvases'
draw submissions gave 33/26/30 ms. Clear and upload traffic continued,
the clock and authored snapshot stayed exact, and the source and copies
were unchanged. The normal reference workload issued 16 main and 13
Preview draws per visible RAF. Remaining delay persists with draw
submission suppressed. Exact Spine REA
`ev_e086215a5dc410fc9874d30c7768b9dcda7d8889be74054b5df798e9eb2e539f`
authenticates the retained software-request launch and executable Mesa
GLX mapping. Its selected rasterizer and interactive cadence remain open.

An explicit Pixi batching experiment for 101–256 vertices ran the current
mascot in Chromium, including visible split color, Physics and a key edit.
Two native sessions reached WebGL readiness and opened the typed project,
then timed out applying it to the renderer via the inspector before Play.
Native draw and pixel benefit remains unverified. Restored native
`2894d6d98835`, HTML `688786f6183` and all ten exact JS/CSS assets. The
private `mascot-batching-2026-11-20-6cUHn8/` retains the experimental diff,
receipts and restoration digest. Removed the 283,045,888 allocated-byte
candidate and the owned project copies. Linux has 791 GiB free, C: 52 GiB
and G: 3.6 GiB. Use a direct native render/inspector discriminator before
retrying that batching route. An intermittent inspector refresh timeout
also occurred on the restored executable during the subsequent color
probe, so the batching trial remains inconclusive on the failure's cause.
[Evidence](research/PLAYBACK-PERFORMANCE-2026-11-18.md#native-webgl-submission-on-the-current-mascot)

Exact projected position retention is READY90. FBones compares the
already projected Float32 coordinates and keeps the existing Pixi buffer
only for identical finite positions. Camera, Deform, topology, resource,
UV and clipping changes use their existing paths. The current mascot's
`anticipation` submitted 1,449 array updates with zero identical repeats.
It also repeated 71 index uploads totaling 617,640 bytes over 1.8 seconds.
On `control/culoare_lumina`, the new executable removed ten direct position
uploads per RAF on each canvas, saving 21,632 submitted bytes per RAF.
Native clock, authored snapshot and source bytes passed. In the initial
instrumented pair p95 was 34 → 40 ms. In two separate warm timing windows
without GL hooks p95 was 35 → 33 and 31 → 29 ms. Their p99 increased from
38 → 43 and 50 → 57 ms. Stable cadence improvement remains unproven.

The current native hash is `e646c510115e`, using HTML `9941b4d40b9c`.
The grouped frontend build, test TypeScript, 586 JavaScript tests and 17
production-CSP browser regressions passed. One existing JavaScript skip
remains. The pinned Pixi test covers unchanged coordinates, pan, Deform
and signed zero. The browser group verifies mesh, clipping, authored
gestures and GIF pixels. Native upload and timing probes verify geometry
dimensions and integrity. Private `mascot-vertex-upload-2026-11-20-bdWX6e/`
retains reports. Removed 17 owned browser workspaces, the old 283,041,792
allocated-byte binary alias and the native probe copies. The next
`anticipation` discriminator tested separating stable artwork instructions
from changing guides. [Evidence](research/PLAYBACK-PERFORMANCE-2026-11-18.md#exact-projected-position-uploads)

The main-artwork RenderGroup experiment is closed. Same native WSLg
`anticipation` A/B measured main index bytes 48,552 → 44,341 per RAF and
draws 16 → 17. The dominant 43,668-byte submission remained. Warm no-hook
p95 intervals were 34/29 versus 34/30 ms. Clock, source, Session and all
six decoded paused raster comparisons passed. REA
`ev_031a409984c17e70178390d33aacccc458c37727820705e5de93f068df4fa369`
authenticates artwork-only and bone-only exports from owned exact stock
4.3.26 fixtures. It establishes distinct user-visible output categories.

Restored the verified `e646c510115e` native renderer and `9941b4d40b9c`
frontend because the separate art group exchanged reduced index traffic
for an extra draw without demonstrating cadence gain. The candidate
passed 586 JavaScript and nine grouped browser cases. The restored
renderer passed the new Ghosting On top pixel assertion, which stays in
the existing regression. Private `mascot-artwork-group-2026-11-20-WWi5LA/`
retains the A/B, captured rasters, experimental diff and restore proof.
Removed ten owned browser workspaces, the 283,045,888 allocated-byte
candidate and owned native/reference scratch. Linux has 791 GiB free,
C: 52 GiB and G: 3.6 GiB. A later guide-cost investigation can isolate
the remaining 43,668-byte draw submission; reuse this evidence and move
to the next independent board slice without repeating the artwork route.
[Evidence](research/PLAYBACK-PERFORMANCE-2026-11-18.md#isolated-artwork-instructions)

## Accepted Tree View Settings READY90

Tree View Settings appears before the pane actions in the real dock header.
Hide skeleton names abbreviates the exact prefix of the supported single
Skeleton's authored name. The tooltip, accessible description, search,
rename and project retain the full name. The browser verifies prefix edges,
a 180px dock, Escape, six unavailable controls, Setup/Animate and F9.
The preference lasts for the FBones session. The exact Linux REA evidence
confirms the closed settings glyph. Original defaults and persistence remain
open. [Tree View Settings result](research/VIEWPORT-OPTIONS-2026-11-18.md#tree-view-settings-reference)

The production web build, both TypeScript checks, 578 JavaScript passes and
53 production-CSP browser passes are recorded. One existing JS skip remains.
Final web index is `036463b71e29`. The Rust Session host `731fd0fd6473`
and accepted 445 Scene and 116 Legacy cases were reused. Optimized Linux
`1115a37f0770` embeds the eight exact JS/CSS payloads and verified HTML
structure and asset references. The executable is unlaunched. Private
`tree-view-settings-2026-11-19-ag92is/` retains reports, pins and ELF proof.

Removed 49 owned browser workspaces and redundant inventories, 12,641,818
logical bytes. Retained 80 MiB of older workspaces with uncertain ownership.
Linux has 792 GiB free and G: has 3.6 GiB.

The live dashboard now opens to explicit parent and child branches with
browser-local unread backgrounds, read actions and an Unread changes filter.
Status board retains drag and priority editing. Four integration cases and
live Chromium at 390px passed. [Dashboard setup](DEVELOPMENT.md#normal-setup)

Windows x64 0.10.0 was delivered to Desktop NEWSPINE as
`FBones-2026-11-19-dd4e9c50.exe` at the user's request. The 18,669,056-byte
GUI PE has SHA-256 `dd4e9c503e56198505cceed38b402be95237000d93e2d55bf11c39564694d488`.
The embedded assets match the same tested frontend and Windows readback
matches the compiled image. The existing executable and project files
were preserved. Native startup remains untested for this image. Private
`windows-newspine-2026-11-19-vNRhYp/` retains verification and delivery
receipts. C: has 65 GiB and G: has 3.6 GiB.

Reuse the accepted test evidence at the next 15-point baseline. Per-bone
Tree visibility remains queued behind the core production workflow.
[Tree bone visibility evidence](research/VIEWPORT-OPTIONS-2026-11-18.md#tree-bone-visibility-reference)

## Accepted Tree filters and Animate Draw Order key READY90

Tree has a popup for the four current categories, temporary bypass, exact mask
restore, Reset and independent text filtering. Highlight-only search preserves
unmatched rows and collapse preferences. Tests verify an inactive Mesh keeps
its native ID and activation state while the mask changes Tree visibility and
Weights eligibility. Extra attachment types are discoverable and unavailable.
Exact Linux REA confirms the closed funnel. Original activation, defaults and
persistence remain open. [Tree filter result](research/VIEWPORT-OPTIONS-2026-11-18.md#tree-filter-menu-reference)

Animate Tree exposes the Draw Order key through the existing action. The
browser verifies a nonidentity draft at frame 12 with Auto Key off, one native
transaction and one Undo, with unchanged Setup, unrelated tracks, slot
selection and Current. Exact Linux REA confirms the static glyph in both
Graph and Dopesheet. Exact activation and color meaning remain open.
[Draw Order result](research/VIEWPORT-OPTIONS-2026-11-18.md#tree-draw-order-key-reference)

The production web build, both TypeScript checks, 578 JavaScript cases and 52
production-CSP browser cases passed. One existing JS skip remains. Final web
index is `c5bd30263d80`. The unchanged Rust host `731fd0fd6473` and accepted
445 Scene and 116 Legacy cases were reused. Optimized Linux `bcfc0035b8a9`
embeds eight exact JS/CSS payloads and the verified HTML structure and entry
references. The executable is unlaunched. Private
`tree-filters-2026-11-19-KHb6mF/` retains reports, pins and direct ELF proof.

Removed 50 owned browser workspaces and redundant inventories, 12,864,653
logical bytes. Retained 80 MiB of older workspaces of uncertain ownership.
Linux has 792 GiB free and G: has 3.6 GiB.

## Accepted Tree search navigation READY90

Tree Previous and Next cycle direct, visible matches. Enter and F3 advance,
Shift reverses the direction, and Escape in the search group clears the
query. The browser verifies 180px controls, local scrolling, category
filters, no results, hidden Tree, and unchanged Session data. Cycling a
single selected bone keeps Rotate. The animation result selects its clip
even when the Animate layout has Tree minimized. Exact Linux REA confirms
the static arrows. Populated ordering and wrap are FBones choices.
[Tree search result](research/VIEWPORT-OPTIONS-2026-11-18.md#tree-search-navigation-reference)

The production web build, both TypeScript checks and 578 JavaScript cases
passed with one existing skip. An 18-case recheck covers the affected
compiled Tree integration on the final source. Forty-nine production-CSP
browser cases passed against web index `98cca0ce1b15`. The unchanged
Rust Session host `731fd0fd6473` and accepted 445 Scene and 116 Legacy
cases were reused. Private `tree-search-navigation-2026-11-19-brxpwt/`
retains the reports and pins. Optimized Linux `791062beb8d2` contains
Tree navigation and Find and Replace. Eight JS/CSS payloads decode to the
tested bytes. Embedded Tauri HTML preserves the tested document structure
and entry references. The executable is unlaunched.

Removed 46 owned browser workspaces and redundant browser and build
inventories, 11,959,515 logical bytes. Retained 80 MiB of older workspaces
with uncertain ownership. Linux has 792 GiB free and G: has 3.6 GiB.

## Accepted Tree Find and Replace READY90

Tree Find and Replace previews literal Bone names in Setup and applies the
included rows in one revision-guarded Undo action. Duplicate final names
block application. Stable IDs, transforms, selection and animation links
are preserved. Native tests verify atomic rejection, simultaneous name
swaps, Undo and Redo, and save/reopen. Path, regex, other item types and wider
scopes are discoverable and unavailable. Exact Linux REA confirms the
toolbar control. The original open dialog and transaction semantics remain
open. [Find and Replace result](research/VIEWPORT-OPTIONS-2026-11-18.md#tree-find-and-replace-reference)

The production web build and both TypeScript checks passed. The combined
gate has 578 JavaScript passes with one existing skip, 445 Scene passes
with two existing ignores, 116 Legacy passes with one existing ignore,
and 31 browser passes across the main run and focused recheck. The focused
checks repeated after correcting the Path option assertion and removing
an unused native test binding. The final web index is `c8f976ff3efe4` and
the fresh Rust Session host is `731fd0fd6473`. Private
`tree-find-replace-2026-11-19-NNT3LJ/` retains the reports and pins.

Removed 25 owned browser workspaces and redundant inventories, 6,457,838
logical bytes including native inventories. Retained 80 MiB of older
workspaces with uncertain ownership. Linux has 792 GiB free and G: has
3.6 GiB. The optimized package is recorded in the current checkpoint.

## Accepted baseline — Tree reveal and recursive branch actions READY90

Tree Auto scroll follows deliberate viewport selections. It starts off for
the session. Right-click and Shift+Enter reveal the primary row once. The
browser verifies an off-screen bone under two collapsed ancestors, preserved
focus, zoom and surrounding scroll, an excluded search result, and no deferred
reveal from an F9-hidden pane. Exact Linux REA identifies the static control.
Exact activation, defaults and broader selection scope remain open.
[Tree reveal result](research/VIEWPORT-OPTIONS-2026-11-18.md#tree-auto-scroll-and-reveal-reference)

Collapse and Expand address the primary projected scene branch. Empty
selection and double-click address all projected branches. A row's context
action recurses over that row. Tests verify control bounds at 180 pixels,
nested and sibling collapse, latent selected descendants and search scope.
Current filters, focus, selection and native state are preserved. Exact
Linux REA establishes the two controls and their order.
[Tree expansion result](research/VIEWPORT-OPTIONS-2026-11-18.md#recursive-tree-expansion-reference)

The production web build, both TypeScript checks, 578 JavaScript cases and
all 46 production-CSP browser cases passed. One existing JS skip remains.
Final web index is `443b63c99cee`. The unchanged native host `50ce6de43571`
and accepted 444 Scene and 116 Legacy cases were reused. Optimized Linux
`b9f438c8c411` includes Tree navigation and the accepted Setup Weights G
shortcut. Eight embedded JS/CSS assets decode to the exact tested bytes.
Tauri HTML preserves the tested entry references. The package is unlaunched.

Private `tree-navigation-2026-11-19-OvLRYc/` retains the browser report,
pins and direct ELF evidence. Removed 41 owned workspaces and redundant
inventories, 10,303,694 logical bytes. Retained 80 MiB of older workspaces of
uncertain ownership. Linux has 792 GiB free and G: has 3.6 GiB.

## Accepted Clipping contextual tools READY90

The Setup HUD exposes all four Clipping rows. Rotate, Translate and Scale
activate the existing whole-attachment tools in Images while retaining the
selected clip. The numeric cells, Shear, Reset and Freeze are unavailable.
The browser verifies an inactive contour and one drag/Undo, with the active
sibling, range and Animate Deform preserved. At 960×640 the case uses a
scene pan to expose the gizmo. Undo retains existing native history focus.
The exact Linux numeric center remains open.
[Clipping result](research/VIEWPORT-OPTIONS-2026-11-18.md#clipping-center-reference)

The web build, both TypeScript checks and 569 JavaScript tests pass with one
existing skip. The production-CSP browser gate covers 40 cases including the
narrow pan recheck against unchanged web assets and Rust host `50ce6de43571`.
The accepted native baseline is 444 Scene and 116 Legacy. Web index is
`44d4f6607335`. Group the next optimized desktop package with the toolbar
position slice. Latest Linux artifact is still `695e95ef8c80`. Private
`clipping-values-2026-11-19-WW7Z0i/` retains both reports. Cleanup reclaimed
9,437,828 logical bytes from 41 owned browser workspaces and their inventories.
Linux has 792 GiB free and G: has 3.6 GiB. Older browser workspaces of
uncertain ownership occupy 80 MiB.

Next, expose the reference-observed padlock on the main floating toolbar.
Implement horizontal movement within the viewport, carrying the selection
path and actual controls together. Verify resize bounds, pointer cancellation,
keyboard positioning, Setup/Animate continuity and no scene edits. Exact
Linux captures establish the icon. The publisher describes drag, and exact
defaults and persistence remain open.
[Toolbar position evidence](research/VIEWPORT-OPTIONS-2026-11-18.md#floating-toolbar-position-reference)

## Accepted contextual attachment values READY90

Setup Region Translate, Rotate and signed Scale share an owner-local draft
with Properties. The sparse native path preserves omitted f32 channels and
inactive siblings. The new case covers byte-exact stored values, no-op,
invalid updates, full-precision draft rehydration, Escape and one Undo.
An explicitly selected inactive Mesh shows its evaluated world hull center,
excluding the interior vertices. Rotate/Scale/Shear numeric Mesh controls are
visible as unavailable. Exact stock display basis and edit behavior remain open.
[Attachment result](research/VIEWPORT-OPTIONS-2026-11-18.md#contextual-attachment-values-reference)

The web build, both TypeScript checks, MCP schema and 569 JavaScript cases
pass with one existing skip. Native Scene has 444 passes and two existing
ignores. Legacy has 116 passes and one existing ignore. The production-CSP
browser gate covers 46 cases, including a focused recheck on the same package
after correcting the hull test's floating-point comparison. New host
`50ce6de43571` and Linux build `695e95ef8c80` use the frozen inputs. The Linux
build embeds the nine tested assets and the preceding selection hierarchy.
It remains unlaunched. Private `attachment-values-2026-11-19-vbDIqy/` retains
reports and pins. Cleanup reclaimed 14,076,116 logical bytes including 47
owned browser workspaces and native inventories. Linux has 792 GiB free and
G: has 3.6 GiB. Older browser workspaces of uncertain ownership occupy 80 MiB.

Next, extend the contextual Clipping HUD with the reference-observed row
availability while preserving the existing vertex, mask and whole-attachment
tools. Retained exact Windows Convex pairs rule out the raw vertex mean on
their fixture. Keep a unique center formula open. For a discriminating
reference, use the documented asymmetric trapezoid and compare the three
expected values before depending on its numeric center.
[Clipping evidence](research/VIEWPORT-OPTIONS-2026-11-18.md#clipping-center-reference)

## Accepted selection hierarchy READY90

The floating HUD shows the saved hierarchy of a single selected bone, slot
or typed attachment. An inactive Mesh path follows its owner through Animate
activation and Tree or viewport filters. Multi-selection clears the row. At
960×640 early labels clip and the full path remains available to assistive
technology. Exact Linux REA proves authored ownership. Supplied and historical
images show visual ordering. Exact Linux selected appearance and ancestor
activation remain open.
[Hierarchy result](research/VIEWPORT-OPTIONS-2026-11-18.md#selection-hierarchy-reference)

The web production build and both TypeScript checks pass, with 569 JavaScript
passes, one existing skip and 30 focused production-CSP browser passes on
reused Rust Session `f3b92cf16d79`. Accepted native baseline is 443 Scene
and 116 Legacy. The verified production web index is `7ce21944fd12`. Group
the next optimized desktop package with contextual attachment fields. The
latest desktop artifact remains the Animate Weights checkpoint `d5a7f2d6eeb0`.
Private `selection-hierarchy-2026-11-19-WYEjK2/` retains reports and pins.
Cleanup reclaimed 6,877,461 logical bytes from 30 owned browser workspaces
and their inventories. Linux has 792 GiB free and G: has 3.6 GiB. Older
browser workspaces of uncertain ownership occupy 80 MiB.

Next, add contextual attachment transform fields for one typed Setup Region
with the shared authoring draft and a labeled hull-center value for one
selected Mesh. Compare an inactive Mesh to its active sibling and binding
bone, guard signed scale and omitted fields in the Region path, and verify
one Undo. Use the exact Linux Mesh evidence for stored versus evaluated
separation and keep unobserved numeric axes explicit.
[Attachment reference](research/VIEWPORT-OPTIONS-2026-11-18.md#contextual-attachment-values-reference)

## Accepted Animate Weights inspection READY90

Inspect weights opens the existing dock for one selected weighted Mesh and
focuses its own vertex picker. Saved influences remain available on an
inactive attachment. The live marker follows evaluated Deform for a visible
active Mesh. The browser verifies its motion and inactive suppression,
independent Deform selection, mode, history, native request boundaries and
Setup Auto. An edited Deform field keeps the standard blur commit. Exact
Linux REA establishes the glyph. Original Animate selection and write scope
remain open. [Weights result](research/VIEWPORT-OPTIONS-2026-11-18.md#weights-in-animate-reference)

The web build, both TypeScript checks and 569 JavaScript cases pass with one
existing skip. The grouped browser result covers 32 cases on the same assets.
The initial 31 passes and the recheck of the corrected Deform key locator are
retained. Reused Rust Session `f3b92cf16d79` and accepted 443 Scene and 116
Legacy baseline. Optimized Linux `d5a7f2d6eeb0` embeds the nine tested assets
and remains unlaunched. Private `animate-weights-2026-11-19-KO9lqT/` retains
reports and hash pins. Cleanup reclaimed 8,583,096 logical bytes including 33
owned browser workspaces. Linux has 792 GiB free and G: has 3.6 GiB. Older
browser workspaces of uncertain ownership occupy 80 MiB.

Next, show the authored hierarchy of one explicit selected bone, slot or
typed attachment above the floating HUD. Use a nested bone and an inactive
weighted Mesh under its slot, with a separate binding bone and active Region
sibling. Verify the stable path through mode, frame and Tree filtering,
narrow layout, and stable history. The reference proves ownership and supplied
examples of ordering. Keep ancestor activation open.
[Hierarchy reference](research/VIEWPORT-OPTIONS-2026-11-18.md#selection-hierarchy-reference)

## Accepted constrained rotation pin READY90

The pin beside Parent shows applied rotation for one selected Animate IK
bone in Local Rotate, using the existing published frame. Draft protection,
scrubbing, a compact keyboard workflow, unchanged display-only snapshots and
separate FK keying pass. REA identifies the exact Linux glyph. Esoteric
describes the behavior for the Spine 4.3 family. The exact live toggle and
wider axes and constraints remain open.
[Pin result](research/VIEWPORT-OPTIONS-2026-11-18.md#constrained-value-pin-reference)

Both TypeScript checks and the web build pass. Two test-only corrections to
the standalone HUD fixture and native track field preceded 569 JavaScript
passes with one existing skip and 30 focused production-CSP browser passes.
Reused exact Rust Session `f3b92cf16d79` and the accepted 443 Scene and 116
Legacy baseline. Optimized Linux `21f0c795c1e1` embeds the nine tested web
assets and remains unlaunched. Private `constrained-rotation-2026-11-19-V7xvXR/`
retains initial errors, final reports and digests. Cleanup reclaimed 7,829,188
logical bytes including 30 owned browser workspaces. Linux has 792 GiB free
and G: has 3.6 GiB. Older browser workspaces of uncertain ownership occupy 80 MiB.

Next, open the existing Weights dock for read-only inspection of one selected
weighted Mesh in Animate. Keep the inspection cursor separate from the Deform
vertex. Verify stored influences while scrubbing a deformed fixture, with
stable selection, mode, authored binding, history and zero authoring or pose
requests from opening and inspecting the dock. Exact Linux REA establishes
the Weights glyph's visible state. The original activation and edit scope
remain open. [Weights reference](research/VIEWPORT-OPTIONS-2026-11-18.md#weights-in-animate-reference)

## Accepted Local Translate axes READY90

Setup Local fields and handles use the signed bone axes for one unconstrained
bone. Sparse f64 numeric fields and pointer intent share a revision-checked
native edit. The three spaces, reflected oblique axes, omitted-axis precision,
compensation, held preview, Escape and Undo pass. Native checks also cover
weighted geometry, Clipping and Store. Exact stock numeric and pointer
transitions remain open. [Local Translate result](research/VIEWPORT-OPTIONS-2026-11-18.md#local-translate-axes)

This grouped round establishes a new baseline of 569 JavaScript passes with
one existing skip, 443 Scene with two existing ignores, 116 Legacy with one
existing ignore, and 18 focused production-CSP browser passes. Both TypeScript
checks, the web build and the 107-variant MCP schema pass. Optimized Linux
`1dd98bd6b327` embeds the nine tested web assets and remains unlaunched. The
fresh browser host is `f3b92cf16d79`. Private `local-translate-2026-11-19-dJ4twk/`
retains logs and digests. Cleanup reclaimed 7,437,589 logical bytes, including
18 owned browser workspaces. Linux has 792 GiB free and G: has 3.6 GiB. Older
browser workspaces of uncertain ownership occupy 80 MiB.

Next, use the identified pin beside Parent for a bounded read-only Animate
Rotate slice. Compare the sampled and applied rotations of one selected bone
on a supported IK chain with a moving target. Preserve the independent axis
choice. Verify both readouts while scrubbing, with stable revision, keys and
history. Exact Linux evidence identifies the glyph. Its behavior is described
for the Spine 4.3 family. [Pin reference](research/VIEWPORT-OPTIONS-2026-11-18.md#constrained-value-pin-reference)

## Accepted Scale numeric axes READY90

Parent shows the authored Local values. World renders each world basis
length with the selected bone's authored axis sign. This is FBones display
policy. The same field shows its Local draft on focus and keeps a visible
Local cue while World remains selected. Blur and Escape restore the World
readout. Browser coverage verifies the reflected nonuniform fixture, no-op
focus and cancellation, ordinary Local edit, compensated sign change with
fixed pivot and child matrix, Undo and independent per-tool preferences.
The exact stock reflected fields remain open.
[Scale axes result](research/VIEWPORT-OPTIONS-2026-11-18.md#scale-numeric-axes-candidate)

Production web build, both TypeScript checks and MCP schema pass, with 564
JavaScript passes and one existing skip. All 17 focused production-CSP cases
pass on the reused exact Rust Session `caa7162b75ea`. The Rust sources and
106 edit variants match the accepted 440 Scene and 116 Legacy baseline.

Optimized Linux `e3f52d4f77c7` embeds the nine browser-tested assets and
remains unlaunched. Private `scale-axes-2026-11-19-1jP24J/` retains reports
and hashes. Cleanup removed 17 owned browser workspaces and redundant
release inventories, totaling 4,888,552 logical bytes. Linux has 792 GiB
free and G: has 3.6 GiB. Older browser workspaces of uncertain ownership
occupy 80 MiB.

Next, make Local Translate distinct from Parent and World. Compare the
orthogonal three-mode fixture and a reflected, oblique authored basis.
Preserve the accepted Parent/World edits and verify one local axis, held
preview, optional compensation and Undo.
[Local Translate result](research/VIEWPORT-OPTIONS-2026-11-18.md#local-translate-axes)

## Accepted Rotate numeric axes READY90

Parent uses the authored Local angle. World projects the signed authored
X-axis heading and sends one f64 absolute angle to the native editor. Native
uses the selected pivot, shortest wrapped turn and realized f32 basis, with
optional Bones and Images compensation. Equivalent input and candidates that
cannot improve the stored heading leave authored bytes and history intact.
A rounded reversal of handedness rejects atomically. Rotate and Translate
keep independent axes through tool changes and temporary Animate. Exact
Linux REA establishes signed Setup storage and a positive-basis Animate
ray heading. The exact Setup field transition and armed original remain open.
[Rotate axes result](research/VIEWPORT-OPTIONS-2026-11-18.md#rotate-numeric-axes-candidate)

The production web build, both TypeScript checks and MCP schema pass.
An isolated compiled HUD test needed the new axis props at mount. Its
assertions and product sources stayed unchanged during the full JS recheck.
Baseline is 562 JavaScript tests with one existing skip, 440 Scene with two
existing ignores, 116 Legacy with one existing ignore and 16 focused
production-CSP UI passes on Rust Session `caa7162b75ea`. The MCP contract
contains 106 edit variants.

Optimized Linux `2a496f355a32` embeds the nine browser-tested assets and
remains unlaunched. Private `rotate-axes-2026-11-19-VKUebq/` retains the
initial fixture failure, full recheck, exact source pins and release receipt.
Cleanup removed 16 owned browser workspaces and redundant inventories,
totaling 6,984,689 logical bytes. Linux has 792 GiB free and G: has 3.6 GiB.
Older browser workspaces of uncertain ownership occupy 80 MiB.

Next, add Scale numerical axes using Parent as a Local alias and a World
projection that switches to the local authored value on focus. Verify
reflected nonuniform ancestry, no-op input and compensated Undo. Keep the
existing projected local pointer factors.
[Scale axes scope](research/VIEWPORT-OPTIONS-2026-11-18.md#scale-numeric-axes-candidate)

## Accepted Shear with Compensation READY90

Shear uses sparse authored Local degree fields and the existing world-delta
diamonds for one editable bone in an unconstrained Setup Scene. Native and
preview agree on the fixed pivot, distinct parented Local and World bases,
relative singular rejection, Local reflection and World handedness guard.
They compensate full child matrices and supported Region and weighted
attachment geometry. The shared midpoint fit holds all four corners within
`0.001` in the new tolerance regression. Clipping and Store are validated at
native confirmation. CSP browser coverage verifies Local Y, World X, active
and inactive weighted meshes, held preview, Escape and one Undo per edit.
Exact armed stock gestures remain open.
[Shear result](research/VIEWPORT-OPTIONS-2026-11-18.md#shear-compensation-candidate)

The production web build, both TypeScript checks and MCP schema pass.
Baseline is 558 JavaScript tests with one existing skip, 439 Scene with two
existing ignores, 116 Legacy with one existing ignore and 15 focused
production-CSP UI passes on Rust Session `5bf2b73cedeb`. The MCP contract
contains 105 edit variants.

Optimized Linux `2e58a6c56576` embeds the nine verified assets and remains
unlaunched. Private `shear-compensation-2026-11-19-0vAnRX/` retains the
reports and input hashes. Cleanup removed 15 owned browser workspaces and
redundant debug and release inventories, totaling 6,754,852 logical bytes.
Linux has 792 GiB free and G: has 3.6 GiB. Older browser workspaces of
uncertain ownership occupy 80 MiB.

Next, implement Rotate numeric axes. Parent uses the authored Local scalar.
World sends an absolute heading with optional compensation and uses the
existing pivot and realized f32 basis. Check two reflected signed X scales,
wrap-equivalent input, Escape, Undo and independent tool preferences.
[Rotate axes scope](research/VIEWPORT-OPTIONS-2026-11-18.md#rotate-numeric-axes-candidate)

## Accepted Scale with Compensation READY90

Scale uses the existing Setup fields and handles for one editable bone in an
unconstrained Scene. Sparse absolute X/Y and projected local multipliers
share the same realized f32 scales. A numeric sign change reflects the
dependent scale axis when the resulting transforms can fit. Native regression
covers child affines, active and inactive Regions, positive Mesh/Clipping
lanes, singular rejection, the mixed pivot-lane mask case, Store protection
and byte-exact Undo. Browser coverage includes native zero rejection,
sign-changing numeric input and a projected reflected-axis drag, held
preview without native calls, Escape and Undo. Exact stock armed Scale
remains open.
[Scale result](research/VIEWPORT-OPTIONS-2026-11-18.md#scale-compensation-candidate)

The shared Region fit validates rounded world origin, basis and all four
corners to `0.001`. The tested Rotate rounding case, rounded uniform Scale,
and tall Region Y-heading fit pass. Genuine unrepresentable shear rejects
the edit. Production build, both TypeScript checks and MCP schema pass.
The baseline is 553 JavaScript tests with one existing skip, 437 Scene with
two existing ignores, 116 Legacy with one existing ignore and all 14 focused
production-CSP UI cases on Rust Session `9241dcd7fe22`. The MCP contract
contains 104 edit variants.

Optimized Linux `fbb01e65c679` embeds the nine verified assets and remains
unlaunched. Private `scale-compensation-2026-11-19-h3kQ4L/` retains test
reports and input and build hashes. Cleanup removed 14 owned browser
workspaces and redundant debug and release inventories, totaling 6,527,272
logical bytes. Linux has 792 GiB free and G: has 3.6 GiB. Older browser
workspaces of uncertain ownership occupy 80 MiB.

Next, connect Shear with separate authored Local and world-delta intents.
Use the parented 30° basis fixture and both representable and unrepresentable
Region positions. Retain singular rejection, weighted Clipping and Store.
[Shear scope](research/VIEWPORT-OPTIONS-2026-11-18.md#shear-compensation-candidate)

## Accepted Rotate with Compensation READY90

Rotate works from the Setup ring and Local numeric field for one editable
bone in an unconstrained Scene. The selected pivot stays fixed. The switch
states preserve child matrices, supported Region corners and positive
selected-bone binding lanes. Held preview and Escape issue no native edit.
Each accepted gesture or numeric entry uses one native action and one Undo.
The native tests also cover weighted Clipping collapse and protection of
stored Deform. Exact 4.3.26 Linux evidence establishes separate authored
rotation, scale and shear animation lanes. Armed Setup Rotate remains open.
[Rotate result](research/VIEWPORT-OPTIONS-2026-11-18.md#rotate-compensation-candidate)

The production web build, both type checks and MCP schema checks pass.
The baseline is 549 JavaScript tests with one existing skip, 433 Scene
tests with two existing ignores, 116 Legacy with one existing ignore and
13 focused production-CSP UI cases on exact Rust Session `ce918817c7ad`.
The MCP contract now contains 103 edit variants.

Optimized Linux `f31b47cbbe4e` embeds the verified assets and remains
unlaunched. Private `rotate-compensation-2026-11-19-02vwsi/` retains the
input hashes, test logs and release receipt. Cleanup removed 13 owned browser
workspaces and redundant debug and release inventories, totaling 6,299,693
logical bytes. Linux has 792 GiB free and G: has 3.6 GiB. Older browser
workspaces with uncertain ownership occupy 80 MiB.

The Scale checkpoint above replaces the strict Region direction gate and
verifies the rounding case under anisotropic ancestry.

## Accepted World Translate with Compensation READY90

F107 World stays selected through both compensation switches. A numeric
edit sends one absolute f64 axis. Native uses the authored pose for the
other coordinate and the realized stored local position for compensation.
The reflected-parent test verifies both axes and all switch states near a
900,000-unit world offset, including opposite-axis and dependent positions
within 0.00001 scene units, atomic rejection and byte-exact Undo. Browser
coverage includes unchanged entry, confirmed feedback, the held world-axis
preview, Escape and one Undo. Exact stock evidence establishes the static
world origin on one retained fixture. Stock armed gestures and numeric
precision remain open.
[World result](research/VIEWPORT-OPTIONS-2026-11-18.md#world-axes-with-compensation)

The web build and both type checks pass. The current baseline is 547
JavaScript tests with one existing skip, 430 Scene tests with two existing
ignores, 116 Legacy with one existing ignore, and 12 passing production-CSP
UI cases with exact Rust Session `34bec7caf684`. The MCP edit contract
contains 102 native variants. The focused cases used the same assets and
Session host before and after, with no repeats required.

Optimized Linux `1d6ce76e1a44` embeds all nine verified assets and remains
unlaunched. Private `world-compensation-2026-11-19-KN8lAC/` retains logs,
input hashes, the release receipt and cleanup. Removed 12 owned browser
workspaces and redundant inventories, totaling 3,744,252 logical bytes.
Linux has 792 GiB free and G: has 3.6 GiB. The 80 MiB of older browser
workspaces with uncertain ownership remain.

Next, use the paired Rotate audit. Check full child matrices and Region
corners under counter-rotation with independent compensation, then measure
weighted lane positions and reject nonrepresentable Region transforms
atomically. The retained original does not include an armed Setup Rotate.
[Rotate scope](research/VIEWPORT-OPTIONS-2026-11-18.md#rotate-compensation-candidate)

## Accepted Parent Translate with Compensation READY90

Parent stays available with Bones or Images armed. Numeric Y and reflected,
sheared X drag use a single exact parent-coordinate command. Preview keeps
the child and active image in place and sends no native edit or evaluation.
Numeric edits also preserve inactive Regions. Escape restores held positions
and one native Undo restores bones and attachments. Stock armed gestures
remain unobserved. World switches to Local when armed on this accepted build.
[Parent result](research/VIEWPORT-OPTIONS-2026-11-18.md#parent-axes-with-compensation)

The web build and both type checks passed, as did 546 JavaScript tests with
one existing skip and all 11 distinct focused CSP/Rust Session cases. The
first armed Parent pointer case selected Local after Undo restored an inactive
Region. It passed when reselected in the same build. Exact asset and host
pins stayed constant, including Rust Session `8abb51c16a06d`.

Optimized Linux `f5da6fe7808b` embeds the verified assets and remains
unlaunched. Private `parent-compensation-2026-11-19-k2sJZF/` retains the
failure, passing recheck, build and input pins. Cleanup removed 12 owned
browser workspaces and obsolete inventories totaling 3,784,624 logical
bytes. Linux has 792 GiB free and G: has 3.6 GiB. Older uncertain browser
workspaces occupy 80 MiB.

## Accepted Numeric Setup Translate Compensation READY90

F107 Local numeric compensation is available. The paired audit found no retained
exact Linux action with armed compensation during typed Translate. FBones
applies the accepted pointer compensation cohort to one authored X or Y
in the supported unconstrained single-bone Setup scope. The opposite
coordinate keeps its exact bits.
[Numeric scope](research/VIEWPORT-OPTIONS-2026-11-18.md#numeric-translate-with-compensation)

The web build, both type checks, updated MCP schema and 544 JavaScript
tests passed with one existing skip. The native group passed 429 Scene
tests with two existing ignores and 116 Legacy with one existing ignore.
All ten production-CSP cases passed on fresh host `8abb51c16a06`. The native
lane validates untouched signed-zero bits and positive Mesh/Clipping
positions. Browser evidence covers all switch choices, active and inactive
Regions, Enter/blur, Escape and one Undo under a reflected parent.

Optimized Linux `18300ea0c7ee` embeds the verified assets and was left
unlaunched. Cleanup removed ten owned browser workspaces and redundant
inventories totaling 3,295,492 logical bytes. Linux has 793 GiB free and G:
has 3.6 GiB. Older browser workspaces with uncertain ownership occupy 80 MiB.
Private `numeric-compensation-2026-11-19-wTX0Iy/` retains the reports,
release receipt and input pins.
The next slice can use the present parent-position command for both
Parent numeric and pointer authoring with armed compensation. Use the same
exact tuple in preview and commit. World numeric rounding and exact stock
armed gestures remain open.
[Parent axes scope](research/VIEWPORT-OPTIONS-2026-11-18.md#parent-axes-with-compensation)

## Accepted planned Trace controls verified

F202 shows the planned Trace controls as unavailable. The publisher sample shows Detail,
Concavity and Refinement slider rows and a separate Refresh. The retained
exact Linux evidence leaves defaults, ranges and generated geometry open.
The browser verified the display, disabled Refresh and working Trace
outline, Inner and Apply workflow.
[Planned Trace evidence](TASKS.md#planned-trace-controls)

The web build, both type checks, 543 JavaScript tests with one existing skip
and all four focused production-CSP Trace cases passed on `943b568bbd14`.
The responsive case narrowed the viewport to 1024 px and checked overflow,
labels and zero native requests after a disabled Refresh activation. The
previous 23-case suite and 428 Scene/116 Legacy results remain baseline.

Optimized Linux `ea5ba8bc1681` embeds the verified assets and was left
unlaunched. Cleanup removed four owned browser workspaces and redundant
inventories totaling 1,944,920 logical bytes. Linux has 793 GiB free and G:
has 3.6 GiB. Older browser workspaces with uncertain ownership occupy 80 MiB.
Private `trace-planned-controls-2026-11-19-LjUeOn/` retains the reports, release
receipt and input pins.
Next, verify numeric Setup Translate with the existing Bones/Images
compensation policy. Keep the authored untouched axis bit-exact and compare
world-space dependents in all toggle states.
[Numeric compensation scope](research/VIEWPORT-OPTIONS-2026-11-18.md#numeric-translate-with-compensation)

## Accepted Trace Apply READY90

F202 Trace Apply pins the target and options while committing. The historical
exact capture and publisher dialog establish the entry and confirmation controls. They leave
pending commit behavior open. FBones locks the cancel, parameter and authoring
controls for the lifetime of Apply. Preview remains cancellable.
[Trace Apply scope](TASKS.md#trace-apply-transaction)

The web build, both type checks, 543 JavaScript tests with one existing skip
and all 23 production-CSP cases passed on `943b568bbd14`. A held preview
remains cancellable. A transport failure before native dispatch keeps the
current candidate. A held successful response keeps the dialog pinned
through Escape, duplicate Apply, mode and selection changes. It produces one
native edit and one Undo. A genuine Rust stale-revision rejection clears
the candidate and restores Cancel. Native baseline is 428 Scene and 116 Legacy.

Optimized Linux `02a911900a4c` embeds the verified assets and was left
unlaunched. Cleanup removed 25 owned browser workspaces and redundant
inventories totaling 6,706,091 logical bytes. Linux has 793 GiB free and G:
has 3.6 GiB. Older browser workspaces with uncertain ownership occupy 80 MiB.
Private `trace-apply-2026-11-19-Oozu9m/` retains the reports, release receipt
and input pins.
Next, the Trace panel can expose the stock-documented planned controls in
their unavailable state. Exact Detail, Concavity, Refinement and Refresh
behavior remains open. The two-notch fixture remains the Concavity witness.
[Planned control evidence](TASKS.md#planned-trace-controls)

## Accepted Precise Trace outline READY90

F202 precise Trace outline controls are available. Existing exact captures
establish the Trace entry, and the official guide identifies Alpha threshold.
Exact stock threshold equality and other settings are open. FBones retains
its established native alpha comparison and current Inner workflow.
[Trace outline scope](TASKS.md#precise-trace-outline-controls)

The web build, both type checks, 543 JavaScript tests with one existing skip
and all 22 production-CSP cases passed on `943b568bbd14`. The real Session
test reproduces the alpha-128 geometry cutoff, slider sync, native numeric
values, an invalid draft blocking a held native preview, exact Apply and
one Undo. The existing Padding and Inner cases passed. The native baseline
remains 428 Scene and 116 Legacy passes.

Optimized Linux `4a60b89c28b3` embeds the verified assets and was left
unlaunched. Cleanup removed 24 owned browser workspaces and redundant
inventories totaling 6,477,654 logical bytes. Linux has 793 GiB free and G:
has 3.6 GiB. Older browser workspaces with uncertain ownership occupy 80 MiB.
Private `trace-precise-outline-2026-11-19-UbqUch/` retains the reports,
release receipt and input pins.
The Trace audit also identified existing UI paths for title close, Escape
and Inner settings after Apply dispatch. The next Trace UI slice should
hold a real Apply reply to align those controls with the commit lifecycle.
Stock Detail, Concavity, Refinement and Refresh remain separately open.

## Accepted Mesh inspector Reset and Freeze presentation

F201 shows both witnessed inspector actions as unavailable. The paired UI audit
places them below Edit Mesh. REA found separate Mesh46 float slots without
establishing their editor meaning or the Freeze action. The publisher
distinguishes the UV-alignment inspector Reset from the four-corner Edit
Mesh Reset. The source and authoring behavior remain open.
[Mesh inspector reference](TASKS.md#mesh-inspector-freeze-and-reset)

The web build, both type checks, 543 JavaScript tests with one existing skip
and 15 production-CSP browser cases passed on reused Rust host `943b568bbd14`.
The browser verified both disabled actions and their descriptions, Setup
selection scope, zero native edits for display, and the independent working
Edit Mesh quad Reset. The native baseline stays 428 Scene and 116 Legacy.
The stock bend probe confirms a root-aligned seven-vertex mesh retains full
topology at the UV-aligned position endpoint. The observed Linux artifact
does not come from a Reset action.

Optimized Linux `a949b5ce5438` embeds the verified assets and was left
unlaunched. Cleanup removed 15 owned browser workspaces and redundant
inventories totaling 4,440,832 logical bytes. Linux has 793 GiB free and G:
has 3.6 GiB. Older browser workspaces with uncertain ownership occupy 80 MiB.
Private `mesh-inspector-actions-2026-11-19-fSsVKJ/` retains the reports,
release receipt and input pins.
Next, pair the Trace UI audit with the retained exact Linux shape evidence.
The current Alpha threshold can support precise numeric entry. For stock
Concavity, the two-notch fixture in the Trace task still needs witnessed
settings and outputs. Keep Inner Contrast and its current default path.
[Trace scope](TASKS.md#spine-informed-mesh-generation)

## Accepted Mesh Wireframe READY90

F201 Wireframe is available. The paired audit found a historical exact Tree
inspector checkbox separate from Edit Mesh controls. The current guide
documents visibility after deselection. The retained Linux REA exports have
no witnessed toggle. A separate exact Linux binary comparison left
the attachment flag mapping open. FBones uses an attachment-keyed
document-session display preference.
[Wireframe reference](TASKS.md#mesh-wireframe-property)

The web build, both type checks and 543 JavaScript tests passed with one
existing skip. The grouped real-session CSP run accepted 15 distinct
cases on `943b568bbd14` across the initial 14 passes and the paired Mesh
Display recheck. The initial test compared an antialiased hull stroke to
undiluted lavender. The retained raster shows 75% coverage for that stroke.
The corrected test uses the blended hue for strokes and exact color for
a vertex. Both Mesh Display cases passed on the same production assets.
The native baseline remains 428 Scene and 116 Legacy passes.

Optimized Linux `82fb9d27e102` embeds the verified web assets and was left
unlaunched. Cleanup removed 17 owned browser workspaces and redundant
inventories totaling 4,890,676 logical bytes. Linux has 793 GiB free and G:
has 3.6 GiB. Older browser workspaces with uncertain ownership occupy 80 MiB.
Private `mesh-wireframe-2026-11-19-jZ2cuZ/` retains both reports, the release
receipt and the input pins.
The next Mesh inspector slice can show the separately witnessed Freeze and
Inspector Reset controls in their unavailable state. Wiring Freeze needs a
stock witness that identifies the independent rotation and scale baseline.
[Mesh inspector reference](TASKS.md#mesh-inspector-freeze-and-reset)

## Accepted Mesh New draft points READY90

F201 draft point editing is available. The publisher documents dragging a point
and removing it with a double-click. A retained exact Linux hull informed the
ordered-point test on a purpose-built FBones fixture. The guide leaves precedence
between double-click removal and first-point close open.
[Draft point scope](TASKS.md#mesh-outline-draft-points)

The grouped round passed the web build, both type checks, 543 JavaScript
tests with one existing skip and 14 production-CSP cases on the reused
`943b568bbd14` Rust Session host. The real draft fixture verifies first-point
drag, outside release, double-click and Shift-click removal, Escape during
a held drag, and ordered UVs in one native command and Undo. This slice
changes frontend source. The prior 428 Scene and 116 Legacy results remain
the native baseline.

Optimized Linux `4a7c03533213` embeds the verified web assets and was left
unlaunched. Cleanup removed 14 owned browser workspaces and redundant
inventories totaling 4,174,595 logical bytes. Linux has 793 GiB free and G:
has 3.6 GiB. Older browser workspaces with uncertain ownership occupy 80 MiB.
Private `mesh-draft-points-2026-11-19-K1WsRd/` retains the reports, build
receipt and source pins.
The next Mesh display slice is the attachment Wireframe property. Pair the
UI audit with the retained exact Linux export evidence, then use two visible
meshes with one opted in and deselected. Original editor persistence is open.
[Wireframe reference](TASKS.md#mesh-wireframe-property)

## Accepted Mesh New outline READY90

F201 New outline and contextual Reset are available in Mesh Setup. The prior
exact capture shows separate New and Reset controls. The retained Linux mesh
samples have no witnessed New or Reset operation, and their hulls are convex.
The FBones draft uses the full fitted image plane and commits a normalized UV hull
through one revision-bound native edit. Reset reuses the existing quad route.
[Mesh New outline scope](TASKS.md#mesh-new-outline-and-reset)

The grouped checkpoint passed the web build, both type checks, MCP schema,
543 JavaScript tests with one existing skip, 428 Scene tests with two ignored,
116 Legacy tests with one ignored, and all 14 production-CSP browser cases on
`943b568bbd14`. It verified the full image preview, invalid close, Escape, one
concave commit, an inactive mesh, Reset, native history and portable reopen.
Optimized Linux `cf2e90a8219e` embeds the verified assets and was left
unlaunched. Cleanup removed 14 owned browser workspaces and redundant
inventories totaling 4,172,552 logical bytes. Linux has 794 GiB free and G:
has 3.6 GiB. Older browser workspaces with uncertain ownership occupy
80 MiB. Private `mesh-new-outline-2026-11-19-wK4Mut/` retains the reports,
build receipt and input pins.
Exact stock placement, cancellation and topology remain open.

## Accepted Mesh Edit display READY90

F201 Triangles, Dim and Isolate are available in the Setup Mesh toolbar.
The historical exact Edit Mesh capture shows these controls. Retained Linux
evidence has no selected mesh for this view. FBones keeps display settings
local to the document and applies them only to the inspected mesh. The
isolated image projection preserves authored activation and earlier masks.
[Mesh Edit display evidence](TASKS.md#mesh-edit-display-controls)

Web build, both type checks and 542 JavaScript tests passed with one existing
skip. The accepted native host `1b61a2fb9974` was reused for the browser group.
It passed 19 of 20 initially. The first Deform pointer missed after a dock
resize. Isolated and repeated parallel rechecks passed on the same assets.
The final paired Deform and Mesh Display run passed after synchronizing the
test's pointer calculation with the resized canvas. Private
`mesh-display-2026-11-19-0nphC6/` retains the initial and final reports, source
pins and failure trace. Optimized Linux `2163beaebfb2` embeds the verified web
assets and was left unlaunched. Cleanup removed 28 owned browser workspaces
and redundant inventories totaling 7,335,185 logical bytes. Linux has 794 GiB
free and G: has 3.6 GiB. Older browser workspaces with uncertain ownership
occupy 80 MiB.

## Accepted Mesh Generate READY90

F202 Generate is available in the Setup Mesh toolbar. The separate control
is visible in retained original Edit Mesh evidence. The exact Linux bend
export has distinct manual and triangulation-only interior edges. FBones
preserves both, inserting an interior point within each eligible source
face without moving existing vertices. The
initial Setup profile uses an explicit unweighted mesh without authored or
stored Deform keys.
[Generate evidence and result](TASKS.md#mesh-generate-in-fbones)

The grouped round passed the web build, both type checks, MCP discovery,
541 JavaScript tests with one existing skip, 426 Scene tests with two ignored,
and 116 Legacy tests with one ignored. All 20 production-CSP cases passed
on `1b61a2fb9974`. Optimized Linux `fd34a96a8fae` embeds the verified web
assets and was left unlaunched. Removed 22 owned browser workspaces and
redundant build inventories totaling 5,972,403 logical bytes. Linux has
794 GiB free and G: has 3.6 GiB. Older browser workspaces with uncertain
ownership occupy 80 MiB. Private `mesh-generate-2026-11-19-d4vH43/` retains
the reports, build receipts and source pins.

## Accepted Trace Padding READY90

F202 Padding has a slider and numeric pixel input. The paired audits
establish a documented Padding control and exact stock ordinary-mesh
acceptance at the texture borders. The FBones policy uses 0–32 whole source
pixels, circular mask expansion within the texture and the original alpha
field for Inner Detail.
[Padding result](TASKS.md#trace-padding-in-fbones)

All 18 real-session CSP tests passed on `450257c14441`. The grouped round
passed the web build, both type checks, 541 JavaScript tests with one existing
skip, 422 Scene tests with two ignored and 116 Legacy tests with one ignored.
The final 0–32 MCP contract also passed its six JS and seven embedded Rust
checks. Optimized Linux `8f5f661189e6` contains the verified web assets and
was left unlaunched. Cleanup removed 20 browser workspaces and redundant
outputs totaling 5,500,187 logical bytes. Linux has 794 GiB free and G: has
3.6 GiB. Earlier browser workspaces with unestablished ownership occupy
80 MiB. Private `trace-padding-2026-11-19-gVvPxM/` retains the test reports,
build receipt and input pins.

## Accepted Loop Offset READY90 and task activity filter

The English board has an Activity filter for all recent activity, updates
or moves over the past 24 hours. Filtered cards are ordered newest first
within each status column. Task content updates and status or priority
moves have separate indicators and times in Details. The two isolated
HTTP and browser checks passed. A read-only 390 px Chrome session
verified the live service and current priorities.
The remaining F307 gravity phase is deferred to final100%, and the
scoped F302 Auto Weights route is waiting.

Explicit Loop Offset now passes the two exact f6–24 replays from Spine
4.3.26 Linux. The f21 key stays selected at f9, the exterior joins match
within 0.00005 and Current stays at f24. One Undo restores each input.
Escape and changing a limit both cancel a held gesture. The FBones policy
places the exterior near arm a third of its span from the seam. Exact
asymmetric spans, selected keys at the cut and one-sided limits remain open.

Web build, production UI typecheck, MCP schema, 541 JS tests with one
existing skip, 417 Scene tests with two ignored and 111 Legacy tests with
one ignored passed. All 23 real-session CSP cases passed on `79c925cbd794`.
Optimized Linux `931ead38f166` reached a viewable WebGL window. The launch
preceded the user's updated rule to open FBones only on request or for a
specific native verification. The rule is recorded in AGENTS.md. Private
`timing-offset-explicit-loop-2026-11-19-HSa6mZ/` retains the test, build and
launch receipts. Cleanup removed 23 owned browser workspaces and redundant
outputs totaling 6,174,415 logical bytes. Linux has 794 GiB free and G: has
3.6 GiB. Earlier browser workspaces with unestablished ownership occupy 80 MiB.
[Explicit Loop Offset result](research/TIMING-OFFSET-2026-11-18.md#explicit-loop-offset-fbones-result)

## Accepted F105 grouped Curves handles READY90

Curves has explicit dock-local handle selection through Ctrl/Cmd-click
or modified keyboard activation. The live Rotate and Deform group
previews without writes and commits through one revision-bound native
batch. Escape and a peer outside its interval each restore all preview
paths. Pointer and keyboard commits, one Undo, retained handle picks,
fixed Current and timeline selection, exact dense words and signed
unpicked controls pass. Group commands keep working drafts. Exact
independent Curves gestures in Spine remain open.
[Grouped Curves gate](research/GRAPH-TOOLS-2026-11-18.md#grouped-handles-in-curves-follow-up)
[Prior Curves Deform evidence](research/GRAPH-TOOLS-2026-11-18.md#independent-curves-deform-follow-up)

Production web and E2E typecheck, 541 JavaScript tests with one existing
skip, and 43 real-session CSP cases passed. The expanded grouped case
also rechecked a valid pointer release on the same assets and accepted
host `c70fa7bb8293`. Optimized Linux `b8f748cff21b` reached a viewable
WebGL window and was handed over. Private
`graph-curves-grouped-handles-2026-11-19-0iwWOk/` retains the reports,
pins and launch record. Cleanup removed 44 browser workspaces and
redundant inventories totaling 10,965,775 logical bytes. Linux has
794 GiB free and G: has 3.6 GiB. Earlier browser workspaces with
unestablished ownership occupy about 80 MiB.

## Accepted F302 vertex weights clipboard

The accepted group starts at `2bea8e89729a`. Copy/Paste pairs equal-count
vertex picks in selection order for the inspected weighted Mesh or Clipping.
Source and destination must have the same bound bone IDs. Native mapping
preserves exact weights and signed-zero locks, local coordinates and unrelated
rows. Setup geometry and one Undo/Redo with portable reopen pass. Production
UI uses real viewport clicks, proves numeric inputs keep their shortcuts
and submits the exact ordered native request in one transaction.
[Clipboard gate](tasks/F302-auto-weights.md#vertex-weights-clipboard-gate) ·
[Weld evidence](tasks/F302-auto-weights.md#weld-correspondence-gate)

Host `179b666efcea` passes 409 Scene tests with two existing ignored, plus
22 Legacy Auto tests. Web build/typecheck and all 28 focused production-CSP
UI cases pass. JavaScript passes 512 with one existing skip after updating
the keyboard fixture to load the new helper. Linux release `e5800d1ceb08`
reached a viewable WebGL X11 window. Private
`weights-clipboard-grouped-2026-11-19-3ZDrqj` keeps build/test/launch receipts.

Automatic cybersecurity review rejected the follow-up JVM method-instrumentation
step for Auto Weights. The probe stopped and the board records that task as
WAITING. The scoped method and exact sample construction remain unresolved.
Retained exact stock-authored files independently support dense storage
and the Weld correspondence discriminator. Neither retained file has a
causal clipboard or Weld operation. Keep those evidence limits when
planning further workflows.

Cleanup removed 30 owned UI workspaces and redundant native inventories,
at least 9,386,153 logical bytes. Research captures and protected product
windows were retained. Linux has 797 GiB free and G: has 3.6 GiB.

## Accepted F302 Prune

The accepted Prune group starts at `8b745396484d`. Both controls, the main
viewport preview, removal count, selected weighted attachments and their
individual locks use one native candidate path. Native tests verify exact
preview/apply weights, one Undo and binary reopen, and atomic rejection
when Clipping would cross. Production UI verifies an Overlay pixel change,
Escape restoring the view, obsolete reply rejection and a single commit
of the latest counted candidate on both selected Meshes. Exact original
defaults, ties and numeric effect remain open. [Prune evidence](tasks/F302-auto-weights.md#prune-gate)

Host `3c894c0694e0` passes 408 Scene tests with two existing ignored and 22
Legacy Auto tests. Web build/typecheck and 512 JavaScript tests with one
existing skip pass. Initial JavaScript expected the old disabled button.
The scoped UI round passed 26 cases and the new Prune case passed after its
sole-editable-lane oracle was corrected on the same host and dist. Linux
release `2bea8e89729a` reached a viewable WebGL X11 window and was handed
over. Private `weights-prune-grouped-2026-11-19-NISLYi` retains the runs
and build/launch receipts. The SDK acceptance case was updated and its
syntax checked. The grouped run exercised the UI/native preview and MCP
input/discovery contract.

The direct exact Linux owned stock REA boot observes `Editor` and `s/bbl`
on the same worker with the same JNI loader, while JLI startup ran on a
different thread. The observed JVM-only early tracer reaches exact exec
then SIGSEGV before clone events. A separate internal passive hook detached
before authored definitions in the synthetic control. The provider
idle timeout after the stock capture was independently cleaned and the
owned editor, display and observed threads exited.
[Auto Weights reference](tasks/F302-auto-weights.md#native-input-layout-and-remaining-discriminators)

Cleanup removed 30 owned UI workspaces, redundant native inventories and
owned research scratch, at least 9,452,313 logical bytes. Linux has 797 GiB
free and G: has 3.6 GiB. The pinned debugger, evidence and protected native
windows remain available.

## Accepted F302 Update Bindings

The accepted group starts at `7d82342eac1b`. Update Bindings recaptures all
local coordinates for the inspected weighted Mesh or Clipping at the
current Setup pose. It preserves exact weight words and guards shape in
both native and viewport arithmetic. Inactive targets, dormant lanes,
near-unit weight sums, frozen-pose guards, repeated no-op, Undo/Redo and
portable Save/Reopen pass. The exact Linux Spine-saved copy opened in
inspection-only mode and received no edit.
[Update Bindings gate](tasks/F302-auto-weights.md#update-bindings-gate)

Host `81cd0fbf2c4e` passes 406 Scene cases with two existing ignored and
22 Legacy Auto cases. Production web and typecheck pass, with 512 JavaScript
passes and one existing skip. All 26 production-CSP UI cases pass, including
live Physics freeze, rebind, resume and Undo. Linux release `8b745396484d`
reached a viewable WebGL X11 window and was handed over. Private
`update-bindings-grouped-2026-11-19-34Ecdg` retains exact checks and launch.

Exact-stock investigation has two new REA capability gates. The synthetic
parent trace recovers one typed call through raw and cached operands and
separates successful same-name class definitions by loader. The pinned
project-local Rizin backend also reads a private native marker with terminal
cleanup. The early JVM-thread probe ended before a clone was observed.
Next retain the initial exec stop and exact terminal wait status on the
owned synthetic JVM, qualify thread enrollment, then join the scoped stock
`s/bbl` method. These probes launched no original editor.
[Auto Weights reference](tasks/F302-auto-weights.md#native-input-layout-and-remaining-discriminators)

Cleanup removed 28 owned UI workspaces, redundant native inventories, debug
scratch and the downloaded archive, at least 128,547,575 logical bytes.
The pinned Rizin binary and evidence are retained. Linux has 797 GiB free
and G: has 3.6 GiB. Protected native windows remain available.

## Accepted F302 Swap and vertex history

The accepted F302 round starts at `e6494e8dce33`. Swap exchanges the two
selected unlocked f32 weight words on the inspected Mesh or Clipping across
all rows. Native history and portable reopen preserve binding coordinates,
the active sibling and non-target weights. Equal-count Trace Undo/Redo now
clears stale vertex scopes on changed committed UVs and preserves the same-UV
scope on weight-only history. In-place UV history also clears the scope.
[Swap evidence](tasks/F302-auto-weights.md#swap-weights-gate) ·
[History evidence](tasks/F302-auto-weights.md#vertex-scope-across-history-changes)

Host `c5e4c00b2ac9` passes 405 Scene tests with two existing ignored, 22
Legacy Auto tests, and the exact Swap MCP schema. Web build/typecheck and
512 JavaScript tests with one existing skip pass. Production-CSP UI accepts
24 cases in the grouped run and the remaining case after correcting its
numeric-label selector against the same dist and host. Linux release
`7d82342eac1b` reached a viewable WebGL X11 window and was handed over.
Private `weights-swap-grouped-2026-11-19-CH43Aq` retains the initial and
corrected runs plus native build and launch receipts.

The round removed 28 owned UI workspaces, temporary JVM files and redundant
inventories, at least 8,965,662 logical bytes. Linux has 797 GiB free and
G: has 3.6 GiB. Retained group artifacts and protected native windows remain
available.

## Accepted Inner Trace READY90

The latest accepted editor batch covers F203 Inner Trace contrast. Trace opens on the
outline workflow with the optional Add inner detail switch off. Inner Trace
opens the same dialog with that switch on. The dialog identifies the inspected
attachment. The embedded controls keep the FBones appearance. Exact stock
4.3.26 retained captures establish the Trace entry, and the current publisher
guide separately describes outline controls and Generate. Original Linux
numeric Trace behavior remains open.
[Inner Trace evidence](TASKS.md#optional-contrast-detail)

**Priority 1 for reference behavior is REA MCP reverse engineering of exact
Spine Professional 4.3.26 on Linux.** Keep a dedicated REA agent. Attribute
historical screenshots and version-unpinned documentation separately.
Manual and scripted original GUI input are outside the current workflow.
[Reference rules](../AGENTS.md#parallel-work-and-reference-first)

The accepted F203 round starts at `b6478c7def11`. Outline uses the full
shared cap in both modes. With headroom and dense texture, Inner tries a
broader masked color pass when fine detection finds no explicit edges.
Candidate REA on host `6cd2f7f61b99` recovers 720 opaque and 665 visible
shaped rim samples, up from zero on both dense controls. Matched texture-only
controls have zero explicit internal edges. All 11 Outline geometries and
the fixed clean, straight and interrupted Inner results remain exact. The
notched fixture at cap 24 keeps all 20 alpha-outline corners with either
toggle. Scene Trace passes 17 tests and Legacy 16, with the existing 4K
benchmark ignored in both. UI typecheck and all nine focused production-CSP
Playwright cases pass against the pinned Rust host.
[F203 acceptance and REA limits](TASKS.md#optional-contrast-detail)

Linux release `e6494e8dce33` reached a viewable WebGL X11 window and was
handed over. Private `inner-dense-grouped-2026-11-19-uzxrEb` retains build,
test and launch receipts. Cleanup removed 11 UI workspaces, redundant
inventories and the owned synthetic JVM inputs, at least 5,122,746 logical
bytes. Linux has 797 GiB free and G: has 3.6 GiB. The accepted build and
retained evidence remain available. Broader textures and original numeric
Outline behavior remain open in the final pass.

F105 playback remains READY90. Keep F307's accepted static gravity checks
and defer the original final-fidelity probes.

The F203 grouped checkpoint from `a73a10efff3b` corrects two contrast defects.
Alpha-ignored Sobel diagonals sample the visible center, and the strongest
RGB channel uses the gradient magnitude at the existing threshold. REA
reproduced the old 21 versus 23 inner points on two visible-identical own
PNGs. Both now yield identical full geometry with 28 hull and 21 inner points.
Apply writes geometry identical to Preview on both inputs, and one Undo restores the original
state. Scene Trace has 13 passes and Legacy Trace 11, with their existing
4K benchmark ignored. Runtime/web build and UI typecheck pass. JavaScript
has 512 passes with one existing skip. Focused production-CSP/Rust UI has
13 of 13 passes and verifies Outline, optional Inner, Apply and Undo.
Release `1b8aad717ca2` started a viewable WebGL X11 window and was handed over.
Private group `inner-contrast-grouped-2026-11-19-la5NCN` retains logs and reports.

From the `1b8aad717ca2` implementation baseline, the next grouped F203
round covers bounded curve detection, alpha and vertex-cap guards, and the
preview highlight for explicit inner edges. REA on host `590d002e4f25`
measures one connected 16-edge component covering all 720 radius-34 samples
within 3 px, compared with zero qualifying edges at baseline. The 68-vertex
mesh stays within the 192-vertex cap. Straight and Outline geometry is
identical on the fixed inputs, including the interrupted straight case,
where zero explicit edges cross the alpha gap. Exact Spine Linux REA
separately confirms import and re-export of an authored two-edge bend with
identical UV rows and triangles. Original Outline numeric fidelity remains
open. [Curve and format results](TASKS.md#optional-contrast-detail)

Scene and Legacy Trace passed 15 and 14 cases respectively. The existing 4K
benchmark remained ignored in both profiles. Runtime/web builds and UI
typecheck passed, JavaScript passed 512 with one existing skip, and focused
production-CSP UI passed 21 of 21 with the real Rust host. The curve case
verifies the warm preview-only highlight and exact geometry on Apply,
Undo/Redo and portable Save/Close/Reopen. Linux release `b6478c7def11` opened
a viewable WebGL X11 window in an isolated profile and was handed over.
Private group `inner-curves-grouped-2026-11-19-l3QCbs` retains build, launch
and test receipts. The round removed 23 UI workspaces, owned inventories and
temporary reference copies, at least 5,689,786 logical bytes. Linux retained
797 GiB free and host G: retained 3.6 GiB.

The previous group accepted Parent Translate and Mesh Smooth. Parent writes
only the selected authored axes through the Scene setter, including the
reflected drag case and exact signed-zero preservation on the unedited lane.
Smooth averages self and authored neighbors under the FBones lock policy.
It preserves the other rows and positions and passes one native Undo. The
initial 33 UI passes and successful targeted Smooth oracle correction are
retained. The group has 398 Scene, 105 Scene codec and 21 legacy Auto passes.
Release `a73a10efff3b` also reached a viewable WebGL window before F203 work.
[Viewport evidence](research/VIEWPORT-OPTIONS-2026-11-18.md#parent-translate)
[Weights evidence](tasks/F302-auto-weights.md#native-input-layout-and-remaining-discriminators)

The REA F302 exact-loader view finds the typed BBW bridge reference in
`s/bbl` and its exact six-array, two-boolean signature. The enclosing
method, sample assembly and authored output remain open for later work.
The accepted Auto worker continues to preserve all 131,072 weight words in
the capacity fixture and lowers the matched GTK peak gap to 12 ms.
[Auto reference and runtime](tasks/F302-auto-weights.md#native-input-layout-and-remaining-discriminators)

Exact F307 Linux evidence pins scene-axis gravity on three static lanes.
Native FBones replay aligns within 0.13119 units with a one-step comparison
offset. A separate 60/120 fps visible clock probe confirms nominal authored
sampling and a gravity-specific startup response. The precise internal
update step and moving-parent phase remain open.
[Gravity evidence](tasks/F307-physics.md#scene-axis-gravity-in-exact-linux-4326)

All owned reference and test sessions exited. Cleanup accounts for at least
12,680,643 logical bytes from QA workspaces, temporary inventories, reference
duplicates and locks, and the private gravity replay. Required receipts and
current app images are retained. Linux has 797 GiB free and host G: has
3.6 GiB free.
[Local board and sources](DEVELOPMENT.md#normal-setup)

Weights now has independent Pies and Overlay with a shared Selected filter.
The fill interpolates the inspected attachment's influence colors across
Mesh triangles or the editable clipping contour. Its session controls
preserve native project state. REA verifies Overlay is unchecked in the two
retained 4.3.26 captures; the enabled semantics follow the publisher guide.
The grouped production build, 512 JavaScript cases with one existing skip,
and all 15 affected production-CSP Chromium cases pass. Native-owned
WSLg WebGL toggles change 3,553 crop pixels and restore the raster, with
matching source bytes and snapshots. Build `0b0c95f19803` reached a viewable
GTK window for handover. Cleanup removed 15 workspaces, two incremental
caches and redundant outputs, totaling 446,768,636 logical bytes. Linux
has 797 GiB free and host G: 3.6 GiB. [Weights UI evidence](tasks/F302-auto-weights.md#weights-overlay)

The latest Linux image includes the main navigation rail with keyboard zoom,
step buttons, 100% and Fit. Fit covers
evaluated bone tips and active Region/Mesh extents. Zoom changes from the rail
retain the main viewport center. The wheel remains pointer-anchored and Reset/F
retains its origin reset. The Rulers control draws the world scale along the
top and left and shows the pointer's coordinates using the same camera.

Preview now reuses the rail with its own camera, artwork Fit, 100% and
right/middle-button pan. The same controls relocate into the Preview footer
for short or narrow artwork space. Current Zoom/Fit, flags and camera input
stay separate from playback, tracks and saved project data. REA compared
exact retained Linux main-viewport captures and separate historical 4.3.26
wide Preview controls. The exact gesture semantics remain open. The current
camera policies belong to FBones.
[Viewport and Preview reference](research/VIEWPORT-OPTIONS-2026-11-18.md#navigation-rail-reference-gate), [Preview camera plan](research/PREVIEW-TRACKS-2026-11-18.md#preview-camera-controls)

The grouped 15-point round covers both cameras, rulers and Graph guides.
REA confirmed alignment of labeled horizontal guides in exact 4.3.26 Linux
Graph captures. In FBones, the guides and labels share a tick transform.
JavaScript passed 464 cases with one existing skip. The first full
production-CSP UI pass finished 138/140. The new guide group was counted as
a live curve by the slot test. At 960×640 the floating Transform panel
wrapped over the tested attachment pixel, which the REA product trace
confirmed. The curve check now counts live paths and the compact layout
keeps the controls on one row at that size. The corrected production build
passed all 19 targeted checks, including both failures, ruler coordinates,
fitted pixels, Preview isolation and unchanged authored state.
[Graph guide evidence](research/GRAPH-TOOLS-2026-11-18.md#graph-value-guides)

The Linux desktop build `eea7b11df364` started with WebGL in a viewable GTK
window and was left available. `.local/viewport-camera-grouped-user-process.json`
protects that handover. Private `viewport-camera-grouped-2026-11-18/` holds
the build logs, two failure traces, the REA occlusion receipt and the final
focused evidence. Cleanup removed 145 isolated session workspaces, 67
redundant output directories and two new incremental caches, totaling
481,776,748 logical bytes. Linux has 807 GiB free and host G: has 3.6 GiB free.

The new grouped build includes Name Tags and Others Select. Tags are separate
session toggles for evaluated bones and active Region/Mesh/Clipping.
Labels use stable object IDs, selectable states, keyboard activation and
existing camera and selection routes. Others Select gates its labels and
visible active Clipping contour picks in Images mode. It keeps explicit
handles and ordinary artwork selection ahead of passive clipping. The UI
checks cover keyboard and contour selection, sampled frame and attachment
changes, wheel handling, Preview isolation and unchanged native state.

REA structurally parsed 16 retained original Linux projects. A candidate flag
changes in two joined Graph artifacts with identical gray Tags controls, so it
does not identify an enabled tag or persistence field. The individual Bone
Name checkbox is separately visible in a historical 4.3.26 capture. The new
Linux REA comparisons also place Pixels and compensation in the toolbar, with
no active-state or numerical witness. Exact tag collision, standalone object
Name, Pixels rounding and compensation transforms stay open. The relevant
receipts are retained. No original process or input was needed. This slice
created no build caches, native sessions or disposable copies. Linux has
807 GiB free and host G: has 3.6 GiB free.
[Viewport reference and policies](research/VIEWPORT-OPTIONS-2026-11-18.md#name-tags-reference-gate)

Favor, Blend and manual Graph presets work on supported visible bone curves.
Favor stages a curve overlay and applies one native key batch with the
captured revision. The tested workflow preserves an unkeyed working pose.
No-selection breakdowns are admitted on visible linear bone intervals. Flat
and Ease In/Out edit the supported bone handles. Other choices remain visible
as planned. REA pins the original closed controls and separately validates
Setup-adjusted display for five root components. Exact numeric behavior for
Favor and preset application remains open.
[Graph reference and policies](research/GRAPH-TOOLS-2026-11-18.md#favor-and-presets-reference-gate)

The estimated 15-point checkpoint from `eea7b11df364` passed 466 JavaScript
cases with one existing skip. Production build and type checks passed. The
full production-CSP UI run passed 141 of 142. One existing keyboard test
still expected Tab to skip the newly enabled Tags button. After updating the
assertion to check both stops, all eight targeted cases passed on the same
production build. The normal Linux desktop build `c1d5a45559eb` started
with WebGL in a viewable GTK window and was left available. The protected
handover is `.local/viewport-graph-grouped-user-process.json`.

Cleanup removed 141 isolated test workspaces, 66 redundant output directories
and two new incremental caches, totaling 480,668,463 logical bytes. Linux
has 806 GiB available and host G: has 3.6 GiB. Private
`viewport-graph-grouped-2026-11-18/` retains logs, focused captures, the first
test failure trace and the active native handover.

Since the accepted `c1d5a45559eb` baseline, Graph display projection and
its inverse passed grouped verification. REA pinned matching key and handle
projections for both Scale axes, Rotate and Translate X on the tested root.
The evidence also confirms both Shear key offsets. FBones extends the same
projection through its local Setup convention. Graph draws live, stored and
Favor curves on a common axis, while the key inspector and native edits retain
stored units. Negative Scale reverses inverse pointer movement, and a zero
axis still permits a time edit. The shared desktop/native carrier preserves
signed-zero ordinates and validates its metadata.
[Graph display evidence](research/GRAPH-TOOLS-2026-11-18.md#setup-adjusted-display-evidence)

Repeat and the pre-zero gutter passed grouped verification. The shared transport
switch shows dim, pointer-inert authored-period copies and toggles Setup and
last-key holds in the plot. The Graph arrow changes the common ruler, key and
playhead origin and uses frame zero for ruler input before the start. REA found
an exact sparse original project with populated Dopesheet only. The period for
sparse Graph tracks and the original arrow gesture remain open.
[Graph Repeat evidence](research/GRAPH-TOOLS-2026-11-18.md#repeat-and-unkeyed-extensions)

The combined projection, inverse edit, signed-zero transport, Repeat and
pre-zero navigation passed the grouped round from `c1d5a45559eb`. JavaScript
passed 469 cases with one existing skip. The desktop library passed 380 cases
with two existing ignored. The rebuilt isolated host and production-CSP
bundle passed all 144 UI cases, including the parented projection, inverse
drags on negative and zero Scale, sparse clip repeats, off-state holds and
common ruler/key origin. The Linux desktop build `fae62a44810b` first reached
WebGL and its window exited when the launch session ended. Relaunch through
a transient user service reached WebGL and stayed available in a viewable GTK
window after the launcher returned. The protected current handover is
`.local/graph-display-repeat-service-user-process.json`. Native verification
covers startup. The Graph gestures ran through the Chromium harness and native
Session. Private `graph-display-repeat-grouped-2026-11-18/` retains logs, two
new Graph captures and the launch receipt. Cleanup removed 135 isolated test
workspaces, 67 redundant output directories and five new incremental caches,
totaling 1,315,624,914 logical bytes. Linux has 806 GiB free and host G: has 3.6 GiB.

The grouped Graph/Dopesheet round from `fae62a44810b` covers
stable row scope across bone, slot and constraint selections, Refresh from
the active selection, Select displayed bones, and per-tab property filtering
with Current tool, bypass and Reset. REA confirmed the toolbar affordances in
12 retained exact captures. Command behavior uses the vendor guides and the
recorded FBones scope policy. JavaScript passed 469 cases with one existing
skip. Production type checking and bundling passed. The first full UI run
passed 145 of 146. The new test expected selection of the constrained member
from a row grouped under its IK target. The revised test verifies the correct
target and separately verifies the owning bone from a slot row. The filter
panel now uses the full width of the timeline for the property chips. The
final bundle passed all 11 targeted UI cases, including frozen empty rows,
keyboard and modifier controls, stored curves, collapsed Dopesheet summaries,
hidden key safety and unchanged native state. The reviewed narrow capture is
960×740. Exact filter state and Lock/Refresh interactions remain open.
[Lock and Refresh reference](research/GRAPH-TOOLS-2026-11-18.md#lock-and-refresh-reference)

Linux desktop build `5961d22a64c9` started in a viewable GTK window with
WebGL and remains available through its transient user service.
`.local/timeline-row-controls-user-process.json` protects the handover. Gesture
checks ran in Chromium with the real Rust Session. Private
`timeline-row-controls-grouped-2026-11-18/` holds the full and focused logs,
the first failure trace, the reviewed final capture and the launch receipt.
Cleanup removed 158 isolated test workspaces, 86 redundant output directories
and two new incremental caches, totaling 924,312,070 logical bytes. Linux has
805 GiB free and host G: has 3.6 GiB free.

The Key Shown checkpoint from `5961d22a64c9` passed grouped verification.
Both tabs use their live track scope for the toolbar action and keyboard
shortcut. One native operation captures supported pose fields. The new
Graph case verifies same-frame no-op, visible split X, hidden split Y and
preserved working Y, an exact symmetric Bézier split and one Undo. The
Dopesheet cases cover collapsed locked rows, a mixed bone/slot/Draw Order/
constraint batch, and atomic native rejection on an out-of-range color.
JavaScript passed 472 cases with one existing skip after a correction to the
keyboard handler's platform guard. The production-CSP suite passed all 149
cases. Scope uses current vendor guidance and the paired FBones policy. REA
found no exact active Key Shown witness and excluded the retained Swap as an
insertion witness. Deform, Sequence, Events, Physics Reset and signed-zero
RGBA rewrites remain open for this bulk action.
[Key Shown reference](research/GRAPH-TOOLS-2026-11-18.md#key-shown-reference)

Linux desktop build `0e9687fa3c8f` started with WebGL in a viewable GTK
window and was left available. `.local/key-shown-user-process.json` protects
the handover. The native launch verifies startup. The Chromium harness uses
the real Rust Session for gesture and history checks. Private
`key-shown-grouped-2026-11-18/` retains the logs, two reviewed captures and
the launch receipt. Cleanup removed 140 isolated test workspaces, 70
redundant output directories and two new incremental caches, totaling
481,211,685 logical bytes. Linux has 805 GiB free and host G: has 3.6 GiB free.

The Dopesheet Adjust batch from `0e9687fa3c8f` connects the toggle,
selection and current-frame eligibility, frozen viewport drag with local
preview, and one native edit across selected frames. The constraint-free
single-bone profile covers Rotate, parent-relative Translate, and local
Scale including selected split axes. Tests preserve IDs, linear or stepped
curves, unrelated drafts and one Undo per gesture. Escape and a frame change
cancel the gesture. Ineligible drags never fall through to Auto Key.
JavaScript passed 475 cases with one existing skip. The full production-CSP
suite passed all 151 cases after correcting the linear test fixture's
constraint removal and tool selection order. A final visual correction
makes the gizmo display the factors and displacement actually applied to the
selected axes. The final bundle passed all 16 targeted cases. The verified
Scale X preview label displays X 1.42× and Y 1.00×. Exact active reference
gestures, adjacent Bézier, constrained poses and grouped edits remain open.
[Dopesheet reference](research/ANIMATION-WORKSPACE-CONTROLS-2026-11-18.md#dopesheet-adjust-reference)

The normal Linux build `09f6fa9ed9a2` started with WebGL in a viewable GTK
window and was left available. `.local/timeline-adjust-user-process.json`
protects the handover. Native gesture verification uses Chromium and the real
Rust Session. Private `timeline-adjust-grouped-2026-11-18/` retains build and
test logs, two corrected UI captures, both initial fixture failure traces
and the launch receipt. Cleanup removed 163 isolated test workspaces, 82
redundant output directories and two new incremental caches, totaling
925,407,033 logical bytes. Linux has 805 GiB free and host G: has 3.6 GiB free.

The click navigation batch connects independent Graph and Dopesheet Jump to
Key and Jump to Frame settings, with four locally persisted choices that
default off. The grouped round passed 475 JavaScript cases with one existing
skip, four targeted UI cases, and all 153 production-CSP UI cases. Chromium
with the real Rust Session verified keyboard activation, zero-result and
committed drags, ineligible Offset, fractional clicks through a scrolled
Graph, and same-frame pose and clipboard preservation. REA separated the
exact Dopesheet click from three drags and confirmed Current survives the
switch to Graph and both Swap states. Exact defaults, direct Graph key
clicks and marquee in the original remain open.
[Timeline click navigation gate](research/ANIMATION-WORKSPACE-CONTROLS-2026-11-18.md#timeline-click-navigation-gate)

Normal Linux build `8b25d2c0cf66` started with WebGL in a viewable GTK window
and was left available. `.local/timeline-jump-user-process.json` protects the
handover. Private `timeline-jump-grouped-2026-11-18/` retains the build/test
logs, the timeline settings capture and the launch receipt. Cleanup removed
148 isolated test workspaces, 77 redundant test output directories and two
new incremental caches, totaling 484,376,478 logical bytes. Linux has 804 GiB
free and host G: has 3.6 GiB free.

The grouped 15-point round from `8b25d2c0cf66` adds two-stage Ctrl/Cmd+A to
Dopesheet, optional pause before retaining additive selection boxes, and
timing scale/reversal on supported bone intervals. Chromium with the real
Rust Session verified row and displayed scope, separate box cohorts, Escape,
fractional reversal and one Undo. Native guards passed stale/collision,
signed-zero value, stepped scaling and affected-curve cases. REA found no
editor selection handler in the Linux installer inventory. The current
manual documents these gestures. Original box lifetime, pause and retiming
behavior remain open.
[Dopesheet selection gate](research/ANIMATION-WORKSPACE-CONTROLS-2026-11-18.md#dopesheet-selection-gate)

Production build, MCP schema generation and 475 JavaScript cases passed,
with one existing skip. The native scene suite passed 384 cases with two
existing ignored. The legacy suite passed 103 with one existing ignored.
The format crate passed all 16 default-profile cases. The focused browser
suite passed seven cases. The full run passed 154 of 156. The Region and
Mesh Sequence cases timed out on native HTTP requests in that run. Both
passed on the same bundle and host in the isolated rerun.

Normal Linux build `8eee37b7e6a3` started with WebGL in a viewable GTK
window and remains available through its user service. The protected
handover is `.local/timeline-selection-user-process.json`. Private
`timeline-selection-grouped-2026-11-18/` retains the logs, the additive-box
capture and both initial failure traces. Cleanup removed 156 isolated
workspaces, 79 redundant test outputs and nine new incremental caches,
totaling 1,528,406,157 logical bytes. Linux has 804 GiB and host G: has
3.6 GiB free.

The grouped 15-point floating-tools round from `8eee37b7e6a3` adds Setup
Pixels for direct translation of one active Region. The half-unit local grid
is off by default and the toggle survives switching through Animate. The
viewport uses one candidate for artwork, outline, tag and gizmo. A native
position-only operation preserves untouched axes, rotation, scale and the
Region representation. A grid-incompatible locked axis stays continuous.
Exact Linux captures pin the button's location. The reference corpus
contains no active Pixels result. Local rounding and ties are FBones
policies guided by the current manual.
[Pixels gate](research/VIEWPORT-OPTIONS-2026-11-18.md#pixels-and-compensation-observations)

Production build and schema generation passed. JavaScript passed 477
cases with one existing skip. Native scene passed 386, legacy 103 and
format 16, with the existing native ignores. All four targeted UI cases
and all 157 production-CSP UI cases passed. Chromium with the real Rust
Session verified 100% preview/commit agreement, toggle and no-op, Escape,
Undo and a locked X drag at 200%. Native verification separately covered
stale pose, exact untouched bits and save/decode.

Normal Linux build `df795ceba8b7` started in a viewable GTK window with
WebGL and remains available. `.local/viewport-pixels-user-process.json`
protects the handover. Private `viewport-pixels-grouped-2026-11-18/`
retains logs, the preview capture and launch receipt. Cleanup removed 152
isolated workspaces, 79 redundant output directories and six incremental
caches, totaling 1,875,704,595 logical bytes. Linux has 804 GiB free and
host G: has 3.6 GiB free.

The grouped 15-point floating-tools round from `df795ceba8b7` connects
Bones and Images compensation for one Setup bone translation in
unconstrained scenes. The native edit covers child roots, direct Region
inventory and positive Mesh/Clipping lanes of the translated bone.
The four toggle combinations, preview geometry, Escape and one Undo passed
with the real Rust Session. Native checks cover positive and dormant
binding lanes, stable Region alternatives, save/decode, invalid geometry
and stale revisions. REA established the gray layout in exact captures and
found no retained active before/after pair. Rotate, Scale, Shear, numeric
edits, Animate and constrained scenes remain open.
[Compensation gate](research/VIEWPORT-OPTIONS-2026-11-18.md#compensation-translation-gate)

Production build and schema checks passed. JavaScript passed 478 cases with
one existing skip. The native scene suite passed 389 with two ignored, the
legacy suite 103 with one ignored and the format crate 16. All 158
production-CSP UI cases passed. The first focused UI run found a one-ULP
continuous Region translation discrepancy against a whole-number assertion.
The rerun and full round passed with a tolerance on that existing route;
the compensated fixture still checks exact authored coordinates.

Normal Linux build `a4def42643db` started in a viewable GTK window with WebGL
and remains available. `.local/viewport-compensation-user-process.json`
protects the handover. Private `viewport-compensation-grouped-2026-11-18/`
retains logs, the applied-controls capture and the initial trace. Cleanup
removed 155 isolated workspaces, 81 redundant output directories and six
incremental caches totaling 1,486,288,048 logical bytes. Linux has 803 GiB
free and host G: has 3.6 GiB free.

The grouped 15-point timeline round from `a4def42643db` wires both Sync
directions across the existing tabs. The official 4.3 release notes
identified Dopesheet → Graph. Graph → Dopesheet uses live visibility and
filters for rows, summaries, navigation, selection and Key Shown.
Dopesheet → Graph takes the source selection on tab change and shows no
curves when that source is empty. Off restores the manual scope controls.
REA established the leading control in three exact captures that show both
Lock and Filter. Exact active transitions remain open.
[Dopesheet Sync gate](research/ANIMATION-WORKSPACE-CONTROLS-2026-11-18.md#dopesheet-sync-gate)

The production build and all 159 production-CSP UI cases passed.
JavaScript passed 480 with one existing skip. Chromium with the real Rust
Session confirmed independent Translate axes, collapse and summaries,
unchanged Current and project while switching modes, and one Key Shown
batch restricted to Translate X. The initial assertion needed the left
Bézier edit and its actual key ID. Both traces are retained. The corrected
focused case and full suite verified the same split and one Undo.

Normal Linux build `e20cf472ddd2` started in a viewable GTK window with
WebGL and remains available. `.local/timeline-sync-user-process.json`
protects the handover. Private `timeline-sync-grouped-2026-11-18/` retains
logs, two final mode captures and the launch receipt. Cleanup removed 164
isolated workspaces, 86 redundant outputs and two incremental caches,
totaling 486,967,630 logical bytes. Linux has 803 GiB free and host G: has
3.6 GiB free.

The grouped 15-point slice from `e20cf472ddd2` adds optional stacked Graph
and Dopesheet under one gesture and command owner. Each panel has its own
ruler and vertical scroll. Sync links horizontal pan, zoom and the leading
frame origin. Both Sync directions, two-point alignment during zoom, pan and
resize, independent Off cameras and a single Session drag with Undo passed
at 1200×850 and 960×700. REA measured the supplied separate-panel layouts.
Current vendor tips describe the link. The ordering, equal split and toggle
are FBones choices while simultaneous exact 4.3.26 geometry remains open.

JavaScript passed 483 with one existing skip. The first full production-CSP
run passed 159 of 160. The remaining Graph tangent-during-Play trace showed
the pointer centered on the handle. The Vue pane capture invoker stamped the
event at the child listener's attachment time under the frozen test clock.
Native pane focus listeners now let the handle receive that event. The final
production build and all 17 affected cases passed, including play/pause,
Escape, one tangent edit, both Sync directions and the stacked layout.
Retained original Graph evidence shows distinct Play and Repeat controls.
Its input receipt contains zero Play inputs and zero tangent drags.

Final Linux build `a94d927f6631` started in a viewable GTK window with WebGL
and was handed over through `.local/timeline-stacked-final-user-process.json`.
The service later exited successfully and the window was closed at the final
status check. The receipt records startup and ownership at handover time.
Private `timeline-stacked-grouped-2026-11-18/` retains the final captures,
logs and initial failure traces. Cleanup removed 184 isolated Session
workspaces, 101 redundant UI outputs and two incremental caches totaling
929,080,532 logical bytes. Linux has 802 GiB free and host G: has 3.6 GiB free.

The grouped 15-point checkpoint from `a94d927f6631` delivers Rows and Toolbar
settings in both tabs and stacked layouts. Per-view local preferences keep
earlier navigation settings. Hidden labels free horizontal space while keys
remain selectable, and hiding the editing toolbar frees vertical space.
Linked views keep their gutter until both labels are hidden. The shared
stacked toolbar stays visible until both views turn it off. REA measured the
name band and time lanes in an exact Linux pair. The launcher archive
provides zero standalone layout settings. The current guides describe the
options, and exact open menu and persistence in 4.3.26 remain unobserved.

The production build passed 483 JavaScript cases with one existing skip,
18 targeted UI cases and all 161 production-CSP UI cases. The new native
Session case verifies both layouts at 1200×850 and 960×700, keyboard focus,
two tick positions, marquee with hidden labels, both preferences after reload
and exact unchanged project state. Linux build `b935dd72dc75` reached WebGL
in a viewable GTK window. Its service exited successfully before the last
status check. `.local/timeline-view-settings-user-process.json` records the
handover. Private `timeline-view-settings-grouped-2026-11-18/` retains logs
and the final screenshot. Cleanup removed 170 isolated Session workspaces,
91 redundant UI directories and two incremental caches totaling 489,308,560
logical bytes. Linux has 802 GiB free and host G: has 3.6 GiB free.

The grouped Graph selection checkpoint from `b935dd72dc75` adds curve-first
Ctrl/Cmd+A for live Graph keys and Bézier handles, handle-focused Frame and
row-scoped right-click visibility toggles. REA joined the retained 4.3.26
Translate controls to distinct X/Y components on the same authored key.
The current Graph guide documents the two selection stages. Exact Spine
isolation and select-all transitions remain open. Deform handle selection,
handle marquee and multi-handle editing are pending.

The first focused pass covered 16 cases. The final production build and
all 162 production-CSP UI cases passed, including the small-movement click
correction. A one-pixel move selects a handle while leaving the exact
Session snapshot, key-specific commands and Current intact. Shared key IDs,
hidden curves, keyboard activation, Frame bounds and real tangent edits
passed. JavaScript passed 483 cases with one existing skip.

Linux build `739c253f7a97` reached WebGL in a viewable GTK window. The
service exited successfully before the final check. The protected startup
receipt is `.local/graph-selection-user-process.json`. Private
`graph-selection-grouped-2026-11-18/` holds logs and the final narrow
capture. Cleanup removed 169 Session workspaces, 92 redundant output
directories and two incremental caches totaling 489,230,503 logical bytes.
Linux has 802 GiB free and host G: has 3.6 GiB free.

The grouped Curves checkpoint from `739c253f7a97` delivers the optional
Animate dock above Preview. It follows a single selected outgoing bone
segment in Graph or Dopesheet, normalizes the selected component with a
signed value span, and uses the existing native handle and interpolation
commands. Flat, Ease in and Ease out apply to the segment. Existing equal
Bézier lanes retain their stored handles. Automatic, Separate and Bounce
are visible as pending controls. The old dock layout migrates without
moving Preview. REA located the dock in the supplied unpinned Dopesheet
layout and verified decreasing controls in an exact stock export. Exact
active Linux 4.3.26 Curves interaction remains open.

The first focused run passed 15 of 16. Its remaining test counted Undo
as a new curve edit. The corrected Curves case and all 163 production-CSP
UI cases passed on the same build. JavaScript passed 488 with one existing
skip. At 1120×820 and 960×740, the new case verifies signed overshoot, the
equal-Y blank lane, one native keyboard or pointer handle edit, a preset
with one Undo, closing during a drag without an edit, and unchanged
Current. The narrow scene uses the existing dock scroll stack.

Linux build `4e1645e662c7` reached WebGL in a viewable GTK window.
`.local/curves-view-user-process.json` records the protected handover.
Private `curves-view-grouped-2026-11-18/` retains logs, the final capture
and initial failure trace. Cleanup removed 171 isolated Session workspaces,
90 redundant output directories and two incremental caches totaling
489,394,836 logical bytes. Linux has 802 GiB free and host G: has 3.6 GiB free.

The grouped nonbone Curves checkpoint from `4e1645e662c7` covers light RGBA,
IK Mix and Softness, six Transform mixes and scalar Physics. Two-color
shows all seven lanes under the existing Linear-only profile. Handle and
preset routes carry the native typed payload. Addressed slot edits retain
the binary32 signs of untouched controls. REA corroborated independent RGBA
and IK handles in historical exact stock artifacts, and active Linux Curves
interactions remain open.

The first focused pass passed 12 of 13. The remaining fixture supplied
zero alpha to the stored dark RGB carrier. The same product build passed
the corrected fixture and all 165 production-CSP UI cases. JavaScript
passed 492 with one existing skip. Native Session tests passed 396 with
two existing ignored cases. Verification covers a descending G handle,
two-color inspection, the IK and Transform channel selectors, scalar
Gravity, one history transaction per change, unchanged sibling controls
and IK flags, and exact preservation of an untouched negative-zero
RGBA handle after an addressed edit and Undo.

The active Linux build `afcde1555616` reached WebGL in a viewable GTK
window. `.local/curves-nonbone-user-process.json` records the protected
handover. Private `curves-nonbone-grouped-2026-11-18/` retains the logs,
final two-color capture and initial test trace. Cleanup removed 170 isolated
Session workspaces, 94 redundant UI directories and five incremental
caches totaling 1,339,843,822 logical bytes. Linux has 801 GiB free and host
G: has 3.6 GiB free.

The grouped verification checkpoint from `afcde1555616` advances the
tracked Curves workflows by completing terminal-key selection, multiple
segments and grouped editing. A single terminal key reveals the preceding
segment. Multi-selection overlays the selected outgoing segments and a
focus selector targets individual handles. Flat uses the selected
endpoint. Interpolation and presets edit eligible groups in one native
transaction, including mixed bone and color selections. REA MCP proves
stock Linux 4.3.26 terminal-segment storage ownership. The stable 4.3.24
release notes establish the single-selection fallback rule. Active stock
Curves interactions and the exact overlay styling remain open.

Production web and Linux desktop builds succeeded. All 166 production-CSP
UI cases passed in 4.1 minutes. JavaScript passed 495 with one existing
skip. The mixed selection case verifies terminal Flat, the focused and
background shapes in a 980 px viewport, two grouped native commands with
one Undo each, and unchanged terminal keys. The Rust Session source was
unchanged. Linux build `50eb01e190e4` reached WebGL in a viewable GTK
window. `.local/curves-selection-user-process.json` records the protected
handover. Private `curves-selection-grouped-2026-11-18/` retains the
logs and mixed Curves capture. Cleanup removed 157 isolated Session
workspaces, 84 redundant UI directories and two incremental caches
totaling 483,986,467 logical bytes. Linux has 801 GiB free and host G:
has 3.6 GiB free.

The grouped Curves preset checkpoint from `50eb01e190e4` delivers a named
local library with Save, Replace, Remove and explicit Apply. A captured
focused lane preserves signed normalized progress and overshoot. Apply
projects the shape onto eligible selected lanes in one native transaction.
An unrepresentable destination rejects the batch before authoring. Equal
lanes keep their authored controls. REA confirms the supplied control
strip and the ownership limit of the exact Linux evidence. FBones uses
its own versioned preferences and control labels.

JavaScript passed 498 cases with one existing skip. The full production-CSP
run passed 167 in 3.6 minutes. Its 1000 px screenshot exposed vertical
clipping after using Apply. The compact selector revision passed nine
affected Curves and docking cases, including the complete plot and Apply
visible together. The native test covers settings reload, Save, Replace,
Remove, mixed bone/RGBA Undo, applying an identical shape and atomic
rejection of extended bone time on RGBA. Linux build `e29c8786736a`
reached WebGL in a viewable GTK window.
`.local/curves-presets-user-process.json` records the protected handover.
The private `curves-presets-grouped-2026-11-18/` folder retains the logs
and both captures. Cleanup removed 167 isolated Session workspaces,
88 redundant UI directories and two incremental caches totaling
920,688,225 logical bytes. Linux has 800 GiB free and host G: has 3.6 GiB free.

The grouped Preview checkpoint from `e29c8786736a` delivers upper-track
Additive with next-assignment scope. The scratch compositor applies
authored bone deltas, including signed Setup scale and split axes, over
the lower Preview pose. A transition blends both entry contributions
over one lower pose. Right-clicking a clip or middle-clicking an assigned
track selects its clip in the editor and retains independent Preview.
Hold Previous was removed following the 4.3 release history. Queue
remains a planned FBones control. The REA Linux stock sample provides
positive combined transforms. Signed/split Additive and active Preview
input in exact 4.3.26 remain open. The 4.3 runtime and publisher guide
ground the implemented behavior. Mixed transitions remain FBones policy.

Production web and Linux builds succeeded. JavaScript passed 501 cases
with one existing skip. The targeted Preview, docking and render
integration round passed 35 UI cases in 57.4 seconds. The rendered
fixture moves from x20 in ordinary mode to x60 after reassignment with
Additive. Toggling the future setting preserves the current pixels.
Explicit navigation changes only editor clip selection and retains
Preview assignments and native Session data. The latest full UI run
remains the previous Curves checkpoint. Linux build `bb6a04ddc851`
reached WebGL in a viewable GTK window.
`.local/preview-additive-user-process.json` records the protected
handover. The process exited after handover and its immutable binary
remains available. Private `preview-additive-grouped-2026-11-18/` retains logs
and both captures. Cleanup removed 35 isolated workspaces, 20 redundant
UI directories and two incremental caches totaling 448,630,738
logical bytes. Linux has 800 GiB free and host G: has 3.6 GiB free.

The grouped Ghosting checkpoint from `bb6a04ddc851` delivers direct
slot-owner selection, Lock and Refresh, plus independent Before and After
motion vectors for Region and Mesh vertices. Attachment filtering follows
full sampled clipping scopes. Vectors can render without other ghosts and
share the scope and opacity. REA confirms these controls in the publisher
images. World-unit threshold, endpoint pairing and plain strokes are
FBones policies. The exact 4.3.26 Linux Ghosting panel and rendered
vectors remain open.

Production web and Linux builds succeeded. JavaScript passed 508 cases
with one existing skip. The first targeted UI pass had 49 of 50. Its new
fixture read a pixel on the viewport axis instead of inside the blue
mesh. Both Ghosting cases passed with the corrected pixel on the same
product build. The test observes parent and child filtering, locked
refresh, partial clipping, Region and Mesh vectors, threshold equality,
and independent Preview and native Session state. Linux build
`a701f0421033` reached WebGL in a viewable GTK window. The process
exited after handover. The protected launch receipt is
`.local/ghosting-motion-user-process.json`. Private
`ghosting-motion-grouped-2026-11-18/` retains the immutable build,
logs, failure trace and final captures. Cleanup removed 52 isolated
workspaces, 23 redundant
UI directories and two incremental caches totaling 453,284,111 logical
bytes. Linux has 800 GiB free and host G: has 3.6 GiB free.

The grouped Ghosting display checkpoint from `a701f0421033` delivers
independent Frames and Key Frames fill and outline controls. Solid
recolors clipped alpha. Silhouette outlines the composed sample.
X-ray outlines individual attachments and reveals overlap seams.
The shader uses viewport-clipped filter passes. Radius, compositing
order and default appearance are FBones policy. REA confirms controls
in the publisher imagery and the stable lineage fixes for alpha-zero
Silhouette and Solid backface culling. Exact 4.3.26 raster effects
and simulated Physics remain open.

JavaScript passed 510 cases with one existing skip. The first targeted
UI run passed 50 of 51. The new display fixture found a precision
mismatch on a shared WebGL uniform. Switching the fragment shader to
the renderer's dedicated input-pixel uniform corrected it. All three
affected Ghosting cases passed on the final production build. The
display case checks a clipped Region, mirrored Mesh, zero-alpha slot,
different styles per range and Preview and Session independence.
Linux build `1a0abf189ec6` reached WebGL in a viewable GTK window
and exited after handover.
Private `ghosting-display-grouped-2026-11-18/` retains immutable build,
logs, the failure trace, and final Silhouette and X-ray captures.
The protected handover is `.local/ghosting-display-user-process.json`.
Cleanup removed 54 isolated workspaces, 25 redundant output directories
and two incremental caches totaling 887,992,771 logical bytes. Linux
has 800 GiB free and host G: has 3.6 GiB free.

The grouped Preview toggle checkpoint from `1a0abf189ec6` delivers
right-click on/off on numbered tracks and a keyboard and touch control
beside Clear. The assigned clip, its frame and ordinary mix phase are
retained while the track is muted. Other tracks keep advancing. The
active selection and transport persist through toggling. Immediate
toggle and retained phase are FBones policies grounded in the
REA-pinned publisher explanation of the gesture. Exact 4.3.26 resume
and mix remain open.

JavaScript passed 510 cases with one existing skip. All 37 affected
UI cases passed on the first run. The rendered test verifies a frozen
base-track crossfade, an inactive high track toggled during playback,
frame equality after restore, and paused keyboard toggle with no native
authoring. Linux build `1fb4cfac8a6f` reached WebGL in a viewable GTK
window and exited after handover. The protected handover is
`.local/preview-toggle-user-process.json`. Private
`preview-toggle-grouped-2026-11-18/` retains the immutable build,
logs and muted-track capture. Cleanup removed 37 isolated workspaces,
22 redundant output directories and two incremental caches totaling
449,486,849 logical bytes. Linux has 799 GiB free and host G: has
3.6 GiB free.

The estimated 15-point Preview UI checkpoint from `1fb4cfac8a6f` adds
a separate default-closed Setup dock beneath Tree. Views opens it and
the Setup Properties inspector remains accessible. Existing dock
positions and dimensions migrate. Follow Setup displays the current
pose and Tracks plays a local composition through Setup rig edits.
The active mode's dock visibility gates one common composition clock.
Shared track continuity and default closure are FBones policies.

Production build and type checks passed. JavaScript passed 511 with one
existing skip. The first UI round passed 41 of 42. The new test used an
incomplete close-button name. Both Preview cases passed after correcting
that locator on the same build, including the rendered rig edit, hidden
clock, Animate Current and clip retention, one native change, and
restored dock size. Linux build `63ddf7dade03` opened a viewable GTK
window with WebGL and exited normally after handover. Private
`preview-setup-grouped-2026-11-18/` holds launch and test evidence, a
Setup capture and the initial failure trace. Cleanup removed 44 test
workspaces, 26 redundant outputs and two incremental caches totaling
452,000,162 logical bytes. Linux has 799 GiB free and host G: 3.6 GiB.

The estimated 15-point checkpoint from `63ddf7dade03` adds Preview View
Settings in both modes. Hide controls keeps the camera and local playback.
Show bones uses the evaluated Preview pose and its own canvas. The two
settings default off and survive docking/mode changes for the app session.
Play current animation is visible as planned. Queue was removed after the
REA editor-versus-Runtime check. Exact original rendering and defaults
remain open.

Production build and type checks passed with 511 JavaScript cases,
one existing skip and all 42 affected UI cases. The new test measured
local bone pixels, moving art with hidden controls, exact main viewport
isolation and no native mutation. Linux build `31a55b6c3087` reached a
viewable GTK WebGL window and exited normally after handover.
Private `preview-view-settings-grouped-2026-11-18/` retains logs, the
native handover and screenshot. Cleanup removed 42 test workspaces, 25
redundant output directories and two incremental caches totaling
451,192,160 logical bytes. Linux has 799 GiB free and host G: 3.6 GiB.

The first Play performance checkpoint from `31a55b6c3087` suppresses WebGL
work after a Preview dock
close and skips unchanged mesh UV/index uploads. Reopening catches up to
the current pose and retains the camera. Positions continue to upload.
Browser and native probes both observe zero closed Preview draws and the
expected mesh upload deltas with unchanged authored snapshots and clocks.
Production build, 511 JavaScript cases with one existing skip, and all
44 affected production-CSP UI cases passed. Linux build `6c73776446a2`
started with WebGL in a viewable GTK window for handover.

On the owned software-GL WebKitGTK fixture, Play is still slow. Native
p95 across dock states is 56–63 ms on the candidate versus 57–62 ms on
the baseline. A paused candidate reads 17–18 ms. CSS hiding of canvases
leaves Play at 61 ms; bypassing three GL call bodies gives 52 ms. A
hash-matched WebKit profile records the main viewport, Preview, ImageLayer
and Vue Tree/timeline paths. Next replay the same 512-vertex native
fixture to isolate how much work comes from per-draw scene preparation
and from editor updates, then measure the next optimization against it.
The next grouped checkpoint from `6c73776446a2` reuses draw-local pose and
binding geometry, fills mesh position buffers directly, and avoids rebuilding
Tree rows and overview key markers on unchanged metadata. Production build,
511 JS with one existing skip, and 49 affected UI cases passed. The paired
owned native case measured 56–61 ms Play p95 before and 57–62 ms after.
SceneTree was absent from the new 198-stack sample. Native clock and project
snapshot are equal. Linux build `5ab8bb25de82` reached a viewable WebGL
window for handover. Native lag remains active. REA has confirmed stock Linux Spine loading GL/GLX,
libGDX and LWJGL. Exact per-frame dispatch and timing remain open.

The diagnostic follow-up clocks a 64 ms RAF p95 with 8 ms of measured
JavaScript. Pose, Deform and main preparation each reach about 1 ms p95.
Bypassing both canvas draw paths leaves 55 ms RAF p95 with 3 ms measured
JavaScript. A separate paint intervention gave 72 ms with both draws
bypassed, 41 ms with Timeline also hidden and 18 ms with the editor
hidden. Repeated marker-only and readout-only interventions give no
stable improvement. Smaller native dimensions improve the paired
measurement by 4 ms and leave the issue visible.

The diagnostic build was isolated and the last verified ordinary binary
`5ab8bb25de82` was restored byte for byte. Private
`playback-stage-timing-2026-11-18/` retains the guarded reproducer,
clock/visibility results and WebKit Timeline counts. Cleanup removed the
diagnostic executable and frontend plus two new incremental caches
totaling 736,799,041 logical bytes. No owned scratch profiles remain.
REA validated a synthetic GLX dispatch probe and retained the stock
loaded-library evidence. Original Play timing remains open.

The same production fixture reproduced the lag on default WSLg X11 and
Wayland. Mesa confirms software EGL without DRM. The Linux entry now
selects direct Skia CPU painting for the matching WSLg sockets without
`/dev/dri`, with an explicit WebKit override preserved. Native build
`334ea331cffd` measures 19–20 ms p95 while playing with Preview visible
on both WSLg paths. X11 with the override off measures 56–62 ms. The
same-frame main, Preview and Inspector raster pixels match across both
X11 settings. Clock, native snapshot and source bytes are stable. The
private non-WSLg Xvfb WebProcess kept the option unset. Production GTK
WebGL startup and user handover passed. Exact stock Play timing and native
cadence on hardware-accelerated Linux, Windows and macOS remain open.
Private `playback-native-display-2026-11-18/` retains receipts and paired
pixel evidence. Cleanup removed 443,353,954 logical bytes from two
incremental caches and a redundant sampler. All 12 owned scratch profiles
are gone. Linux has 798 GiB free and host G: 3.6 GiB.
[WSLg checkpoint](research/PLAYBACK-PERFORMANCE-2026-11-18.md#wslg-software-painting)

Private `playback-scene-preparation-2026-11-18/` retains the comparison and
profile. Cleanup removed 49 isolated workspaces, 28 redundant outputs,
two incremental caches, a temporary source-map build and one owned native
portal profile, totaling 462,095,043 logical bytes. Linux has 798 GiB free
and host G: 3.6 GiB.
Private `playback-performance-2026-11-18/` retains the paired runs,
reproducers, profile, immutable candidate and handover. Cleanup removed
44 isolated workspaces, 25 redundant outputs, two incremental caches
and the temporary source-map build, totaling 458,125,376 logical bytes.
Linux has 798 GiB free and host G: 3.6 GiB.
[Playback performance evidence](research/PLAYBACK-PERFORMANCE-2026-11-18.md)
[Preview View Settings evidence](research/PREVIEW-TRACKS-2026-11-18.md#preview-view-settings)

The project board is running locally at <http://127.0.0.1:4180/>. It reads
TASKS, STATE and AGENTS and writes status and priority edits into TASKS.
The browser checks passed task drag and select, priority drag and buttons,
add/remove, reload persistence, keyboard tab navigation, external updates
and a narrow viewport. Mutation checks used disposable copies of the
three documents. [Local board command](DEVELOPMENT.md#normal-setup)
[Setup Preview evidence](research/PREVIEW-TRACKS-2026-11-18.md#setup-preview)
[Ghosting gate](research/GHOSTING-2026-11-18.md#reference-and-implementation-gate)
[Named presets evidence](research/GRAPH-TOOLS-2026-11-18.md#named-curves-presets)
[Upper-track Additive evidence](research/PREVIEW-TRACKS-2026-11-18.md#upper-track-additive-reference)
[Terminal and multi-selection evidence](research/GRAPH-TOOLS-2026-11-18.md#terminal-keys-and-multiple-segments)
[Independent Curves gate](research/GRAPH-TOOLS-2026-11-18.md#independent-curves-view-gate)
[Graph selection evidence](research/GRAPH-TOOLS-2026-11-18.md#graph-key-and-handle-selection-gate)
[Rows and Toolbar gate](research/ANIMATION-WORKSPACE-CONTROLS-2026-11-18.md#rows-and-toolbar-gate)
[Stacked timelines gate](research/ANIMATION-WORKSPACE-CONTROLS-2026-11-18.md#stacked-timelines-gate)

The floating viewport bar is implemented in source. Bones/Images display
switches stay available while the tool panel changes with bone, slot, Region,
Mesh or Clipping selection. Auto Key uses the timeline state across Animate
contexts. Slot and attachment actions reuse existing native key commands.
Select Bones and Select Images now gate new viewport pointer and marquee
selection while preserving selected handles and Tree/Timeline access. Show
Others gates unselected Clipping outlines while retaining the mask. These
input and display policies remain unverified against exact Spine transitions.

REA MCP observed the stock JVM during three owned 4.3.26 GUI startups with
zero input. The runtime counted 2,729 class definition entries on each run.
The marker query parsed 111 standard pools and found no toolbar owner. REA
static inspection identified a parser path that advances past the magic.
Removing the magic check preserved the same coverage. A separate aggregate
diagnostic isolated 2,614 rejections to the candidate version check and
four to bounds, with no read, tag or length failures. The return probe then
saw 2,729 non-null JNI results, including the 2,614 entries rejected by the
collector's version check. A deeper Frida attempt detached before window
confirmation or a sample. The toolbar owner remains unresolved. Use a
different verified passive route before repeating that experiment. Edition
corroboration remains from the prior banner-verified CLI run.
[Toolbar and runtime evidence](research/VIEWPORT-OPTIONS-2026-11-18.md#floating-toolbar-and-rea-analysis)

Graph Frame/Auto/Store/Swap and Timing Shift/Offset are implemented in the
persistent responsive timeline command bar. Favor/Presets and Dopesheet
Adjust are visible as planned actions. The existing key commands and inputs
are reused. [Timeline evidence](research/ANIMATION-WORKSPACE-CONTROLS-2026-11-18.md#persistent-timeline-controls)

Graph has transient overview, bone and property visibility controls. The
filter governs live and stored paths, picking, and fitting. It prunes hidden
keys from the active Graph selection. Dopesheet still exposes all keys and an
explicit Dopesheet selection reveals its curve when returning to Graph.
Modifier and exact version transition semantics remain open.
[Graph evidence](research/GRAPH-TOOLS-2026-11-18.md#curve-visibility-groups)

The 15-point UI-first verification round started from the accepted full-range
Offset baseline below. The batch covers the floating contextual bar, viewport
selection and Clipping display filters, persistent Graph/Timing commands, and
Graph visibility at overview, bone and property scope. This is a planning
estimate across the active UI-first workflows. The batch checks keyboard and
pointer input, clipping/Preview isolation, native key insertion, axis layout,
hidden key safety, and existing native Session behavior. The first unit run
identified an early release of the geometry lease on Ctrl selection. Restoring
the pointer-up lifecycle passed all 464 executed JavaScript tests with one
existing skip. The full production-CSP UI run passed 138 of 139. Its final
viewport sample was covered by the wrapping tool bar. Compacting the bar at a
wider viewport threshold restored the sample and passed all 13 applicable
final checks. Both production type checks and the Linux build completed.
[Test cadence](../AGENTS.md#test-cadence)

The previous checkpoint's final Linux desktop image started WebGL in a viewable GTK window and was
handed over to the user. Immutable SHA-256 begins `afbeb3e46014`, and
`.local/ui-first-grouped-user-process.json` records the protected identity.
Logs, corrected screenshots and the first UI failure trace are under private
`ui-first-grouped-2026-11-18/`. This closes the grouped checkpoint.

The two current no-input observations removed their fixture copies, display
authorizations and owned stale locks, totaling 1,136 bytes. Both JVMs exited.
The grouped build cleanup removed 138 isolated Session workspaces, 64 redundant
UI output directories and three incremental caches. The total reclaimed
logical size was 479,694,225 bytes, including the probe artifacts. Retained
the current handover, test evidence and reusable dependencies. Linux has
807 GiB free and host G: has 3.6 GiB free.

### Retained Timing Offset checkpoint

Exact Linux Offset probes established cyclic retiming of the selected bone
property row, duplicate values at the loop boundary and the cumulative basis
of consecutive drags with the same selected key. REA authenticated the captures
and independent CLI exports. Nonlinear probes across two segment durations and
two clip durations support a fixed 300-step subdivision and ten-chord seam
sampling. The native operation uses that measured model with stored-time and
curve-profile validation.

FBones exposes Offset in Graph, Dopesheet and the generated MCP schema. The
supported profile is a closed single bone property row spanning the authored
clip. The drag displays its frame delta. On release one native transaction
wraps the row and regenerates the seam. A continued selection reuses the original
typed row and survives a successful Save. Explicit Loop bounds, other channels
and modifier activation remain open.
[Timing Offset evidence](research/TIMING-OFFSET-2026-11-18.md)

**Direct cross-system comparison passed.** The stock Linux Spine CLI opened
and exported copies of both FBones-authored binary saves with exit 0. Compared
with the corresponding original GUI edits, Setup, Translate and Rotate key
and handle times were exact in both phases. The first +9 phase had maximum
absolute key and handle value error 0.00002. The cumulative +12 phase matched
every measured field exactly. The private `rea-product-timing-offset-direct.json`
pins the binaries, exports, independent numeric comparison and focus trace.

Five integration cases passed across the focused runs after aligning the old
Shift test with the now-available Offset mode. The full production-CSP suite
passed all 138 distinct cases. Rust passed 379 with two existing ignored,
JavaScript passed 464 with one existing skip and Scene format passed 105.
The final Linux build opened a viewable window with WebGL. The immutable
handover is protected by `.local/timing-offset-user-process.json`.

Cleanup removed 135 own completed Session workspaces and 69 disposable UI
output directories, totaling 46,157,437 logical bytes. Five temporary original
GUI copies and their display authorizations were removed by the driver. Five
stale display locks were removed after terminal checks. Retained artifacts
include the final Offset trace, both native saves, original exports, direct
comparison and first Shift expectation failure. Linux has 808 GiB free and host
G: has 3.6 GiB free.

Two prior explicit Loop Offset probes are complete in original Spine. For
Loop 6–24, +6 wrapped the Rotate key from 21 to 9 and produced equal 75.69
endpoints. Independent CLI export preserved both exterior keys and the
Translate row while showing changed exterior Bézier handles adjacent to the
endpoints. The second artifact changes the two input handle times. REA verifies
the result regenerated the old times and the complete export was identical.
The general rule remains open. Explicit Loop FBones wiring is deferred behind
the floating toolbar. The verified full-range profile remains available.
[Explicit Loop evidence](research/TIMING-OFFSET-2026-11-18.md#explicit-loop-bounds-in-the-original)

Earlier exact interactions include [Graph Swap](research/GRAPH-TOOLS-2026-11-18.md#exact-graph-swap-gesture-in-the-linux-reference)
and [Timing Shift](research/TIMING-SHIFT-2026-11-18.md).
Earlier UI-first evidence covers [Preview tracks](research/PREVIEW-TRACKS-2026-11-18.md),
[Ghosting](research/GHOSTING-2026-11-18.md),
[app frame](research/WINDOW-CHROME-2026-11-18.md),
[Animate tools](research/ANIMATION-WORKSPACE-CONTROLS-2026-11-18.md),
[Setup Tree creation](research/SETUP-TREE-CREATION-CONTROLS-2026-11-18.md),
[File I/O](research/FILE-IO-CONTROLS-2026-11-18.md) and
[Viewport Options](research/VIEWPORT-OPTIONS-2026-11-18.md).
Named skins remain last.

## Local REA tooling

REA 6.9.0 and its Node 24.22.1 runtime are pinned under `.local/rea/`.
Codex reads the `rea` stdio MCP entry from the project's `.codex/config.toml`.
The CLI version, MCP initialization, tool listing and a desktop inventory call
on a disposable fixture passed. After Codex restarted, its REA tool also read
the pinned Node executable's ELF header. Spine and provider-specific analysis
were outside this check. Reproduce with `/mcp` in Codex from this project or
`.local/rea/rea --version` for the local CLI.
The fixture and the 99,285,736-byte npm download cache were removed. The pinned
installation is retained.

FBones 0.10 versus Spine Professional 4.3.26 now has a
[feature comparison](research/FBONES-SPINE-4.3.26-FEATURE-GAPS-2026-11-18.md)
covering Setup, Animate, format, runtime and integrations. The paired DATA/UI
audits reuse retained original evidence and current visuals. A bounded REA MCP
pass on the original package and Windows launcher confirms the exact package
hash and static PE imports. The probes yielded no editor code or fresh gesture
evidence. Private `.local/research/spine-feature-gap-2026-11-18/rea-evidence.json`
retains the selected records. No original process or product code was touched.
Next reference action for F105 is an owned minimal reversing Translate sample
at a discriminating point with predicted roots and verified input controls.
Existing render/encoding acceptance and deferred F307/F308 scopes still apply.
Only the cited REA receipt was generated, with no disposable build or capture
outputs. Linux free space is 815 GiB and Windows host G: has 3.6 GiB free.

## Current work — MCP first,0.10 delivered (F313 DONE)

User authorizes commit, push and a new release after finishing MCP, public/developer
MCP-first documentation and three real-project GitHub screenshots. Implementation
and local acceptance, hosted CI, publication and independent asset checks are complete.
Package/Tauri/Cargo version0.10.0 agree; immutable beta1 is retained failed, and v0.10.0-beta.2 is now pushed. Never replace existing0.9.6 release assets or selected Windows images.

Current MCP:23 tools/86 native edit variants/36 nested inputs, actual visible
Session, authenticated IPv4 loopback HTTP, remembered per-profile address/token,
explicit stopped Reset, real viewport image/camera metadata, PNG/WAV content,
resource/guide/prompt and optional negotiated-version stdio adapter. Start is
explicit (no autostart), validates Setup drafts and hands manual editing to AI.
Stop joins the listener/serializes dispatch and refreshes before unlock. Native
revisions, pose epochs, history, binary/resource guards remain authoritative.
New supported features follow the MCP-first shared-Session contributor contract.

FINAL actual GTK acceptance passes on build8f00ebef, own203568/start2349033:
W3C Copy followed by independent GTK clipboard read; official SDK1.32.1 (registry
integrity independently matched),23routes/56calls/11groups, stronger normalized
bones/mesh/binding/constraint/animation/event SaveCloseOpen equality, referenced
PNG/WAV bytes, runtime export, actual viewport PNG, visible native project,
StopStart same copied settings/reinitialize, explicit Reset/new credentials,
old token at NEW listener401 and retained normal native exit0. Private receipts
`.local/mcp-native-acceptance/final-clipboard/` join bound/terminal identities.
Independent audit verifies882B own binary9f4e573f/internal4.3.26/rawDEFLATE1579B/
CRC64=20f2daf93243d56f. This is Linux clipboard/native proof; full process restart
is covered by config file-load/unit tests, not a second real app restart. Windows/
macOS client/clipboard gestures and original-editor fidelity are not inferred.

The preceding final0.10 negative remains under `final-0.10`: same SDK/StopStart
passed, but old-token HTTP body caused reset104 instead of a reliable401 and its
launch transport ended native-15 (not normal). Paired DATA/UI gates diagnose
unread rejected bodies; bounded drain without JSON parse/dispatch corrects it.
A64KiB actual socket regression requires clean read_to_end, no tolerated reset,
and zero rejected dispatch. Both later final-http and final-clipboard runs pass
all phases; negative receipts are retained unchanged.

Final local checks:127production-CSP Chromium/real-Rust UI pass;370native pass/
2existingignored;105Scene/16default format,7research and103legacy/1ignored pass;
464JavaScript pass/1existingPhysics skip. Runtime16package+24native-export samples
pass; typechecks, web build, strict all-target Clippy and rustfmt pass. Linux CI
workflow now requires matching actual GTK/official-client/clipboard acceptance
before release, in addition to the three-platform/package/source/signature gates.

Actual supplied project is now losslessly supported:71bones/26slots/32default
attachments/14animations,13weighted meshes up to893vertices. Scoped Scene limits
1024vertices/6144triangle indices/8192edge indices and aggregate vertices preserve
ordinary/legacy/Clip/Trace limits and independent object/byte budgets. Cached
Array/UV/IntList16/ShortList47 references are rechecked per requesting field.
Final ACTUAL format example on the private source proves complete715855payload
byte equality after the strengthened cache guard. New1024/1025,8192/8193 semantics,
scoped/cache and high-index native/TS regressions pass; no records/animations are
dropped. This is FBones capacity policy, not a new original numerical-parity claim.

README's three1440x900 PNGs are the exact visually inspected0.10 captures from
`.local/mcp-readme-release-0.10/`: full Setup, actual big_win frame17 Dopesheet and
head Graph. Whole71-bone character now clears floating tools; Preview/keys remain
real. Package-derived EN/RO footer fixes stale static0.9.6. Public provenance hashes
and README link/image checker pass. Original user folder and32-file Ubuntu copy
hashes remain unchanged; raw project/JSON/PNGs and credentials stay private.
Only authorized editor screenshots enter Git/source archives.

Commit7eb094ff471e5b584762811762e5f6fe32093a7d and immutable beta1 tag were
atomically pushed. Beta1 Windows job134127709364 failed JS schema comparison
because checkoutCRLF differed from canonicalLF; retained raw log proves it failed
before native tests. Beta1 remains immutable/unpublished. Paired DATA/UI gate and
six regression checks normalize only CRLFpairs, retaining strict semantic/loneCR/
formatting rejection. Checker-only44fa099220c753f593220e0d4d74757de91554e7 and new
immutable v0.10.0-beta.2 are atomically pushed; application remains0.10.0. FullJS
464pass/1skip. Final reviewed beta2 export1003files/1004manifest members, archive
7566c1e9, matches that exact Git snapshot. Native/UI/images remain unchanged.

Main44111143311 completes all4required jobs SUCCESS. Beta2 tag44111143281
attempt1 has Linux/Windows/UI+actual nativeSDK SUCCESS; macOS134136759209 was
CANCELLED before acquiring any runner (runner0, steps[]). GitHub annotations
explicitly report hostedARM64 capacity/unassigned runner, not a compiler/test
failure. Dependent publisher skipped; release-by-tag404 at retry preflight.
Connector rerun returns403 (integration lacks Actionswrite), so reviewed temporary
branch ops/retry-mcp-beta2/f5e97e680143a829d613fd04a7b5f2617d62e2bd contains only a
one-purpose Actionswrite helper. Fresh exact run/job/sibling/tag/release-absence
guards precede one POST for the unassigned macOS job and dependent publication.
Helper44119538509/job134166784985 SUCCESS, actual POST201 retained in private
ops-helper-success.log. Its exact own branch is now deleted locally/remotely with
expected-tip lease; main/tag remained44fa099 during cleanup; helper/receipt are private.
No merge or application/tag change. Original release SHA/tag are unchanged. Paired retry DATA/UI
records classify this infrastructure action and its strict guards.

Actual tag run44111143281 attempt2 completes SUCCESS. macOS134166879302 passes
all tests, signed updater packaging and architecture/package checks. GitHub
represents the three reused green siblings with attempt2 job IDs134166881792
(Linux),134166979083(Windows),134166882898(UI), retaining original timestamps.
No repeat of those accepted jobs. Dependent publisher134179759374 succeeds,
verifies published application version0.9.6→0.10.0 and publishes release448882264 at16:13:40Z.
[Latest v0.10.0-beta.2](https://github.com/Malasuerte94/FBones/releases/tag/v0.10.0-beta.2)
is immutable44fa099/tag source, app0.10.0/runtime0.1.0-beta.1. Historical beta1
failure and attempt1 capacity cancellation remain preserved, never relabeled.

Independent root-run postrelease verification PASS:
`.local/mcp-postrelease-tools/results/verification-1/result.json` checks all16
uploaded assets against streamed SHA256/BLAKE2b and GitHub digests, all15aggregate
checksums, three exact-source/version/architecture reports, four cryptographic
updater signatures with signed filenames/app0.10.0 and five exact platform routes.
Actual public Latest endpoint returns the exact verified manifest. Source archive
matches all1003reviewed files+manifest and public Git commit/tree. Published runtime
matches all32members of the independent local prepack (55current runtime/domain
sources match). Large packages are streamed/discarded; retained small assets
3,474,029B. Existing frozen Node crypto verifier is reused; independent Rust crypto
is explicitly unperformed. Neither metadata/package verification nor Linux native
acceptance establishes0.10installed upgrades or Windows/macOS MCP gestures.

Final independent public UI/docs review passes: MCP-first contract and native
scope honest; all3screenshots visually inspected and exact hashes/links match.
Private result mcp-ui-delivery-audit-2026-11-17.md. Frozen read-only postrelease
verifier tooling.json a1b88f43 passed source/runtime/pin preflight; its root-run
receipt above is actual publication proof, not merely helper/CI acceptance.
All requested MCP implementation/docs/real-project captures/commit/push/release
work is complete within existing supported profiles. No new full Spine-parity,
platform-native installation/gesture or deferred final10% claim.

Prior protected user normal164d057d executable was preserved at immutable
`.local/mcp-2026-11-17/builds/<sha>/FBones`; its ownership receipt is updated. Own
acceptance processes all have retained terminal receipts; do not operate user
windows. Normal current-source0.10 build8f00 is now handed to user as own210243/
start2423656, separate profile, renderer=webgl, protected immutable executable;
normal-0.10-launch.json binds it. No availability failure or OS-gesture claim.
Continuation cleanup removes325,825,737logical bytes (118completed own
Nov17 headless workspaces, obsolete own0.9.6test binary/depfile, superseded exported
source directories, terminal ops-helper Python cache and superseded docs review). Compressed cited source snapshots, final beta2 export/Git
clone, exact source/art, raw successful+negative evidence and current builds remain.
No preexisting workspace or selected/mapped app removed. Private X92 had0windows
and its retained own provider handle was stopped (exit143); no global display or
user window operation. Final Linux~815GiB/hostG~3.6GiB; no physical recovery claim. Private Xvfb92 is now stopped; extracted local tools (~6.5MiB) remain
needed for any CI reproduction; installed pinned SDK is retained for reproduction.
Earlier cleanup234,303,008B plus agent-owned24,014,436B npm scratch and42,808,901B
isolated diagnostic target retain their scopes. Final remeasure: Linux815GiB,
hostG3.6GiB; no physical-recovery attribution. Total scoped cleanup626,952,082
logical bytes (~598MiB). No new large build/capture artifacts during publication.
Mixed shared target/debug/deps (~9.5GiB) and uncertain old native variants
(~1.074GiB) remain; ownership/relevance prevents blind deletion. Cited snapshots,
current deliveries and accepted/negative evidence remain.
No original operation, global package/settings change or physical-recovery claim.

Next: F313 is complete. Continue the next unclosed roadmap slice toward90%,
retaining explicit final100% fidelity/platform-native gaps; no accepted native or
original reruns without relevant product changes. Protect the0.10 handed-over
window. Preserve immutable44fa099/tag release source, beta1 failures, retry and
publication/asset receipts. Current operator checkpoint records the actual
published result. Documentation-only main follow-up records this closeout and
retry gates; product files, immutable release tag and assets remain unchanged.
Preserve accepted90% Physics/Match/native-upgrade evidence; no old probes resumed.
[Task](tasks/F313-mcp.md), [AI guide](MCP.md), [acceptance checklist](research/MCP-ACCEPTANCE-CHECKLIST-2026-11-17.md).

## Active goal and priorities

Latest user steering establishes a general **90% usable delivery milestone**.
Complete and verify the core, track the remaining fidelity/edge cases and proceed;
return to the final10% in the final100% pass. This is an agreed planning milestone,
not a measured percentage of reference compatibility. Integrity/persistence guards
and evidence limits remain mandatory. Skins remain at the end.

Physics F307 and both Transform Match actions F308 are now **READY90** by explicit
user acceptance. Existing phase/precision/Additive/Physics/suffix limitations and
the failed separate Save-only probe remain recorded below and in final-pass task
rows. No further Physics/Match reference work is active at this milestone.

The requested closeout is complete at the agreed90% milestone. Actual stock
0.9.5→0.9.6 is accepted on Debian/AppImage (full native project flows), macOS
ARM64 (clean upgrade/Current panel/fresh startup) and Windows x64 (clean upgrade,
exact installed native/registry plus bundled footer/fresh startup). All three
native app stages exit0 on both remaining platforms; Windows also proves the
actual inherited installer exit0. Disk checks preserve the same own binary.
Windows automatic/fresh Current-panel gestures and Windows/macOS native project
Open/reopen/New/edit/dirtyCancel/Save remain final100%; startup/disk checks are
never labeled project persistence. Three agents supplied DATA/UI/tooling reviews;
root alone operated shared CI/native cases. No original Physics/Match probe was
resumed. Release0.9.6 and the selected0.9.5 local delivery stay immutable.

## Current work — PSD import READY90

Latest user steering after the completed closeout requests Photoshop PSD import
preserving layer positions and stacking order. [F312](tasks/F312-psd-import.md)
is delivered as a usable90 **source feature**: File → Import PSD in editable
Setup stages all raster layers as one contiguous slot/Region block, preserving
signed/half-pixel positions relative to one canvas center at the destination
bone's local origin, bottom-to-top order, opacity and hidden inventory. One
successful import is one revision and Undo/Redo; source PSDs are never written.
Native cache/ID/history/encoder guards stay atomic, and existing PNG-resource
Save/Close/Open preserves exact imported bytes in the ordinary binary project.

Three agents supplied the preimplementation [DATA](research/PSD-IMPORT-DATA-GATE-2026-11-11.md),
[UI](research/PSD-IMPORT-UI-GATE-2026-11-11.md) and
[parser](research/PSD-IMPORT-PARSER-AUDIT-2026-11-11.md) findings, then distinct
frontend/parser/Session implementations. The coordinator owned integration and
shared tests. There is no measured exact4.3.26 PSD gesture: this is an explicit
FBones import policy, not Photoshop/Spine PSD compositing parity. No original
Physics/Match or completed native-upgrade batch was repeated.

The supported profile is flat PSDv1 RGB8 Normal raster layers, RAW/PackBits and
straight transparency, within declared input/layer/cache budgets. Groups,
masks/effects/text/smart objects/adjustments, ZIP/PSB, embedded ICC and nonempty
global DisplayInfo1007/1077 are refused. The last refusal is conservative: Adobe
documents global Spot preview effects, but the kind layout is not inferred; no
actual original Spot observation was collected. Some benign modern metadata is
also refused. External Images roots require portable Save As. Explicit nonempty
animated draw-order keys retain their existing structural-edit rejection; no
Animate data is cleared or lost to make the import succeed.

Verification: the final complete125-case production-CSP Chromium/real-Rust suite
passes after the resource-safety refusal and lint cleanup, including PSD overlap
pixels and binary Save/Close/Open plus retained Animate/Physics/Match regressions.
Final364 native e2e-feature tests pass/2 existing ignored; the focused PSD UI
run also passes after rebuilding both the frontend and real Rust host. JavaScript451 pass/one existing Physics skip; legacy102 pass/one existing
ignored; format16 default/103 Scene pass. Default desktop357 passed before the
extra resource-refusal test; the final e2e-feature suite is a superset. Typechecks,
production web build, Rust check, strict all-target Clippy and rustfmt are included
in the current local verification. Private logs/JSON/own PSD inputs and accepted
binary/PNG/pixel outputs are retained in `.local/psd-import-2026-11-11/`.

Final normal Linux source build37a5ce50 starts with renderer=webgl in a viewable
owned GTK/X11 window277245/startTicks3156774/window0xa00003. It is handed to the
user and protected; the earlier80592821 working window270527 also remains
protected rather than being closed or overwritten. The final active executable
is retained in RAM-backed storage so no second large disk copy is needed. Its startup is not a PSD OS-picker gesture. Native GTK/Windows/
macOS PSD-picker gestures, new three-platform installer builds and publication
are separate next delivery checks. The selected Windows image and published
v0.9.6 remain unchanged; **published0.9.6 does not contain PSD import**. Broader
PSD/group/compositing fidelity returns in the final pass; skins remain last.

## Current release publication

Published GitHub Latest is now v0.9.6-beta.1/application0.9.6, runtime remains
0.1.0-beta.1. The immutable release tag/archive bind commit
cfc60a45b5d73e25f35125f5353da56ff9027236. Release 439062261 is independently
verified: tag 42608780250 and main 42608780414 pass their required jobs, including
three platform builds and 123 hosted Ubuntu UI cases/runtime gates.
All 16 uploaded asset digests/15 aggregate checksums, four updater payload
signatures/authenticated versions and five exact bundle routes pass. Source
archive equality covers 739 reviewed files plus its manifest;
runtime archive equality covers 32 files. No original/private
assets are included. The [release notes](releases/v0.9.6-beta.1.md) retain the
verification scope and limits.

The follow-up integrates QA tools, scoped acceptance findings and the90% policy;
product source files are unchanged against the immutable release. No release tag
or asset is rebuilt/replaced. Prior local Windows QA/selection still belongs to
0.9.5 image54e27667, never relabeled0.9.6. Installed-upgrade acceptance is now
closed at90%: Debian42679060912, AppImage43001332547, macOS43015214283 and
Windows43022013711. Their different native project/current-panel scopes are
retained below. Physics moving-parent phase, World shear precision and broader
compatibility remain explicitly deferred/open for final100%.

## Current GitHub Actions health

User-requested audit2026-11-11: fresh [normal main CI43026304209](https://github.com/Malasuerte94/FBones/actions/runs/43026304209)
on51b38f7dbc9617ccd8aa61c7edad004e7927dc7d passes all four check jobs:
Windows x64, Linux x64, universal macOS builds/package structures and Ubuntu
UI/README/runtime checks. All123 UI cases pass (7.5minutes); release publishing
is correctly skipped for this branch/manual run. Current main needed no code fix.
The former `[skip ci]` final documentation commit is now explicitly verified by
workflow_dispatch; no accepted native/original case was repeated.

The complete initial list contained58 runs:20success/35failure/3cancelled.
Failed historical runs remain historical; the latest four actual native-upgrade
profiles pass as recorded above. The newest former Desktop failure42508880037
was Sequence Graph Undo (expected index2, observed1), corrected later by4033a83
and covered by subsequent green runs, including this one. Two old research
workflow heads still show failure: Windows Legacy Press42679065767 and macOS
New/Save43007410715. Their unresolved interaction/observation limits stay consumed
or final100%, not falsely called repaired by clean90. No history deletion,
continue-on-error, global setting or workflow-name cosmetic change was used.
Private audit receipts are in `.local/ci-health-2026-11-11/`. Only56KiB of required audit JSON receipts were retained; this read-only audit created no disposable cache/build/package artifacts and reclaimed0additional bytes. Host G: remains1,470,742,528B free; no local product/native build ran. This audit changed
no product/workflow source or public main commit; current51b38f7 retains its
actual green checks. These continuation-note edits are local to this workspace.

## New exact4.3.26 observations

Paired [DATA](research/PHYSICS-MATCH-STABILIZATION-DATA-GATE-2026-11-08.md)/
[UI](research/PHYSICS-TRANSFORM-STABILIZATION-UI-GATE-2026-11-08.md) audits first
reused accepted evidence. The existing four-bone/three-Transform canonical source
2d78523c was reused without repeating its original Save. Two independent fresh
forks then received exactly ONE Match and ONE Save each:

- [Offset DATA](research/TRANSFORM-MATCH-SUFFIX-OFFSET-RESULT-2026-11-08.md)/
  [UI](research/TRANSFORM-MATCH-SUFFIX-OFFSET-UI-RESULT-2026-11-09.md): original
  X=-930 versus old prefix20, full-frame-934.5, hybrid15.5 or authored57.
  All six Offset bits match all-except-selected/first ordered target exactly.
  Before2d78523c; afterd2df4adf.32authored bone-channel bits, both drivers,
  primary unrelated fields and72nullable cells are preserved.
- [Properties DATA](research/TRANSFORM-MATCH-SUFFIX-PROPERTIES-RESULT-2026-11-08.md)/
  [UI](research/TRANSFORM-MATCH-SUFFIX-PROPERTIES-UI-RESULT-2026-11-09.md): original
  FromX989..990/ToX70..71; all24endpoints+24runtime scalars match the same model
  bit-exact, independently from Offset. Before2d78523c; aftere71757f1. All six
  offsets, bone fields, other constraints, flags, mixes and references remain.

These observations falsify the old uniform prefix policy for this Local/Local,
nonadditive graph. They do not establish proprietary scheduling or general
World/additive/Physics/rounding parity. The correction must retain full scene
validation/layout/Physics indices and skip only the selected Transform in a
scratch evaluation, without publishing/advancing cached Physics or its clock.

Both owned original instances closed normally with bound retained-handle exit0:
Offset92376/start2026-11-08T21:56:43.2409149Z and
Properties99036/start2026-11-08T22:05:03.8751852Z. These are closed historical
identities, never reusable authorization. Private raw captures, saved stages,
classifiers, gates and terminal receipts remain under
.local/research/stabilization-2026-11-08/{suffix-offset-1,suffix-properties-1}.
No personal original/project/window was operated. Current process isolation is
always rechecked rather than inferred from these receipts.

The new [active Local/World Offset DATA result](research/TRANSFORM-MATCH-ACTIVE-LOCAL-WORLD-OFFSET-RESULT-2026-11-09.md)/
[UI result](research/TRANSFORM-MATCH-ACTIVE-LOCAL-WORLD-UI-RESULT-2026-11-09.md)
changes only primary targetLocal true→false in the accepted four-bone/two-
constraint own recipe. One NEW canonical Save423bf317→60741ccb precedes one
independent Offset Match+Save60741ccb→258c48f9; no accepted zero-mix/LL/suffix
batch repeated. Frozen23-input checker selects first ordered target and the
selected-excluded/prefix equivalence group: X=-123.1509628296 versus authored
-86.15096 or complete-frame-56.07548. All32bone bits, complete driver, unrelated
primary fields, order and48nulls remain exact. Five frozen f64 fields match bits;
shear differs0.00006103515625 under unchanged0.0005 classification bound.
Current Rust-formula translation also matches five fields but shear differs
0.00006866455078125/9ULPs; that translation is not native execution. No rounding
fit or math change follows. The graph has no suffix/Physics: it cannot establish
World suffix scheduling, Properties or general-space parity. Both new owned
originals85528/start10:41:08.0504102Z and85828/start10:43:18.9149080Z close
normally with retained exit0/unchanged gates/source. Raw current captures,
before/after/proofs/terminals remain in the ignored active-local-world-ui-v1 run;
local aggregate checkpoint `analysis/transform-match-active-local-world-check.json`
(private/ignored; the linked public DATA/UI findings carry the sanitized result)
and sanitized own semantic reference retain reproducibility without raw binaries.

## Product integration and current verification

Both native Match sections now use full ordered selected exclusion. The entire
scene remains validated with unchanged indexed scratch Physics, exact authored
values, None/Pose, stale/singular rejection, cache nonpublication and one history
action. Own6Offset/48Properties fixtures and regressions are integrated.

Both Match buttons and explicit-ID workspace actions share a six-lane finite
0..1 capability guard after pending-field flush. A visible EN/RO reason explains
extended mixes; extended authored values remain exact/editable/savable. Hidden
lanes and dedicated-view identity are tested. Animate accessibility descriptions
reference visible Setup reasons only.

Retained product integration checks:443JavaScript pass/oneexistingPhysics skip,343desktopnative/
2existingignored,102legacy/1existingignored,16defaultformat/103Sceneformat,
strictClippy/check/rustfmt, finalwebbuild and realRusthost pass. Runtime16package/
24nativeexport samples pass. Focused21/21UI passes, including exact saved Match
bits and live/Off/lease/history/native-session binary SaveCloseOpen. Independent
raw UI-before/after projections match both actual original graphs exactly;
reports ui-{offset,properties}-independent-data.json remain under the current
private run folder.

ONE newly UI-encoded Properties sourcee368fee8 now also passed original4.3.26
CLI53180/start2026-11-08T22:18:47.7462282Z, observed terminalexit0/Complete,
bounded completed streams and unchanged source/copy. Independent90numeric/
reference checks pass (61explicit/29labeleddefaults, max1.19e-7 under unchanged
5.1e-6);10sparse unmappedMix omissions remain unrepresented. Raw48scalar proof
is separate from runtimeJSON. Private original-ui-export and
ui-original-export-independent-data.json own that new single-source acceptance.

First fullUI run:122pass/1failure/0skip/retry. The failure compared f64frame29.88
against its f32key29.8799991607666 near the next frame30; correct interpolation
exceeded the test's fixed.0002 cross-time comparison by9.8e-6. Independent DATA/
UI reproduced native output exactly; no evaluator defect was established.
[Paired clock finding](research/ANIMATION-PHYSICS-TEST-CLOCK-GATE-2026-11-09.md)
precedes a deterministic pause-before-Play/fixed250ms test-clock correction.
All numeric bounds/epoch/history/nonbake assertions remain; focused3/3 passes.
The final full123-case run passes123/123 with zero failure/skip/flaky/retry
in244.913seconds. Its final JSON/log remain in the current private run. First
failed trace/context/results are retained in ui-full-first-artifacts and ui-full-first-results.json, not
shared Playwright output that subsequent runs replace.

## Accepted local Windows stabilization build

Current immutable0.9.5 image is
54e27667a55738fbbb524488b2a238010c6d2a5c7b2ff91788677314a8c80503 under
WINDOWS_TEST/builds. The shared manifest/current pointer now select it through
the unchanged stable root bootstrap. It is a local working-copy delivery, not
a new public release or commit claim. The retained255-file product snapshot belongs to that0.9.5 image;
release-only version/visible-label metadata now differ from the working tree; digest42c5b169fb0073f30c07fa26ae7e786c16cfc603a6d607c41aad013370749379.

Final own Windows QA passes6/6 groups: native OS Open, both independent Match
branches with exact6+48scalars and UndoRedo, native SaveAs/CloseOpen, extended
Mix flush/guard/persistence and explicit normalization/invaliddraft/Escape.
Seven native dialogs have exact filename native+UIA readback before one post,
then actual path/raw binary checks. Independent DATA verifies all saved graphs
against actual original outputs and unchanged authored bones/drivers; normalized
final save is byte-identical to the Properties save. UI review independently
confirms the receipts/DOM assertions and screenshots. Own QA30068/start
2026-11-08T22:43:38.5738007Z closed normally/clean, no forced termination.
Its identity is historical, never authorization for another process. Raw reports
live in windows-qa-v2/{resume-result,closed}.json and
windows-final-independent-data.json in the current private run.

Earlier QA and initial V2 Open failures remain separately passed:false. The
first helper selected an ambiguous filename Edit without readback and saved
only OUR generated input at its source path. Its modified file was archived;
only after normal close was that copy restored from unchanged own source.spine.
A data-free dialog toy proved a unique modern Save filename binding/readback.
V2 then discovered a distinct classic Open shape before any input. Reviewed
Open-only1148/label1090 support resumed that pending dialog once; modern Save
keeps its FileNameControlHost1001 path. No completed Match or frozen baseline
was replayed. No product SaveAs defect was established; these were harness
corrections with failed evidence preserved. The two own temporary QA profiles
are removed after normal-close and fresh image/profile inactivity checks.

Native evidence is targeted own WebView2 plus actual OS pickers/lifecycle,
not physical global-mouse routing, original gesture parity, Physics phase,
macOS or installed-app upgrade. Existing protected user53988/image94293013 and
all other personal/mascot/editor windows remain untouched. The old immutable
image/manifest are preserved.

## Current F307 reference limits

The accepted37static/990dynamic original observations remain unchanged.
Moving-parent/export residuals remain3.35184/2.24952step and1.26276ramp. No solver,
clock, numeric-bound or fitted phase change is justified. The missing datum is
actual parentX at Physics entry plus reset/update/Pose/delta/remainder and output
emission around13/60 versus the90Hz event. Existing grids/PNG oracles were not
repeated; earlier JVMTI/VMStruct/hardware-breakpoint negatives remain valid.

[Own passive-memory V4](research/PHYSICS-OWN-MEMORY-CAPABILITY-RESULT-2026-11-09.md)
proved two exact1764B naturally retained own class copies, complete421,531,648B/
419region collection in266ms with zero read errors, requested64/reported128MiB,
normal hold/Destroy/child/controller0. Static framing38groups/all1764truncation
cuts and13 Windows ABI vectors pass. This is not editor class/method recovery.

[ONE original seed scan](research/PHYSICS-ORIGINAL-SEED-METADATA-RESULT-2026-11-09.md)
is consumed:0seeds,76generated-class metadata/13unique, partial452MB of1.346GB/
76read errors. Normal own original close0/source93pins pass, but strict15002ms
versus15000ms remains FAILED. No absence/provenance/caller claim or rerun.

[Own file metadata](research/PHYSICS-OWN-FILE-METADATA-RESULT-2026-11-09.md)
retains name-only negative; [attribute-only duplicate](research/PHYSICS-PSS-DUPLICATE-OWN-FILE-GATE-2026-11-09.md)
proves one exact own DISK/path/fileID/localclose/normal0 in15ms. Resource-utility
audit then STOPPED the proposed original PSS lane: no identified previously
uninventoried class/archive resource would change inspection. No original PSS
scenario is justified. Static launcher field decode supplies only String[] args;
its package remains known non-ZIP, with compression/encryption unknown.

[New metadata-only own debugger result](research/PHYSICS-OWN-DEBUG-TRANSPORT-RESULT-2026-11-09.md)
also STOPPED: strict initial-break predicate fails (actual ntdllRVA125245 versus
export126ae0), controller7. All seven unchanged V4 host markers/main/20sHold/
Destroy0/debug+retained child0 nevertheless occur in22,047ms/49events/13,833B,
no second chance/force/timeout. No address fit, retry, DefineClass followup,
original operation or product change. Final offline audit identifies no next
provider with an expected useful caller datum. Keep F307 ACTIVE and the fidelity
gap open; independent native installation/Match work continues.

## Current additional F308 observations

[Active Local-source/World-target Properties](research/TRANSFORM-MATCH-ACTIVE-LOCAL-WORLD-PROPERTIES-RESULT-2026-11-09.md)
plus [UI](research/TRANSFORM-MATCH-ACTIVE-LOCAL-WORLD-PROPERTIES-UI-RESULT-2026-11-09.md)
now independently classify first-target/all-except-selected:60741ccb790B→
d785a510912B. One Match+Save,32bonebits/full driver/six global offsets/unrelated
fields/order preserved,24driver cells remainnull/24selected materialize. Frozen
accepted-space-separability matches48bits; independent f64/f32 formula vectors
remain31/48 and27/48 exact. Own58404/start15:09:12.8253090Z closes normally with
retained0. One premature capture failed closed/noinput and remains recorded.

Cached0.9.5 Session first opens original607inspection-only and stops before any
edit/3requests/EOF0. Fresh editable own423recipe, typed-equal to607, then passes
oneProperties/oneUndoRedo/SaveCloseOpen/15requests/EOF0. Raw846B690290e6 equals
all48 DTO bits;31/48 original bits exact, max1.52587890625e-5 under unchanged
0.0005. Native source/format preservation passes. Original607editability, new
build/current0.9.6GUI or fresh original CLI acceptance are not claimed.

[New active World-source/Local-target Offset](research/TRANSFORM-MATCH-ACTIVE-WORLD-LOCAL-OFFSET-RESULT-2026-11-09.md)
uses direct independently encoded own9a9ac5ee740B, one flag from accepted14743c0e,
no canonical Save. One Offset+Save produces1a334dc5805B and uniquely classifies
selected-excluded/firstTarget across18frozen lanes at unchanged0.0005.32bone bits/
modeled graph/48nulls preserved; UUID/type tags/group/source-state metadata also
normalize during Match+Save, with no invented causal split or all-raw-fields
unchanged claim. Own81388/start16:25:29.6255571Z/HWND8266414 closes normally with
retained0 at16:35:07.7144178Z. This consumed action is never repeated.

[Cached native comparison](research/TRANSFORM-MATCH-ACTIVE-WORLD-LOCAL-OFFSET-NATIVE-RESULT-2026-11-09.md)
passes15requests/oneUndoRedo/SaveCloseOpen/EOF0 on the supported own9a9 input;
rawcc1cfa29 equals all6DTO bits, source/driver/unrelated fields/48nulls preserved.
4/6 original bits exact; Y7.62939453125e-6 and shear0.00045013427734375 remain
within unchanged0.0005. Both cached cases reuse0e694ce7 binary/file-level83dep
chain:78historical source and2preparation-only resources unchanged,3strictly
version-only TOML/JSON differences0.9.5→0.9.6. No embedded/new-build attestation.
No arithmetic formula or tolerance changed. Broader Properties/World suffix/
additive/Physics/manual behavior and exact precision remain open.

## Previously accepted delivery and profile boundaries

Previous public0.9.5-beta.2/1913f20e retains its earlier acceptance evidence;
current0.9.6 publication is recorded above. All120hosted/localUI,442JS+oneknownskip,340native/twoignored,
102legacy/oneignored,16default/103Sceneformat,7research and runtime16+24samples
belong to that delivery. Full signature/16asset/source/runtime verification,
release438536371 and CI42524571053/42524571125 are retained in
[its checkpoint](../analysis/constraint-updater-check.json).

Shared WINDOWS_TEST now selects immutable54e27667. Protected user53988's
older normal startup still belongs to94293013. Never automate/close that window,
its bootstrap transport or any other protected personal/mascot/editor window.
Read relevant .local/*user-process*.json ledgers and recheck current identity
before any own process operation.

The current runtime remains independent MIT0.1.0-beta.1, published40,803-byte/
32file archive SHA5f8e171bff34384e7219e8adfe345ea49e92632962bf1965b95b644d49954544.
Game JSON export is separate from binary .fbones; mixing/directbinary/npm/full
parity are open. Debian installed0.9.5→0.9.6 upgrade/persistence now passes;
AppImage full upgrade and Windows/macOS clean90 are also accepted. Native
Windows/macOS project Open/reopen and publisher signing/notarization
remain in the final100% plan.

Real-source profile remains4editable/4guarded plus editable mascot125bones/
24slots/22PNGs/2clips/79constraints, all223769source payload bytes independently
regenerated. Fresh original acceptance for that broader mascot remains pending;
[mascot checkpoint](../analysis/mascot-support-check.json) owns its limits.
B/E reversing curves, nondefault inheritance, F capacity/curves and G Path/other
records stay guarded. Full canonical equality and unknown-record preservation
remain mandatory; no source gets admitted by deleting unsupported data.

New independent active World/Local **Properties** also completes one original
observation: direct9a9a740B→42912aff926B, own83396/start17:20:49.1774414Z/
HWND5770712, one lower Properties Match plus one Save, dirty→clean and retained
normalexit0 at17:24:51. Original findings use new DATA/UI companions; no previous
Offset/canonical batch repeated. Frozen22lane/.0005 classifier uniquely selects
selected-excluded/first target; FromX−55.2231216431..−54.2230987549→To70..71.
All48 endpoint/runtime relations are internally bit-exact;32authoredbone bits,
driver/offsets/order and nullable transition preserve modeled semantics. Fixed
f64 model27/48exact/max4.57763671875e−5; accepted-Properties separability44/48/
max2.288818359375e−5. World arithmetic/span precision stays open, no formula fit.
Independent raw/lifecycle audit records raw metadata normalization during
Match+Save without isolating its cause.
ONE cached real Session case now passes15JSONL/None epoch/oneUndoRedo/SaveCloseOpen/
EOF0/empty stderr:27/48exact/max4.57763671875e−5 under unchanged.0005. Saved
65f213fc has all48raw f32bits equal itsDTO and modeled authoring/driver/offset/
nullable state preserved; original0ad remains immutable. This reuses the pinned
0.9.5binary/83depchain, not a fresh0.9.6/nativeGUI/encoding-compatibility claim.
[Original](research/TRANSFORM-MATCH-ACTIVE-WORLD-LOCAL-PROPERTIES-RESULT-2026-11-09.md),
[UI](research/TRANSFORM-MATCH-ACTIVE-WORLD-LOCAL-PROPERTIES-UI-RESULT-2026-11-09.md)
and [native companion](research/TRANSFORM-MATCH-ACTIVE-WORLD-LOCAL-PROPERTIES-NATIVE-RESULT-2026-11-09.md) retain the bounds. DATAfreezec429815f/toolingdd429620/
classifier8a6f25b3 and actual raw stages remain private.

New independent World/World branches also complete from own741B64451233, both
Localflagsfalse, same4bones/2constraints/X50/orderedtargets; no oldcanonicalSave.
[Offset](research/TRANSFORM-MATCH-ACTIVE-WORLD-WORLD-OFFSET-RESULT-2026-11-09.md):
oneupperMatch+Save→804B60f82258, own27984/start18:12:45.9881611Z closes with retained0
at18:28:49.8953982Z. Frozen22model classifier honestly UNCLASSIFIED37b6c254 because
its predictions omitted the **already implemented** inverse-source world-point
branch. Separate retrospective source-backed check matches newXY exactly and
oldzeroMixXY within8e−6; no product correction or refittedbound follows. Original
6values preserve graph/32bits/driver/48nulls; Shear gap remains.0004806519.
[Properties](research/TRANSFORM-MATCH-ACTIVE-WORLD-WORLD-PROPERTIES-RESULT-2026-11-09.md):
independent one lowerMatch+Save→948Bdc1ae590, own21320/start18:32:48.7950865Z/
HWND722486/retained0 at18:41:56.7736918Z. Frozen26models uniquely selected-excluded/
firsttarget;48 internalendpoint/runtime relations exact, best predeclaredanchor
44/48/max2.2888e−5; raw32bone/6offset/driver24null+primary24present preserved.
Data2c417019/51pins and driver76e656ca/14+4 remain immutable. Both new cached
comparisons now pass15requests/None epoch/oneUndoRedo/SaveCloseOpen/EOF0 with
independent saved-raw==DTO preservation. Offset2/6exact/max0.00048828125,
Properties11/48exact/max0.0000457763671875; bound0.0005 stays unchanged. Saved
b8f522bc752B and6a7955b9869B reuse cached0.9.5/83dependency provenance; no fresh
build/nativeGUI/exactparity claim. The [separate native companion](research/TRANSFORM-MATCH-ACTIVE-WORLD-WORLD-NATIVE-RESULT-2026-11-09.md)
preserves original classifier limits and all immutable original documents.

The [Save-only precision experiment](research/TRANSFORM-MATCH-SAVE-ONLY-DATA-NEGATIVE-RESULT-2026-11-09.md)
is **negative**, not a serialization observation. Root misread resized capture
coordinates and posted156,14 to actual2560×1439: [Open Project appeared](research/TRANSFORM-MATCH-SAVE-ONLY-UI-NEGATIVE-RESULT-2026-11-09.md),
not Save. Both853B65f213fc/mtime remain equal; no Save/no-op/normalization claim
or arithmetic fit follows. ONE attempted input only, no dialog recovery/retry.
Separate reviewed lifecycle cleanup used one main-owned WM_CLOSE, retaining
62568/start18:59:38.2618215Z/exit0 at19:04:53.1066351Z and unchanged source/gate.
The consumed terminal proves closure of that own experiment; a fresh process
preflight remains mandatory for every future launch. Before a future fresh
precision case, inspect original-resolution pixels and bind capture dimensions
to intended control; retain the failed route and do not replay it unchanged.

## Current native installation work

Reviewed tools, scoped acceptance findings and the90% policy were prepared on
QA branch work/native-install-upgrade-0.9.6. Product Rust/Vue/runtime sources
remain unchanged against the original main baseline1888c2a; release439062261/tagcfc60a4 and its immutable
packages are unchanged. Root alone operates hosted native VMs, never a personal
installation or protected local editor. Current ignored closeout receipts are
under `.local/native-upgrade-closeout-2026-11-11/`.

- [Debian full upgrade](research/NATIVE-LINUX-DEBIAN-UPGRADE-AND-PERSISTENCE-V6-RESULT-2026-11-09.md) passes42679060912/b1c8549: actual signedReady, dirtyInstallCancel/nativeSave, old3166/automatic3442/fresh3571 all actualnormal0. Newnative memberd27601e1/current0.9.6 and onlythen separate same-file native GTKTable Open/Upgrade root/X37.5/clean/unchanged binary pass. Immediate creator and automatic project restoration are not claimed.
- [AppImage full upgrade](research/NATIVE-APPIMAGE-UPGRADE-AND-PERSISTENCE-RESULT-2026-11-11.md) passes43001332547/ea3510e: actual FUSE outer435195ee/member2c6800aa, dirtyCancel/Save, old3246/automatic3575/fresh3721 all actualnormal0, current0.9.6 and separate same-file native GTKTable Open/semantics/unchanged404B checkpoint. No extract-and-run fallback. Independent DATA5c9c82fb/UI12400d9b pass.
- [macOS clean-upgrade90](research/NATIVE-MACOS-CLEAN-UPGRADE-90-RESULT-2026-11-11.md) passes43015214283/05ce6f1 on ARM64: exact stock0.9.5/current+signedReady, one Install, retainedold2281/1794397866.970383 normal0. Unique own-bundle NSWorkspace automatic2426/1794397875.189430 matches premeasured updater nativeacdc0088/26,357,856B, freshly parsed Info0.9.6 and actualCurrent0.9.6. Successful actual typed SDK kqueue registration precedes one normal close/eventnormal0. Onlythen fresh2442/1794397879.075083 has direct WebGL readiness/current0.9.6/retainednormal0. Five strict405B/e74 CRC/fulltyped disk checkpoints match; finalfile was not separately uploaded, so final identity is runner-receipt based. DATA96e6ddc5/UI26c40fe3 independently verify45 consumed pins/52 raw files. Project Open/reopen/persistence explicitlyfalse; no immediate-parent/automaticWebGL-log/Intel/publisher-notarization claim.
- [Windows clean-upgrade90](research/NATIVE-WINDOWS-CLEAN-UPGRADE-90-RESULT-2026-11-11.md) passes43022013711/65c74bb: one exact owned SDK Install invocation returns successfully after305-node preflight. Retainedold8268/start134388743051709820, genuine inherited installer5932/start134388743179306030, automatic6984/start134388743212299612 and onlythen fresh5836/start134388743268374049 all have actualexit0. Installerf01215f3/newnativef8d709b8/16,827,904B/file identity/registry0.9.6 match independent premeasurement. Two prior exact default EBWebView absence receipts plus live kernel/parent/Job chains qualify the automatic normal profile; old/fresh use private profiles. Complete owned auto289/fresh122-node UIA trees show the exact bundled Version0.9.6 Text under editor-status; this literal UI label is corroboration, not a live Current-version API. Fresh direct WebGL and strict unchanged405B/e74 CRC/typed disk checkpoint pass. DATAaf7c8478/UIa6e32f87 independently verify29 consumed pins/57 raw files and join the sole public result. Windows automatic/fresh Current-panel, project Open/reopen/persistence explicitlyfalse. Auxiliary WebView entries without observed terminal are not declared normally closed; native app/installer terminals are proven. Earlier parser/startup/SDK/physical-hit/profile failures remain consumed evidence, not active work.


The coordinator applies the user's general90% milestone through the paired
[clean-upgrade DATA policy](research/NATIVE-WINDOWS-MACOS-CLEAN-UPGRADE-90-DATA-GATE-2026-11-11.md)/[UI policy](research/NATIVE-UPGRADE-90-STARTUP-AND-DISK-UI-GATE-2026-11-11.md).
Windows/macOS native project Open/reopen/New/edit/dirtyCancel/Save UX and
Windows automatic/fresh Current-panel interactions belong to final100%; fresh startup plus disk hash/parse is never labeled native project
persistence. Debian/AppImage retain their stronger accepted scope. Mac picker
v1–v4/New/Save and corev1–v3 negatives remain preserved, including Swift SDK
availability, one ineffective immediate numeric readback, initial AX startup
and a foreign layout splitter. No further picker/foreign-control exception,
Documents staging, keyboard provider or original Physics/Match work is active.
The [earlier capability result](research/NATIVE-INSTALL-UPGRADE-CAPABILITY-RESULT-2026-11-09.md)
retains consumed negative routes; do not repeat those unchanged.

## Cleanup, ownership and next reproducible action

All34 historical personal-process ledgers remain protected. They are notices,
not fresh liveness/ownership receipts: prior protected FBones85172/start
2026-11-09T11:39:53.7157359Z/image54e27667 and its transport5405/Linux
556534/556535/556847 are never closed/reused. Former personal Spine87668 and
Nov9 owned originals are historical/consumed identities; any future original
operation needs fresh ownership/absence guards, not that old manual-close gate.

The earlier upgrade/CI closeout changed no product sources and performed no
local product build or duplicate normal availability launch. All target apps
were dedicated hosted-VM copies; accepted native instances closed normally.
Local Windows operations were small C# type compilation/AST and a pure SDK parse
of retained command-line text, with no local app/window/provider operation.
No personal project/window input/save/close/attach or global input occurred.

The preceding Nov9 cleanup recovered16,883,658logicalbytes: disposable NSIS member copy,
own native-test audio/object/cache categories and a stale unpublished
991B checker receipt. Source packages/extractors/scripts/final manifests/raw
observations/failed diagnostics/saved native outputs remain. Nine uncertain old
native variants(~1.074GiB) remain because mapped-process evidence is incomplete;
debugdeps~7.6GiB mixed/reusable/incrementalempty. No fullcargo clean/user-data
removal/physical recovery claim. No new localCargo/frontend build or large
package download. Remote fixtures live only in ephemeral VMs.

Earlier closeout checks2026-11-11T13:22:32UTC: Linux available883,947,839,488B
(~823GiB); Ubuntu VHDX is on Windows G:, free1,470,742,528B,
VHDX224,114,245,632B nonsparse. Linux free space does not establish host safety.
The preceding closeout cleanup removed233,513logicalbytes:26,326B own generator/freeze caches,
9,482B obsolete helpers (six duplicate AST validators consolidated into one),
and197,705B new unpublished archive copies; private originals are preserved.
Required frozen tools/manifests/raw successes and useful negatives (~42MiB) stay
ignored for reproduction/final100%. No new local product/package/SDK/Cargo/
frontend build or large package download. No trim/shutdown/compaction/global
settings or physical-reclamation claim; retain uncertain old variants and mixed
reusable dependencies rather than deleting mapped/other-task artifacts.

Current PSD-session cleanup2026-11-11T17:07UTC removes12,066,436,398logical
bytes of own RAM-backed build cache (~11.24GiB),242 completed generated headless
workspaces/54,771,609B and106,870B of duplicate-ledger/unused-PNG/own Python cache
scratch. Original Cargo targets, original inputs, all preexisting workspaces and
personal files are preserved. The active final executable266,657,600B remains
in RAM-backed storage; its live profile and the earlier protected working-window
image266,691,608B/profile remain needed by user windows. No selected/mapped image
was removed. Eight accepted PSD input/semantic/binary/PNG/pixel files plus their
manifest and concise test logs/JSON remain ignored for reproduction. Uncertain
old native variants (~1.074GiB) and mixed reusable original debugdeps remain
retained as previously recorded. Final Linux free space is~823GiB; tmpfs has
~20GiB available with only the active executable retained. Host G: still has
1,470,742,528B free, VHDX224,114,245,632B nonsparse, actually rechecked17:07:43UTC.
No physical host-space recovery, trim, compaction or global setting change is claimed.

Next reproducible action: read F312 and its paired gates; export only the reviewed
source additions, run normal three-platform CI and targeted native PSD picker/
installer checks before publishing a higher application version. Never replace
existing0.9.6 release assets or selected/mapped Windows executables. The tested
PSD core is READY90; keep broader codecs/compositing and F307-final/F308-final/
F005-native-final deferred instead of automatically reopening accepted probes.
Preserve the complete F105 Animate scope and integration. Skins stay at the end.
Earlier native-upgrade receipts remain in `.local/native-install-upgrade-2026-11-09/`,
`.local/research/finish-three-2026-11-09/` and
`.local/native-upgrade-closeout-2026-11-11/`.
