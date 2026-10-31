# Manual range input: exact screen-coordinate contract

2026-10-29. Read-only diagnosis and one proposed future adapter correction.
No original invocation/input, V3 helper change, new launch or product edit.
V3 remains frozen; a new probe requires a fresh paired gate and own instance.

## What actually happened

Root's preserved V3 receipts show one owned original process, one successful
navigation click and one activation click triple accepted by SendInput. Navigation
intended screen(1765,442), observed cursor(1765,441). Its fresh screenshot **did**
show the intended manual-ranges inspector, so navigation is demonstrated.
Activation intended(1775,732), observed(1775,731); only its first three-event
Move/Down/Up batch ran. The exact-position guard stopped before the second click.
No full numeric selection, typing, Enter, Save or manual endpoint change occurred.
The original source remained canonical567c; normal clean close is recorded.

These adjacent-pixel differences are observed **coordinate mismatches**. The old
“User/context input” exception does not establish user interference. Quantization
of normalized absolute movement is a plausible transport explanation, not proved
from these two observations. Do not reinterpret the stop as a widget/range no-op.
Private records: V3 `source-end-finite-{navigation,activation}-attempt.json`,
post-navigation captures and `closed-source-end-finite.json`.

## Primary Windows API evidence

- [MOUSEINPUT](https://learn.microsoft.com/en-us/windows/win32/api/winuser/ns-winuser-mouseinput)
  describes0..65535 absolute coordinates and VIRTUALDESK mapping. It does not
  specify a universal exact inverse pixel-rounding formula for this mixed-monitor
  configuration. Therefore adding1 to Y or changing65535/65536 from these outputs
  would be an unproved empirical compensation.
- [SetCursorPos](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setcursorpos)
  accepts screen coordinates directly, avoiding that normalized conversion. It
  may clamp to ClipCursor bounds; a successful return alone is insufficient.
  Microsoft explicitly calls the cursor a shared resource. This proposal is
  controlled test automation with ROOT-authorized movement toward our own window,
  not a claim of exclusive access to the user's desktop.
- [GetCursorPos](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getcursorpos)
  reads screen coordinates. Match these exactly after setting the position, in
  the same declared DPI-aware coordinate context as the own-window capture.
- [SendInput](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-sendinput)
  serializes the submitted array without interspersed other input. It does not
  make a preceding SetCursorPos call atomic with that array, nor prove widget
  acceptance, selection or text editing from a successful return count.

## One proposed correction — no alternative grid or tolerance change

For a future **single finite SourceX End6→10 probe**, replace normalized mouse
movement with one SetCursorPos to the exact newly approved screen point, then a
separate atomic **SendInput LeftDown/LeftUp pair**, with no MOVE/ABSOLUTE flags.
Use this same mechanism for navigation and each of the two ordinary activation
clicks. This removes normalized-coordinate inversion from the path; whether the
field then selects correctly remains an experiment. No actual new adapter is
implemented or exercised by this memo.

Required sequence per click:

1. Bind latest readable capture and ROOT point readback to a fresh own
   PID/start/image/package/backend/HWND/title/source567c, unchanged rectangle,
   visible unoccluded LWJGL point, no modal, no held mouse buttons/modifiers and
   all protected user-process ledgers. Record cursor, foreground and last-input
   state. Never uncover/reposition a window or restore another app's focus.
2. Call SetCursorPos **once**, inspect return and immediately require actual
   GetCursorPos equal to the intended integer screen point. Recheck WindowFromPoint
   and its root/PID, identity, rectangle, source and held-input state immediately
   before SendInput. Changed context stops; no movement retry or pixel tolerance.
3. Submit only Down/Up as one two-event array, record exact event timestamp(s),
   SendInput return count, position and foreground. Count2 means submitted, not
   selected. A partial injected Down receives only one recorded safety Up, then
   stops. Do not repeat the semantic click.
4. Before activation's second click80ms later, require the point still exact,
   own-window hit test unchanged and no new input since the preceding injected
   event. Revalidate before the second pair. A coordinate mismatch and a changed
   input timestamp are different stop reasons; neither alone proves user action.
5. Restore the saved cursor only if its coordinates and last-input state still
   establish our latest injection as the untouched context. If ambiguous, leave
   it alone and record why; never restore foreign focus. SetCursorPos's effect on
   last-input bookkeeping must not be assumed to identify an input's origin.

The move and button pair are **non-atomic together**. Immediate exact-position
and ownership checks reduce the race window; they cannot lock out simultaneous
user activity. Any detected input/context change stops the attempt. Keep ordinary
focus to our own window intentional and disclosed, with no global keyboard,
SetForegroundWindow, Alt or thread-attach workaround.

The existing semantic gates remain: visible inspector → actual full selection
of6 → targeted own-child WM_CHAR10 → exact draft10 → targeted scan-coded Enter
→ committed10 → normal Save → independent typed comparison. No weaker selection,
transport-success or unchanged-file result substitutes for these observations.
Reverse/equal/clear/Match remain blocked until the finite probe is demonstrated.
