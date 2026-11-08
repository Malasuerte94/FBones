# FBones runtime (preview)

An independent MIT animation player for Node/browser games, with an optional
PixiJS8 view. It contains FBones code and does not import a Spine runtime.
The first release is a bounded preview, not full Spine runtime compatibility.

Source lives in this checkout's `packages/runtime` within the editor's
[GitHub repository](https://github.com/Malasuerte94/FBones). Tagged prereleases
attach an installable runtime archive after their required checks pass; see the
[release page](https://github.com/Malasuerte94/FBones/releases) for actual
available downloads. `@fbones/runtime` is the intended npm name; a GitHub release
does **not** establish npm scope ownership or registry publication. You can also
build a tarball locally:

```sh
pnpm install
pnpm build:runtime
mkdir -p artifacts/runtime
npm pack ./packages/runtime --pack-destination ./artifacts/runtime
```

In a separate game project, install the resulting file, including offline:

```sh
npm install /path/to/fbones-runtime-0.1.0-beta.1.tgz
# Only if the game uses the Pixi view:
npm install pixi.js@8.8.1
```

GitHub hosts source, issues, examples and gated release tarballs. npm can provide
the normal version-pinned developer install once a maintainer owns the scope
and publishes the package. This release does not publish the registry name.
Direct GitHub installation from the repository root installs the editor project,
so use the runtime archive for this monorepo package.

## Export from the editor

Open an editable project and choose **File → Export runtime**.
Select a destination folder. FBones creates a new bundle containing:

```text
FBones-runtime-<unique>/
  skeleton.fbones.runtime.json
  images/<image-key>.png
  audio/<sound-key>.wav
```

Serve the folder with the game or load its JSON in Node. The JSON is a separate
game export with a versioned schema; `.fbones` projects remain binary. This
package does not parse editor `.fbones` or `.spine` project files. The exporter
copies supported cached resources and refuses unavailable required files.

## Node or a custom renderer

```js
import {readFile} from 'node:fs/promises';
import {FBonesPlayer} from '@fbones/runtime';

const json = await readFile('hero/skeleton.fbones.runtime.json', 'utf8');
const player = new FBonesPlayer(json);
console.log(player.animationNames);
player.play('walk', {loop: true});

const pose = player.update(1 / 60); // delta seconds, called by your game loop
// pose.bones: local values plus evaluatedWorld {x,y,a,b,c,d}
// pose.slots: activated/deformed geometry in final draw order
// pose.events: forward event crossings for this update
```

`pause()`, `resume()`, `stop()` and `seek(seconds)` control the player. Seek
replays deterministic Physics from zero and fires no events. `duration` is in
seconds, including the same image-sequence tail policy as the editor preview.
`play()` returns initial frame-zero events; process its return value if those
are needed. Repeated paused/zero-delta updates do not refire cached events.
The player owns no timer, native bridge, filesystem, network request or audio
device. Applications decide whether/how to play sounds from event definitions.

## PixiJS8

```js
import {Application} from 'pixi.js';
import {FBonesPlayer} from '@fbones/runtime';
import {FBonesView, loadRuntimeTextures} from '@fbones/runtime/pixi';

const app = new Application();
await app.init({width: 960, height: 640});
document.body.appendChild(app.canvas);

const jsonURL = new URL('./hero/skeleton.fbones.runtime.json', location.href);
const response = await fetch(jsonURL);
if (!response.ok) throw new Error(`Export load failed: ${response.status}`);
const player = new FBonesPlayer(await response.text());
const textures = await loadRuntimeTextures(player.data, new URL('./images/', jsonURL));
const view = new FBonesView(key => textures.get(key));
view.position.set(480, 500);
app.stage.addChild(view);
player.play(player.animationNames[0]);
view.sync(player.frame);
app.ticker.add(ticker => view.sync(player.update(ticker.deltaMS / 1000)));
```

The Pixi entry registers static implementations for a strict production CSP.
It does not require allowing JavaScript evaluation. The headless entry never
imports Pixi, DOM, Vue, Pinia or Tauri. The view converts authored Y-up coordinates
to Pixi Y-down once, so position/scale the view like an ordinary Container.
It reuses nodes and mesh vertex buffers; it recreates geometry when the active
attachment changes. Clipping ranges, inverse/convex masks, two-color slots and
normal/add/multiply/screen blend modes reuse FBones's existing render math.

`view.destroy()` disposes its nodes, mesh geometry, masks and filters. It keeps
caller-owned textures. `loadRuntimeTextures()` uses Pixi `Assets`, which owns
its cache; unload those URLs through `Assets.unload()` after all users release
them. Do not destroy textures shared by other characters.

## Supported profile and limits

Version1 supports named animations; Rotate/Translate/Scale/Shear and split X/Y;
linear/stepped/monotone-time Bezier; default attachment inventory/activation;
slot light/dark color; weighted meshes and clipping bindings; draw order;
deformation; image sequences; events; and the current FBones IK/Transform/Physics
solver and its existing fidelity limits. No automatic animation mixing,
crossfades, skins, Path constraints, nondefault inheritance, texture atlases or
arbitrary Spine project loading are claimed. The parser rejects unknown timeline
families/version mismatches instead of dropping them.

Physics uses the existing FBones deterministic60Hz policy and is limited to120
seconds. Numeric agreement with every original Spine constraint/Physics case
remains unproven. `{simulate:false}` disables Physics while retaining static
constraints. Without Physics, sampling supports up to1,000,000frames. One update
may cross at most1024loops and emit at most4096events; event-budget rejection
happens before the clock advances. Resource keys are portable relative names.
Limits include4096bones/slots/constraints/images,65536sequence inventory frames,
32MiB JSON text and a bounded structural walk. These are FBones resource policies.

The package parser and player do not modify Setup or editor history. A player
clones and freezes its retained data. Treat returned presentation frames as
read-only. To load changed authored data, create a new player.

## Development checks

From the repository root:

```sh
pnpm build:runtime
pnpm test:runtime
```

The second command includes native-generated export/PNG→headless sampling
checks and needs the current `e2e-host` test binary (see the repository testing
guide). The standalone package's `npm test` runs its model/Node/Pixi object tests
after building. GPU pixel and native OS results are tracked separately; object
tests alone do not establish GPU behavior. A packed tarball includes ESM,
TypeScript declarations, this README, MIT license and examples, with no editor
binary or proprietary reference material.
