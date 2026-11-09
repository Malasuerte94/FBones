# Windows v8 pre-freeze timing refinement: close the observed Ready panel

Recorded before the PowerShell refinement. The shared Linuxv5/Windowsv8 Press
gate is already consumed by Linux and remains immutable; this addendum changes
only the unexecuted Windows scenario. No extra action or provider is added.

`UpdateNotice.vue` watches updater visible and opens the panel automatically.
An early qualifying percentage snapshot can therefore say panel closed, while
Ready opens it before the later one Press closes it. Comparing that old closed
snapshot with the final closed state would miss the actual toggle. This is a
source-backed timing race, not proof that an unobserved action succeeded.

Narrow to the already actual v7 state: whole closed-grammar **ready-0.9.6**
Updates caption and visible **Current version:0.9.5** panel. Within the same
bounded passive observation require that state; no progress/idle action. Refresh
one complete owned UIA snapshot/provider identities immediately before metadata/
Press, retaining the same root/RuntimeID/current owner, exact Ready caption and
present current-version panel. Both Legacy metadata before/current names must
qualify as Ready before entry. The SDK controller/action/ownership guards stay.

Reserve the same one attempt, perform the same SDK Press and require the
known-present panel to close in complete same-owned after evidence, current
0.9.5/no-startup-error and normal retained exit0. No second press, fallback,
different button, longer unbounded wait, policy or product change. Current
image/package/metadata/getter success alone still cannot pass UI control.

Root operates a fresh hosted run after final paired source/pin review. This
recording performs no native/provider/network action and changes no consumed
source or result.
