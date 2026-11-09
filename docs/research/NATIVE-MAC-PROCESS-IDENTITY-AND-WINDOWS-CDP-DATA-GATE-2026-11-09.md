# Native v3 findings and next bounded identity/provider questions

Before new tooling. Preserve consumed run42647352277/source v3. Windows now
passes every unchanged retained PID/start/image/window-owner/visibility
predicate with the exact aa57d9bc… installed image. It stops at missing/ambiguous
CDP listener; no listener rows were retained, so the cause and listener
multiplicity are unknown. Guarded cleanup observes own normal exit0. This is
native startup evidence, not frontend control or installed-upgrade acceptance.

macOS has the exact6824b30a… installed stock image, Aqua/AX true, live created
child1360, matching NSRunningApplication PID/bundle/executable/identifier,
finished-launching true, an own on-screen window and stdout reporting native
UI ready/WebGL. Its strict guard fails because launchDate is nil. No0.9.6 or
upgrade acceptance follows. The retained Process and requested/returned spawn
times were not misrepresented as an OS start time.

## New macOS OS-identity capability, retaining direct Process launch

Apple's [launchDate documentation](https://developer.apple.com/documentation/appkit/nsrunningapplication/launchdate)
says this optional value is available for applications launched by LaunchServices.
The observed nil under direct Process.run is therefore not evidence of a failed
GUI startup. Keep the direct launch and replace this unsuitable start-time
prerequisite only after independently proving an actual OS process identity
provider; do not switch to LaunchServices or fabricate the missing property.

One10–15minute job feasibility pass may compile a tiny own C bridge against the
job's actual SDK `<libproc.h>` and `<sys/proc_info.h>`. Use the SDK's official
`struct proc_bsdinfo`, `PROC_PIDTBSDINFO`, `proc_pidinfo` and `proc_pidpath`;
require the full returned struct size, matching PID, positive start seconds,
microseconds below1000000 and actual executable path/file identity. No handwritten
offsets, replacement struct, memory/debugger provider or guessed field layout.
The [Apple-published header](https://github.com/apple-oss-distributions/xnu/blob/main/bsd/sys/proc_info.h)
defines start seconds/microseconds;
[libproc declarations](https://github.com/apple-oss-distributions/xnu/blob/main/libsyscall/wrappers/libproc/libproc.h)
and [implementation](https://github.com/apple-oss-distributions/xnu/blob/main/libsyscall/wrappers/libproc/libproc.c)
describe the relevant API boundary. These sources support design, not actual
runner capability or an unversioned SDK ABI assumption.

First prove the provider on a newly created own data-free console child in that
VM. Bind the retained creation object/PID, parent relationship, repeated identical
OS start tuple and expected/actual executable file identity, then normal terminal
status. The bridge may query only that created child and subsequently the one
retained created stock app; no general PID/process inventory or personal host.
Capture SDK/compiler/provider pins and actual API results/errors. If unavailable,
short, inconsistent or failed, stop without substituting an approximate time.

Only after that positive may the stock direct-Process child use the provider's
actual PID/start tuple, rechecked with its retained Process liveness before
controls and close. Preserve all existing bundle/image/window/AX assertions.
Expected and queried executable paths may be compared by documented file
identity; do not invent alias equivalence. No TCC change, re-signing, alternative
launcher, product/test ABI or installed-upgrade claim is authorized by this gate.

## New Windows CDP diagnostic: observe before changing provider

Retain the same installed stock image, process route, full readiness assertions,
dedicated profile and loopback debug-port argument. In a new bounded run record
all rows for the expected port: address, port, state and owning PID, along with
created app PID/start/image and bounded actual child-process ancestry/command
line/provider status. Record no unrelated process or network contents. Preserve
the original pre-launch unused-port check and own normal-close behavior.

Missing rows, two listeners belonging to one owned WebView, a foreign owner and
a genuine ambiguous provider are different observations. Do not select the first
row, relax the count/ownership check or alter debug arguments before the new
evidence distinguishes them. Token scope remains metadata-fetch step only;
never log secrets/environment wholesale. This diagnostic supplies no frontend
control or upgrade proof until an actual owned provider is observed and checked.
