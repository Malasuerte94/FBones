# F308 active graph: independent DATA result

2026-10-29. Root collected exactly two new original4.3.26 current-pose PNGs
from the [frozen two-case plan](TRANSFORM-ACTIVE-GRAPH-DATA-PLAN.md). No original
command, GUI input, old PNG read or product change was performed by this worker.
The precollection sources, predictions, helpers and three freezes remain intact.

## Provenance independently verified

`analysis/transform-active-graph-source-check.json` is
PASS_SOURCE_PROVENANCE_TWO_NEW_ACTIVE_GRAPH_RENDERS, SHA256
`8b091d19a92950b1bd3e02c313cc0f54b4de903e74cf19c8603cee0bc59577dd`.

The checker verifies all41 frozen hashes, both source/renamed-copy identities,
full raw projections, DEFLATE length and CRC64-ECMA, all four resources per
case, exact settings differences limited to input/output, concrete launch
arguments, two separate version4.3.26 Professional logs with Complete and exit0,
one2048² PNG per case, PNG hashes/cardinality, and unchanged source/settings/
resources. The original logs' folder-watch warnings are retained; export
nevertheless completes. No JSON export was requested or inferred.

| Case | New actual PNG SHA256 |
| --- | --- |
| multi-target |`13f1531333527151d08da92451905eec3384a7ecf948bf4e18f61ca32a39d921`|
| fan-in |`9786c608f35dc97007d6112cc3fde2693c937f51f0079058ff476c5a5c4bb2f6`|

## Independent blind measurement

`analysis/transform-active-graph-data-image-check.json`, SHA256
`309309133ab252fa1abb928a841697508cd8babeaa60077384224628c14919cf`,
reports **ONE_NAMED_MODEL_COMPATIBLE: sequential-route-mix**.

The separate DATA implementation scans each complete image with PIL, finds
connected color components, calculates nine pixel centroids and patch counts,
and explicitly inverts the calibration2×2 matrix. It imports neither production
evaluation nor the frozen UI extractor. It was run and its result communicated
before reading the UI worker's actual measurements. All nine patches and fixed
4× board/crop calibration pass. Nothing is measured from a predicted region.

Both targets in both cases pass the unchanged bounds: origin.25 world, each
basis component.009, and16-unit marker endpoint.25 world. Sequential mixing's
maximum observed origin/endpoint error is.03332895 and basis error.00344607.
Case1 alone cannot distinguish the alternatives. Case2 distinguishes them:

| Alternative, Case2 | A endpoint error | B endpoint error | Result |
| --- | --- | --- | --- |
| sequential route mix |.01086546|.01625461|Both pass|
| old-base delta aggregate |8.87679400|1.60728923|Both reject|
| last-route single blend |9.01023191|1.60988614|Both reject|

After freezing that independent result, comparison with the UI extractor found
identical patch counts, centroids and reconstructed world values in both cases.
The private `measurement-crosscheck.json` records this subsequent comparison;
it did not alter either measurement or the predictions.

Reproduction commands inspect only these new stored files:

```text
python3 .local/research/transform-active-graph-data/check-collection.py
python3 .local/research/transform-active-graph-data/check-images.py
```

## Bounded conclusion

**Direct exact4.3.26 evidence:** for these two Local/Local, nonadditive,
unclamped graphs with sibling targets and partial mixes, both targets are
evaluated and destination fan-in is compatible with sequential route mixing.
The two declared alternatives are rejected by the same measurements. This
extends the earlier single-target/no-fan-in corpus without rerendering it.

This does not recover bit-exact editor arithmetic or manual endpoint/Match
coupling. Other spaces, additive/clamp behavior, source-target overlap, target
hierarchy, constraint ordering, timelines and full solver parity remain outside
this experiment. No solver or tolerance change follows from the measurements.
