# Windowsv8: narrow Press to the observed stable Ready panel

This pre-freeze addendum narrows the preceding
[Press DATA gate](NATIVE-PRESS-ACTIONS-LINUX-V5-WINDOWS-V8-DATA-GATE-2026-11-09.md).
It does not change consumedv7, add an action, broaden provider access or waive
any identity/metadata/output condition.

Current UpdateNotice.vue watches updater.visible and opens the panel when it
becomes true. The toggle may therefore change from downloading0% to Ready and
automatically open the panel between an early qualified inventory and SDK Press.
A before/after panel XOR alone could then attribute an automatic transition to
Press. This race is source-backed; its occurrence in a new run is not assumed.
Actualv7 measured the stronger stable state: unique same-runtime Updates button
with closed caption variant ready-0.9.6 and the Current version0.9.5 panel open.

Use only that stronger state forv8. Before metadata and action entry, obtain a
fresh complete owned UIA inventory with retained main PID/start/image/window,
current validated provider tree, same full RuntimeID/owner and unique visible
enabled Button. Require exactly ready-0.9.6 caption variant and actual Current
version0.9.5 panel presence; startup/loading/unsupported errors and all inventory
caps/errors/foreign owners fail closed. Read metadata from that exact live bound
button; both its recorded before/current caption variants must still be ready
before the once-only action entry. Unknown/downloading captions stop without
fallback, extra press or qualifying an earlier snapshot.

The one SDK Press is now intended only to close this known open Ready panel.
Afterward require an independently complete owned snapshot with the panel absent,
actual0.9.5 footer and no startup/loading/unsupported error. Retain actual result,
legacy Press role/state checks, exact runtime/root/kernel ownership, one durable
intent/reservation and normal retained exit0. HRESULT success alone remains
insufficient; the historical combined viewport/upgrade fields remain separate.
The C++ closed-caption grammar stays bounded; this PowerShell scenario adds a
stricter Ready precondition, not a native caption identity exception. No provider,
Windows, target or network operation was performed by DATA.
