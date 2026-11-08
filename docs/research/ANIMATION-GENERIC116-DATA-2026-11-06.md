# Generic116: split bone-channel configuration

2026-11-06. Targeted read-only follow-up to the real-project audit. No product
code, original process, user window or shared test runner was changed/operated.
This supersedes the earlier set-of-bones hypothesis and narrows the previously
unknown integer relation; it does not declare a new editable profile.

## Direct editor-file observations

Generic116 in animation18 field8 reads as a counted sequence of **(Bone12 object
reference, varuint)** pairs. Reference identity is significant: a pair can inline
its bone before the later skeleton inventory. Entry order must be retained.

A disposable own graph reader now reaches the exact12-byte suffix in three
supplied exact4.3.26 project payloads:232174,1270540 and310454 decoded bytes.
Their19 animations contain1599 completed owner groups. Across those groups:

| Generic116 relation | Owner groups | Scalar timeline kinds |
| --- | --- | --- |
| Value1 entry present | 56 | Both14 and15 present |
| No entry | 1543 | Neither14 nor15 present |

There are **zero disagreements**, including no unmarked partial14/15 pair.
All56 entries reference bones in their corresponding skeleton inventories.
The correspondence is per animation, not a global skeleton setting.

The fourth project remains a partial parse. Its first animation has one
Generic116 entry with value2. A fully consumed group in that same animation,
for that same referenced bone, contains scalar kinds16 and17. The later parser
failure is custom timeline132 **kind39**, not Generic116. No whole-file success
is claimed for this fourth project.

All57 inspected mapped bones have setup Bone12 field27 value1. Consequently the
Generic116 value2 is not merely a copy of that existing setup field.

## Independent runtime correlation

The Sequence DATA agent decoded the supplied `.skel` files with the installed
official `spine-core` **4.3.13** implementation. Those source files identify
**4.3.26** internally and the instrumented reader accounts for their complete
bytes. This is secondary runtime-grammar evidence, not original4.3.26 editor
method recovery or a claim that library4.3.13 is editor4.3.26.

Matching animation name, bone name, key count, time and value independently gives:

| Editor custom132 kind | Runtime timeline type | Tracks | Keys |
| --- | --- | --- | --- |
| 14 | TranslateXTimeline | 56 | 318 |
| 15 | TranslateYTimeline | 56 | 310 |
| 16 | ScaleXTimeline | 1 | 5 |
| 17 | ScaleYTimeline | 1 | 5 |

The comparison declares absolute frame/value tolerances0.0005 **before** checking.
It uses the retained conversion receipts' coordinate scale0.5 and30 frames per
second. Across114 tracks/638 keys, maximum frame residual is1.33514404296875e-5
and value residual0.0001220703125; no bound fails. Scale X's maximum value residual
is5.960464477539063e-8, and Scale Y agrees exactly (those five observed Scale Y
values are all1; varying-Y numeric behavior is not established here). It checks represented key
times/values, not sampling, curve fidelity, gestures or original rendering.

**Supported conclusion:** Generic116 value1 accompanies separated Translate X/Y
tracks; value2 accompanies separated Scale X/Y tracks in the observed case.
These are bone-channel configuration relations rather than unidentified pose
data that can be discarded. The runtime correlation also independently resolves
the names of kinds14–17.

**Still unknown:** whether the integer is a bitmask, the meaning of3/4 or other
values, split Shear modes, an enabled split configuration with missing/empty axis
tracks, original toggling/merging gestures and collision/curve behavior. Do not
infer combinations or implement a guessed bitmask from values1 and2 alone.

## Existing accepted fixtures and retained failures

Eleven relevant already accepted own animation fixtures were inspected locally;
all their Generic116 collections are empty. Nine initially parsed completely.
Two initially failed because the reused historical research reader consumed five
IK curve-control axes instead of the accepted two. Applying that already known
IK grammar correction lets those two parse completely as well. The first failure
inventory and the focused correction result are both retained; no original
reference batch was rerun.

The new graph reader needed research-only candidate handling for scalar kinds,
class123 and kind22 to get past downstream records. A candidate class69 shape
advances the fourth file to kind39. These are diagnostic hypotheses unless
separately verified by the responsible feature audit. Exact suffix consumption
alone does not prove their complete semantic or writer contracts. No such
handling was added to the production codec.

## Implementation decision and next discriminating fixture

Generic116 is no longer an undifferentiated blocker: its observed1/2 modes can
be specified alongside the corresponding scalar channel families. Preserve typed
bone references, exact integer values and entry order, then require complete
independent reserialization equality. Do not silently flatten scalar timelines
into combined two-axis keys: X and Y can have different frames and curves.

The next own original4.3.26 fixture should compare one bone with combined channels,
separated Translate only, separated Scale only, both together and separated Shear.
Vary one option per fresh copy; include an axis without keys. This discriminates
enum-versus-bitmask behavior and whether configuration survives without matching
tracks. Actual original gestures remain pending Windows capability/isolation.

Independent typed scalar encoding, native/front-end sampling and key authoring,
stable metadata remapping, paired UI evidence and a fresh original acceptance
remain required before exposing a supported profile. The three large complete
research graphs also exceed the current128-bone authoring bound; resolving116
alone does not make the seven remaining projects editable.

## Reproduction and private evidence

Ignored root: `.local/research/generic116-2026-11-06/`.

- `read_graph.py`: own reference-aware diagnostic reader; `Reader` exposes arenas
  and completed groups without modifying inputs. Results/failures are retained
  separately under `actual-v1` through `actual-v8`.
- `summarize.py` → `generic116-final-result.json`: pinned source hashes, exact
  suffix checks,57 pair/reference relations and the fourth-file failure.
- `correlate.py` → `runtime-correlation-v1.json`: declared bounds, all114 matched
  tracks and638 key comparisons; consumes the Sequence agent's pinned runtime
  report rather than reimplementing or copying its parser.
- `accepted-own-inventory-v1.json` and `accepted-own-inventory-correction-v2.json`:
  the11 own-fixture check and retained/fixed IK-reader failures.
- `manifest.json`: source/tool/dependency/result pins. Raw user names, projects,
  runtime files and local paths remain ignored and are not copied into this note.

All commands are local read-only research. This work neither consumes the prepared
original edited-source collector nor resumes deferred Physics/Match/JVM probes.
