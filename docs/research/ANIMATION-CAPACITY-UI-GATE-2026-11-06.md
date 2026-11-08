# Aggregate animation capacity — pre-code UI confirmation

2026-11-06. Read current STATE/TASKS, the retained capacity DATA audit and current
workspace, timeline, Tree, Preview and viewport publication paths. This is a
source-level cost-boundary audit. No product edit, shared check/build,
browser/platform/original operation or performance measurement occurred.

Coordinator reports that the independently gated known-field corrections now
produce full363,416-byte typed A payload equality in the private proposed-capacity
copy. The capacity decision under review is **aggregate4096tracks/8192keys,
SceneDomains16384**, with explicit **per-clip512tracks/4096keys**. All bone, slot,
attachment, geometry, resource, canvas, duration/frame and other structural caps
stay unchanged. A has12clips,116bones,112slots and2dark slots; its largest active
clip has357tracks/2418keys. Private codec equality is not native/UI admission.

## Active clip drives the expensive UI paths

`useAnimationWorkspace` keeps the native animation inventory but resolves one
`activeAnimation` by ID. Bone timeline projection and sampling use that clip.
Slot, constraint/Event, draw-order/deform and Sequence composables receive that
same active ref. Their display tracks, key selection, sampling, key-value edits,
interpolation, clipboard and move/delete routes do not concatenate all clips.
Automatic preview End also inspects the active clip. Switching clips resets
gesture/selection context and recomputes those active projections.

`App.vue` passes these active track arrays to AnimationTimeline. Its `allTracks`
combines **families of the active clip**, not all animation inventories;
`allKeys`, Graph curves/handles, overview, marquee and frame grid operate on those
props. Deep key-array watchers likewise cover only those active arrays. Synthetic
empty rows depend on the unchanged bone/slot/constraint inventory and current
selection. Increasing aggregate limits while retaining the explicit per-clip
limits therefore does not increase this existing worst-case active key/track
bound. A's357/2418 is within that bound; this is not a measured responsiveness
or frame-rate result.

Tree and Preview enumerate all animation **names/buttons**, and the timeline
selector lists names/IDs. They do not instantiate one timeline or canvas per
animation. Preview owns one canvas/ImageLayer and draws the shared rendered
bones/viewSlots of the selected clip; Main uses the same projected scene. The
two dark slots add their already reviewed per-slot filter path, not one filter
per color track or per stored clip. Geometry/selection/Fit remain governed by
the existing scene limits and actual geometry. No all-clips rendering/path bug
was found in this audit.

## Aggregate costs remain real at publication boundaries

The workspace retains the complete native summary, including all clips. Native
edits/Save/resource actions publish that summary after their Promise succeeds
and the existing document/revision/logical/intent guards accept it. Such actions
can allocate/rebuild native history, DTO/JSON, frontend animation arrays and
deep resource-continuity comparisons across the entire inventory. More global
keys therefore increase memory and completed-action serialization/validation
cost even though active sampling bounds stay fixed. A codec clone benchmark
alone does not measure those wrappers or the browser heap.

`ProjectViewport`'s animation tick advances the active preview clock; it does not
reassign the project summary or send the full scene over IPC per frame/pointer.
Animation Physics uses the active clip in its frontend preview runtime. Native
evaluation/freeze/checkpoint calls remain their separately guarded operations;
event-triggered audio/resource calls are not full-project per-frame publication.
The proposed aggregate bounds do not authorize changing these routes.

The timeline is still an ordinary DOM/SVG view without key virtualization, and
valid large frame extents still drive its existing ruler construction. Those
pre-existing active-clip/frame bounds are not a browser performance guarantee;
do not infer smooth interaction from unchanged limits. The earlier oversized
automatic-preview fix still keeps blocked candidates out of the ruler.

## Decision and next evidence

No UI product change is required for the aggregate-only increase with the
explicit old per-clip limits and unchanged scene/resource/canvas budgets.
Proceed to the coordinator's **actual native Session/history/DTO cost gate**:
full A Open, every clip's sample/key/edit/history/save/reopen semantics, stable
IDs/source bits, memory and completed-action serialization under the proposed
limits; independent aggregate and per-clip over-bound rejection must remain.
Report the next blocker rather than bypassing equality or other validators.

Actual browser interaction, native WebView/platform behavior, GPU blending/
pixels, full A frontend responsiveness and original independently encoded
acceptance remain pending. This source audit supports that next measurement;
it does not replace it or authorize broader capacity relaxations. Root owns the
single STATE/task checkpoint and integration/admission decision.
