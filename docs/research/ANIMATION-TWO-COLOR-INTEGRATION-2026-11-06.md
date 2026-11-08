# Two-color animation integration — 2026-11-06

The current working0.9.4 profile makes **3 of8 supplied copies editable**;
5 remain inspection-only, reject mutation and copy/reopen byte-identically.
The newly admitted source A has116bones,112slots,12clips and190 referenced PNGs.
All8 source/copy hashes and all190 original/session/portable PNG hashes remain
unchanged. No original/user window was operated, no original batch was repeated
and no Windows image was delivered. F105 and the full user goal remain active.

## Recorded decisions before implementation

Paired [two-color DATA](ANIMATION-TWO-COLOR-DATA-GATE-2026-11-06.md),
[UI](ANIMATION-TWO-COLOR-UI-2026-11-06.md) and
[integration contract](ANIMATION-TWO-COLOR-INTEGRATION-CONTRACT-2026-11-06.md)
separate directly observed4.3.26 binary fields, secondary official runtime4.3.13
guidance and explicit FBones policies. Kind4 retains one joint seven-lane key:
Light RGBA/Dark RGB, with one stable identity and no dark alpha. Slot13 fields11/12
retain Setup dark bytes and enablement independently. All18 active-dark source
keys are linear; enabled two-color stepped/Bezier curves remain guarded.

Setup exposes Tint Black and a dark swatch; Animate exposes precise Dark RGB
working fields and the shared color-key action. Dopesheet/Graph use the same key
identity and named light/dark components. Mixed selections cannot silently apply
unsupported interpolation. Dormant Setup RGB survives disablement; disabled slots
sample/key zero dark lanes. Toggling incompatible existing keys rejects atomically.
These controls are FBones choices over observed fields; original gestures and
conflict/clear behavior are unknown. The shared Setup/Animate transform layout stays.

Manual/Auto Key, copy/paste, move/delete, clip duplication, remapping and history
preserve all seven lanes. Light/dark unkeyed intent is independent through ordinary
edits, Save and verified resource publication; a joint key consumes its supplied
intents. Omitted dark values preserve an addressed existing key or the sampled
enabled dark state. Numeric-equal overwrites preserve loaded signed-zero bits.

Main and Preview share one renderer. An owned per-slot Pixi ColorMatrixFilter
implements the black-end/light-end projection, attachment RGB on light only and
combined alpha once. The installed pinned Pixi8.8.1 shader was inspected for
unpremultiply/matrix/premultiply behavior. Region/Mesh geometry, masks, blends,
filter lifecycle and default disabled path are covered by algebra/recorder tests.
Actual Pixi filter programs and ImageLayer construction/destruction pass the
string-code-generation-disabled CSP test. This is not a GPU pixel observation.

## Narrow admission corrections

Three independent gates addressed A's remaining diagnosed equality/evaluation
failures before aggregate capacities changed:

- [Bone time DATA](ANIMATION-BONE-CURVE-TIME-DATA-GATE-2026-11-06.md) and
  [UI](ANIMATION-BONE-BEZIER-UI-2026-11-06.md): a loaded Rotate handle lies outside
  its endpoint interval while the cubic time remains monotone. Rust and TS use an
  exact finite-f32 dyadic monotonicity test, preserving these handles and rejecting
  truly reversing curves. Graph vertical drag retains valid loaded time controls;
  invalid release rejects before IPC. Other timeline families retain their guards.
  A separate10,000-case Rust/TS/Python integer-oracle comparison has zero differences;
  the first subnormal floating-comparison defect and interrupted pipe run remain
  retained beside the corrected file-backed proof.
- [Setup Transform DATA](ANIMATION-TRANSFORM-SETUP-MIX-DATA-GATE-2026-11-06.md)
  and [UI](ANIMATION-TRANSFORM-SETUP-MIX-UI-GATE-2026-11-06.md): source Setup mixes include
  `[0,-1,-1,0,0,0]`. Only the finite Setup-mix range restriction is removed from
  format and common native/TS evaluator preflights. The existing precise extended
  numeric controls already represent these values. The first actual-A None sample
  caught the overlooked common preflight; the correction and failed receipt remain.
  Solver arithmetic, Match, Physics and animation-constraint key/override ranges
  are unchanged. Nonfinite/stale/cache guards still reject atomically.
- [Skeleton bounds DATA](ANIMATION-SKELETON-BOUNDS-DATA-GATE-2026-11-06.md) and
  [UI](ANIMATION-SKELETON-BOUNDS-UI-GATE-2026-11-06.md): Skeleton11/tag24 is four typed,
  finite metadata f32 values retained bit-for-bit, including negative zero. It has
  no UI, Fit, geometry or recomputation authority. Runtime header dimensions differ
  by one ULP, so they cannot replace these editor values.

The paired [capacity DATA](ANIMATION-TWO-COLOR-CAPACITY-DATA-2026-11-06.md) and
[UI gate](ANIMATION-CAPACITY-UI-GATE-2026-11-06.md) authorize measured FBones totals:
4096 all-family tracks,8192 keys and16384Scene domains. Explicit active-clip
512tracks/4096keys, per-track4096keys and native per-family4096-key request bounds
remain. There was no combined multi-family4096-command sum guard, and none was
introduced. Legacy non-Scene domains stay8192; bone/slot/geometry/PNG/cache/file/
depth/generic bounds are unchanged. Complete typed payload equality remains required.
The obsolete native bone-only global512/4096checks were removed; final complete
format validation still precedes history publication.

