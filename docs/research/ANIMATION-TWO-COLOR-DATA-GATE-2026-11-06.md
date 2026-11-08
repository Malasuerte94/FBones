# Source A two-color persistence DATA gate — 2026-11-06

Reference-only before dependent code. Reuse current STATE/F105, the accepted
slot light-RGBA and attachment-tint profiles, the
[paired UI gate](ANIMATION-TWO-COLOR-UI-2026-11-06.md), and retained exact4.3.26
conversion/source receipts. No product edits, original process/input, GPU/browser
retry or shared test run. Budgets remain unchanged; this note does not admit A.

## Direct source and independent runtime correlation

The retained frozen graph reader consumes all363,416decoded bytes including the
exact12-byte suffix of source A. Its complete arenas are retained for independent
cost/schema review, not as a proposed product payload cache. Contrary to the
initial kind20 hypothesis, A has **no kind20**: both light-only and two-color keys
use custom132 **kind4**, with seven f32 values in every class133key.

Existing pinned runtime decoding supplies the independent timeline identities:

| Source kind4 subset | Tracks | Keys | Editor curve codes |
| --- | ---: | ---: | --- |
| Light-only → RGBATimeline | 523 | 1620 | 1094linear,471Bezier,55stepped |
| Two-color → RGBA2Timeline | 10 | 18 | All18linear |

Slot/clip identity and key counts match; frames and values pass the predeclared
absolute0.0005 bounds. Order is `[lightR,lightG,lightB,lightA,darkR,darkG,darkB]`.
All represented values are in0…1. The existing light-only subset's three dark
lanes are exact+0; its unused dark handle components are all exact0x4f000000
sentinels. Each kind4track carries a typed Slot13 reference after its key list,
whose bone matches the enclosing class19owner. Keys/track owners and all f32 bits
must be preserved; never replace editor values with runtime quantized exports.

The coordinator authorized **one new-datum Setup observation**, reusing the
pinned existing official4.3.13 decoder on A only. Its supplied runtime input
identifies4.3.26; all190,200bytes are consumed. This library is a private secondary
grammar tool, not editor4.3.26 or original acceptance/rendering evidence.

Setup Slot13 **tag12** is true on exactly2of112slots, precisely the two whose
runtime Setup dark color is non-null. **Tag11** stores their dark RGB bytes
exactly; those two are white. The110disabled slots retain stored black RGB.
Tag8 is null on every slot and is unrelated to this observed enable distinction.
Tag5 independently matches light RGBA. These are explicit stored enable/color
fields, not a nullable color that may erase dormant stored bytes.

Every tag11stored fourth byte is255, including disabled slots. Runtime dark.a
is0: its RGB loader leaves the Color constructor's alpha unchanged, and the
RGBA2timeline sets only dark RGB. Thus preserve the fourth source byte exactly
but do **not** expose or animate a guessed Dark Alpha channel. Initially reject
other source alpha bytes pending evidence. Enabled black, disabled nonblack,
alpha edits, toggle/merge gestures and their original persistence effects are
not observed; do not describe black as synonymous with disabled.

## Curve and default boundary

The physical kind4grammar has seven lanes and, when current or preceding curve
code is1, seven blocks of incoming x/y plus outgoing x/y and four zero metadata
bytes per block. Existing light-only Bezier cases prove that padding/metadata
layout; active light axes satisfy the current bounded time-control rules. The
18active two-color keys are **linear only**. There is no primary editor proof of
non-sentinel active-dark Bezier handles or an active-dark stepped key in this
sample. A conservative source-A profile can support two-color linear keys while
keeping other enabled-dark curve forms inspection-only until independently
proven. Do not drop the three dark lanes/handles to reuse a four-axis curve type.

Pinned runtime `RGBA2Timeline` statically confirms seven independent channels,
light RGBA plus dark RGB. For the existing full-weight single-clip policy, before
the first key retain Setup light/dark; afterward sample its own key sequence and
keep the final endpoint. This is secondary runtime guidance, not original editor
sampling. Dark values are applied/clamped to0…1 by that runtime; source bits must
remain unchanged. Broader mixing/additive and out-of-range-color behavior stays
outside the current policy. Missing PNG state must not determine color sampling.

## Minimal complete preservation and feature contract

Retain both Setup enable and stored dark bytes in typed Scene data, either
explicit SceneSlot fields or a canonical-default side inventory. Defaults are
`enabled=false,storedDark=[0,0,0,255]`, preserving old canonical bytes and legacy
profiles. Native public DTO may expose enabled plus RGB while retaining the
unexposed fourth byte in the authoritative model. Enabling black and disabling
while retaining dormant RGB must remain distinct representations; unknown source
combinations still fail closed unless a bounded explicit policy is approved.

