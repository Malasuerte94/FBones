# F308 manual range editing: DATA plan

2026-10-29. One new own fixture, at most four new manual endpoint actions.
No original commands/input or production edits by this worker. The coordinator
alone owns new original collection. Reuse all ten accepted Match actions;
none is repeated and no Match is clicked for this plan.

## Proven, documented and unknown

**Exact4.3.26 proven:** the ten accepted Match actions identify24 independently
nullable finite-f32 editor cells, four per Rotate/X/Y/ScaleX/ScaleY/ShearY row.
From offset and each To offset/max/scale remain separate runtime fields.
Actual stored endpoints imply runtime scales via the observed f32 span ratio
on all27 accepted mapped routes, including reversed spans and non-unit scales.
Properties Match fills mapped cells and changes runtime mappings; Offset Match
preserves both. New Local-source/World-target Properties reproduces all24
predeclared source/destination endpoint bits. Sources:
[old eight actions](../../analysis/transform-match-reference-check.json),
[new two actions](../../analysis/transform-match-local-world-check.json),
[typed preservation](TRANSFORM-RANGES-CODEC-HANDOFF.md).

**Documented, not exact manual-editor proof:** the current official
[Transform guide](https://en.esotericsoftware.com/spine-transform-constraints#Match)
still describes an older Local/Relative surface. It does not identify4.3.26
manual four-endpoint/null behavior. Public4.3 runtime mappings use From offset
and To offset/max/scale; they do not identify editor field commits or defaults.

**Unknown:** manual endpoint coupling, cache materialization scope, equal/zero
span handling, clearing a present field, and all incoming-route synchronization
for one destination channel. Current native ordinary updates deliberately
preserve saved ranges; the view-only `editorRangeBits` array is not writable.
Do not interpret this preservation policy as original manual coupling.

## Frozen own fixture

Private source: `.local/research/transform-manual-ranges-data/manual-ranges.spine`,
662bytes, SHA256
`068968205cce2acd55934a992d7cb1daaff7b359768abcb7846ea448a15ced5d`.
Its `.fbones` copy is byte-identical. The independent format codec generated it
from a typed model and verified complete encode/decode equality; no original
file/template was copied. Project `Own Manual Ranges`, constraint `manual-ranges`.

Four asymmetric affine bones, source `source`, ordered targets
`[firstTarget,secondTarget]`, both Local flags true, all six mixes0. Existing
nonzero global offsets `[7,11,-13,.2,-.1,19]` must remain unchanged. All24 editor
cells start **absent**. The coherent sparse mappings are:

| Source / runtime From offset | Destination / runtime To start..end | Scale |
| --- | --- | ---: |
| X /2 | Rotate /20..28 | 2 |
| X /2 | Y /35..47 | 3 |
| ScaleY /.5 | ScaleX /1..3 | 2 |
| ScaleY /.5 | Rotate /20..28 | 8 |

The displayed source-range hypothesis is X2..6 and ScaleY.5..1.5, based on
accepted mapped-null display evidence; capture must verify this new fixture.
Rotate is shared by two incoming routes with **coherent** endpoints, while X
fans out to two destinations. The current codec permits cross-source fan-in;
exact original GUI retention of this new combination must be checked in the
saved baseline before any endpoint action. If it normalizes/removes a route,
stop and report rather than modify the source to force the planned answer.

Predictions are frozen in private `predictions.json` and identical sanitized
[transform-manual-ranges-plan.json](../../analysis/transform-manual-ranges-plan.json),
SHA256 `f16d47345a9a59ecd6c15ec669057f5c3d891ef7af9366aafe6b0b9df67df914`.
They contain complete f32 runtime candidates and explicit unresolved outcomes;
do not change them after observing original results.

## Four actions maximum

| Branch | Actual intended field edit + Enter | Primary hypothesis, not fact |
| --- | --- | --- |
| `source-end-finite` | Source X End6→10 | Keep source start2/destination endpoints; all outgoing X scales become1 and1.5 |
| `target-start-reversed` | Target Rotate Start20→32 | Keep end28; BOTH incoming Rotate scales become−1 and−4; unrelated Y/ScaleX routes unchanged |
| `source-end-equal` | Source X End6→2 | Requested denominator0 with nonzero destination spans; original rejection/fallback policy unknown |
| `clear-source-end` | Clear explicit Source X End10, Enter | Conditional present→null/default/no-op semantics unknown |

The first three use independent fresh copies of the same original-saved
canonical baseline. The fourth uses a **fresh copy of the accepted first
branch's AFTER**, only if independent DATA decoding proves selected cell5 now
stores10 (`41200000`). Bind that source hash before clearing. This is one new
clear action with dependent provenance, not a fourth independent baseline fork
or a repeat of the finite edit. If no explicit cell was materialized, skip the
clear branch and retain that question as unknown.

Competing finite hypotheses are predeclared too: preserving scales by moving
peer endpoints, or changing only the editor cache. Record every changed cell
and runtime field; do not assume a minimal single-cell patch. Equal source
endpoints cannot preserve both nonzero destination spans with a finite affine
factor: record rejection, peer movement, finite fallback or actual nonfinite
bits as observed. Never weaken the production finite-profile guard to force
an experimental zero-span result into editable support.

## Baseline and saved-data checker

Helper `.local/research/transform-manual-ranges-data/inspect.py` never invokes
original. It verifies source envelope CRC64, independently parses typed bones/
constraints, retains nullable and f32/nonfinite bits, compares all hypotheses
and records unexpected invariants without normalizing them.

```sh
python3 .local/research/transform-manual-ranges-data/inspect.py baseline \
  --after <original-canonical-baseline.spine> --output <baseline-proof.json>

python3 .local/research/transform-manual-ranges-data/inspect.py edit \
  --branch source-end-finite --baseline <original-canonical-baseline.spine> \
  --before <source-end-finite-before.spine> --after <source-end-finite-after.spine> \
  --output <finite-proof.json>
```

Use the corresponding exact branch name for reversed/equal. Clear additionally
requires `--case1-after <source-end-finite-after.spine>` and identical before
bytes. Original input/control identity, before/after screenshots, four stable
saved hashes and clean-title receipts must be bound separately by the
coordinator; a saved-data-only result does not invent gesture proof.

Typed baseline pass is required: bone/channel bits, source/ordered targets,
spaces/mixes/offsets, all four routes and24 absent cells must match the own
source. Extra editor metadata remains separate and must not be stripped.
For edits, unchanged bones/offsets/mixes/flags/references/link inventory are
hypotheses to verify, not reasons to discard contradictory observations.

## Bounded implementation gate

These probes target a usable native range-edit contract, not another rounding
grid. Root must settle an atomic intended-cell edit with synchronized affected
runtime routes before making the24-cell UI writable. Keep unedited field bits
and nulls exact; one accepted edit is one Undo item. This plan does **not** yet
prove finite SourceStart/ToEnd edits, unmapped-side creation, arbitrary partial
cache reconciliation or manual rounding/clearing in every state. General Match
world decomposition/rounding remains separate active work. No full24-cell or
complete Match parity claim follows merely from the first finite result.

## Original-saved baseline gate passed, no numeric result yet

The coordinator opened a fresh owned original4.3.26 instance and saved the
canonical baseline,711bytes, SHA256
`567c2fe3f0bdcecd23a4bf3261b17de8b3f5bd63f67102a47be7b041b0792405`.
Independent DATA proof `transform-manual-ranges-data/baseline-bound-proof.json`
SHA256 `7d75e0b413d32a409d1b1d5467434fafb049e6cdec64814ca3ce2723a2d65246`
binds the raw source, frozen predictions/eight tools, fresh ownership,
four stable clean saved reads and readable own capture.

All four bones' authored channels, source/ordered targets, flags, mixes,
nonzero global offsets, **all four runtime routes including fan-in** and all24
absent cells remain unchanged. The readable saved inspector confirms the exact
derived endpoint display in this plan and four links. Three observed baseline
interactions are only selection/foldout/Save; no numeric or Match action exists.
The three independent numeric branches may now use exact copies of this
baseline after the coordinator closes the baseline owner and binds the updated
case gate. The fourth remains conditional on the first edit's explicit cell10
proof. No original input or command was performed by this DATA worker.

## First finite attempt: input not demonstrated

The first own finite-branch helper returned0 after posting characters10, but
the baseline/after-attempt/working source remains exactly567c. Independent
proof `transform-manual-ranges-data/finite-input-limitation-proof.json`, SHA256
`44abd9a154440b550640a695033ba9867c442b2ee16e713aaa8a618682242cc3`,
checks identical raw bones/runtime/cache, clean titles, four stable saved reads
and **byte-identical** before/draft PNGs (`672dee…c90`). There is one type
attempt, no Enter/commit/readback proof or subsequent Save. The coordinator
closed only that clean owned process normally; all evidence is preserved.

This is an input/readback limitation, **not** evidence that the original range
field is read-only or that numeric editing is a no-op. No accepted manual
range action exists yet. A new separately frozen, distinct own adapter probe
may test two ordinary button-down/up pairs instead of WM double-click, then
capture field activation before characters and the exact draft before Enter.
The GLFW explanation is an inference, not identified exact editor code. Treat
character entry itself as potentially authoring immediately. If successful,
use that controlled result as the first finite evidence rather than repeat an
already accepted semantic action. If activation/draft remains unproved, stop
the adapter branch and retain manual policy as unknown; do not add a blind input
sweep or change production semantics. This DATA worker sends no input.
