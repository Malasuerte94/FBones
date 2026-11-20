# F302 — Logical, topology-aware weight distribution

## REA rework checkpoint — 2026-11-18

The board tracks this rework as `F302-auto-weights-rea`. Bind membership and
Auto remain distinct. The historical single-influence, selection isolation,
locked mass, undo and source-byte findings still govern authoring.

REA structural inspection `ev_362436b0184c9a04e930b9bda1ace174d34b418db1e198578bdd0904298b7777`
authenticated the owned historical Windows 4.3.26 before/after pair and its
runtime exports. Two rows with identical prior weight bits and opposite bind Y
end at different dominant bones: 91.03% bone1 and 76.88% bone2. The outputs
retain normalized rows and identical binding coordinates. The original export
also gives bone2 as the closest posed segment to both vertices, so a monotone
segment-distance-only ranking cannot account for the two winners. The
method-level Linux inspection remains open. The exact update blob is unresolved by the available native/static provider and
the retained Linux export has no qualifying Auto result. The Windows artifacts
retain their historical provenance.

The same edit command was replayed in the FBones Rust Session on private copies.
The three-influence input was the exact stock file. For the five scoped cases,
the native Session used the independently encoded equivalent baseline because
the stock editor metadata keeps those files inspection-only. The original
baseline comparison established equal authored bones, binding rows and surface
connectivity despite triangle order changes. Every replay preserves the copied
source bytes and binding positions. The largest absolute per-influence
differences are shown below.

| Case | Maximum absolute weight difference | Observation |
| --- | ---: | --- |
| Full Auto, three bones | 68.21 percentage points | Stock produces zero for two vertex/bone pairs that remain positive in FBones. |
| Vertex 0 only, all four candidates | 54.37 percentage points | Stock assigns B 100%, FBones 45.63%. Untouched vertex rows match. |
| Locked A, all other candidates | 32.12 percentage points | Every A weight retains its original bits. |
| B only, vertex 1 + B, locked B + selected B | 0 | Single-bone selection works at zero prior mass. The locked overlap is a stable revision no-op. |

The data show different support and distribution. A global pruning threshold,
the existing top-four limit and the exact locked-candidate normalization require
separate evidence. The next case is the six-vertex baseline with A locked, B+C
selected and D as an unlocked outside sentinel. Compare matched full/subset results
and acquire an independent asymmetric six-influence overlap case through a
qualified exact Linux provider before adjusting numerical behavior.

