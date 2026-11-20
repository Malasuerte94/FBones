import 'pixi.js/unsafe-eval';
import { Application } from 'pixi.js';
import { deformSlots, orderSlots, sampleDeformPoses, sampleDrawOrder } from '../domain/animationGeometry';
import { AnimationPhysicsPreview } from '../domain/animationPhysicsPreview';
import { projectSequencePoses, sampleSequencePoses } from '../domain/animationSequence';
import { projectSlotPoses, sampleSlotPoses } from '../domain/animationSlots';
import { slotAttachmentColor } from '../domain/attachmentColor';
import { bindingPoints } from '../domain/binding';
import { withEvaluatedPose } from '../domain/evaluatedPose';
import { maxGifFrames } from '../domain/gifExport';
import { worldRegions } from '../domain/images';
import type { ProjectSummary } from '../domain/project';
import { transformPoint, worldBones } from '../domain/rig';
import { imageData } from '../services/desktop';
import { ImageLayer } from './ImageLayer';

const maxSeconds = 120;
const pixelBudget = 128 * 1024 * 1024;
const texturePixelBudget = 32 * 1024 * 1024;
const regionCorners = [[-.5, -.5], [-.5, .5], [.5, .5], [.5, -.5]] as const;

export interface GifFrameOptions {
  timesSeconds: readonly number[];
  maxSize?: number;
  signal?: AbortSignal;
  simulatePhysics?: boolean;
}

export interface GifFrame {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
  index: number;
  total: number;
}

const yieldToBrowser = () => new Promise<void>(resolve => setTimeout(resolve, 0));

