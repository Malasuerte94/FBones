/** Incremental GIF89a encoding. Each frame owns its local palette and LZW table. */
export interface GifEncoderOptions {
  width: number;
  height: number;
  /** Null plays once, zero loops indefinitely, and positive values count repeats. */
  repeat: number | null;
}

type RgbaPixels = Uint8Array | Uint8ClampedArray;
type IndexedPixels = { colors: Uint8Array; indices: Uint8Array };

const MAX_SIDE = 4096;
const MAX_WORD = 0xffff;
const OPAQUE_COLORS = 255;
const ALPHA_THRESHOLD = 128;
const CLEAR_TO_BACKGROUND = 2 << 2;
const LZW_TABLE_SIZE = 4096;
const textEncoder = new TextEncoder();

function unsignedWord(value: number): [number, number] {
  return [value & 255, value >> 8];
}

function inRange(value: number, minimum: number, maximum: number): boolean {
  return Number.isInteger(value) && value >= minimum && value <= maximum;
}

function header({width, height, repeat}: GifEncoderOptions): Uint8Array {
  const loop = repeat === null ? [] : [
    0x21, 0xff, 11, ...textEncoder.encode('NETSCAPE2.0'), 3, 1, ...unsignedWord(repeat), 0,
  ];
  return Uint8Array.of(
    ...textEncoder.encode('GIF89a'), ...unsignedWord(width), ...unsignedWord(height),
    0xf0, 0, 0, // A two-entry global palette with transparent background index zero.
    0, 0, 0, 0, 0, 0, ...loop,
  );
}

function rgbBucket(r: number, g: number, b: number): number {
  return ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
}

type ColorBox = { buckets: number[]; population: number; shift: number; priority: number };

function colorBox(buckets: number[], histogram: Uint32Array): ColorBox {
  let population = 0;
  const minimum = [31, 31, 31];
  const maximum = [0, 0, 0];
  for (const bucket of buckets) {
    population += histogram[bucket * 4]!;
    for (let component = 0; component < 3; component++) {
      const value = (bucket >> ((2 - component) * 5)) & 31;
      minimum[component] = Math.min(minimum[component]!, value);
      maximum[component] = Math.max(maximum[component]!, value);
    }
  }
  let axis = 0;
  for (let component = 1; component < 3; component++) {
    if (maximum[component]! - minimum[component]! > maximum[axis]! - minimum[axis]!) axis = component;
  }
  return { buckets, population, shift: (2 - axis) * 5, priority: (maximum[axis]! - minimum[axis]!) * population };
}

/** Median cut over a fixed RGB histogram keeps workspace bounded by 32,768 buckets. */
function quantizedPalette(rgba: RgbaPixels, indices: Uint8Array): IndexedPixels {
  const histogram = new Uint32Array(4 * 32_768);
  const buckets: number[] = [];
  for (let offset = 0; offset < rgba.length; offset += 4) {
    if (rgba[offset + 3]! < ALPHA_THRESHOLD) continue;
    const r = rgba[offset]!, g = rgba[offset + 1]!, b = rgba[offset + 2]!;
    const bucket = rgbBucket(r, g, b);
    const base = bucket * 4;
    if (histogram[base] === 0) buckets.push(bucket);
    histogram[base] = histogram[base]! + 1;
    histogram[base + 1] = histogram[base + 1]! + r;
    histogram[base + 2] = histogram[base + 2]! + g;
    histogram[base + 3] = histogram[base + 3]! + b;
  }

  const boxes = [colorBox(buckets, histogram)];
  while (boxes.length < OPAQUE_COLORS) {
    let next = 0;
    for (let i = 1; i < boxes.length; i++) {
      if (boxes[i]!.priority > boxes[next]!.priority) next = i;
    }
    const {buckets: box, shift, priority, population} = boxes[next]!;
    if (priority === 0) break;
    box.sort((a, b) => ((a >> shift) & 31) - ((b >> shift) & 31) || a - b);
    let split = 1;
    let left = histogram[box[0]! * 4]!;
    while (left < population / 2 && split < box.length - 1) {
      left += histogram[box[split]! * 4]!;
      split++;
    }
    boxes[next] = colorBox(box.slice(0, split), histogram);
    boxes.push(colorBox(box.slice(split), histogram));
  }

  const colors = new Uint8Array((boxes.length + 1) * 3);
  const paletteByBucket = new Uint8Array(32_768);
  boxes.forEach(({buckets: box, population}, index) => {
    const colorIndex = index + 1;
    const totals = [0, 0, 0];
    for (const bucket of box) {
      const base = bucket * 4;
      paletteByBucket[bucket] = colorIndex;
      for (let channel = 0; channel < 3; channel++) {
        totals[channel] = totals[channel]! + histogram[base + channel + 1]!;
      }
    }
    for (let channel = 0; channel < 3; channel++) {
      colors[colorIndex * 3 + channel] = Math.round(totals[channel]! / population);
    }
  });
  for (let pixel = 0, offset = 0; offset < rgba.length; pixel++, offset += 4) {
    indices[pixel] = rgba[offset + 3]! < ALPHA_THRESHOLD ? 0
      : paletteByBucket[rgbBucket(rgba[offset]!, rgba[offset + 1]!, rgba[offset + 2]!)]!;
  }
  return {colors, indices};
}

