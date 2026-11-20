# Spine Professional 4.3.26 on Linux

The user authorized the Linux install and entered the activation code in the
stock launcher. The launcher came from the local Linux archive and was
installed under the user's local opt directory. It was started with
`Spine.sh --update 4.3.26`. The first visible launcher window was handed to
the user. Activation settings and credentials were outside the evidence.

## Direct Linux evidence

An owned copy of the previously measured mixed-curves project was passed to
the stock Linux launcher with these arguments.

```sh
Spine.sh --update 4.3.26 --input own-linux-exact-reference.spine --output cli-export --export json
```

The launcher reported Spine 4.3.26 Professional. The export completed with
exit 0. The source copy and the exported JSON matched their retained exact
Windows counterparts byte for byte. The reference case contains one root and
one animation with four keyed transform properties. REA pinned the launcher,
the Linux editor package, the project and both export identities. The
private source manifest is `rea-linux-spine-install-and-cli.json`.
[Vendor CLI options](https://en.esotericsoftware.com/spine-command-line-interface)

The stock launcher also opened a distinct owned copy in an authenticated
local Xvfb display with Openbox. The guard checked that Spine was absent
before startup, then matched the exact editor stdout, the child Java image,
PID/start time, visible window and explicit test project name. It captured
the Setup view only. No input was sent. The test instance and its window
server reached retained terminal states. This display is separate from the
user's desktop and uses the user's licensed Linux installation.

One preflight failed when the private Openbox process could not find the
packaged theme. A second matched the exact editor window but the capture
process lacked the private X authority. Supplying the retained Openbox data
directory and running capture under the private display authorization
resolved the two failures. The final run kept the 1440 by 900 Setup PNG and
the ownership/terminal report under `owned-gui-final`. REA independently
authenticated the image and report in `rea-linux-spine-owned-gui.json`. The disposable GUI
project copies, private authority files and three owned stale display lock
files were removed. The owned CLI source copy and export remain available.

## Follow-on observations from this installation

The owned Linux GUI and CLI route subsequently proved the two-way
[Graph Swap exchange](GRAPH-TOOLS-2026-11-18.md#exact-graph-swap-gesture-in-the-linux-reference)
and the [Timing Shift property-row scope](TIMING-SHIFT-2026-11-18.md).
Use this installation for new REA, GUI, CLI and format observations.
