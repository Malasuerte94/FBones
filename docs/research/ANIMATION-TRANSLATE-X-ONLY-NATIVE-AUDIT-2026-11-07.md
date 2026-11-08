# Translate X-only mode1 — native pre-code audit

Research-only prerequisite for the independently observed17 E mode1 rows with
nonempty TranslateX and no TranslateY. This audit does not broaden mode2 Scale,
Y-only/both-empty configurations, nonmonotone curves or E's separate slot/mesh
budgets. E remains guarded; no fifth editable-source claim follows. Root owns
paired DATA/UI gates and the explicit implementation start.

## Existing native paths

`animation::check_representation` tests the typed per-bone mode, not presence of
a sibling track. A mode1 bone therefore already accepts TranslateY input with
`keyId:None` when no Y track exists. `set_keys` creates that track and a fresh
monotonic native key identity in the existing bone group. Combined Translate
and scalar commands on an unconfigured bone still reject; no mode row is created
by a key command. Padding, finite/time/curve and source-bit checks remain common.

The sampler initializes both physical axes from Setup and changes only the
addressed scalar axis. Without Y keys, Setup Y is retained at every frame. A
first Y key retains Setup Y before its frame and applies its authored scalar
thereafter. No source X key, sibling curve or Setup field needs recomputation.
Frozen animation-key context validates document/revision/epoch/clip/frame and
bone identity without requiring the keyed channel to have existed already; it
does not prevent a deliberate first-Y key.

Deletion removes selected keys and erases an empty track/parallel-ID vector. It
does not erase split configuration. Under the proposed narrow format policy,
removing the last Y key can therefore retain mode1 plus X without runtime logic
changes. Removing the last X must fail the complete final format validation,
even if Y remains or both axes were requested for deletion. Candidate changes
and ID allocation are private until that validation/history commit succeeds.
Partial mode2 Scale remains invalid. Do not remove configuration or fabricate
an X key to make a deletion succeed.

`scene_wire::reconcile` retains surviving group/track positions, appends a new
semantic Y selector to the existing owner group, removes a deleted Y selector,
and aligns the family vector with parallel native IDs before normalized encoding.
Ordered mode rows map through stable bone IDs on structural reordering and clone
on clip duplication. Typed mode/alias/object ownership remains independent from
whether Y exists. Deleted Y IDs must not be reused when Y is later recreated;
Undo restores the old snapshot and its old IDs. Existing dangling-key bone-delete
rejection remains; this change does not authorize dropping tracks.

## Current assumptions that actually need work

The format validator currently requires both axis selectors for each mode. DATA
owns changing only mode1 to require nonempty X and permit optional nonempty Y;
mode2 stays paired and empty tracks remain rejected. Native core has no additional
complete-pair predicate in the audited paths, so no native runtime change is
currently justified by source inspection alone.

`animation_split_tests.rs` currently expects deleting all TranslateY keys to
reject. That assertion must become a positive mode/X-preservation test, with
new last-X rejection and retained Scale-pair rejection controls. Existing raw
frame/value/control bits, padding, duplicate/ID and curve-neighbor regressions
must remain. Source docs describing all mode1 rows as complete pairs need the
new narrow observed exception, without weakening the rest of the profile.

## Own fixture and integration plan after explicit start

Add a separate own X-only fixture/opt-in seed, derived from the bounded existing
mixed-family split fixture by removing only bone1's TranslateY track and retaining
its ordered mode1 row. Keep the complete Scale pair, ordinary channels, all other
families, source-zero Mesh marker and seven numbered PNGs. Rebuild the typed wire
layout/strings normally; never bypass the decoder. Keep the existing fixture and
its consumed receipts unchanged.

Focused native evidence must cover source encode/decode equality; missing-Y Setup
sampling; first-Y creation and one-history Undo/Redo; deleting/recreating the last
Y with fresh IDs and unchanged X/mode/source bits; last-X/Y-only/both-empty and
partial Scale atomic negatives; mode order through reparent/duplicate; mixed
batch/paste into compatible mode1 and rejection in an ordinary target; portable
Save/reopen and source/resource preservation. These tests remain pending until
DATA/UI gates and coordinator start; no native source/test edits were made here.

The real store integration must also exercise manual Y and shared-family Key
(the latter deliberately authors both axes), dirty K/Auto Key addressing only
changed axes, and an unkeyed Y working value while X is keyed. Current frontend
`animationBoneChannels` already derives both Translate axes from X presence, so
retention captures Y even when its native track is absent. This is a source-level
observation, not proof of publication behavior. Important asynchronous cases are
first-Y key pending while the user reverts Y to the old clean Setup value; pending
X while Y changes/clears; explicit discard/seek away-back; stale document/revision;
Save/resource retention without baking. Existing per-field intent generations
and guarded resource publication must preserve those distinctions. Do not infer
correctness solely because full-pair tests pass.

Browser/original behavior remains unobserved. The intended first-Y/deletion/manual
family controls are explicit FBones authoring policies supported by the narrowed
persistent model, not new original-editor gesture or inversion proof.
