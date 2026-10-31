# Scoped Auto: data and persistence audit, 4.3.26

Recorded 2026-10-29. This memo precedes implementation. The paired interaction
audit is `AUTO-SCOPE-UI-4.3.26.md`. Original baseline SaveAs and five new scoped/
locked Auto actions are independently verified below. Multi-selection remains
pending; these proofs do not establish Ctrl/marquee interaction parity.
Independent aggregate: `analysis/auto-scope-reference-check.json`, five new
actions,120 compared weight components and240 retained local-coordinate
components, including four newly positive columns. No accepted old batch was
repeated. Reproduction reads existing owned stages only:

```sh
python3 .local/research/auto-scope-data/collect-check.py
```

## Proven, reused evidence

- `analysis/auto-weights-reference-check.json`: the accepted exact original
  all-influence Auto action changed fifteen weights but preserved all thirty
  local-position components bit for bit. Two weights became zero. No vertex
  subset, selected-influence subset, lock or newly-positive influence was
  exercised. Do not repeat or generalize that action into a subset contract.
- `analysis/weighted-clip-binding-reference-check.json`: the accepted sequential
  original Bind initializes dormant local coordinates as well as positive
  coordinates. Its sole-positive numeric edit is not evidence about Auto.
- Current supported mesh/clip dense bindings store ordered bone references and
  per-vertex weights/local coordinates. The accepted canonical codec requires
  complete reserialization equality. No persistent lock field has been
  identified by the accepted evidence.

## Documented, patch version unpinned

