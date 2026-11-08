# Sequence sampling and frontend/native contract — 2026-11-06

Pre-code coordinator decision, reusing the paired Sequence DATA/UI gates and
independent codec/native gate. The previous goal turn made verified progress
(K/draft fixes, real-source native history/save tests and schema correlations).
The full user goal remains active; this adds Sequence across storage, resources,
sampling and controls rather than merely admitting a previously rejected record.

The bounded data profile is numeric-suffix Region/Mesh settings and key modes
0 Hold, 1 Once, 2 Loop. Unknown records, modes, curves and identities remain
inspection-only. Complete independent payload reserialization remains mandatory.
No original4.3.26 acceptance, interaction or pixel parity is claimed by this work.

Frontend/native sample policy: before the first key use setupIndex; otherwise
use the last key at/before the current frame. Read stored key frames, delay and
project FPS with f32 semantics, then calculate nonnegative elapsed intervals in
f64 as `(frame - storedFrame) / storedFps / storedDelay`. For advancing modes use
floor(intervals + 0.00001). This explicit FBones interval bias follows secondary
public4.3.13 runtime guidance; it is not a newly observed editor4.3.26 boundary.
Use arithmetic floor/clamp/modulo, never a signed32-bit overflow conversion.
Hold retains index; Once holds the last image; Loop wraps through count.

Settings use checked nonnegative integers, count1..4096, digits0..10, checked
start+count-1 within nonnegative i32 (the signed ZigZag wire range) and setupIndex<count. Keys require a supported mode,
integer index<count, finite positive f32 delay and native frame bounds. These
are FBones allocation/authoring budgets, not inferred original control ranges.
Mode/index encoding remains canonical observed f32, with raw frame/delay bits.

Public settings are start/count/digits/setupIndex. AttachmentView includes
nullable sequence and sequenceAvailableFrames (indices whose validated PNG is
loaded). RegionView.image stays the authored resolved base. Clip sequenceTracks
carry stable attachment+slot IDs and key id/frame/mode/index/delay. Commands are
Setup setAttachmentSequence and Animate setAnimationSequenceKeys; the existing
atomic mixed-family batch gains optional sequenceKeys. Shared native move/delete,
copy/paste, duplication, stable-ID remapping and history include the new family.

Main/Preview share one transient projection selecting only image content and
availability. Authored names/paths/dimensions, Mesh UV/weights/vertices and slot
activation stay intact. Missing sampled frames remain visibly missing; there is
no base-image or nearby-frame fallback. Native resource collection enumerates all
referenced suffix frames, including inactive attachments, for portable Save As.
New profile admission must wait for all storage/API/resource/sample paths to be
integrated. Fresh independent original acceptance and current UI pixels remain
separate pending gates when platform capability permits them.