/** Render one frozen clip through the editor's artwork layer in a detached canvas. */
export async function renderGifFrames(
  project: ProjectSummary,
  clipId: number,
  { timesSeconds, maxSize = 512, signal, simulatePhysics = true }: GifFrameOptions,
  onFrame: (frame: GifFrame) => void | Promise<void>,
): Promise<void> {
  signal?.throwIfAborted();
  const clip = project.animations?.find(animation => animation.id === clipId);
  if (project.inspectionOnly || !clip || !project.bones.length) {
    throw new Error('Select an animation in an editable project before exporting a GIF.');
  }
  if (!Number.isInteger(maxSize) || maxSize < 16 || maxSize > 1024) {
    throw new Error('GIF maximum size must be between 16 and 1024 pixels.');
  }
  if (!timesSeconds.length || timesSeconds.length > maxGifFrames || timesSeconds.some((time, i) =>
    !Number.isFinite(time) || time < 0 || time > maxSeconds || (i > 0 && time <= timesSeconds[i - 1]!),
  )) {
    throw new Error(`GIF export requires 1 to ${maxGifFrames} increasing sample times within ${maxSeconds} seconds.`);
  }

  const times = [...timesSeconds];
  const total = times.length;
  const documentId = project.documentId;
  const fps = Math.fround(project.animationFps ?? 30);
  const sceneEditing = project.sceneEditing;
  const setup = structuredClone({ bones: project.bones, slots: project.slots, constraints: project.constraints ?? [], clip });
  const preview = new AnimationPhysicsPreview();
  const configure = () => preview.configure({
    setupBones: setup.bones, setupConstraints: setup.constraints, setupSlots: setup.slots, clip: setup.clip, fps, simulate: simulatePhysics,
  });

  async function sample(time: number) {
    signal?.throwIfAborted();
    // Advance the same fixed Physics ticks from clip start even for a subrange.
    // Give the UI a chance to process cancellation during a long lead-in.
    while (simulatePhysics && time - preview.time > .25) {
      preview.advanceTo((preview.time + .25) * fps);
      await yieldToBrowser();
      signal?.throwIfAborted();
    }
    const frame = time * fps;
    const evaluation = preview.advanceTo(frame);
    const bones = withEvaluatedPose(preview.localBones, evaluation.bones);
    let slots = setup.slots;
    if (sceneEditing) {
      slots = projectSlotPoses(slots, sampleSlotPoses(slots, setup.clip.slotTracks ?? [], frame));
      slots = deformSlots(slots, sampleDeformPoses(slots, setup.clip.deformTracks ?? [], frame));
      slots = orderSlots(slots, sampleDrawOrder(slots, setup.clip.drawOrder ?? [], frame));
    }
    slots = projectSequencePoses(slots, sampleSequencePoses(slots, setup.clip.sequenceTracks ?? [], frame, fps));
    // Keep the complete draw order and clipping inventory, without asking the
    // artwork layer to fetch fully invisible resources.
    slots = slots.map(slot => slot.region && (!slot.visible || slotAttachmentColor(slot)[3] === 0)
      ? { ...slot, region: null } : slot);
    const world = new Map(worldBones(bones).map(bone => [bone.id, bone]));
    return { bones, slots, world };
  }

  const textures = new Set<string>();
  let left = Infinity, right = -Infinity, bottom = Infinity, top = -Infinity;
  configure();
  for (const [index, time] of times.entries()) {
    const { bones, slots, world } = await sample(time);
    for (const slot of worldRegions(bones, slots, world)) {
      const region = slot.region;
      if (!slot.imageAvailable) throw new Error(`Missing image ${region.image}.png for GIF export.`);
      textures.add(region.image);
      const points = slot.mesh ? bindingPoints(bones, slot.mesh, world) :
        regionCorners.map(([x, y]) => transformPoint(slot, x * region.width, y * region.height));
      for (const { x, y } of points) {
        if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('GIF artwork has nonfinite bounds.');
        left = Math.min(left, x);
        right = Math.max(right, x);
        bottom = Math.min(bottom, y);
        top = Math.max(top, y);
      }
    }
    if (index % 8 === 7) await yieldToBrowser();
  }

  if (left === Infinity) {
    for (let index = 0; index < total; index++) {
      signal?.throwIfAborted();
      await onFrame({ width: 1, height: 1, rgba: new Uint8ClampedArray(4), index, total });
    }
    return;
  }

  const cap = Math.min(maxSize, Math.floor(Math.sqrt(pixelBudget / total)));
  const padding = Math.min(8, Math.floor(cap / 4));
  const spanX = Math.max(1, right - left), spanY = Math.max(1, top - bottom);
  const scale = Math.min(1, (cap - 2 * padding) / Math.max(spanX, spanY));
  const width = Math.min(cap, Math.ceil(spanX * scale) + 2 * padding);
  const height = Math.min(cap, Math.ceil(spanY * scale) + 2 * padding);
  const centerX = left / 2 + right / 2, centerY = bottom / 2 + top / 2;
  const screen = (x: number, y: number) => ({ x: width / 2 + (x - centerX) * scale, y: height / 2 - (y - centerY) * scale });

  signal?.throwIfAborted();
  const app = new Application();
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Could not create a GIF pixel reader.');
  // Canvas readback converts WebGL's premultiplied output to top-down straight RGBA.
  context.globalCompositeOperation = 'copy';
  let layer: ImageLayer | undefined;
  let layerError = '';
  try {
    await app.init({ width, height, backgroundAlpha: 0, resolution: 1, antialias: true,
      preference: 'webgl', preserveDrawingBuffer: true, autoStart: false });
    layer = new ImageLayer(imageData, () => {}, message => { layerError = message; });
    layer.showPassiveClippingOutlines = false;
    app.stage.addChild(layer.container);
    let texturePixels = 0;
    for (const name of textures) {
      signal?.throwIfAborted();
      texturePixels += await layer.preload(documentId, name);
      if (texturePixels > texturePixelBudget) throw new Error('GIF artwork exceeds the texture budget.');
    }
    configure();
    for (const [index, time] of times.entries()) {
      const { bones, slots, world } = await sample(time);
      layer.draw(documentId, bones, slots, null, screen, scale, world);
      if (layerError) throw new Error(layerError);
      app.render();
      context.drawImage(app.canvas, 0, 0);
      const { data: rgba } = context.getImageData(0, 0, width, height);
      await onFrame({ width, height, rgba, index, total });
      if (index % 8 === 7) await yieldToBrowser();
    }
  } finally {
    layer?.destroy();
    if (app.renderer) app.destroy(true, { children: true });
    canvas.width = canvas.height = 1;
  }
}
