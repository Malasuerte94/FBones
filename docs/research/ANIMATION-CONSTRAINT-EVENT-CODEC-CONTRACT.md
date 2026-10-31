# Constraint and Event animation codec contract — proposed next profile

2026-10-30. Design only, after the directly observed492c/9b7f records and paired
DATA/UI audits. This document does not authorize product changes while0.9.2
checks or its Windows image are frozen. No new original collection is needed
for the already measured families. New public names below are proposed, not
currently exported crate APIs.

## Evidence and boundaries

Use `ANIMATION-CONSTRAINT-EVENT-DATA-4.3.26.md`, the complete492c tree and
`analysis/animation-next-optional-reference-check.json` (47keys/240scalars), plus
the prior complete9b7f tree for kind30 Reset. Exact owner/type/alias accounting
is mandatory, rather than merely consuming a track prefix. The optional-family
report has no original GPU, trigger, audio playback or Physics phase claim.
IK Compress=1 at frame6 is directly retained raw despite omission from runtime
JSON; preserve it and label the runtime projection NOT_REPRESENTED.

IK Bezier has not been measured. Global Physics-property targets and Reset All
have not been measured. Reject these branches explicitly rather than treating
a null target as an invented global constraint. Audio metadata was measured
with generated WAV while audio playback was disabled. Format support alone does
not establish resource decoding or playable sound.

## Proposed public Rust model

Preserve every existing field/API and the old default bytes:

```rust
// New SceneProject fields. Existing constructors use these defaults.
pub audio_root: String, // old default exactly "./audio"; preserve stored spelling
pub events: Vec<EventDefinition>, // old default empty

pub struct EventDefinition {
    pub name: String,
    pub int: i32,
    pub float: f32,
    pub string: String,
    pub audio: String, // empty means no audio; not an ImageAsset
    pub volume: f32,
    pub balance: f32,
}

// New Animation fields; default empty and retained through existing history.
pub constraint_tracks: Vec<ConstraintTimeline>,
pub event_tracks: Vec<EventTimeline>,

pub enum ConstraintTimeline {
    Ik { constraint: usize, keys: Vec<IkKeyframe> },
    TransformMix { constraint: usize, keys: Vec<TransformMixKeyframe> },
    Physics {
        constraint: usize,
        property: PhysicsProperty,
        keys: Vec<PhysicsKeyframe>,
    },
    PhysicsReset { constraint: usize, keys: Vec<PhysicsResetKeyframe> },
}
pub struct IkKeyframe {
    pub frame: f32,
    pub mix: f32,
    pub softness: f32,
    pub stretch: bool,
    pub compress: bool,
    pub bend_positive: bool,
    pub curve: IkKeyCurve,
}
pub enum IkKeyCurve { Linear, Stepped } // no unmeasured Bezier variant
pub struct TransformMixKeyframe {
    pub frame: f32,
    pub values: [f32; 6], // Rotate, X, Y, ScaleX, ScaleY, ShearY
    pub curve: TransformMixCurve,
}
pub enum TransformMixCurve {
    Linear,
    Stepped,
    Bezier { controls: [[f32; 4]; 6] },
}
pub enum PhysicsProperty { Inertia, Strength, Damping, Mass, Wind, Gravity, Mix }
pub struct PhysicsKeyframe {
    pub frame: f32,
    pub value: f32,
    pub curve: PhysicsCurve,
}
pub enum PhysicsCurve { Linear, Stepped, Bezier { controls: [f32; 4] } }
pub struct PhysicsResetKeyframe { pub frame: f32 }
pub struct EventTimeline { pub event: usize, pub keys: Vec<EventKeyframe> }
pub struct EventKeyframe {
    pub frame: f32,
    pub int: i32,
    pub float: f32,
    pub string: String,
    pub volume: f32,
    pub balance: f32,
}
```

All stored f32 values, frames and controls require bit-aware equality, including
signed zero. Bool IK lanes accept only exact raw positive-zero/one f32 encodings;
unknown values/negative-zero flag encodings stay inspection-only. Integer values
use checked signed32 zigzag. The observed value records materialize every Event
payload; do not replace them with optional fields or infer whether the original
JSON omitted an override. Editing a definition must not silently change existing
key payloads that happen to equal an old default.

