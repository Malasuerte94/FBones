export interface GifExportOptions {
  animationId: number;
  customRange: boolean;
  startFrame: number;
  endFrame: number;
  fps: number;
  repeat: boolean;
  includeLastFrame: boolean;
}

export const maxGifFps = 50;
export const maxGifFrames = 600;
export const maxGifBytes = 16 * 1024 * 1024;

export function lastGifFrame(duration: number, timelineFps: number, fps: number): number {
  return Math.max(0, Math.ceil(duration / timelineFps * fps - 1e-8));
}

export function planGifFrames(options: GifExportOptions, timelineFps: number, duration: number) {
  const {customRange, startFrame, endFrame, fps, includeLastFrame} = options;
  if (!Number.isFinite(timelineFps) || timelineFps <= 0 || !Number.isFinite(duration) || duration < 0 ||
      !Number.isInteger(fps) || fps < 1 || fps > maxGifFps) {
    throw new Error('Choose a valid GIF frame range and frame rate.');
  }
  if (customRange && (!Number.isInteger(startFrame) || !Number.isInteger(endFrame) ||
      startFrame < 0 || endFrame < startFrame || endFrame > lastGifFrame(duration, timelineFps, fps))) {
    throw new Error('Choose a valid GIF frame range.');
  }
  const clipEnd = duration / timelineFps;
  const gridCount = lastGifFrame(duration, timelineFps, fps);
  const last = includeLastFrame ? gridCount : Math.max(0, gridCount - 1);
  const start = customRange ? Math.min(startFrame, last) : 0;
  const end = customRange ? Math.min(endFrame, last) : last;
  const count = end - start + 1;
  if (count > maxGifFrames || Math.min(clipEnd, end / fps) > 120) {
    throw new Error('Choose a shorter GIF range. Export supports up to 600 images within the first 120 seconds.');
  }
  const timesSeconds = Array.from({length: count}, (_, i) => Math.min(clipEnd, (start + i) / fps));
  const delayCentiseconds = timesSeconds.map(() => Math.floor(100 / fps));
  return {timesSeconds, delayCentiseconds};
}

export function gifBase64(chunks: readonly Uint8Array[]): string {
  const size = chunks.reduce((bytes, chunk) => bytes + chunk.length, 0);
  if (size > maxGifBytes) throw new Error('The GIF exceeds 16 MiB. Choose a shorter range.');
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  const pieces = [];
  for (let start = 0; start < size; start += 8192) {
    pieces.push(String.fromCharCode(...bytes.subarray(start, start + 8192)));
  }
  return btoa(pieces.join(''));
}