The official [Auto section](https://en.esotericsoftware.com/spine-weights#Auto),
read 2026-10-29, describes vertex and influence selections as limiting the
computation. It does not specify the numeric disposition of outside mass or
initially zero selected mass. The
[Lock section](https://en.esotericsoftware.com/spine-weights#Lock) describes
per-attachment influence protection. The separate
[Update bindings section](https://en.esotericsoftware.com/spine-weights#Update-bindings)
changes stored local coordinates. Manual-edit normalization documentation
does not establish scoped Auto normalization.

## New controlled source and commands

Private source: `.local/research/auto-scope-data/source.json`; own PNG at
`images/scope-grid.png`. The immutable 977-byte `baseline.spine` SHA256 is
`362faabc791285359428a8ecb6ff65ba0776b79f7c3b6797f10f912472f8b814`.
It contains one six-vertex mesh, five hull vertices plus an interior vertex,
four bound bones A/B/C/D, and explicit nonzero local coordinates for every
influence, including zero weights. Bones are already posed relative to their
binding positions, so rebinding and dormant-coordinate changes are observable.

| Vertex | A | B | C | D | Selected B+C mass |
| --- | --- | --- | --- | --- | --- |
| 0 | .40 | .30 | .20 | .10 | .50 |
| 1 | .60 | 0 | 0 | .40 | 0 |
| 2 | .10 | .15 | .55 | .20 | .70 |
| 3 | 0 | .35 | .25 | .40 | .60 |
| 4 | .25 | .50 | 0 | .25 | .50 |
| 5 | .15 | .10 | .15 | .60 | .25 |

Own generation, not an original invocation:

```sh
cargo run --manifest-path .local/research/advanced-features/scene-check/Cargo.toml -- \
  --generate .local/research/auto-scope-data/source.json \
  .local/research/auto-scope-data/baseline.spine
python3 .local/research/auto-scope-data/read-data.py \
  .local/research/auto-scope-data/baseline.spine
```

Generation completed exit 0, with codec round-trip equality; the independent
raw reader matches all specified rows. `baseline-check.json` records current
displayed world points and bit-level source checks. This establishes our
source, not original acceptance or an Auto result.

The UI reference agent exclusively owns the new original instance and inputs.
It will save an original baseline before forking controlled own cases:
vertices 0+1 only; B+C only; vertices 0+1 and B+C; single B; lock A then B+C.
The lock-only file must precede its Auto result to isolate persistence changes.
The data audit independently compares every weight/local-coordinate bit,
membership/order, outside rows, UV/topology, bone channels and slot activation.

## Proven new original baseline

The paired worker opened the own source in a fresh guarded original instance,
then used original SaveAs. Its 1039-byte result SHA256 is
`e152436d95f378c3922c0ad9020760d99a2d3d30bd19a8527ce170978544634b`.
The independent immutable copy is `original-baseline.spine` under the private
data folder. `original-baseline-check.json` proves all24 weight components and
48 local-coordinate components remain bit-identical, as do all four bones'
authored channels/world matrices, membership, slot activation, UVs, edges and hull.
Reconstructed world displacement is zero.

Original SaveAs cyclically reordered the same five triangles (the first triple
moved to the end) and added records85/86 whose semantic purpose is unknown.
Their presence does not prove persistent vertex/influence selection.
Connectivity is unchanged.
Case comparisons must therefore use original-saved before stages, avoiding
false attribution of this initial canonicalization to Auto. An exploratory
dirty bone pose was discarded and the exact source reopened before this
trusted stage; it is excluded from scope evidence.

## Proven new single-influence Auto

The UI worker selected B in the actual original Weights list, with no vertices
selected, then activated the original Auto button and saved separate before/
after projects. See its paired memo for the input method and captures; this
numeric proof must not be presented as foreground Ctrl/marquee gesture parity.
The selection-before file preserves all authored fixture geometry and weights.

- Before SHA256: `94cabedf1b211e73d2bf3755503dd2e91d9b2682ec016b5ab11a78ec65efab71`.
- After SHA256: `8b86135c81ed6402054ae85f07fae0f0e1464f1f2499d5191feb81740877321f`.
- All six resulting rows are exactly `[0,1,0,0]` over A/B/C/D. All outside
  weights are zeroed, rather than preserved. A single selected influence is
  not a no-op and does not retain its previous mass.
- Vertex1's B weight becomes1 from0 while its dormant local coordinates remain
  bit-identical. All48 coordinate components remain identical, including all
  positive-to-zero columns. All bone channels, membership/order, slot activation,
  UVs, triangles, explicit edges and hull remain unchanged. Maximum posed world
  displacement is34.4548923 units.

Independent command:

```sh
python3 .local/research/auto-scope-data/compare.py \
  .local/research/auto-scope-data/single-b-before.spine \
  .local/research/auto-scope-data/single-b-after.spine --bones B
```

`single-b-auto-check.json` records every before/after weight bit and local-
coordinate comparison. Additional private parser finding: Project tag42 takes
scalar2 in the B-selection save, contradicting the old reader's boolean schema.
Its semantic purpose is unknown; it is not sufficient evidence for constructing
multi-influence selection or changing the production codec.

## Proven new lock behavior and persistence boundary

The paired worker reopened the trusted baseline, locked A using its color-square
control, saved a lock-only stage, then used Auto with no influence or vertex
selection. Lock-only did not mark the original project dirty. Before SHA256:
`ca364bcada37bc170c9550883db6c8638116e75e4fe2f9afe49cc8d0fbc4e668`;
after SHA256:
`639f768c93e1144cac3c8bd18e4c466e4f29e1593e9f6b658b318ba13ce63075`.
The independent `lock-a-auto-check.json` verifies:

- Every A weight remains bit-identical, including vertex3's original positive
  zero. B/C/D are recomputed to the remaining mass rather than preserving their
  previous distribution. Vertex0 becomes approximately `[.4,.6,-0,0]`;
  vertex1 becomes `[.6,.000201085,.399798900,-0]`.
- All48 local-coordinate components remain bit-identical, including vertex1's
  newly positive B/C influences and all positive-to-zero influences. Bone
  channels, membership, slot activation and geometry/topology remain unchanged.
- Original Auto writes negative-zero weights in some unlocked columns. Their
  sign bits are real data; these are not negative numeric weights.

The lock-only file adds no binding, mesh or vertex lock field. Its only raw
differences from the trusted baseline are envelope identity, a directory
metadata counter and an unknown project-level three-float vector. Crucially,
the paired worker actually reopened that saved lock-only project and selected
the mesh: A's padlock disappeared. Thus this observed lock is session state,
not retained by the saved project. Do not invent a canonical persistent lock
field. A proposed FBones command can carry explicit stable locked bone IDs;
its session/history lifetime is a separate design choice until observed.

The separate overlapping case **locked B + selected B**, no vertex restriction,
has before SHA256
`fc5c4eb75379f4d98baa6ac4709549b7ac6191d89e7168a1beded2fb7811d846`
and after SHA256
`84e40adb759238a37e4bf92fdaac0411f79646e386d62347b0fcc16adf292c56`.
All24 weight bits and48 coordinate bits are unchanged, along with geometry,
bones and inventory. The original action did not dirty the title. Thus when
all selected candidates are locked, the action is a no-op; it does not clear
outside weights or fall back to every unlocked bone. This does not yet prove
the case where all bound bones are locked or several selected candidates mix
locked and unlocked members.

## Proven selected-row isolation and zero selected mass

**Vertex0 only, all candidates:** before
`bbc7d9b3f3237be33e1154b6da4e5b271fb526ba593291d12e1988bea35be73e`,
after `d002677854e2fa4292a6aa1b848020a39d330483ac0ffe1096d175c73c307b53`.
Only vertex0's weights change, to `[0,1,-0,0]`. Every other row preserves all
weight and coordinate bits. All48 coordinates, bones and topology are retained.

**Vertex1 + B:** before
`8133964ddb73b4b96541eb725f71ba3d84311187b5c2a89729707c099107fd1e`,
after `5b808f5a9bdea3eee4612b438cc704919beeff05b55c58e5b302174368bc0f82`.
Only vertex1 changes from `[.6,0,0,.4]` to `[0,1,0,0]`. All other rows and all48
coordinates stay bit-identical. Therefore zero old selected mass does not
prevent newly assigning weight; outside weights are erased only on the affected
row. This combines vertex restriction with candidate-influence restriction.

## Unknown; implementation gate remains closed

- Multiple-selected-influence behavior and whether it differs from single-B.
- Multiple selected vertices and influences, mixed locked/unlocked selected
  candidates, all-bound-bones-locked outcome and lock lifetime across tool/
  attachment changes and Undo (save/reopen loss is proven above).
- Legitimate dormant0,0 and other independently constructed new-vertex states;
  the new initialized nonzero B column is proven retained above.
- Whether scope uses the complete mesh graph or a subgraph; matching output
  alone cannot recover the proprietary solver.

Keeping outside bits and redistributing only old selected mass, previously
listed as a possible FBones fallback, is directly contradicted by single-B.
It must not be implemented as original behavior. No production behavior is
chosen until the remaining cases settle multi-scope/lock precedence.
Protected user windows are excluded; all original inputs must use the paired
agent's fresh owned PID/start-time/image/HWND guards. Accepted old batches and
old GUI handles are not reused.