Bezier controls use the existing absolute-frame/value convention: each axis is
`[leftOutgoingFrame, leftOutgoingValue, rightIncomingFrame, rightIncomingValue]`.
The right key carries incoming handles on wire. Reconstruct current-or-previous
Bezier blocks, preserve unused sentinel handles and require zero metadata. No
independent incoming curve flag or guessed interpolation lane is added.

## Exact measured records and arena ownership

All families remain custom132, generic key-list204, domain133 key identities.
Use the existing domain/generic arenas and exact traversal; never serialize the
symbolic typed-value names as invented numeric class tokens.

| Family | Kind | Key payload after frame and curve | Target after key list |
|---|---:|---|---|
| IK |7| five f32 lanes: mix, softness, stretch, compress, bendPositive | typed IK56 domain link |
| Transform Mix |8| six f32 lanes; six conditional handle axes | typed Transform65 domain link |
| Physics scalar |23–29| one f32 value; one conditional handle axis | typed Physics121 domain link |
| Physics Reset |30| curve0, no value/handle payload | typed Physics121 domain link |
| Event |12| curve0, statically typed DOMAIN Event value | typed Event-definition35 domain link |

Event definition35 measured field order:
`10:group108, 4:f32, 7:true, 3:zigzagInt, 0:skeletonLink,
8:volume, 9:balance, 2:name, 6:audioPath, 5:defaultString`.
Event value measured field order:
`6:balance, 1:definition35, 2:zigzagInt, 4:string, 3:float, 5:volume`.
The Event-value call site has no numeric class token. It adds a domain identity,
not a generic identity. Its definition and repeated string aliases must resolve
exactly. The definition self-group and its children belong to the same arena.
Skeleton11 field10 contains definitions; field34 stores the audio root. Existing
empty-profile values remain unchanged. Unknown group flags/metadata reject.

IK groups follow the target bone (`IkConstraint.target`), Transform groups its
source (`TransformConstraint.source`), Physics groups its constrained bone.
These are observed owners, not the first affected bone. Their group19 has enum2
and a Bone12 owner. Event group19 is global enum3/null bone; Draw remains global
enum4/null bone. Do not confuse group owner, key target, constraint evaluation
order or Event definition order.

## Canonical grouping and preservation policy

Proposed bounded authoring order extends the existing profile: retain existing
bone-group order (bone tracks, then slot/deform owner extensions), append new
constraint tracks into their matching owner group, then append unseen owners in
first-seen order. Event global group precedes the existing final Draw group.
Preserve stable track order within each owner. Existing files with alternate
family interleaving remain inspection-only through complete reserialization.
This mixed-family ordering is a declared canonical FBones policy; the separate
reference animations do not prove original ordering of every mixed family.

Expose `Animation::constraint_track_permutation(&SceneProject)` and apply its
stable permutation to native parallel key IDs. Event tracks follow definition
order, exposed by an analogous permutation helper. One track per constraint
family/property and one Event track per definition; frame order is nondecreasing
and existing duplicate keys remain lossless. A UI authoring collision rule is a
separate policy. Preserve literal existing key order and allocate no IDs in the
format model.

The measured references each have one Event definition. Vec-based ownership and
first-definition group serialization can reuse the existing group108 mechanism,
but exact multi-definition aliases/order need an explicitly labeled inferred
canonical writer profile and a new own UI-source comparison before a broad
multi-definition acceptance claim. No silent reordering of imported definitions.
The full guard must reject an unrepresentable graph instead of normalizing it.

## Native/TS mapping and transient sampling

Native stable `constraint_ids` map to codec indices only after type/ownership
validation. New `event_ids`, `animation_constraint_key_ids` and
`animation_event_key_ids` use the existing global allocator/history. Their IDs
are session metadata, not extra binary fields. Reorder/remap applies the same
permutation to each parallel key array; unknown/deleted targets reject atomically
until an explicit maintenance policy is agreed.