The historical paired UI capture shows feedback after the scope is applied.
The FBones panel now gives inline feedback for the acknowledged Setup command.
It distinguishes a one-revision edit from a no-op and clears feedback when
the scope, mode or project changes. The grouped Playwright cases verify success
and no-op feedback in the Weights viewport delivery below.
Private `auto-weights-rea-2026-11-18/` retains the FBones replay and the
REA receipt is under `auto-scope-data/`. The [vendor weights guide](https://en.esotericsoftware.com/spine-weights#Auto)
describes topology and scopes without a published numerical algorithm.

### Linux six-influence capacity and numerical prototype

The new own fixture has a six-vertex hull, two interior vertices and six
overlapping segments. Each of seven rows starts with six positive weights.
The eighth row starts with four, including two initialized dormant candidates.
Exact Linux 4.3.26 Professional exported the independently encoded input
with the authored counts `[6,6,6,6,6,6,6,4]` and exact authored weights.
REA authenticated the project and both output files through
`ev_4bc9e42e9752e62acdcf499b5ee86723ea5f44318c65ed90ca362a2313f9ccb6`.
FBones Auto authors four positives on every row in the same fixture. Exact
Linux re-exported that saved FBones output with all four positives and
maximum decimal weight loss below `4.8e-6`. This proves storage and export
capacity. The six-influence stock Auto result remains open.

The scoped FBones control starts from the unchanged input. H0 stays locked at
25% and 31.25%; H1/H2 take the corresponding 75% and 68.75% residuals. Both
dormant selected candidates at vertex 7 become positive. H3–H5 clear only
in the edited rows. Local coordinates, other rows, topology and input bytes
remain equal. Undo/Redo and Save/Reopen match the native snapshots. The
historical exact capture shows the numeric Influence control next to Prune.
The current guide documents Prune as a separate operation. The publisher
changelog places a Problems-warning limit in a later beta, so the historical
numeric control's effect and the exact 4.3.26 Auto cap remain open.
[Publisher changelog](https://esotericsoftware.com/spine-changelog#4.3.92-beta) ·
[Publisher explanation](https://esotericsoftware.com/forum/d/30466-title-please-add-a-global-default-setting-for-the-bone-influence-check)

Jacobson's dissertation impact statement identifies bounded biharmonic weights
as a historical Spine Auto method. The publisher also describes internal mesh
refinement in its historical workflow discussion. These sources motivate a
candidate family; they supply no exact 4.3.26 anchors, tessellation or parameters.
[Author's account](https://www.cs.columbia.edu/cg/pdfs/1459800467-breathing-life-into-shapes-computer-graphics-and-applications-alec-jacobson-2015.pdf) ·
[Publisher discussion](https://en.esotericsoftware.com/forum/d/5050-weights-and-bones-workflow-issues) ·
[Numerical method](https://doi.org/10.1145/2010324.1964973)

The independent prototype refines the surface, builds the cotangent finite
element Laplacian with lumped mass, then solves box-constrained biharmonic
energy per bone. It compares anchors snapped to the refined mesh with explicit
in-domain bone samples. With the same fixed eight-way refinement and inserted
anchors, all three measured cases converge.

| Stock case | Current maximum absolute error | Prototype maximum absolute error |
| --- | ---: | ---: |
| Full Auto, three bones | 68.21 pp | 63.68 pp |
| Vertex 0 only | 54.37 pp | <0.001 pp |
| Locked A | 32.12 pp | 4.87 pp |

The full three-bone case still has two incorrect dominant bones. The finer
inserted solve encounters degenerate faces in the four-bone fixture. The global
triangulation variant is bounded to the convex test surfaces. Production adoption
requires a constrained refinement that retains authored edges, stable segment
anchors, and a stronger held-out stock result. The original lock/selection
comparison remains independent of the numerical prototype. Private
`six-overlap/` and `biharmonic-comparison.json` retain the reproducible inputs,
the direct stock capacity witness and the candidate results.

### Constrained refinement and pose comparison

REA independently decoded the exact historical full-three pair in
`ev_4d817002fb748af58e61952c24b51b4b41a5409aabf2b828d02e48ebd6283b8d`.
The saved project retains the complete ordered triangle stream and all five
explicit edges through Auto, including the authored interior diagonal 1–3.
The original runtime JSON changes the order of its last two faces while
retaining the oriented face set. Project binding positions remain exact.
Projected through the authored Setup bones, each stored point's root and
child projections differ by 21.21 units. A pose-only Auto pair is needed
to distinguish the original solver's choice of geometry. This is historical
Windows provenance with the same exact editor version.

The private refinement inserts segment samples into each original face and
uses shared chains along real neighboring edges. Each authored face's area
and original edge incidence are checked. A control with identical posed
coordinates on two independent triangles retains two components and all six
edges. This establishes refinement isolation for that control. The rig and
authored triangles never change as part of the research solve.

The candidate compares current posed vertices and segments against a common
bind gauge inferred from the saved local coordinates. Crossed shape/segment
variants isolate the two inputs. Clipped segment anchors include intersections
with each original face boundary. With 16-way refinement and posed inputs,
the largest measured difference in the historical full-three case drops from
68.21 to 39.54 percentage points. The dominant bone agrees on four of five
vertices. Row 2 still favors bone1 by 2.55 pp in the candidate while the
stock result favors bone2 at 76.88%. The coherent bind-gauge variant has
61.98 pp maximum difference and three incorrect winners at the same
refinement. This favors the posed input for this prototype and leaves the
stock solver's input source open.

The scoped vertex-only result is within 0.001 pp in the same refinement.
For the locked-A case, the unclipped constrained run gives 2.90 pp maximum
error and converges. The clipped run gives 2.87 pp and two columns terminate
during line search. The scaled projected-gradient residual in that run is
`2.41e-8`. Report the nonconvergence independently of the weight error.
On the six-overlap control, the candidate produces five or six weights above
`1e-8` on three rows. The stock Auto output for that fixture remains open.

Private `probe-constrained.py` reproduces both reports with the system
SciPy. Its `--basis-sweep` mode runs the crossed shape/segment comparison;
the default runs clipped anchors and the overlap control. Next qualify the
pose-only exact Linux comparison or the held-out overlap Auto output and
bound convergence and work before a solver change. The delivered solver stays
at its accepted baseline while these findings are evaluated.

### Locked influence and convergence gate

REA independently decoded the owned historical Spine Professional 4.3.26
Windows locked-A pair in
`ev_ba938e431ef0c0b7769e2c14f89628f4ce65b38c2c0039752dd97c91be09620a`.
All six locked weight words and all 48 local binding coordinate words survive
Auto bit for bit. At each vertex the exact sum of the three saved editable
weights, rounded once to f32, equals f32 of one minus the locked weight.
The original accumulation order remains unknown. The editable output includes
five negative zeros, including one change from positive zero. At vertex 5 the
stock weight for B exceeds C by 0.71668 percentage points. The private
`rea-locked-a-f32-residual-gate.json` retains the words and arithmetic checks.

The same prototype geometry, anchors and bounded quadratic were solved with
factorized bounded least squares and sparse active-set polishing. The initial
128-step cap failed at a projected residual of `3.72e-5`. A cap of four steps
per free variable allowed all four cases to reach a residual below `1e-9` and a
first-order objective gap below `8.64e-10` per column. The historical full-three
and locked-A maximum differences remain 39.54 pp and 2.87 pp, with the same
different dominant bones at vertices 2 and 5. The two optimizer outputs differ
by at most 0.00315 pp across the historical comparisons. The one-vertex result
matches the saved reference. In the synthetic six-influence overlap, two to
four weights exceed `1e-8` per row with the refined solve. Earlier tiny masses
were sensitive to numerical termination. Stock Auto output is still needed
to infer the original support policy.

Private `probe-convergence.py` and `convergence-comparison.json` retain the
method and results. Run with `PYTHONNOUSERSITE=1 OPENBLAS_NUM_THREADS=1`
and `/usr/bin/python3`. The dense factorization and the 17–45 s private
comparison timings are research measurements. Product timing and the
production work bound remain open.

Before adopting a solver, measure the current release command on a Scene mesh
at the supported 1024-vertex and 128-influence limits. The synchronous
`edit_rig` command holds the Session mutex during the current solve. An owned
Linux native run should measure click-to-result and a native main-loop heartbeat
from a fresh weight state. The browser frame clock alone cannot measure stalls
in the GTK process. If the command exceeds the interaction budget, scope
computation to an immutable snapshot and validate revision and pose epoch at
the short commit, preserving one undo action.

### Native solver in exact Linux Spine

REA process evidence
`ev_d374176b908a4f9377b2a4ecc83a471383e6d70321b471c889a9f20a6b59de98`
identifies the editor-native ELF in an owned, no-input Spine Professional
4.3.26 Linux session. The ELF SHA-256 is
`eb36213ce39922c3557594fa52ad816b077bf1d7ad00df7ffb7ef6c761449a6f`.
REA export evidence
`ev_e235fb141c6ce6b2f5cf8d3df5fc1fbcb074d61290e3e52b599c5e3651ec52e9`
contains libigl `bbw` at `0xd65c0` and `active_set` at `0xd2f60`. The
REA assembly observation
`ev_796306c1883c8cbb7024ab3ffe650c91e612b0fc4859ad9d3bc66bc8d7427e37`
shows the native caller entering BBW via its linkage stub. The BBW routine
calls cotangent and mass matrix builders, quadratic precompute/solve with
fixed values, and the active-set solver. REA assembly evidence
`ev_5ba6793343d97a6f5edcfddb3c211933c5b773bce40430bdfa8f3bc2eac0dd86`
shows input floats widened to double and a call to `igl::boundary_conditions`
before BBW. REA sees a double sum across all solved influence columns per
vertex in `ev_5bfc52cda54479c909fd1a86f5eb3ba2899d7c67e2a38c708f8010facda48f8d`.
The native success path divides each weight by its row sum and writes f32
output in `ev_5971c906d7af76c4f3fdf612396223e5b9459a4f4e319cd6ea9303b76b849b65`.
The wrapper initializes BBWData with a zero byte, an integer 200 and three
double `1e-14` constants at the observed offsets. Their interpretations as
partition-unity, iteration budget and tolerances remain inferred from the
upstream layout. The exact embedded libigl revision remains open.

The headless same-version export observer did not see this native library
during its bounded window. The isolated no-input editor run mapped it and
its owned processes were reaped. The private receipt
`native-method/rea-stock-linux-bbw-dataflow.json` retains the complete result
and cleanup evidence. Next follow the native caller to the editor's registered
entry point with REA and determine which vertex and bone arrays that caller
supplies. The named Auto UI dispatch, exact source pose, bone sampling and
post-native output filtering remain open.
[Upstream implementation](https://github.com/libigl/libigl/blob/main/include/igl/bbw.cpp) ·
[Upstream inputs and output](https://github.com/libigl/libigl/blob/main/include/igl/bbw.h)

### Native input layout and remaining discriminators

A fresh owned no-input Linux run remapped the identical native ELF in REA
`ev_5a0f94d87b490d100d7d656f7f825a4bc12d91c96de107fc1497b836bdaec01b`.
Focused REA observation
`ev_3547926a2a66cd2f97a618616e8371ed0be2f55bd35ebba53d714b095368d01c`
relates the exported JNI entry to the native helper and decodes its input
layout. Private `native-method/rea-stock-linux-bbw-input-abi-2026-11-19.json`
retains the exact evidence and ownership receipt.
The native wrapper widens the input mesh and control f32 XY to double XYZ with
Z zero. It widens packed signed-16-bit face triples to a three-column integer
matrix. Point-handle indices and two-column bone segments are integer inputs,
and the cage-edge matrix is empty. The native mass builder maps mode 3 to
mode 1 for triangles. Upstream libigl names mode 1 mixed Voronoi. Boundary
membership compares squared distance against the f32 value `1e-7` widened to
double, with a separate near-endpoint projection range for segments. Thus the
wrapper accepts existing vertex and handle samples. Their upstream generation,
coordinate basis and dispatch from Auto remain open.

For the retained historical cases the private mixed-Voronoi comparison keeps
the same two differing dominant bones. Its maximum stock errors are 43.26 pp
on full-three and 3.52 pp on locked-A. A second ablation applies the confirmed
boundary membership rules to the same sample domain. It gets identical fixed
rows and memberships in all three cases, so the same quadratic solution
applies. Private `mass-discretization-comparison.json` and
`boundary-membership/comparison.json` retain both comparisons. The next
discriminator is the upstream construction of the input mesh and handles.

REA `ev_f44c662f51e0d3670dbaf0f82b36b960335bb0cf31f59be55f34999bf09072d7`
compared exact Linux retained overlap exports with independently decoded
project data. Observed positive weights round to five decimals and local
coordinates to two. The JSON omits dormant coordinates and changes one face
order while retaining the oriented face set and explicit edges. Use the project
binary for bit observations. On a fresh overlap copy, moving H2 by minus 30
along Y would translate seven evaluated vertices by minus 4.6875 and leave the
eighth fixed, with binding coordinates held. The stock Auto result for that
pose probe remains open. Private `six-overlap/rea-exact-linux-export-observability.json`
retains the calculation and provenance.

An owned, version-pinned stock Linux CLI import produced the posed companion
project in REA `ev_5dea9d3db305e839d95bfe43889e1e6a272d59a36f8f3255174a3e3339c90315`.
REA typed comparison
`ev_5d9507f5d2abb90b2d53104c58cbb6be456a6a20ce7b0901a07fc5bb1f0abe22`
identifies H2 Setup Y as the sole decoded bone channel change. All 48 weight
words, 96 local coordinate words, UVs, and ordered edges and faces match.
The decoded mesh and binding have no separate evaluated position array.
The FK prediction of seven moved vertices and one unchanged vertex holds on
the authored companion. In this controlled case import carried the weights
through unchanged. Auto's input remains to be observed. The private receipt
is `six-overlap/rea-exact-linux-posed-import-observability.json`.

A separate exact-version no-input Linux REA JVM probe discovered the Java VM
and attached a daemon thread. Its request for JVMTI 1.2 returned `JNI_EVERSION`
before any class pool was queried. The owned process and display exited.
This establishes the outcome of this metadata route. The managed Auto caller
and its vertex/handle assembly stay open. See private
`native-method/rea-stock-linux-bbw-jvmti-2026-11-19.json` for the REA and
Frida evidence and reproducible identity checks.

REA static inspection
`ev_83e5b4f2a84e644e3de16085be437d31399c989dee5c42f50d784f015786ea8d`
pins dense native output. Its row count is input XY length divided by two
and its column count is supplied point handles plus supplied bone edges.
The copy loop supports more than six columns. Any authored influence cap or
row projection would have to occur outside the inspected helper. Its BBW
configuration starts at 200 iterations and decrements once after the fixed
initial solution, leaving 199 for each active-set column. The iteration-limit
status keeps the current column result in the success path. Other nonzero
statuses mark an error. Private `native-method/rea-stock-linux-bbw-writeback-2026-11-19.json`
retains the instructions, identity and limitations.

The exact Linux post-definition VM route in REA
`ev_387148e7f94ea6f1e976b100d4478875539a423661de33511970754874913d6e`
observed live class names and typed constant-pool references without GUI
input. The initial named-package filter found 73 class pools and 1,387
method references, with no matched geometry bridge in that scope. The live
metadata provider is independently validated. The caller's loader identity,
geometry construction and refined mesh sample ordering need further evidence.

The exact-loader follow-up used the observed Editor class loader as an
identity filter, validated first with two distinct synthetic loaders. REA
`ev_4a987fde662bb1245981592ef853b7fc08d7bfc9d8f5a0d92a2ea4d9466fa48a`
found one typed bridge reference in managed class `s/bbl`, constant-pool
entry 354. Editor declares the bridge as native and nonstatic with descriptor
`([F[I[IZ[F[S[FZ)Z`, which gives six arrays, two boolean arguments and a
boolean result. Typed metadata proves the loaded class reference. The
enclosing method, Auto action dispatch and sample construction remain open.
The exact owned sessions closed with unchanged fixtures. Private
`native-method/rea-stock-linux-bbw-exact-loader-2026-11-19.json` retains the
receipt and exact provider scope.

Exact Linux JVM static REA pins three exports that address the same indexed
method slot. ByteCodeLength reads its bounded size, ByteCode copies that
range, and NameUTF resolves its name. See private
`native-method/rea-bbw-method-index-join-feasibility-2026-11-19.json` for
the three REA IDs and boundaries.

Synthetic REA on the pinned bundled JVM
`ev_5ad26c0cc70b7012b194412f6218d528f4eabdaa3ce72b37a804d078ed84c769`
observes an authored six-byte method before and after invocation. Its call
at bytecode offset 2 starts with big-endian CP 7 pointing to the typed
static method. After the call returns 42, the same offset holds a
little-endian cache index of 1, while CP 7 still names the target. Next
qualify the scoped exact-Editor-loader join on an observed unlinked method
or resolve the linked cache index. The current `s/bbl` receipt contains
only the typed reference, so the method join remains open. No original
editor was launched for these probes.

Exact static REA
`ev_658473fe949980ac83c860ca35df8c6e521ab1ee414d2413862f8a145e5f5437`
pins the linked cache-entry lookup, while
`ev_f6e2630ff063dfa02c9dd345f382dfcd08f42cafdea7e7ec25b68c43b8ec1c8a`
pins its count and owning constant-pool pointer. A bounded probe can check
owner and count, resolve the linked index and require the original typed
Methodref identity. Private `native-method/rea-bbw-linked-cache-map-static-2026-11-19.json`
retains the exact pinned JVM evidence. The result enables the method join
without assuming that an observed operand is still a raw pool index.

The bounded owned-JVM pilot stopped before launching Spine. REA
`ev_6f8fb431f527033df85917846084d6d8b38576badb9eaeebd01d30d333ca8393`
observed the synthetic CP-count call complete without the callback that
would qualify the pool pointer. The separate instruction-level route failed
to establish class resolution and the leaf-hook route detached before its
sentinel. The public wrapper keeps the class mirror and resolves the pool
internally. Private `native-method/rea-bbw-exact-operand-guard-gate-2026-11-19.json`
retains all three outcomes. The next discriminator needs a non-reentrant,
same-class pointer observation on an owned synthetic JVM. No exact stock
method or bytecode offset is established by the current route.

The next owned parent-trace probe succeeded without callback reentrancy.
REA `ev_b0b43a6c9341392532417422b12331be850c0d89dcc6b90f59377346ea790fe9`
observes a qualified synthetic class on the pinned JVM with a null cache
before invocation, and the same owned pool with a length-two cache afterward.
The method's rewritten index 1 resolves to original CP7 and the expected
typed target. The isolated project-local Rizin backend also launched an
owned ELF and read known marker arguments in REA
`ev_a6a1c3a10966e6f360ac562a1bcf5e3914aa251b78d81fade7de9aa6de085672`,
then closed with the inferior reaped. Neither probe launched Spine. The
private `native-method/rea-bbw-non-reentrant-owned-cp-read-2026-11-19.json`
and `native-method/rea-rizin-owned-native-marker-2026-11-19.json` retain
their independent authority and cleanup. Next qualify the observed
class-definition return and loader ownership before joining `s/bbl`.

REA `ev_fa83dd6cd6b4a6c832ed51ab484c50b67dd77853773508bc2a418a61e467ad9a`
then verifies the known-thread definition return on the pinned JVM. It
observes the authored anchor and target under one loader, distinguishes an
identically named target under a second loader, and captures no successful
definition from the deliberately malformed input. Next prove coverage of
the owned startup threads and join method operands from the stopped target.
No original process was started for the synthetic qualification.

An early-clone attempt on a fresh synthetic JVM in REA
`ev_42e3e7b3a12464be33dd9f1812d208f636bcad20b42661f243b22145fd09f254`
ended with `ECHILD` before any authored definition or clone was observed.
The driver did not retain the terminal signal/exit distinction. Record the
initial exec stop and complete wait statuses on the next owned attempt
before relying on thread enrollment. Private
`native-method/rea-bbw-early-clone-gate-2026-11-19.json` retains the limitation.

The revised fork/exec probe in REA
`ev_67945ab7e977b8c300c4e4995fc22c9ed101e3ba04487fdf862fc18a863be503`
records a pre-exec stop, exact pinned JVM exec, and terminal `SIGSEGV`
before clone or definition events. The direct pinned JVM version command
exits normally outside the tracer. This identifies the observed failure
phase. Its underlying signal cause and clone coverage remain open.
Private `native-method/rea-bbw-fork-exec-gate-2026-11-19.json` retains the
complete status journal.

The scoped owned stock boot in REA
`ev_03ca9ce3eac0c0803faeb5ac80ac90f1537ef5e382d9658d2ad56dca30687fcc`
observes both `Editor` and `s/bbl` defined once under the same JNI loader
and on the same worker thread. The pinned JLI startup role used a different
thread. The direct evidence rules out tracing the JLI startup thread alone
on this boot. It does not establish the worker creation path, cross-boot
identity or enclosing method. No original GUI input was used. The outer
idle timeout interrupted provider close after capture. Independent process,
display and owned-copy checks confirmed terminal cleanup. See private
`native-method/rea-stock-linux-bbw-jli-role-2026-11-19.json`.

A separate passive hook at the internal successful definition instruction
reported ready in synthetic REA
`ev_f746483ddf706be1ca9e8c55f2aca573fa3680abad575c2e9c98f5e1884ba41d`
and detached before the authored definitions, while the identical
uninstrumented fixture completed. The capture does not establish why the
instrumented JVM ended. Private
`native-method/rea-bbw-passive-definition-frida-gate-2026-11-19.json`
retains the negative gate and control.

Automatic cybersecurity review rejected the follow-up JVM
method-instrumentation task. That run stopped. The stock method and input
construction stay unresolved. Retained authored artifacts and public
reference evidence can still support independent editor workflows.

REA `ev_07258e63a951d41d95dfc8c1181ba1e965203e01999b1d9af87199b859a80967`
prepared independent input contrasts from the owned exact Linux saved pair.
One compensates H2's local positions while moving its bone handle by 30 units,
keeping evaluated vertices within `1.79e-7`. A second changes a dormant H2
local position while leaving evaluated geometry fixed. A third changes one
UV with fixed skinning and preserved triangle orientation. These recipes
separate lock inclusion, dormant inputs and UV dependence when the original
native arguments become observable. Private
`six-overlap/rea-stock-input-orthogonal-contrasts.json` retains the f32 rows
and acceptance thresholds.

REA `ev_a113d0f673046debecaef4e061fa45a57bb480bac84018ebd13ba0e221db5e47`
measures the eight saved source vertices against all six full Setup bone
segments. Neither the raw UV domain nor the neutral or posed FK domain
provides a single anchor at the native squared-distance cutoff. The nearest
in-span sample is 0.14219–0.46620 units away across those controls. The six
authored endpoint pairs are distinct even though per-influence projections
of the same bound vertex nearly coincide. This rules out unmodified raw
vertices and full segments at literal scale as an anchored input on that
fixture. The upstream sampling, coordinate scale and handling of coincident
controls remain open. Private `six-overlap/rea-authored-bbw-handle-bounds.json`
retains the comparisons.

The independent bounded-SciPy comparison in REA
`ev_2f2fa42611c539f186ef042bb3cfe9feb14116c129128fe667546d2277ef7eb3`
used the retained clipped 16-way domains with mixed Voronoi and the observed
movement tolerance. Its ten columns stop in 16–46 iterations. Caps of 199 and
796 produce identical output weight words and leave the same stock winner
mismatches. This bounds the iteration-cap explanation for the reconstructed
domains. Exact stock sample generation and actual convergence remain open.

The implementation batch updates the FBones Scene edge index guard to use the
format's limit. The legacy codec keeps its prior bound. The Weights panel keeps
pending Bind membership through acknowledged weight changes, explains the
locked-only scope, and shows Prune with an unavailable state. The Prune control
is visible in the retained exact historical Auto capture. Its original effect
remains open. The same historical capture shows separate Smooth and Weld
actions. FBones exposes both as unavailable with explanations, keeping the
existing brush tool independent. The current guide describes bulk smoothing
over hull and manual-edge neighbors and weight matching across meshes.
[Weights guide](https://esotericsoftware.com/spine-weights#Smooth)

The new Mesh Smooth command uses a frozen set of input rows, uniform self
and neighbor scores, and only authored contour and manual edges. Selected
vertices receive the redistributed unlocked mass. An empty UI selection
targets all vertices. The command preserves exact locked words, local
binding coordinates, topology and out-of-scope rows, with one native history
entry for a changed candidate. The uniform formula and lock normalization
are FBones policies based on the documented behavior. Exact 4.3.26 numeric
output and Clipping smoothing remain open.

### Swap weights gate

Retained historical exact 4.3.26 Mesh and Clipping captures show Swap in the
Weights panel with zero or one selected influence and the control disabled.
The current publisher guide documents selecting two bones, then exchanging
their weights. It lists Clipping among the supported weighted attachments.
Exact Linux effect, lock handling and vertex-scope behavior remain open.
[Swap and Lock guide](https://esotericsoftware.com/spine-weights#Swap)

The FBones policy is one explicitly inspected weighted Mesh or Clipping
attachment in Setup with two distinct selected unlocked bound bones.
Exchange only their weight words on every vertex of that attachment.
Preserve all local binding coordinates, membership order, other weight
words, topology, active sibling and session selection. Validate the
existing dense binding and clipping polygon in one atomic revision-guarded
history action. Identical output preserves redo and creates no new history.

The grouped Scene regression on host `c5e4c00b2ac9` verifies exact binary
weight words including signed zero, inactive Mesh and Clipping targets, active
sibling and binding preservation, stale and invalid rejection, one Undo/Redo,
redo-preserving no-op and portable Save/Close/Reopen. Production-CSP UI
verifies inactive Mesh Swap with two selected influences, a spectator lock,
an uncommitted Bind change and a selected vertex. Both selected columns still
exchange on every row. The native edit schema exposes the same fixed pair via
`swapAttachmentWeights`.

### Vertex scope across history changes

The retained stock scoped cases confirm that vertex selection limits Auto.
Exact stock selection behavior across Undo and Redo remains open. FBones
stored numeric vertex indices per attachment and invalidated on vertex count
changes. An Undo or Redo that replaces a Mesh with an equal-count Mesh
could keep those indices for a different ordered UV domain.

Use the committed ordered Mesh UV arrays and row count across a history
transition. Clear remembered vertex indices and active focus for changed
domains and preserve bone selections and locks. Keep vertex scopes across
weight-only history and other transitions with the same UV domain. A history
operation that edits UVs in place also clears that scope. The format contains
no persistent vertex IDs for distinguishing that case from replacement.
The focused production UI case uses an actual four-vertex Trace replacement
with a different ordered UV domain. Undo and Redo clear the affected target's
stored vertex scope and focus, preserving its chosen bone and lock and the
active sibling's selection. The weight-only Swap roundtrip retains its pick.

### Update Bindings gate

The retained historical exact 4.3.26 Mesh and Clipping captures show the
Update control beside Mode. The current publisher guide describes rebinding
the current vertices to the bones and replacing their stored local positions.
Standalone activation and numeric output in exact Linux remain open.
[Update Bindings guide](https://esotericsoftware.com/spine-weights#Update-bindings)

The FBones policy targets the inspected weighted Mesh or Clipping in Setup,
including inactive attachments. At the current authored or validated frozen
Setup pose, project each entire row to its visible point and rebase every
bound local coordinate, including dormant lanes. Divide the anchor by the
existing row mass so valid near-normalized weights stay exact while the
rendered point stays stable within floating-point tolerance. Preserve weight
words, membership, topology, activation, and selection. Reject stale epochs,
animated pose snapshots, singular inverses and incompatible Deform keys
through the existing atomic history and shape validation. A changed binding
creates one Undo entry. Weight locks protect their existing weight words.

REA `ev_60226d776c51da9491789a1837ac38c35a41d8fbb01e99c2dcb39c31e879dbee`
uses an exact Linux Spine-saved posed six-bone fixture as input to an
independent rebind model. All-lane projection changes 89 of the 96 local
words and preserves all 48 weight words. Recomposed geometry differs by at
most `1.252e-6` units. The dormant H2 lane on row 7 distinguishes the
policies: making it active moves the row nearly 30 units after a positive-only
rebind and less than `1.78e-6` after reprojecting all columns. This is a
derived witness on an exact source, with no original Update invocation.
Private `six-overlap/rea-update-bindings-posed-discriminator.json` retains
the input identity, comparisons and reproducer.

The grouped native Session case on host `81cd0fbf2c4e` passes on inactive
Mesh and Clipping with evaluated IK, a signed-zero dormant lane and a
near-unit weight sum. It verifies the projected shape and exact weight and
unrelated words, repeated no-op, Undo/Redo, portable reopen, stale and
animated leases and singular rejection. Production-CSP UI captures the live
Setup Physics epoch, recaptures the entire inactive Mesh, preserves
selection and pending Bind changes, resumes Physics and restores the local
coordinates on Undo. The direct exact stock-saved copy opened as
inspection-only in REA
`ev_d5df5e7badde4ae09dbe68ba14a3e66cdf1c5c1279fef463a40b0de6a44dee50`.
That probe performed no edit. Its private receipt
`six-overlap/rea-fbones-update-bindings-stock-copy-inspection-only.json`
keeps the input and host hashes.

### Prune gate

Retained historical exact 4.3.26 captures show Prune for weighted Mesh and
Clipping. The current publisher guide describes a maximum positive influence
count per vertex, removal strictly below a threshold, redistribution, live
geometry preview and a removal count, and pruning multiple selected meshes.
Exact Linux defaults, ties, locks and numeric effects remain open.
[Prune guide](https://esotericsoftware.com/spine-weights#Prune)

FBones targets the entire inspected weighted Mesh or Clipping, or the
explicit selection of eligible weighted attachments. Each target uses its
own session locks. Positive locked weights count toward the cap. Rank
editable positive weights in descending order, breaking ties in binding
order. Keep the strongest editable lane if the threshold removes every
possible recipient, and report a conflict if the cap leaves no place for
editable mass. Redistribute removed mass proportionally among surviving
editable lanes, retaining the previous row mass where representable. Keep
exact weights on untouched rows and preserve locks, signed zeros, local
positions, topology and activation. The default settings are neutral.

Preview changes only the main editor's rendered candidate and counts removed
positive vertex influences. It uses the same native plan and frozen Setup
pose as Apply. Guard document, revision, targets, options and epoch. Reject
incompatible Deform or invalid Clipping, cancel without a write, and apply
all changed targets in one canonical Undo action.

REA `ev_b36a7b8162ab5211b743acc6ef24488775078a39292d37229d0455f1cca17702`
derives discriminators from exact Linux stock-authored six-bone weights.
An exactly 12.5% lane distinguishes strict cutoff from inclusive cutoff.
Three equal 12.5% lanes distinguish ranking under a cap of four. Positional
shifts differ among proportional redistribution, equal redistribution and
redistribution entirely to the largest lane. In a locked cap-two case,
the preserved positive locks leave 40.625% with no recipient. These are
independent policy calculations, with no observed stock Prune invocation.

On host `3c894c0694e0`, native Session preview and Apply match for a batch
with inactive weighted Mesh and Clipping. Nine removals verify threshold
equality, tie order, signed-zero locks, the strongest-recipient fallback,
one Undo/Redo and portable reopen. A separate crossing Clip rejects the
entire batch and preserves authored bytes. The production UI uses two
selected meshes with different locked bones. It displays a changed Overlay
sample during preview, restores the raster and revision on Escape, and
rejects a stale delayed reply before applying the latest counted candidate
in one edit. The initial threshold-only UI oracle was corrected to account
for the protected row's sole editable recipient, with unchanged web host
and Rust host for recovery. Tauri, the native test host and read-only
`fbones_preview_prune_weights` share the native preview route.

### Weld correspondence gate

Exact historical 4.3.26 captures establish the Weld control on weighted
Mesh and Clipping. The publisher guide documents All, Overlapping and at
least two shared bound bones. Publisher statements describe a separate
source and vertices with different locations or counts. No retained exact
before/after Weld pair establishes correspondence or transfer rules.
[Weld guide](https://esotericsoftware.com/spine-weights#Weld)

REA `ev_e2a29cc93fc63af38152d711968b089e0e8396584bf32899e1ed2f3ca10ceb61`
derives a controlled discriminator from the exact Spine-saved Linux
six-overlap fixture. At the internal face sample, nearest-vertex sampling
has four positive influences and triangle interpolation has six. A
coincident point and exterior points at 0.25 and 12 units distinguish
candidate overlap cutoffs. Private `six-overlap/rea-weld-correspondence-discriminator.json`
retains source identity and comparison. This test performed no stock Weld.

### Vertex weights clipboard gate

The publisher guide documents Copy and Paste for equal numbers of selected
vertices. The publisher's Spine 4.3 explanation establishes pairing in
selection order within a single attachment at each end. The exact retained
4.3.26 controls and authored dense outputs do not expose a clipboard
before/after operation. Weld's separate All and Overlapping controls are
documented, with exact correspondence and numeric effects still open.
[Weights guide](https://esotericsoftware.com/spine-weights#Weights-copy-and-paste) ·
[Selection order clarification](https://esotericsoftware.com/forum/d/30212-spine-43-released/14)

REA `ev_2629bdf27085c0dba3e17b396cd49e67fa788eaa498c2b878b0acb09f66cc6b7`
independently decodes authentic Linux stock-saved dense rows and finds eight
vertices with six bound columns, two positive-zero words and 96 stored local
coordinate words. The file's producer was a stock CLI import. It establishes
binary storage, with no clipboard action in its provenance. The retained
JSON projection rounds weights, so a future exact clipboard comparison
needs binary before/after files with the command independently documented.

The FBones policy captures an immutable in-editor snapshot for one inspected
weighted Mesh or Clipping in Setup. Scope it to the logical document. Pair
equal nonempty source and destination picks by selection chronology, using
vertex-index order within a single simultaneous box or select-all action.
Require the same stable bound bone set and map columns by ID. Preserve exact
weight words, local coordinates, other rows, topology, membership order and
activation. A target's positive and signed-zero locked words stay exact. A
different copied word on any locked lane rejects the whole edit. Use the
existing frozen pose and polygon guard for Clipping, protect Deform keys and
commit once; a byte-identical paste creates no history. Keyboard shortcuts
are scoped to the Weights controls or focused viewport.

Host `179b666efcea` verifies the exact Scene payload on inactive Mesh and
Clipping, including permuted bone IDs, signed-zero locks, out-of-range and
repeated destination indices, stale lease/revision, one Undo, redo and
portable reopen. The production UI test selects source rows `[2,0]` and
destination rows `[1,3]` using the actual viewport. Ctrl+C in the numeric
field leaves the editor clipboard empty. Focused viewport Copy is read-only,
unequal-count paste is unavailable, and the ordered exact words enter one
native edit. Source, local coordinates, unpicked rows, current selections
and activation are verified, followed by one Undo.

### Native Auto latency on the Scene limit

Release `01534fc9f7e1` accepted five measured trusted single OS clicks and
one warm-up on a 1,024-vertex mesh with 128 bound influences in private Xvfb
with software GL. Time from click to acknowledged inline result was 258 ms
median and 269 ms p95. The maximum GTK main-context callback gap during
each measured command was 133.7–141.8 ms. Matching idle maxima were
8.5–9.2 ms. The later second animation-frame callback measures a presentation
opportunity. It provides no pixel or display scanout timestamp.

Each click authored one revision of finite normalized dense weights, with
the same local binding coordinates and topology. Undo restored the full
baseline after each click. The source file hash stayed exact and the
owned app and controllers exited. Private `native-timing/run-release-01534fc9/result.json`
and `native-timing/README.md` retain results, ownership, and reproduction.

The next source batch moves Scene Auto computation to a worker using an
owned binding and pose snapshot. The Session releases its mutex for the solve
and checks document identity, revision and frozen pose epoch before applying
the canonical Scene history transaction. Direct and wrapped slot aliases
retain their legacy dormant-position policy. The priority queue orders graph
travel by the original distance and vertex keys with the same strict
relaxation arithmetic. Automatic viewport cleanup respects the pending
edit's pose. The grouped regressions and matching release timing cover this
candidate. Stock input construction and numerical fidelity remain open.

On the same capacity fixture the previous and candidate Rust Session hosts
returned identical bits for all 131,072 weight words. Both preserved every
local binding coordinate and the source file and restored the baseline with
Undo. The reached candidate paths include explicit scoped and compatible
slot Auto. In the grouped native tests, stale document, revision and pose
results are rejected, competing results make one edit, and locked no-ops
preserve redo. The deferred UI case passed original scope retention,
harmless viewport input, queued Save and one Undo.

Matched native release `ab466ddf5197` lowered the largest GTK main-context
gap from 141.813 ms to 11.667 ms on five trusted clicks. Candidate idle
maximum was 9.221 ms. Click-to-result median moved from 258 to 219 ms,
and nearest-rank p95 moved from 269 to 289 ms. Frame callbacks describe
presentation opportunities. Each measured edit produced one valid revision,
and every Undo restored the fixture. A trusted warm-up Ctrl+Z also verified
the ordinary desktop edit dispatcher. The owned app exited normally.

The private report `native-timing/run-release-ab466ddf-retry/clock-stable-measurements.json`
retains matched configuration and a reduction over the contiguous stable
heartbeat suffix. Two wall-clock steps occurred during startup, before all
sample and idle windows. The raw log and first warm-up probe failure remain
in the private receipts. GTK responsiveness is verified for the measured
Linux fixture. The managed Auto sampling and authored output remain open.

### Weights viewport display

REA evidence `ev_bac0c8acf0e5607b1aa6f28753354aa79353cfe08d903a83ac0926515109686f`
links two retained, owned Spine Professional 4.3.26 Windows captures to an
identical binding. Pie sectors use the weights-list colors and the selected
vertex's solid fill grows from 12×12 to 20×20 pixels in the two captured states.
Separate selected-bone evidence shows the relevant sectors extending outward.
The captures measure that historical viewport; exact Linux visual sizing and
toggle interaction remain open.

FBones Setup now shows proportional Pies for the resolved inspected binding,
including active and inactive Mesh and weighted Clipping. It draws enlarged
selected pies and accentuates sectors for selected influences. A neutral
authored bone uses a distinct view color shared by the Weights list and the
viewport. The Pies toggle preserves the scalar heat view and editable handles
when off. Selected uses the documented union of selected vertices and vertices
with positive weight on a selected bone. Suppressed charts retain small edit
handles. These are session view settings. Overlay is visible and disabled.
[Publisher descriptions](https://esotericsoftware.com/spine-weights#Pies)

The grouped production build and 512 JavaScript cases passed with one existing
skip. All 15 affected Chromium cases passed with real isolated Rust Sessions
under production CSP. A same-round correction extends picking to the colored
edge of enlarged charts; the four Weights cases, 52 viewport-input cases and
four renderer cases passed after rebuilding. The pixel toggle and selected
edge click preserve the native snapshot. Scoped Auto feedback distinguishes
changes from no-ops. Final build `bc450a1fefdc` opened as a viewable GTK WebGL
window on Linux for handover. The numerical Auto comparison remains active.

### Weights Overlay

REA `ev_3666ed97cec69d458dab79d25fb1fde8569b183069bc36a1d25c0ce6c635eb8e`
verifies Overlay is unchecked in both retained 4.3.26 Windows captures. That
establishes the two observed UI states. The enabled fill and Selected color
semantics come from the publisher's current guide. Exact enabled 4.3.26
behavior remains open. [Weights guide](https://esotericsoftware.com/spine-weights#Overlay)

FBones blends the Weights swatch colors at the vertices and interpolates
across the inspected attachment. Selected makes unselected influences
contribute black while preserving their share of the normalized mass.
Pies and Overlay are independent session controls. Selected works with
either display. The fill uses authored Mesh triangles and the evaluated
editable contour for Clipping. The latter is an FBones display choice.
Image masks, Preview, authored bindings and undo history are separate from
this display. The static WebGL shader runs under production CSP.

The grouped round passed the production and strict UI builds, 512 JavaScript
cases with one existing skip, and 15 Chromium cases backed by isolated
Rust Sessions. Real pixel tests cover the gradient, black contributions,
toggle restoration and the concave notch of an inactive clipping attachment.
An owned WSLg GTK WebGL check changed 3,553 pixels in the viewport crop,
restored the initial raster exactly on toggle-off, and preserved the native
project snapshot and source file hash. Native build `0b0c95f19803` launched
for handover. Private `weights-overlay-2026-11-19/` retains the verified
rasters, receipts and grouped logs.

## Accepted bounded implementation — 2026-10-29

Status: DONE for the documented independent algorithm and canonical profile.
The previously pending scope/lock UI original comparison and Windows delivery
are complete: sourcee346 accepted/exported once by original4.3.26 with all48
binding-coordinate bits independently checked; Windows83e5 four current groups
passed. These flows also remain green in finalF30935/35Linux/currentbe1bc.
Reports: analysis/scoped-ui-original-check.json and
analysis/scoped-weights-delivery-check.json; latest STATE records exact checks.
Proprietary Auto numeric distribution, original brush target-lock behavior and
original insertion arithmetic remain explicit unknowns. The implementation
uses recorded bounded FBones policies rather than claiming that parity. Older
ACTIVE/UI-next statements below are historical checkpoints.

## Latest scoped UI and lock continuation — 2026-10-29

Scoped Auto selection, group Direct/mixed numeric input and per-attachment
transient locks are implemented. Current rebuilt Linux Playwright **27/27 pass**
(three new scope cases/eight new lock cases); strict UI TypeScript and175JS
pass/1known Physics skip. Native138default/93legacy pass, strict Clippy both.
See `../../analysis/scoped-weights-ui-check.json` and latest STATE for exact
counts, source snapshot, checks and protected normal Linux window966265.

Paired original Auto5/manual5 observations prove scoped replacement, locked
mass, Direct locked-target override and preservation of all local coordinates.
Brush override/Normalize are explicit bounded FBones policies, not recovered
original brush parity. New row interpolation/extension is recorded before code
in `../research/WEIGHTED-VERTEX-BINDING-POLICY.md`; new original insertion control
was inconclusive. New-row native tests cover dormant activation, unchanged old
rows, posed fields, outside extension, singular atomicity and Save/Open.

F302 remains ACTIVE pending a new UI-authored scoped original export and targeted
current Windows delivery. No accepted original batch should be repeated. Exact
proprietary Auto distribution and original insertion/brush arithmetic remain
explicit gaps. Older “UI next”/zero-placeholder prose below is historical; typed
Scene weights preserve ALL existing coordinate bits, including genuine origins.

Status: IMPLEMENTATION ACTIVE. Part of the full active goal; no scope reduction.

## Requested end state

Investigate and repair automatic weights and binding so influence follows bone chains and connected mesh surfaces rather than arbitrary nearest-four distance leakage.

## Mandatory evidence gate

Two reference agents inspect behavior/data and UI/interaction before dependent
implementation. Priority: original Spine **4.3.26** reverse engineering → official
primary documentation → explicit assumption. Reuse completed evidence; never
repeat accepted oracle batches or use older editor versions.

Behavior/data findings: `../research/FEATURE-DATA-4.3.26.md` (in progress).
UI findings: `../research/FEATURE-UI-4.3.26.md` (in progress).
Code audit: `../research/FEATURE-CODE-AUDIT.md` (in progress).
Record each conclusion as directly proven, documented, inferred or unknown.

## Acceptance and failure cases

Exact4.3.26 reference first, official Auto Weights documentation next; record unknown proprietary algorithm explicitly. Initial binding preserves the current geometry. Auto retains existing binding coordinates; after the bones have been posed it may legitimately change vertex positions. Require normalized nonnegative weights, thin limbs, disconnected islands, branch joints, degenerate/zero-length/coincident bones, affine parents, deterministic results and atomic undo/save. Provide meaningful comparative deformation cases, not only sum-to-one tests.

## Implementation and verification surface

mesh.rs, mesh_edit.rs, weights UI/options, own generated surfaces and pose examples; runtime/image reference comparison and weighted persistence.

Persistence changes must include bounded parsing plus exact complete
reserialization, atomic revision-checked edits, history and independent new
original4.3.26 comparison. UI claims require actual Windows interactions and
visual inspection where relevant. Keep unknown files inspection-only.

## Evidence / handoff

### New scoped original evidence and implementation gate

The paired `AUTO-SCOPE-DATA-4.3.26.md` and `AUTO-SCOPE-UI-4.3.26.md` now record
five NEW own exact-original cases, independently checked before core changes:

- Single selected B: all six rows become B100%, including a previously-zero B.
  Unlocked outside influence weights are erased, not protected.
- Selected vertex0 only: only that row's weights change; all other rows retain
  every weight/coordinate bit.
- Vertex1+B combined: that formerly-zero B becomes100% only at vertex1; other
  rows remain bit-identical. Zero selected mass does not prevent Auto.
- Locked A with Auto over all influences: all six A weights retain their exact
  bits, and B/C/D share the remaining mass. Locks disappear on original reopen;
  no canonical persistent lock field is established or added.
- Only-selected B also locked: the complete binding is unchanged and original
  stays clean. No editable candidate means no-op, not a fallback to other bones.

All five preserve all48 local binding-coordinate components and unrelated
bone/topology/inventory state. The original may produce negative-zero weights;
the bit comparisons distinguish them from positive zero. Multi-B+C/Ctrl/marquee
gestures remain unproven; the official guide is patch-unpinned evidence for
general multi-selection support. Do not claim numerical proprietary parity.

The proposed protected-unselected-mass fallback in the older handoff is directly
CONTRADICTED by these observations. Core/optional native API is now implemented:
19 focused core tests and four native groups,125default/88legacy tests pass;
strict all-target Clippy passes both profiles. Active/inactive Mesh/Clip, stable
IDs, locked/no-op mass, invalid scopes, history, real save/open and epoch guards
are covered. TS contract matches the optional scope. A freshly rebuilt real
Rust host passed the existing16 Linux Playwright workflows in15.6s; report
analysis/playwright-scoped-backend-check.json. Scoped store/panel/viewport UI is
NOT yet implemented; follow AUTO-SCOPE-UI-IMPLEMENTATION-HANDOFF.md and retain
remaining manual-lock/new-vertex evidence gates. No new Windows scoped delivery
or full F302 completion is claimed.

### Current0.8.2 shared binding and remaining scope

Two weighted-clip DATA/UI audits and new original Bind/Direct snapshots preceded
the common helper implementation. analysis/weighted-clip-binding-reference-check.json
proves sequential first membership/zero additions and initialized dormant
coordinates; sole100→50 with no positive recipient changes no persistent bytes.
Default Scene uses explicit attachment-ID membership Bind separately from Auto.
Every ordinary typed Scene weight operation preserves ALL local-position bits,
including legitimate0,0/negative-zero and positive↔zero transitions. The old
image command path retains its explicitly named legacy dormant-init policy;
the proven no-recipient guard is fixed in both. This supersedes the old
heuristic described below for the NEW typed path, not its historical evidence.

Actual0.8.2 mesh/clip UI, frozen pose Bind/Unbind, Direct and brush values/history
pass7Windows groups plus independent actions/data and original weighted pixels;
analysis/weighted-clip-authoring-check.json. This is not proprietary Auto parity.
F302 stays ACTIVE for selected vertices/influence scopes, locks and the NEW
four-case paired original experiment in
../research/WEIGHTED-CLIPPING-NEXT-STEPS.md. Also inspect dormant positions when
new weighted vertices are created and newly-positive original Auto behavior;
there is no proven persistent unset marker that licenses treating0,0 as absent.
Explicit Update Bindings must stay separate from ordinary weights, including
retained membership, rather than being silently folded into Auto.

### Evidence retained from both audits

- **Proven by original4.3.26:** the owned posed five-vertex/three-bone Auto
  operation changed all15 weight values while preserving all30 local binding
  components bit-for-bit, plus binding order, UVs and topology. Its maximum
  posed world displacement was about12.381 units. No formerly-zero influence
  became positive in that example. See
  `../research/FEATURE-DATA-4.3.26.md#f302--direct-original-auto-action-and-corrected-beforeafter-proof`,
  the paired UI observations, and `analysis/auto-weights-reference-check.json`.
  The rejected raced after-copy is not evidence and must not be reused.
- **Documented, patch unpinned:** the official
  [Weights guide](https://en.esotericsoftware.com/spine-weights#Auto), consulted
  again on2026-10-29, says Auto uses mesh topography, supports selected vertex/
  influence scopes, and distinguishes changing weights from Update Bindings.
  Update Bindings explicitly replaces local binding positions. Those facts
  support removing implicit whole-mesh rebinding from Auto; they do not reveal
  the proprietary numeric solver or prove exact4.3.26 controls.
- **Unknown:** the original complete algorithm, seeding, diffusion constants,
  influence budget, and initialization of newly-positive previously-zero
  binding rows. Existing fixture collection is reused, not repeated.

### Independently implemented FBones algorithm

`src-tauri/src/auto_weights.rs` computes positive graph conductances from the
triangle and explicit-edge graph. Each bound bone seeds vertices near its
segment on its nearest connected component(s); shortest surface travel gives
the weighting prior. Bounded screened diffusion smooths over actual graph
neighbors. Disconnected components never diffuse across an empty gap. An
unseeded component uses its nearest bound bone. The four strongest influences
are retained with deterministic bone-index ties and normalized nonnegative
weights. Limits are256vertices/128boundbones/48diffusionsteps. These are our
bounded design choices, **not recovered proprietary behavior**.

Existing positive binding coordinates stay bit-identical even when the new
weight is zero. Meaningful nonzero coordinates of old-zero rows also stay.
Only a newly-positive old-zero row whose coordinates are `[0,0]` receives a
current-world-to-bone-local initialization. That placeholder is how the current
FBones binder represents absent influences. A genuine dormant zero origin is
indistinguishable; initializing it is an explicit FBones fallback, not a
Spine-proven fact. All results are staged: failed validation/inversion never
partially mutates the input. Auto does not silently update all bindings to
preserve an already posed silhouette.

The base helper recomputes all vertices over the mesh's existing binding list;
it does not bind new bones. The selected-vertex/selected-influence scopes from
the official guide are not yet passed by the native/UI Auto command. Keep this
limitation visible in acceptance tracking rather than implying that the active
brush influence restricts Auto.

Focused checks include a nondegenerate thin U surface whose top-left vertex is
Euclidean-nearest to the opposite branch across empty space, nearby disconnected
islands with independent moved-bone deformation, a forked thin surface, posed
binding-bit preservation, newly-positive placeholders/nonzero dormant rows,
reflection/uniform-scale invariance, coincident zero-length bones/zero edges,
unseeded components, manual connecting edges, malformed data and atomic
singular-inverse failure. Native command/history/canonical save and actual
Windows deformation checks remain separate acceptance gates.

Observed checks on2026-10-29: all10 focused algorithm tests pass in both the
default and `scene-editing` builds. Strict feature library Clippy passes.
The U fixture also executes the previous `mesh::bind` distance method as its
baseline: that opposite-gap vertex gets under5% left influence there, over65%
with the graph solver, and less than40% of its previous false movement when
only the opposite branch moves12worldunits. This is own-fixture deformation
evidence, not a measurement of the original Spine solver.

```sh
CARGO_HOME="$PWD/.tools/cargo" cargo test -p fbones-desktop --offline auto_weights::tests
CARGO_HOME="$PWD/.tools/cargo" cargo test -p fbones-desktop --features scene-editing --offline auto_weights::tests
CARGO_HOME="$PWD/.tools/cargo" cargo clippy -p fbones-desktop --lib --features scene-editing --offline -- -D warnings
```

Do not mark complete from the independent algorithm tests alone. Root owns the
final TASKS/STATE update and actual application launch after integration.

The native/Windows gates above have since passed in the0.8 checkpoint: actual
Bind/Auto/Undo/Redo and combined native save/close/reopen preserve existing
positive binding coordinates exactly while changing the deliberately poor
weights and retaining normalization. Native Scene and legacy history/canonical
tests pass too. Evidence: final16-group analysis/scene-ui-check.json. The
selected vertex/influence scope and its original reference questions remain
active; use research/WEIGHTED-CLIPPING-NEXT-STEPS.md before implementing them.
