# macOS: known own nonchild exit status observed

Actual hosted run42680160095 at source b6bf253bf80d70998f045a587f3a993dedb8d658
passes the separately reviewed [DATA](NATIVE-MACOS-OWN-NONCHILD-EXIT-DATA-GATE-2026-11-09.md)
and [UI](NATIVE-MACOS-OWN-NONCHILD-EXIT-UI-GATE-2026-11-09.md) capability fixture.
This is one own console fixture on arm64/macOS26.7.2, not a product or
LaunchServices/updater observation.

Actual SDK compilation succeeds. Compiled source SHA256 e1f2127b matches frozen
v2 byte-for-byte; executable b07ac606 remains unchanged before/after. The created
controller1196 launches known launcher1197, whose actual retained wait status is
normal0. Worker1198 records original parent1197, then is observed live with
parent1, unchanged UID501/kernel start/image file identity. Actual worker
waitpid returns−1/ECHILD10; pending/zero is not substituted for this proof.

An exact SDK EVFILT_PROC registration for1198 with NOTE_EXIT|NOTE_EXITSTATUS
returns the expected EV_RECEIPT status: EV_ERROR with data0. Registration precedes
one nonce ACK. The later event identifies1198/filter−5 with NOTE_EXIT and no
EV_ERROR; raw data1792 is interpreted by actual SDK WIFEXITED/WEXITSTATUS as
normal exit7. Controller wait is also normal0. The native sequence takes about
64ms; compile plus wrapper takes6.68s.

Independent audit matches the retained88-byte READY protocol to its declared
own layout and worker JSON, verifies the same33-byte nonce in ACK/controller
marker, parent/start/UID/file IDs, registration-before-ACK ordering and raw event
fields. Raw receipts, source/compiler/SDK/header/image pins and failures remain
private. No signal, NOTE_TRACK, global PID scan, GUI, product launch, privilege
change or network call is performed by fixture code.

This proves this known same-user nonchild's normal exit7 is observable on the
measured platform/SDK. It does not prove discovering an automatic app successor,
LaunchServices lineage, bundle/window identity, a real app's terminal, macOS
installation/upgrade or project persistence. Those remain separate requirements.