Proposed TS discriminators mirror Rust: `ik`, `transformMix`, `physics`,
`physicsReset`; constraints/Event references are stable IDs. Curves keep the
existing flat `curve:'linear'|'stepped'|'bezier'` plus optional controls array.
IK uses named booleans and two numeric fields, Transform six values/six axes,
Physics property/value/one axis, Reset frame only. Event keys expose all literal
payload values, independently of definition defaults. Add default-empty
`constraintKeys` and `eventKeys` to the shared atomic batch. Native summaries
expose Setup definitions plus per-animation tracks; no per-frame full Scene IPC.

Sampled coefficient values must enter a borrowed ordered-solver overlay. Keep
Scene/authored constraint layout intact, because current PhysicsState::prepare
compares the full authored Constraint vector and clears springs on changes.
Cloning/replacing animated constraints in Scene every frame would reset springs.
Continuous replay must sample coefficients at its existing integration steps,
not apply the destination frame to all earlier time. Discrete flags use the left
key; before-first keys use Setup. These sampling/playback choices need the paired
UI/docs audit and explicit policy where exact editor observation is absent.
The DATA files prove serialization, not Reset crossings, loops, Event firing or
sound playback. Preserve default live Setup and explicit Simulate-off.

## Bounds and gate before implementation

Keep the existing64-animation,4096-total-key,512-track and actual encoder arena
caps, counting ALL families. Event keys add key133 plus typed value-domain entries;
definitions/groups add their own domains. Check actual Writer counts so output
cannot exceed the reader's8192-domain/16384-generic/depth limits. Reuse existing
name/string/finite/path bounds; any new event-count/audio-size cap is an explicit
FBones policy, not an observed original limit. No dynamic audio decoding inside
the independent format crate.

Next gate: root authorizes the new profile version only after0.9.2 delivery
checks finish. Then expose these types, extend complete reader/writer equality,
verify the entire retained492c/9b7f composites without dropping records, and keep
all older empty/bone/slot/DrawOrder/Deform bytes unchanged. Native/UI implement
real sampled behavior/history/persistence and targeted original/Windows checks.
Unknown IK Bezier/global Physics/audio variants remain inspection-only.

## New IK Bezier enabling gate — before dependent code

The coordinator collected one new no-asset five-key mixed IK case after the
initial draft above: input2290073b…1b2d6d, sourcee996d5bf…63acbbb. Import115080
and export64480 both have retained-handle observed exit0, exact4.3.26/Complete
and no metadata error. `analysis/animation-ik-bezier-reference-check.json`, SHA
9e0f0f0d27861162c5e91eae3942067d7568d749d439099781aa9252c44ba420,
classifies exactly one predeclared whole-graph hypothesis: **two handle axes,
current OR previous Bezier**. Five other2/5/1-axis and presence candidates fail.
The full1288-byte graph plus12-byte trailer,27domains/63generic identities,
all four bone names/parents, expected target/group owner, child/lower membership
and shared constraint-group aliases are independently checked. Terminal key
curve0 is retained; there are no three extra flag-handle blocks. Changing the
three discrete flags does not create additional Graph axes.

This closes the initial IK Bezier unknown in the proposed public contract:

```rust
pub enum IkKeyCurve {
    Linear,
    Stepped,
    Bezier { controls: [[f32; 4]; 2] }, // Mix, Softness
}
```

The five raw numeric lanes remain unchanged. Only Mix/Softness interpolate;
Stretch/Compress/BendPositive stay discrete. Runtime JSON preserves all eight
Bezier control numbers.31 runtime key/control scalar comparisons match the
requested input at zero decimal residual. Raw key frames/value/flag bits match
f32 input; raw handle numbers are checked against the same unchanged5.1e−6
bound. Compress=true remains raw at frames12/18 but is omitted in runtime JSON,
so its runtime numeric equivalence stays false. Global Physics targets/Reset All
remain unmeasured; no other unknown is closed by this one new oracle. No original
render, gesture, IK solver phase or additional collected batch is claimed.

## Implemented0.9.3 codec checkpoint

