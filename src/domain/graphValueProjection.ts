import {animationChannelDimensions, type AnimationChannel} from './animation.ts';

export interface GraphBoneSetup {
  x?: number;
  y?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  shearX?: number;
  shearY?: number;
}

export interface GraphValueProjection {
  factor: number;
  offset: number;
  unit?: '°' | '%';
}

export function graphBoneValueProjection(
  setup: GraphBoneSetup | undefined,
  channel: AnimationChannel,
  component: number,
): GraphValueProjection | undefined {
  if (!setup || !Number.isInteger(component) || component < 0 || component >= animationChannelDimensions(channel)) return;
  const y = component === 1;
  switch (channel) {
    case 'rotate':
      return {factor: 1, offset: setup.rotation ?? 0, unit: '°'};
    case 'translate':
    case 'translateX':
    case 'translateY':
      return {factor: 1, offset: (y || channel === 'translateY' ? setup.y : setup.x) ?? 0};
    case 'shear':
      return {factor: 1, offset: (y ? setup.shearY : setup.shearX) ?? 0, unit: '°'};
    case 'scale':
    case 'scaleX':
    case 'scaleY':
      return {factor: ((y || channel === 'scaleY' ? setup.scaleY : setup.scaleX) ?? 1) * 100, offset: 0, unit: '%'};
  }
}

export function graphDisplayValue(raw: number, projection?: GraphValueProjection): number {
  if (!projection) return raw;
  const value = raw * projection.factor;
  return projection.offset === 0 ? value : value + projection.offset;
}

/** Apply the displayed motion to the original stored ordinate. A collapsed
 * lane can still edit time, while its raw ordinate keeps its original sign. */
export function graphRawValueAfterDelta(raw: number, displayDelta: number, projection?: GraphValueProjection): number {
  const factor = projection?.factor ?? 1;
  return displayDelta === 0 || factor === 0 ? raw : raw + displayDelta / factor;
}
