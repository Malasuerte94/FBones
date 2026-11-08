# F109 — independent developer runtime

Status: **WAITING for broader runtime coverage and npm publication.** The
supported preview is implemented and published on GitHub; full runtime/Spine parity
is not claimed. The user explicitly requested an independent runtime and simple
developer installation, with GitHub/npm as the proposed distribution.

Current package: [packages/runtime](../../packages/runtime/README.md),
`@fbones/runtime`0.1.0-beta.1, MIT, platform-free Node/browser ESM/types and optional
PixiJS8 `/pixi` entry. It bundles our own current animation/geometry/solver code.
The current40,373-byte `.tgz` is attached to
[beta5](https://github.com/Malasuerte94/FBones/releases/tag/v0.9.4-beta.5).
Its31files match reviewed source/dist and its published checksum was verified.
The earlier local archive's standalone offline install proof is retained; Pixi
is an optional peer. npm scope ownership/publication remains pending.

File → Export runtime uses the native destination picker and creates a new
versioned game JSON bundle with referenced PNG/WAVs. It preserves authored Setup,
named keys, constraints/inventory/order/stable references and rejects missing
resources/stale revisions/inspection-only data. It does not bake transient poses,
mark saved, replace binary `.fbones` persistence or distribute source metadata.

Supported preview includes bone channels/linear-stepped-monotone-Bezier curves,
slot colors/two-color/attachments, weighted Mesh/Clip/deformation/draw order,
Sequence/events, deterministic bounded current FBones constraints/Physics.
`runtimeCapabilities` and the README define exact limits and FBones policies.
The player owns no timers, native bridge, filesystem or audio device. The Pixi
adapter owns display objects and leaves caller textures alive.

Proof:16package tests, strict declarations, standalone offline Node+NodeNext
TypeScript consumer,24samples from three real native exported generated fixtures,
and actual shipped-Pixi WebGL pixel/topology/filter/texture-ownership checks under
production CSP. Native Windows File-menu6-group QA and user-confirmed mascot export/Save buttons pass. See the
[integration checkpoint](../../analysis/animation-reliability-check.json) and
[runtime gates](../research/RUNTIME-DATA-UI-GATE-2026-11-08.md).

Remaining scope stays explicit:

- Maintainer-chosen npm scope/registry publication and optional editor download link.
  Versioned GitHub source/archive and gated release automation are delivered.
- Animation mixing/transitions/layers and additional game integration APIs.
- Direct binary authoring-project loading if requested; current API consumes a
  separate game export and must never rename JSON as `.fbones`.
- Unsupported editor profiles/timelines/inheritance/Path and unmeasured exact
  original4.3.26 constraint/dynamics behavior; existing guards stay authoritative.
- Wider platform/renderer/performance coverage and representative real-game use.

Next reproducible action: install the published archive in a game, export its current
editable project with File → Export runtime and run the Node/Pixi example. For
integration verification, build the opt-in e2e-host, `pnpm build:runtime`, then
`pnpm test:runtime`. Do not claim public registry availability until observed.
