# Manual range activation: one fast double-click sidecar gate

2026-10-29. UI review only. No helper modification, original command/input or
new launch. Frozen V4 remains unchanged. ROOT owns the separate sidecar and
live own-instance checks; the one finite6→10 semantic cap is unchanged.

**Observed:** exact screen-coordinate V4 navigation worked. Two activation
button pairs were accepted at the correct point, but issued timestamps were
391ms apart despite the nominal80ms sleep. Full ownership/module hashing between
pairs accounts for additional harness work. The subsequent targeted Ctrl+A
phase returned four accepted posted events, yet the screenshot still does not
prove selected text6. An I-beam appearance alone is not text-focus proof.
No numeric text, Enter or Save has occurred at this checkpoint.

**Hypothesis, not recovered widget behavior:** a faster ordinary double-click
may activate/select the numeric field. The391ms measurement does not prove that
this duration exceeds the proprietary widget threshold; that threshold and its
selection gesture remain unknown.

A single corrected sidecar may make all expensive source/identity/backend/
protected-ledger/capture checks **once before** movement/injection. Set the exact
screen point and immediately recheck actual cursor, visible owned hit, no held
buttons/modifiers and input context. Then submit one atomic SendInput array
`LeftDown,LeftUp,LeftDown,LeftUp`, at the same point with recorded timestamps.
There must be no file hashing, ownership enumeration or sleep *between* these
four events. Move and button array remain non-atomic together. No repeated
navigation, new original instance, field text, Enter, Save or fallback gesture
is bundled with this activation attempt.

[SendInput](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-sendinput)
documents serial, noninterspersed events within an array; it does not establish
text-field selection. [GetDoubleClickTime](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getdoubleclicktime)
describes the system timing limit. [WM_LBUTTONDBLCLK](https://learn.microsoft.com/en-us/windows/win32/inputdev/wm-lbuttondblclk)
documents class-style-dependent Windows message generation; the actual
LWJGL-rendered widget may recognize clicks itself. Neither source establishes
its exact4.3.26 behavior. Do not post a guessed WM_LBUTTONDBLCLK instead.

Return4 means input submitted, never full selection. A partial odd prefix
(1 or3 events) needs only a recorded safety release of our own injected Down;
otherwise stop without another semantic gesture. Preserve receipts, actual
cursor/foreground, canonical source567c and all prior frozen artifacts.
Conditional pointer restoration cannot restore another application's focus.
ROOT must independently see the full existing6 selected before the unchanged
WM_CHAR10/draft10/Enter/committed10/Save gates unlock.

An official historical4.3.19-beta changelog note concerning Match/unconstrained
sampling is a **documentation lead only**. It is excluded from inference about
4.3.26 by AGENTS.md. A future separately gated direct4.3.26 nonzero-mix Match
probe is needed to distinguish sampling stages; this activation sidecar does
not authorize or establish that behavior.
