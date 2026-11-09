# Own Linux descendant lifecycle prerequisite

Pre-code UI/ownership review only. A new fixed standard-library console fixture
may test the target kernel's documented process-local PR_SET_CHILD_SUBREAPER/
PR_GET_CHILD_SUBREAPER contract, after DATA checks the installed kernel headers.
The question is whether its own parent can adopt and wait for one known created
grandchild after that child's original parent exits normally. This is not a
global process/security setting or an editor/GUI experiment.

Bind the created old child and its newly spawned own child by parent chain,
PID/start/executable/source receipts before adoption. Require the same new child
to become a direct child of the retained wrapper and observe its exact waitpid
terminal exit0; old parent exit0 and disappearance alone are insufficient.
Bound the fixture's own self-exit duration, discovery and retained output. Stop
on identity/source/parent mismatch, unknown descendants or missing terminal
proof. No unrelated PID selection, signal/kill, original/product operation or
replacement application launch is part of this capability test.

A positive proves only this toy's kernel descendant/wait lifecycle. It can
support separately reviewed real automatic-relaunch observation, without
claiming that a Tauri restart, GTK/WebDriver reconnection, actual installed
upgrade or saved-project restoration has happened. A normal console result
cannot substitute for the future updater-created process and its own bindings.
