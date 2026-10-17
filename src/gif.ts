// Minimal animated GIF89a encoder (global palette, LZW, looping) with no dependencies. Enough for
// sprite previews; frames are indexed images that share one palette of at most 256 colors.

export interface GifFrame {
  /** width*height palette indices, row-major. */
  indices: Uint8Array;
  /** Frame delay in hundredths of a second. */
  delay: number;
}

function lzw(indices: Uint8Array, minCodeSize: number): number[] {
  const clear = 1 << minCodeSize;
  const eoi = clear + 1;
  const out: number[] = [];
  let acc = 0;
  let bits = 0;
  let codeSize = minCodeSize + 1;
  let next = eoi + 1;
  let table = new Map<number, number>();
  const emit = (code: number): void => {
    acc |= code << bits;
    bits += codeSize;
    while (bits >= 8) {
      out.push(acc & 0xff);
      acc >>>= 8;
      bits -= 8;
    }
  };
  emit(clear);
  let prefix = indices[0]!;
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i]!;
    const key = (prefix << 8) | k;
    const code = table.get(key);
    if (code !== undefined) {
      prefix = code;
      continue;
    }
    emit(prefix);
    if (next === 4096) {
      emit(clear);
      table = new Map();
      codeSize = minCodeSize + 1;
      next = eoi + 1;
    } else {
      if (next >= 1 << codeSize) codeSize++;
      table.set(key, next++);
    }
    prefix = k;
  }
  emit(prefix);
  emit(eoi);
  if (bits > 0) out.push(acc & 0xff);
  return out;
}

/** `palette` is a list of [r, g, b]; padded to a power of two. */
export function encodeGif(width: number, height: number, palette: [number, number, number][], frames: GifFrame[]): Buffer {
  let depth = 1;
  while (1 << depth < palette.length) depth++;
  const size = 1 << depth;
  const bytes: number[] = [];
  const u16 = (v: number): void => {
    bytes.push(v & 0xff, (v >> 8) & 0xff);
  };
  bytes.push(...Buffer.from("GIF89a", "ascii"));
  u16(width);
  u16(height);
  bytes.push(0x80 | (7 << 4) | (depth - 1), 0, 0);
  for (let i = 0; i < size; i++) {
    const c = palette[i] ?? [0, 0, 0];
    bytes.push(c[0], c[1], c[2]);
  }
  // NETSCAPE2.0 application extension: loop forever.
  bytes.push(0x21, 0xff, 0x0b, ...Buffer.from("NETSCAPE2.0", "ascii"), 0x03, 0x01, 0x00, 0x00, 0x00);
  const minCodeSize = Math.max(2, depth);
  for (const f of frames) {
    if (f.indices.length !== width * height) throw new Error("gif frame size mismatch");
    bytes.push(0x21, 0xf9, 0x04, 0x00);
    u16(f.delay);
    bytes.push(0x00, 0x00);
    bytes.push(0x2c);
    u16(0);
    u16(0);
    u16(width);
    u16(height);
    bytes.push(0x00, minCodeSize);
    const data = lzw(f.indices, minCodeSize);
    for (let i = 0; i < data.length; i += 255) {
      const block = data.slice(i, i + 255);
      bytes.push(block.length, ...block);
    }
    bytes.push(0x00);
  }
  bytes.push(0x3b);
  return Buffer.from(bytes);
}