Add a typed seven-value color timeline/key/curve representation, independently
of the current four-value light-only variant. They share wire kind4 and one
semantic slot-color address: reject conflicting simultaneous light-only/two-color
tracks. Preserve owner/track order, key stable IDs, raw frame/value/control bits,
shared references and exact absence/defaults. A Setup enable change cannot
silently reinterpret/discard animated dark lanes; initially reject incompatible
toggles or provide an explicit separately audited conversion. Do not author a
second fictional dark timeline or add dark alpha. Property-only edits retain
existing frame bits, including negative zero transported by JSON as zero.

A supported worktree feature must span native stable-ID remapping/history,
atomic seven-lane key batches, clipboard/move/delete/duplication, working-pose
retention and resource generation, Graph/Dopesheet channel labels and enabled
controls, full native/frontend sampling and the **actual two-color renderer**.
Ordinary Sprite tint multiplication cannot lift texture blacks and would display
this admitted source incorrectly. The UI/renderer audit owns black-end shader,
PMA and attachment-alpha/tint composition; no rendered-pixel fidelity is established
here. RGB edits must not overwrite source alpha or unrelated Setup/keys.

Before any source admission, require full independently typed writer→reader model
and complete payload equality, including dormant defaults, flags, dark values,
all other records and layout/string provenance. This audit has **not** encoded A
with a new typed writer. Current source A also exceeds track/key/domain caps
(2203/6764/10589), so schema work alone cannot unlock it. A measured model/history/
render/performance budget review is separate; do not raise bounds merely to fit.
Own within-budget fixtures must cover enabled black versus disabled dormant RGB,
all existing light curves unchanged, supported two-color keys, unknown-curve/
alpha rejection, history/save/reopen and no-bake sampling. Independent original
new-file and GUI acceptance remain pending; no compatibility claim follows from
this correlation.

## Private evidence

Ignored `animation-two-color-data-2026-11-06/` retains one full A graph,
`source-a-correlation-v1.json`, the one justified `runtime-a-setup-v1.json`, and
`setup-and-curves-result-v3.json` with reusable scripts/logs. Initial script syntax
failure and the informative stored-alpha/runtime-alpha mismatch are retained;
the final comparison correctly correlates dark **RGB**, preserving editor RGBA
bytes rather than normalizing them to the runtime Color member. No runtime batch
or accepted original oracle was repeated. Source and input hashes are pinned.

## Frozen format API before implementation

Coordinator authorizes format-only implementation with unchanged capacities:
`SceneProject.slot_dark_colors:Vec<SlotDarkColor{slot,enabled,color:[u8;4]}>`,
canonical omission of false/black255, a pure `slot_dark_color(slot)` default
lookup and `normalize_slot_dark_colors` rejecting duplicate/foreign/alpha≠255
rows before sorting by slot index. `SlotRgbaKey` retains its existing four light
values plus `dark_values:[f32;3]`. `SlotRgbaCurve::Bezier` retains four light-axis
controls plus explicit optional three dark-axis controls. No opaque bytes.

The initial strict profile permits enabled two-color **linear keys only**,
matching all observed A keys. Disabled light-only keys require exact+0 dark lanes
and absent dark controls, preserving the old stream. Active-dark stepped/Bezier
and any supplied dark-control block reject until primary evidence; the explicit
type does not enable unknown values. Dormant Setup RGB remains separate from its
enable flag and is retained; only fourth byte255 is currently supported. Native
and UI owners must use the same capability boundary and never silently flatten,
zero or downgrade an unsupported curve. Root owns their integration.

## Format handoff

The independent format crate now implements that typed table and seven-lane
linear profile, preserving dormant Setup data and raw key bits through complete
reader/writer equality. Canonical empty/default metadata retains its old stream;
legacy Scene→Region conversion rejects nonempty dark metadata rather than dropping
it. Unknown alpha bytes, active-dark stepped/Bezier keys, disabled nonzero dark
lanes and supplied dark controls reject. No source/arena/key/resource cap changed.

All62scene-format tests pass (the existing59plus3new), all16legacy-format tests
pass, and strict all-target format Clippy passes. New tests cover enabled black
versus disabled nonblack dormant data, canonical omission/order/duplicates, two
color linear edits with negative-zero frame/value bits and retained layout, raw
payload corruption/truncation, unknown alpha/curve/lane rejection, and unchanged
unrelated typed data. Initial own-fixture empty/default-animation assumptions
failed without changing guards; corrected fixtures retain those failure logs.

Both previously supported real sources still independently reencode every byte
of their27,253and18,674-byte payloads. A remains outside unchanged budgets; this
handoff does not claim its full typed encode/decode, native editability, rendering
or original acceptance. Native/frontend owners must complete the same strict
capability contract before enabling the feature. Private final aggregate/source/
log pins are `animation-two-color-data-2026-11-06/codec-result-v1.json` and
`codec-evidence-v1.json`; the earlier `reference-evidence-v1.json` preserves the
pre-code gate and research chronology.
