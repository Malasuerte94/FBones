# F307: own open-file metadata provider

Question: can documented Windows Process Snapshotting return a held-open known
own file's handle/name from a newly created own console process? This is a new
provider question after the bounded class-memory negative, not another signature
scan. DATA/UI first reused the inventory; no prior PSS capability was found.

Use exactly HANDLES|HANDLE_NAME_INFORMATION (0xC), context flags0. No VA clone,
thread capture, process-memory content, debugger, injection, privileges or
OpenProcess/PID fallback. The controller retains the handle from its sole own
CreateProcess, verifies image/file identity/PID/start, and the child holds one
pinned own temporary file through READY and a20second ordinary lifetime. It then
closes its handle and exits normally. No original editor is involved.

One capture/walk: at most4096entries,512KiB serialized output and15second loop
deadline. A blocking native call cannot be canceled by that loop; record any
overrun and retain owned lifecycle rather than claiming a hard wall-time cap or
forcing cleanup. Emit only the expected own-file name and redacted counts for
other entries. Match the child-reported handle plus complete normalized native
file name/file identity; never compare W: text naively or open arbitrary names.

API results are DWORD error codes; only ERROR_NO_MORE_ITEMS completes the walk.
Check validity flags and even bounded byte lengths; names may lack NUL and are
copied while their walk marker is alive. There is no File object enum: use valid
TypeName where supplied. Never close a target-owned handle. Free the walk marker
and local snapshot under documented ownership, then retain normal child exit.

Primary contracts: [capture](https://learn.microsoft.com/en-us/windows/win32/api/processsnapshot/nf-processsnapshot-psscapturesnapshot),
[entry](https://learn.microsoft.com/en-us/windows/win32/api/processsnapshot/ns-processsnapshot-pss_handle_entry),
[walk](https://learn.microsoft.com/en-us/windows/win32/api/processsnapshot/nf-processsnapshot-psswalksnapshot),
[free](https://learn.microsoft.com/en-us/windows/win32/api/processsnapshot/nf-processsnapshot-pssfreesnapshot).
Cached SDK header/import declarations are available; actual target-platform
operation remains unproved before the own test. A positive identifies currently
open files only, not which archive supplied a class. Closed/transient archives
may be absent. A later original-owned file observation needs its own bounded
selection/isolation review, excluding unrelated profile/license/personal paths.
No original run or Physics math/bounds change follows from this own-only gate.