Synthetic all-family maximum/boundary/domain/malformed cases and a45-clip native
540-track edit/history/save case pass. The native4151-key single-clip candidate
rejects atomically even though its6791 project keys fit the aggregate budget.
Source A contains2203tracks/6764keys/10589domains; its busiest clip has357tracks,
and another clip has2418keys, within unchanged active-clip limits.

## Actual production-store/native Session proof

Current opt-in host SHA
`b781315be78434d1b4980f144e408a76a8b429c94eef0ddc9bb3865f6ab97568`
passes five isolated real Rust Session scenarios using the compiled production
store. They do not use a second JavaScript persistence engine or a browser.

For A,84 sampled local/world/slot/Sequence comparisons pass declared bounds.
Maximum local residual is6.103515625e-5 (bound0.0005), world origin
6.1035156022626325e-5 (0.001), world basis9.499419455494262e-7 (0.00001), and
seven-lane slot residual is0 (1e-9). The checks include the outside-control Rotate
segment and the formerly rejected negative Setup mixes. One atomic bone Translate
and joint-color edit at frame21,100 actual history edits/100Undo/100Redo, resource
refresh, portable Save As and reopen pass. Setup and unrelated source data stay.

The owned debug host's100-history sequence takes11094.79ms wall time; RSS rises
55184→150132KiB (delta94948KiB), and the largest actual DTO is1290135bytes. These
shared-machine/debug allocator measurements cover the100edits. The subsequent
100Undo/100Redo pass separately and are outside that measurement interval. These
are not rendered FPS, release benchmarks or a guarantee for every maximum-size
model. This scope correction follows direct reinspection of the retained driver;
the raw timing/result receipts are unchanged.

An own seven-patterned-PNG fixture passes16 native/frontend samples, all seven
working families with independent light/dark drafts, resource/Save retention
without baking, real joint Auto Key, mixed color/Sequence Paste/history, incompatible
toggle atomicity and dormant-enable/disable/new-light-key zero-dark behavior.
The initial collector compared key IDs across new sessions; only that collector
was corrected to compare reopened semantic keys. The final host rerun passes.

The earlier real3-clip source passes27 Sequence samples, mixed edit/history and
Save/reopen with the same independently checked saved SHA
`69032a14bd95efa5d7238102b953464d306470da6e316212a3a8391e821876b3`.
The real19-clip five-family resource/Save workflow also passes and retains saved
SHA`a4aa2130dc4c94d831569f79176dac2b177b828cf4775ab51556b304ba576cea`.
The separate8-file corpus guard scenario supplies the current3/5 admission count.

## Independent saved-file verification and limits

The [saved DATA result](ANIMATION-TWO-COLOR-SAVED-DATA-2026-11-06.md) checks A's
Save As SHA`eedc3fb8803ea4b720ee6160d2cf59a895d97427cd738d0ea5d72418b7848882`.
Reference-aware Python graph comparison independently preserves every original
object/string alias/reference, tag/collection/trailer and all62,280 original f32
bits. Only the two intended keys and `./audio/`→`./audio` differ. A separate expected
typed model reproduces the whole363467-byte saved payload and deterministic
compressed envelope. This runner uses the product format encoder independently
of Session/history; it is not a second encoder implementation. The Python graph
comparison is independent of that codec. All190 PNG triples hash identically.

Current checks pass:367JS/one existing Physics skip;283native/2ignored;
73Scene format/16default format;95legacy desktop/one ignored; product/UI TypeScript,
production web build, desktop cargo check, strict Clippy and rustfmt. Initial
recorder stub/arena/collector failures are retained with their diagnosed corrections.

Playwright discovers105cases in38files. Zero execute: the production server
fails listenEPERM at127.0.0.1:4173. No flag/CSP relaxation or unchanged retry was
used. Current normal Linux release SHA
`eab5ce1393d1d6b5ce85365a5664de5354919c551acb00b1991ece7597b55652`
builds, but an own empty isolated-profile launch exits101 during GTK initialization;
no current normal window is available. No current Windows/macOS, GPU pixels,
native OS dialogs/drag, original-editor or expanded-profile acceptance is claimed.

Raw scripts, sources, failures and result receipts remain ignored under
`animation-two-color-implementation-2026-11-06/`; its aggregate/source/log pins
are `analysis/animation-two-color-check.json`. The other private experiment roots
are named in the linked pre-code gates. Prior checkpoints remain unchanged.
All24 protected-process receipts were read, without treating historical PIDs as
live identities. Windows selection remains429e4c4f…887c.

Next independent work starts from the retained
[guarded-source triage](ANIMATION-GUARDED-SOURCE-TRIAGE-2026-11-06.md) and paired
[split-axis DATA](ANIMATION-SPLIT-AXIS-DATA-GATE-2026-11-06.md)/
[UI](ANIMATION-SPLIT-CHANNELS-UI-2026-11-06.md). Scalar14–17/Generic116 observations
alone admit none of the other five sources: each exceeds128bones and some have
additional geometry/record limits. Do not combine independent axes by inventing
keys or accept truly reversing time curves without exact semantics. Choose one
bounded decision before coding. Full animation tools and original/platform gates
remain open; deferred broader Match/Physics research stays deferred.
