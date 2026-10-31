# F308 sparse Offset/Mix controls: DATA gate

2026-10-29. Reuses accepted exact4.3.26 evidence; no original command, input,
accepted-batch rerun or product change by this worker. The paired UI handoff
owns the observed control visibility. This memo specifies its persistence
boundary before the dependent UI change. **Corrected before code after direct
capture review:** source-only filtering is insufficient for Offset translation;
the observed Translate row exposes both X and Y.

## Proven data and index contract

`analysis/transform-match-reference-check.json` contains the accepted
offset-mixed/properties-mixed before/after snapshots. Their ordered From rows
are ScaleY and X; destinations are ScaleX, Rotate and Y. Thus the sparse
source set is {X,ScaleY}, and the destination set is {Rotate,Y,ScaleX}.
The exact mixed inspector captures show the corresponding controls, as recorded
in `TRANSFORM-MATCH-UI-4.3.26.md`. No fresh observation is needed.

Transform65 independently stores six global offsets and six mixes regardless
of the route graph. Canonical property/index correspondence is:

| Property | offsets/mix index | Raw meaning |
| --- | --- | --- |
| rotate |0|Rotation offset / Rotate mix|
| x |1|Translate X offset / X mix|
| y |2|Translate Y offset / Y mix|
| scaleX |3|Scale X offset / Scale X mix|
| scaleY |4|Scale Y offset / Scale Y mix|
| shearY |5|Shear offset / Shear mix|

Direct review of own `match-offset-mixed-before.png` shows Offset Translate
**X11 and Y−13**, although the only translation source is X. Its Scale row
shows only Y−.1; ScaleX is blank. Therefore the observed Offset indices are
{1,2,4}, not the source set's {1,4}. Translation is presented as a paired
Offset group in this world-source/local-target fixture. The image does not
settle whether that exception changes with spaces or a Y-only source.

Mix controls follow the union of **destination To properties**: Rotate,
TranslateY and ScaleX have values; TranslateX and ScaleY are blank. Deduplicate
repeated destinations for presentation, preserving ordered route data. Do not use
the From-array position, filtered UI position, a bone channel tag or editor
range-cell position as the six-channel index.

All six before-offset values are nonzero:7/11/−13/.2/−.1/19, although only X
and ScaleY have source routes. Properties Match preserves all six offsets and
mixes while changing only routes and nullable editor ranges. Offset Match
changes **all six** offsets, including channels without visible source controls;
visibility therefore does not imply that the remaining stored values are
absent or disposable. The sparse raw records and nullable tag31 cache remain
separate representations.

## Concrete dependent UI policy

Render source-related Offset controls with the directly observed paired
Translate X/Y exception whenever a translation source is present, and one Mix
control per used destination property, retaining the canonical index above.
Generalizing the translation pair to other source-space/Y-only combinations is
an explicit FBones grouping policy beyond the single observed sparse fixture.
Current
`ConstraintInspector.vue` fieldValues already reads all six values; patchFor
copies the complete current six-tuple and replaces only the requested indexed
cell. Keep that preservation behavior when filtering the rendered rows.

A single visible edit must leave hidden offsets/mixes bitwise unchanged.
Changing/removing a route must not zero or normalize hidden channels, destroy
nullable editorRangeBits, reorder routes/targets, or create extra authoring
edits just to synchronize visibility. Adding a route reveals its existing
stored channel value. These are explicit FBones lossless-edit policies,
supported by the independent stored fields; an original route-switch gesture
has not been measured.

## Unknowns and limits

No accepted exact4.3.26 observation here establishes the appearance of both
sections when **no mappings exist**, nor whether a user deleting/adding routes
changes hidden numeric defaults in original. Y-only source and local-source
sparse translation visibility have not been independently observed here.
Do not claim a measured empty
section layout or reset rule. Empty source/destination sets produce no numeric
rows under the stated FBones presentation policy; foldout/empty hint treatment
is a UI choice and must not mutate the project.

This handoff does not implement Match or writable range cells. Their unresolved
formulas and manual interaction gate remain separate.
