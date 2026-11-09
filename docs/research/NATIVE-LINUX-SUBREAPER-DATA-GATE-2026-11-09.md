# Own Linux descendant-terminal capability: DATA gate

Before implementation. This is one data-free process-provider question, not
another app installation, GUI gesture, original observation or upgrade test.
The actual Linux stock-app Stage1 provider and retained original-child exit0
are accepted; automatically restarted descendant adoption/wait status remains
unproved. A new own fixture can determine whether a controller can retain an
orphaned descendant's actual terminal status rather than infer it from absence.
The stock0.9.5 lockfile selects Tauri2.12.5. Its retained `src/process.rs`
(SHA256 `4bd9af755113e8ed6230cb301748a12ec454e490ade398d397bf518e5d4f0075`)
implements restart by spawning the selected current binary, then exiting0.
That concrete source topology makes orphaned-descendant terminal observation
useful; it does not prove the actual installed-app upgrade/relaunch outcome.

Local `/usr/include/linux/prctl.h` declares PR_SET_CHILD_SUBREAPER36 and
PR_GET_CHILD_SUBREAPER37. The maintained Linux
[SET manual](https://man7.org/linux/man-pages/man2/PR_SET_CHILD_SUBREAPER.2const.html)
defines this as an attribute of the calling process: orphaned descendants move
to their nearest living ancestor subreaper, which can wait for their status.
It is not a global OS setting. The
[GET manual](https://man7.org/linux/man-pages/man2/PR_GET_CHILD_SUBREAPER.2const.html)
specifies readback into an int; [waitpid](https://man7.org/linux/man-pages/man2/waitpid.2.html)
describes termination status for an exact waited child. Documentation does not
prove the hosted runner's capability before observation.

One fresh own Python controller process may set/read back only its own flag
using stdlib ctypes/libc and constants validated against the local kernel
header. Create exactly one own old child; it creates one own new child with
fixed own source, arguments and NUL/direct-owned-file standard streams. No
anonymous pipe, arbitrary PID input, GUI, product, original, global setting,
signal/kill, debugger or memory operation. Do not set this flag in an existing
agent, driver or user process merely to demonstrate it.

Retain old-child Popen identity and its exact normal exit0. Before old exit,
record the new child's self PID/start/executable identity and parent=oldchild.
After old exit, require the same new PID/start/executable and parent equal to
the new controller. Keep that controller alive and waitpid only the recorded
adopted descendant; require an actual waited PID and WIFEXITED/exit0, with raw
wait status distinct from signal death or /proc absence. Receive both start and
adoption receipts before relying on a recycled numeric PID. Files/receipts are
fresh and bounded, with finite self-exit waits; no forced cleanup or blind retry.

Success proves only this own orphan-adoption/terminal provider. It does not
establish Tauri restart topology, WebDriver reconnection, GTK/AT-SPI, automatic
0.9.6 relaunch, install authorization or persistence. Those must still be
observed on the separately reviewed real app sequence. Failure stops use of
this provider and retains the diagnosed own result, not a claimed upgrade.
