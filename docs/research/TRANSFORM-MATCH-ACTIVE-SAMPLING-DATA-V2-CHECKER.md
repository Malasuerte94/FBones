# Active sampling DATA checker correction before collection

2026-10-29. Coordinator review found the initial action checker allowed the
whole properties field without separately checking link inventory/order. No
new original action has started. Original sources, predictions, helper, plan
and18-file complete ledger remain unchanged.

Use **inspect-v2.py**, alongside the original helper, for both baseline and
action checks. It additionally compares the ordered source-property list and
each ordered destination-property list before permitting endpoint changes;
the result exposes `sourceDestinationRouteInventoryAndOrderPreserved:true`.
No graph creation/deletion/reorder can pass merely as a Properties change.
Baseline proof schema/numerical hypotheses/preservation policy remain identical.

The new `freeze-v2-complete.json` includes all prior pinned files, the unchanged
previous complete ledger, this addendum and the corrected helper. No original
commands, product changes or widened numerical bounds accompany the correction.