function palette(rgba: RgbaPixels): IndexedPixels {
  const indices = new Uint8Array(rgba.length / 4);
  const colors = [0, 0, 0];
  const exact = new Map<number, number>();
  for (let pixel = 0, offset = 0; offset < rgba.length; pixel++, offset += 4) {
    if (rgba[offset + 3]! < ALPHA_THRESHOLD) continue;
    const r = rgba[offset]!, g = rgba[offset + 1]!, b = rgba[offset + 2]!;
    const rgb = (r << 16) | (g << 8) | b;
    let index = exact.get(rgb);
    if (index === undefined) {
      if (exact.size === OPAQUE_COLORS) return quantizedPalette(rgba, indices);
      index = exact.size + 1;
      exact.set(rgb, index);
      colors.push(r, g, b);
    }
    indices[pixel] = index;
  }
  return {colors: Uint8Array.from(colors), indices};
}

function lzw(indices: Uint8Array, minimumBits: number): Uint8Array {
  const clear = 1 << minimumBits;
  const end = clear + 1;
  const firstFree = end + 1;
  const dictionary = new Map<number, number>();
  let nextCode = firstFree;
  let width = minimumBits + 1;
  let heldBits = 0, heldCount = 0, bytesUsed = 0;
  const maxClears = Math.ceil(indices.length / (LZW_TABLE_SIZE - firstFree));
  const bytes = new Uint8Array(Math.ceil((indices.length + maxClears + 2) * 12 / 8));

  function write(code: number) {
    heldBits |= code << heldCount;
    heldCount += width;
    while (heldCount >= 8) {
      bytes[bytesUsed++] = heldBits & 255;
      heldBits >>>= 8;
      heldCount -= 8;
    }
  }

  write(clear);
  let prefix = indices[0]!;
  for (let i = 1; i < indices.length; i++) {
    const symbol = indices[i]!;
    const phrase = (prefix << 8) | symbol;
    const code = dictionary.get(phrase);
    if (code !== undefined) {
      prefix = code;
      continue;
    }

    write(prefix);
    if (nextCode < LZW_TABLE_SIZE) {
      dictionary.set(phrase, nextCode++);
      // The decoder learns the phrase with the following code.
      if (width < 12 && nextCode > (1 << width)) width++;
    } else {
      write(clear);
      dictionary.clear();
      nextCode = firstFree;
      width = minimumBits + 1;
    }
    prefix = symbol;
  }
  write(prefix);
  if (width < 12 && nextCode === (1 << width)) width++;
  write(end);
  if (heldCount !== 0) bytes[bytesUsed++] = heldBits;
  return bytes.subarray(0, bytesUsed);
}

export class GifEncoder {
  readonly header: Uint8Array;
  private readonly width: number;
  private readonly height: number;
  private hasFrames = false;
  private finished = false;

  constructor(options: GifEncoderOptions) {
    const {width, height, repeat} = options;
    if (!inRange(width, 1, MAX_SIDE) || !inRange(height, 1, MAX_SIDE)) {
      throw new RangeError(`GIF dimensions must be whole pixels between 1 and ${MAX_SIDE}.`);
    }
    if (repeat !== null && !inRange(repeat, 0, MAX_WORD)) {
      throw new RangeError('GIF repeat count must be null or a whole number from 0 to 65535.');
    }
    this.width = width;
    this.height = height;
    this.header = header(options);
  }

  addFrame(rgba: RgbaPixels, delayCentiseconds: number): Uint8Array {
    if (this.finished) throw new Error('The GIF is already finished.');
    if (rgba.length !== this.width * this.height * 4) {
      throw new RangeError('GIF frame dimensions do not match the output.');
    }
    if (!inRange(delayCentiseconds, 0, MAX_WORD)) {
      throw new RangeError('GIF delay must be a whole number from 0 to 65535 centiseconds.');
    }

    const {colors, indices} = palette(rgba);
    const paletteBits = Math.max(1, Math.ceil(Math.log2(colors.length / 3)));
    const paletteSize = 3 * (1 << paletteBits);
    const minimumBits = Math.max(2, paletteBits);
    const image = lzw(indices, minimumBits);
    const blocks = Math.ceil(image.length / 255);
    const metadata = Uint8Array.of(
      0x21, 0xf9, 4, CLEAR_TO_BACKGROUND | 1, ...unsignedWord(delayCentiseconds), 0, 0,
      0x2c, 0, 0, 0, 0, ...unsignedWord(this.width), ...unsignedWord(this.height),
      0x80 | (paletteBits - 1),
    );
    const frame = new Uint8Array(metadata.length + paletteSize + image.length + blocks + 2);
    frame.set(metadata);
    frame.set(colors, metadata.length);
    let cursor = metadata.length + paletteSize;
    frame[cursor++] = minimumBits;
    for (let offset = 0; offset < image.length; offset += 255) {
      const block = image.subarray(offset, offset + 255);
      frame[cursor++] = block.length;
      frame.set(block, cursor);
      cursor += block.length;
    }
    this.hasFrames = true;
    return frame;
  }

  finish(): Uint8Array {
    if (this.finished) throw new Error('The GIF is already finished.');
    if (!this.hasFrames) throw new Error('Add at least one frame before finishing a GIF.');
    this.finished = true;
    return Uint8Array.of(0x3b);
  }
}
