# F307: own open-file metadata capability

These experiments use own console processes and a46-byte own C: NTFS temporary
file. They observe metadata only, not file contents or original editor calls.
No original launch, process-memory read, privilege, injection, OpenProcess or
forced termination is involved. Consumed versions stay immutable.

## PSS name-information provider: bounded negative

The [first gate](PHYSICS-PSS-OWN-FILE-GATE-2026-11-09.md) and15tool pins plus
14relative/threeexternal root pins were verified. Controller3008/start
2026-11-09T10:15:57.2228582Z exited7 because the capability assertion failed.
Own child81364/creationFILETIME134386929573211897 closed its file normally and
exited0. Its reported handle172 appears once in46snapshot entries, but that
entry's object-name length is0. Type length10 was recorded without its content;
it does not establish the type string or terminator convention.

Capture0xC/context0, marker creation/free and snapshot free return0; walk ends
with259(ERROR_NO_MORE_ITEMS), elapsed0ms and no overrun. Seven entries have a
name flag;36have a valid type by the first tool's validator. The tool's strict
8-byte File comparator records0file-type entries; no generic File-support
conclusion follows from that comparator. The expected entry name is absent.

Known input remained unchanged; after verified child exit the wrapper removed
only its sole46-byte file and GUID directory. Independent raw accounting/pins/
ownership/lifecycle report: data/pss-own-independent.json, SHA256
f8fd1ebada62588bf91c5b6655013b82fb9823a7776631f2486f132a716ad35c.
Private raw sources/manifests/results/cleanup receipts stay under the ignored
physics-phase-sprint run. No unchanged PSS-name rerun is selected.

## Distinct attribute-only duplicate provider

The [paired gate](PHYSICS-PSS-DUPLICATE-OWN-FILE-GATE-2026-11-09.md) was
implemented as a fresh version, retaining the first experiment unchanged.
Manifestba0c968b9932248c7bc5b56184c983c2c99aa213f28201390b196a3d15e27185,
all15tool pins and14relative/threeexternal root pins match independently.

**Own capability directly proven:** controller51100/start
2026-11-09T10:27:32.3336077Z and own child60400/creationFILETIME
134386936524290148 both exit normally0. The known handle172 appears exactly
once. Its actual PSS flags1/type10bytes decode to `File` plus a UTF16NUL;
snapshot object-name length remains0. This independently resolves the earlier
unknown type bytes; it does not retroactively make PSS name support positive.

ONE attribute-only duplicate(access128/options0/noninherit) succeeds after
identity checks. GetFileType returnsDISK1; the complete132-unit NT path and
volume/file identity match the preopened known file. The local duplicate closes
successfully; all captured API errors are0. Capture/walk/free and normal child
file close succeed;15ms elapsed, no overrun. The unchanged46-byte temporary file
and sole GUID directory are removed after normal child terminal proof.
Independent report data/pss-own-v2-independent.json, SHA256
550c759fb7857b699692f23667118d1727770651339c069f30b477380aea9295.

This proves only the duplicate-based metadata route for the exact child-reported
own handle. A future original lacks that reported known handle and needs a
separate bounded candidate-selection/privacy/handle-reuse scenario. Only a new,
previously uninventoried class/archive resource under approved roots would
change further source inspection; known package/JAR/JVM/fixture paths alone
would stop the route. No original capture, class origin or Physics caller order
is established. No solver, clock or acceptance bound changed.
