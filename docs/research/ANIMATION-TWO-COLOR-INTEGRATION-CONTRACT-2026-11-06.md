# Two-color slot integration contract

Pre-code coordinator decision,2026-11-06. Reuses paired
[DATA](ANIMATION-TWO-COLOR-DATA-GATE-2026-11-06.md) and
[UI](ANIMATION-TWO-COLOR-UI-2026-11-06.md). Target is the actual116-bone,
112-slot source A, not a claim that isolated dark-color decoding admits it.
Scalar-axis findings remain retained separately; they alone admit none of the
six guarded sources. Full F105 and all six-source compatibility work stay open.

## Model and transport

Keep editor kind4 as one joint seven-scalar key identity: light RGBA plus dark
RGB. No dark alpha, separate dark timeline or invented custom20 record.
`SceneProject.slot_dark_colors` stores typed slot address, enable flag and the
complete stored RGBA bytes; default disabled/blackFF is implicit. Preserve the
dormant RGB independently of enablement. AlphaFF is the supported metadata
profile, not runtime opacity. Slot12 and Slot11 map those Setup fields.

Format/native own exact f32 values, stable references/history and full payload
reserialization equality. Existing light values/controls retain their public
four-component shape; additional `darkValues` and optional `darkControls` retain
the three extra wire components. The native view publishes both; optional
frontend fields keep old fixtures conservative. Native light-only callers that
omit dark values retain the addressed key's dark values or the sampled dark
state for a new key, rather than clearing it. New UI color operations provide
the whole joint key. Move/delete/clipboard/duplicate/remapping retain all lanes.

Native SlotView exposes `tintBlack` and packed `darkColor`; SlotPose exposes dark
RGB independently of the light color. Setup command is
`setSlotDarkColor {id,enabled,color}`. All changes use native revision/history.
Animate can edit the dark RGB working pose/keys but cannot toggle Setup enablement.
Unkeyed light and dark intent are retained separately through ordinary edits,
Save and verified resource publications. A joint key consumes both supplied
color intents. Invalid color drafts block Save/resource actions and Escape cancels.

## Initial evidence boundary

Actual A's18 dark keys are all linear. The supported enabled two-color timeline
profile is therefore initially linear; existing disabled light-only Bezier/
stepped tracks keep their proven grammar and zero/sentinel dark lanes. Unknown
active-dark curve behavior remains guarded. The model names optional dark
controls explicitly for future work; it must not use raw graph/payload caches.
There is no new original gesture or pixel-parity claim.

Enable/disable operations are explicit FBones controls over the proven Setup
fields. Reject enabling a slot whose color keys have unsupported interpolation;
reject disabling when nonzero keyed dark values would violate the disabled
profile. Never clear, flatten or discard keys to make the toggle succeed.
Dormant Setup RGB remains stored. Original merge/clear/conflict choices are unknown.

Independent UI review caught a pre-integration routing defect: disabled slots
retaining nonblack dormant Setup RGB must sample/key canonical zero dark lanes,
not feed the dormant metadata into a light-only key. Preserve those bytes in
Setup; enablement alone decides whether they contribute to the sampled pose.
The real-composable reproduction is retained in the private UI evidence. This
correction applies equally to frontend sampling and native new-key defaults.

## Rendering, capacity and acceptance

Main and Preview must use one shared color projection. The retained official
runtime4.3.13 provides secondary guidance: dark remaps the black end of sampled
texture RGB; it is not another multiplicative tint. Combined slot/attachment
alpha affects both contributions; attachment RGB affects only light. Preserve
premultiplied-alpha edges, Region/Mesh geometry, masks and existing blend modes.
Default disabled rendering remains unchanged. Own math/renderer checks are
distinct from browser/GPU/OS/original observations.

The source also exceeds existing global track/key/domain bounds. Keep current
bounds during semantic implementation. A capacity change requires measured
actual counts, active-clip cost, bounded synthetic/native history and parser
checks, consistent reader/writer/native limits and retained boundary rejections.
Do not raise bone, geometry, PNG/cache, wire-depth or source-size bounds to force
admission. Even after capacity work, every actual source must independently
decode/reencode completely and pass real native editing/history/save/reopen.
Current unavailable browser/original/platform acceptance stays explicit.