After coordinator authorization, the format model, complete reader/writer and
bounded validators above are implemented. Public API is now present. Additional
whole-graph facts settled during exact reconstruction are retained explicitly:
Skeleton11/tag40 points to the SAME Event group108 as definition35/tag10; tag53
is true in the audio492c fixture and false in the no-audio9b/default profile.
Tag53's meaning is unknown. `SceneProject.editor_flag_53:bool` preserves it,
defaultfalse, with no runtime inference or user-facing invented meaning.
`audio_root` preserves exact spelling. Legacy conversion rejects nondefault
new metadata rather than silently dropping it.

Event values are separate domain identities, and the per-definition default
string label is reused when a literal key string equals that definition's
string. Unsupported alternative reference/alias graphs still fail the full
reserialization guard. No general Java object/string-identity policy is inferred.
The reader explicitly rejects null/global Physics and Reset targets, malformed
IK float-boolean encodings, unknown typed values and metadata. All families
share key/track and actual domain/generic writer budgets.

`analysis/animation-constraint-event-format-check.json`, SHA
42c740771e22621f0b87954c9fdbcc9839799e3ce3781991125ddbe71876cd26,
records46 passing format tests (41 existing plus five new), strict all-target
Clippy and formatting. New tests exercise every constraint curve family/Reset,
two own Event definitions, audio/default aliases and signed f32 payload bits;
invalid targets/types/curves/string roots/metadata/truncation; canonical
permutations; and4000 Event keys versus4090 exceeding the real domain budget
including Scene overhead. Multi-definition authoring remains a bounded inferred
canonical policy pending new UI-source original acceptance.

Read-only `verify_scene` verifies exact FULL decoded payload equality for retained
492c6552B,9b4779B,IKe9961300B and earlier accepted own Geometry2550B/Slots2550B/
Bones1006B. No original collection is repeated. Codec persistence readiness is
not sampled solver/native/UI/trigger/audio or newly authored original acceptance;
those later integration gates remain pending.

## Actual UI-authored original acceptance —0.9.3

The new native/UI-authored source c910154b (1249B) passed ONE original4.3.26
export, process115048, retained observed exit0/Complete/no metadata error.
Source/copy and the own PCM16 WAV remain unchanged. Independent result
`analysis/animation-constraints-events-ui-original-v2-check.json`, SHA
28157b6768f9437d26ed5423800e08e8ae18d0bb046961f0984d37b17d72faa6,
binds the actual collection receipt and output562fc91e. All42 new keys
(4IK/4Transform/28Physics/2Reset/4Event),40 Setup bone scalars,60 constraint
value bits,64 control bits and12 Event float bits match the complete raw/native
saved/reopened graph.256 runtime numeric comparisons have maximum residual
3.3333333338e−7 under the unchanged5.1e−6 bound. This source has one Event
definition; multiple-definition original acceptance remains unmeasured.

The initial comparator rejected omitted empty slots/skins and then assumed an
omitted Physics Mix key value was0. Both checker failures are retained locally;
no original command was repeated and no project/solver/tolerance was changed.
The versioned comparator accepts absent collections only when expected empty.
Official primary4.3 `spine-ts/.../SkeletonJson.ts` documents Transform Setup
MixY←MixX and ScaleY←ScaleX for mapped channels; timeline MixY←MixX but ScaleY
uses1; Physics timeline Mix defaults1 and other scalar properties0. These are
version-unpinned documented JSON interpretations, separate from the directly
measured exact4.3.26 raw/native bits and actual export omissions. A local source
line-coordinate erratum records the difference between the web-rendered cache
and the pinned downloaded primary source; it changes no comparison.

No Compress/audio fields are unrepresented in this particular source. The older
Compress omission, arbitrary RGBA quantization, unknown Skeleton/tag53 meaning,
original gesture/GPU/audio rendering and Physics phase limits remain unchanged.
The original CLI had audio playback disabled. Own application audio/UI checks
remain separate. Fresh final91 UI bytes are not separately exported: the reuse
report proves that only the complete identity field differs from acceptedc910.
