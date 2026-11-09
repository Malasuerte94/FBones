# F307: own-memory identity revision

## Observed result and next bounded question

The single V1 own toy loads/calls its class, completes its20second hold and
DestroyJavaVM, then exits0. Its controller exits7: textual image comparison
fails and therefore **zero memory reads** occur. The retained V1 receipt does
not distinguish a QueryFullProcessImageName error from a path-text mismatch.
This is not a failed class-retention scan. No path-alias cause is inferred.

DATA/UI independently confirm that fail-closed outcome. A fresh V2 revision may
replace textual identity with the existing reviewed file-handle identity helper:
compare volume serial/file indices for expected and actually queried image.
Record raw expected/actual paths, query/open/file-information errors and exact
creation time. Only a proven same file plus valid creation identity permits
reads. Fresh source/image/manifest/output paths preserve all V1 evidence; process
selection, byte/time/candidate limits and own-console scope remain unchanged.
This diagnoses a guard deficiency; it does not authorize an unchanged rerun,
an original process scan or a broader memory budget.

The original [own capability gate](PHYSICS-MEMORY-OWN-CAPABILITY-GATE-2026-11-09.md)
and its consumed pins remain unchanged. The revision is reviewed before execution.
