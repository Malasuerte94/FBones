import type {AttachmentView, ClippingView, SlotView} from './project.ts';
import {resolveAttachment} from './sceneSelection.ts';

export interface MeshDisplayOptions {
  triangles: boolean;
  dim: boolean;
  isolate: boolean;
}

export interface MeshDisplay extends MeshDisplayOptions {
  attachmentId: number;
}

/** Project inspected artwork for the viewport only, including inactive meshes. */
export function isolatedMeshSlot(slots: readonly SlotView[], display?: MeshDisplay): SlotView | undefined {
  if (!display?.isolate) return;
  const target = resolveAttachment(slots, display.attachmentId);
  if (!target?.attachment.mesh || !target.attachment.region) return;
  const {slot, attachment} = target;
  if (slot.visible && slot.mesh && slot.region && slot.activeAttachmentId === attachment.id) return slot;
  return {
    ...slot,
    visible: true,
    activeAttachmentId: attachment.id,
    region: attachment.region,
    mesh: attachment.mesh,
    imageAvailable: attachment.imageAvailable,
  };
}

/** Keep inherited clipping, while an isolated alternate does not use its own
 * slot's active clipping attachment as an image mask. */
export function meshDisplayClip(clip: AttachmentView | undefined, slotId: number, isolated: boolean): ClippingView | undefined {
  return clip?.clipping && !(isolated && clip.slot === slotId) ? clip.clipping : undefined;
}
