# Own developer runtime — reused DATA/UI gate

Recorded before implementation. This is a new FBones developer API, not an
original-editor runtime API compatibility claim.

DATA reference agent reused the accepted observations in
[animation DATA](ANIMATION-DATA-4.3.26.md) and its later channel/curve findings:
stored times are frames at project FPS; translation, rotation and shear are
relative to Setup and scale is multiplicative. Before the first key retain
Setup; retain ordered duplicate keys. Reuse our independently authored sampler,
ordered solver and deterministic animation Physics preview, with their existing
numeric fidelity limits. No Spine runtime code, package or assets are inputs.

UI reference agent reused contracts 4/5 in the
[animation UI audit](ANIMATION-UI-4.3.26.md), and inspected the supplied full
workspace: evaluation is transient, Setup does not change during playback, and
the player must run locally without complete-scene IPC per frame. Separating a
headless player from a Pixi view meets that contract. Screenshot evidence does
not prove runtime APIs or timing fidelity.

FBones design: an MIT ESM package with a Node/browser entry and optional Pixi8
entry, a separate versioned game export, explicit capabilities/errors, and
reusable textured regions, weighted meshes, masks, colors and draw order.
`.fbones` project persistence remains the original supported binary profile.
The game export is not a `.fbones` loader or replacement project format.

Distribution: source on GitHub; build/publish only own code and generated type
declarations. Package tarballs install offline; a public npm scope/name is a
later publishing decision. Neither npm ownership nor publication is claimed.
Primary package instructions:
[npm scoped public packages](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/).
Pixi adapter uses installed8.8.1 API/type checks; current official
[Mesh guide](https://pixijs.com/8.x/guides/components/scene-objects/mesh)
is secondary documentation, not original4.3.26 evidence.

Integration observation: the existing native `e2e_seed_import_metadata_fixture`
exports its Mesh texture reference with rectangle width/height0, whereas its
Region rectangle is32×24. Mesh positions/UVs own its geometry. The runtime accepts
finite nonnegative Mesh rectangle metadata and still requires strictly positive
Region rectangles. Reproduced through isolated `NativeHost` seed/open/export;
temporary host root was closed and removed. No original data or guard change.
