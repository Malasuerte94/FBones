import {animationChannelDimensions, type AnimationKeyInput} from './animation.ts';

/** The Desktop wire restores the signs that JSON.stringify removes from zero
 * values and Bézier controls. Indices address 2 values followed by 8 controls. */
export function preserveAnimationKeyZeros<T extends AnimationKeyInput>(key: T): T {
  const indices: number[] = [];
  const dimensions = animationChannelDimensions(key.channel);
  key.values.forEach((value, index) => {
    if (index < dimensions && Object.is(value, -0)) indices.push(index);
  });
  key.controls?.forEach((axis, component) => {
    if (component >= dimensions) return;
    axis.forEach((value, index) => {
      if (Object.is(value, -0)) indices.push(2 + component * 4 + index);
    });
  });
  return indices.length ? {...key, negativeZeroIndices: indices} : key;
}
