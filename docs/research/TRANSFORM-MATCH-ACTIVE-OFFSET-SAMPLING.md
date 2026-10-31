# Active Offset Match sampling — observation and implementation decision

2026-10-30, recorded before dependent native changes. Root's fresh owned exact
Spine4.3.26 instance76268 executed ONE Offset Match and ONE Save, then closed
normally. Private ready/effect/saved, attempt markers and close receipt are in
`.local/research/transform-match-active-offset-confirmed/`. No accepted baseline
Save or Properties action was repeated.

## Proven observation

Before72b1aac437162894bc88f3d35890a1c58f2edf330d1e05f45c13086fd06a586d
and afterfbcae5a1482183f06d9d16911e365329208dedac37107e13fa6d8551e1d5811d
pass the unchanged strict full raw/CRC inspector. Independent DATA comparison
finds ALL SIX computed offset f32 bits equal the frozen first-target,
prefix/selected-excluded hypothesis:

| Field | Value | f32 bits (decimal) |
| --- | ---: | ---: |
| Rotation | -56 | 3261071360 |
| X | 20 | 1101004800 |
| Y | 42 | 1109917696 |
| Scale X | -0.30000007152557373 | 3197737372 |
| Scale Y | 0.4999999403953552 | 1056964606 |
| Shear Y | -28 | 3252682752 |

Authored-only predicts X57 and the current complete-frame implementation X15.5;
both fail. All three wrong-second-target vectors fail every offset bit. All32
bone channels, the complete driver and every primary field except its six
offsets retain exact typed bits, including route order, flags, mix, properties
and24 absent range cells. No evaluated pose is baked. Raw payload byte runs
map to identity, class86.field1, class80.field0 and Project.field7 in addition
to the six offset fields. Non-graph field semantics remain bounded; typed graph
preservation is distinct from byte-for-byte file equality. Independent report:
`analysis/active-offset-sampling-data-check.json`,
SHA168aff70839cfe8656a7affdd955dc712016a1db420778f65540194b3e8e51ab.

## Native decision and boundaries

Route Offset Match through the same internal prefix evaluation already used by
Properties Match: precise cached authored poses, scratch cached Physics, complete
scene validation/layout and constraints strictly before the selected Transform.
Preserve None mode, Pose without time advancement otherwise, stable constraint
ID/type and epoch/revision/document/bone checks, pure matching arithmetic,
public geometry singularity guards, atomic failure and one history action.
No solver arithmetic/clock/format changes are needed.

The measured graph is nonadditive Local/Local with a preceding Transform and no
suffix or Physics. It cannot distinguish prefix from full-stack evaluation with
only the selected constraint excluded. Applying the common prefix rule to suffix,
World, additive or Physics cases remains an explicit uniform FBones policy.
This six-scalar result and earlier48-scalar Properties result do not establish
full computed-bit or complete interaction parity. Old2984 remains unknown-cause;
70596 has a separate user-reported close and contributes no Match datum.

Required focused regressions: exact six measured offset bits; preserve all
unrelated fields; one Undo/Redo/save/reopen; prefix suffix policy; frozen precise
authored poses; scratch Physics and explicit Off; atomic invalid-prefix failure.
Reuse accepted original artifacts without repeating original commands.
