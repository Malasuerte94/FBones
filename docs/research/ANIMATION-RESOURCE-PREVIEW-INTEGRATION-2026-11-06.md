# Resource continuity and Sequence preview integration

2026-11-06. Current working0.9.4, F105 active. The paired
[resource DATA](ANIMATION-RESOURCE-DRAFT-DATA-2026-11-06.md),
[UI](ANIMATION-RESOURCE-UI-2026-11-06.md) and
[preview gate](ANIMATION-SEQUENCE-PLAY-RANGE-GATE-2026-11-06.md)
preceded dependent implementation. These are explicit FBones workflow policies;
no new original4.3.26 resource gesture or automatic-range observation is claimed.

## Working behavior

Native Session summaries now distinguish logical document ownership from the
existing resource/evaluation generation. Successful New/Open/replace advances
`logicalDocumentId`; refresh, folder selection, Save and ordinary history retain
it. This is runtime metadata, not a binary schema field. Every Session summary
uses central stamping; failed/exhausted replacement is atomic.

Only the two image-resource callbacks may retain drafts across a resource
generation. The live invocation document/revision must still match; returned
logical identity must match, resource ID/revision must advance by one, and the
complete authored summary projection must compare exactly, including negative
zero. Only known library/availability/history/save flags may differ. Ordinary
edit/Save stale guards remain unchanged. Object/vertex/weight selection and
clipboard ownership use logical identity; image/audio/pose/checkpoint authority
still uses resource generation. Old leases remain invalid.

The publisher restores current dirty/newer property intent for all seven working
families, with no consumed fields. It does not restore a discarded/changed
context, publish malformed/stale replies, key values or bake a sampled pose.
Invalid raw fields stop both actions before transport. Valid pending edits finish
first; failed pending edits prevent the queued resource action. Explicit Simulate
off survives. Missing Sequence PNGs stay unavailable, without substitute frames.

Transport derives an automatic preview End from the final running Sequence key
of each track, independently of stored last-key duration. Loop gets a full cycle;
Once gets its remaining images including a final-image interval. Later Hold
supersedes an earlier running key. Explicit bounds remain authoritative; no key
or duration field is serialized as a workaround. The helper recovers f32 clocks,
delay/key time and native short-JSON duration. Excessive automatic ranges require
an explicit End and never expand the ruler to the raw huge candidate. Play checks
range and initial Event budget before discarding a working pose. Controls and
store validate a cleared End against the same automatic fallback, separately
from effective/display extents; rejected text restores accepted bounds.

## Own native and real-source evidence

Reproduction lives in ignored `resource-preview-2026-11-06/`. The scripts call
the actual production workspace/composables through the rebuilt isolated Rust
Session host, SHA256
`543c1286f168cf36e9f8545c1843e99443a312397f2240621f6d63557807cdec`.
The small generated fixture and PNGs are ours; title/window API stubs provide no
browser/OS input, rendered-pixel or original-editor evidence.

`native-integration-v3.mjs` / `native-integration-v3-result.json` prove:

- All seven working families survive refresh, canceled folder selection, a new
  copied folder and Save As. Native Setup/geometry/keys/settings/tints remain
  unchanged; binary reopen excludes all unkeyed values. Stable selection and
  mixed bone/Sequence clipboard survive; actual native mixed Paste/Undo works
  afterward. A real new geometry freeze includes the retained bone/deform pose.
- Removing an own numbered PNG truthfully marks that selected Sequence frame
  unavailable. Switching to the complete copied folder restores availability.
  Old image requests reject `ProjectChanged`; old native geometry leases reject
  specifically `StalePose` at the new revision. Frontend rejects the old lease
  before IPC. Refresh/new folder never enables explicitly disabled simulation.
- A single Loop key0 keeps stored duration0, default Play runs a9-frame preview,
  frame3 selects red8 in both frontend and native sampling, and explicit End3
  overrides the range. Save/reopen retains exactly that one Sequence key at0
  and duration0. Playback authors nothing.

`actual-resource-native-v1.mjs` / result repeats the actual workspace resource
and Save/Save As route on the supplied19-clip source, staging five applicable
working families. Both resource operations retain them without baking or keying;
source/resource hashes remain unchanged. Its saved SHA256 remains
`a4aa2130dc4c94d831569f79176dac2b177b828cf4775ab51556b304ba576cea`,
identical to the prior independently checked Save result. Personal sources and
assets remain ignored. This does not recollect an original oracle batch.

## Integration checks and retained failures

Full JavaScript:344 pass, one existing Physics skip. Native current274 pass,
two ignored; legacy95 pass, one ignored. Scene format59 and default format16
pass. Product/UI TypeScript, production web build, cargo check, strict Clippy and
rustfmt pass. Tests cover newer clean reverts, clip/discard/replacement, invalid
raw fields, authored-model/signed-zero mismatches, pending success/failure,
selection/weights/locks, sampled preview/Event timing and controlled range text.

The first full JS attempt rejected an outdated fake with no logical identity;
only the fixture was corrected to the native contract, then all tests passed.
The first own integration collector tried structuredClone on Vue proxies; v2/v3
use recursive plain snapshots. Both failed receipts remain retained. Separate
review caught the automatic/effective End mismatch; the compiled component plus
real workspace regression verifies rejected clears restore the accepted End.

Playwright discovers104 cases, including two new native resource/zero-duration
Sequence cases. Zero browser cases executed: the rebuilt production server
fails `listen EPERM` on127.0.0.1. The first private report-isolation configuration
used a wrong web-server cwd; v2 corrects cwd and retains that initial failure.
No flags/CSP or assertions were weakened. Current Linux launch and all source,
document and receipt pins are in `analysis/animation-resource-preview-check.json`.
Windows WebView2, OS dialogs, macOS, Main/Preview pixels and fresh original
expanded-profile acceptance remain unobserved; full F105 stays active.
