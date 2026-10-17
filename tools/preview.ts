// Renders the skeleton's animations for review.
//   node tools/preview.ts [outDir] [anim...]     (default: out/, every animation)
// Writes, per animation: <name>.gif (mannequin on a scrolling ground strip, x8), <name>_strip.png
// (every frame side by side, mannequin row over part-map row, x6) and <name>_sheet.png (1x, transparent).

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { encodeGif } from "../src/gif.ts";
import { hex, MANNEQUIN, MISSING, PART_MAP, type Palette, type RGB } from "../src/palette.ts";
import { encodePng } from "../src/png.ts";
import type { Sprite } from "../src/sprite.ts";
import { ANIMS, H, W, type Anim } from "../src/templates/chibi24x32/index.ts";

const outDir = process.argv[2] ?? "out";
mkdirSync(outDir, { recursive: true });

const BG = hex("#e8e2d6");
const GROUND = hex("#c2b59e");
const TICK = hex("#9d8f76");

/** RGB image as a flat array of colors, so GIF and PNG writers share it. */
class Image {
  readonly w: number;
  readonly h: number;
  readonly px: RGB[];
  constructor(w: number, h: number, fill: RGB) {
    this.w = w;
    this.h = h;
    this.px = Array.from({ length: w * h }, () => fill);
  }
  set(x: number, y: number, c: RGB): void {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.px[y * this.w + x] = c;
  }
  blit(s: Sprite, pal: Palette, ox: number, oy: number): void {
    for (let y = 0; y < s.h; y++)
      for (let x = 0; x < s.w; x++) {
        const ch = s.get(x, y);
        if (ch !== ".") this.set(ox + x, oy + y, pal[ch] ?? MISSING);
      }
  }
  scaled(n: number): Image {
    const out = new Image(this.w * n, this.h * n, BG);
    for (let y = 0; y < out.h; y++)
      for (let x = 0; x < out.w; x++) out.px[y * out.w + x] = this.px[Math.floor(y / n) * this.w + Math.floor(x / n)]!;
    return out;
  }
}

function png(img: Image): Buffer {
  const rgba = new Uint8Array(img.w * img.h * 4);
  img.px.forEach((c, i) => {
    rgba.set([c[0], c[1], c[2], 255], i * 4);
  });
  return encodePng(img.w, img.h, rgba);
}

function gif(imgs: Image[], delay: number): Buffer {
  const colors: RGB[] = [];
  const index = new Map<string, number>();
  const frames = imgs.map((img) => {
    const idx = new Uint8Array(img.px.length);
    img.px.forEach((c, i) => {
      const k = c.join(",");
      let v = index.get(k);
      if (v === undefined) {
        v = colors.length;
        colors.push(c);
        index.set(k, v);
      }
      idx[i] = v;
    });
    return { indices: idx, delay };
  });
  if (colors.length > 256) throw new Error("too many colors for a gif");
  return encodeGif(imgs[0]!.w, imgs[0]!.h, colors, frames);
}

/**
 * Character on a ground strip. For side walks the ticks scroll at the walk speed: a planted foot must
 * stay on its tick. Front/back walks get a plain strip (their movement is toward the viewer).
 */
function stage(s: Sprite, f: number, steps: number[], axis: Anim["axis"]): Image {
  const pad = 8;
  const img = new Image(W + pad * 2, H + 4, BG);
  for (let y = H; y < H + 4; y++) for (let x = 0; x < img.w; x++) img.set(x, y, GROUND);
  const shift = steps.slice(0, f).reduce((a, b) => a + b, 0) % 6;
  for (let x = -shift; axis === "x" && x < img.w; x += 6) {
    img.set(x, H, TICK);
    img.set(x, H + 1, TICK);
  }
  img.blit(s, MANNEQUIN, pad, 0);
  return img;
}

function strip(sprites: Sprite[]): Image {
  const gap = 2;
  const img = new Image(sprites.length * (W + gap) + gap, H * 2 + gap * 3, BG);
  sprites.forEach((s, i) => {
    img.blit(s, MANNEQUIN, gap + i * (W + gap), gap);
    img.blit(s, PART_MAP, gap + i * (W + gap), H + gap * 2);
  });
  return img;
}

/** 1x transparent sheet, frames left to right: what an engine or Aseprite (Import Sprite Sheet) loads. */
function sheet(sprites: Sprite[]): Buffer {
  const w = sprites.length * W;
  const rgba = new Uint8Array(w * H * 4);
  sprites.forEach((s, i) => {
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const ch = s.get(x, y);
        if (ch === ".") continue;
        const c = MANNEQUIN[ch] ?? MISSING;
        rgba.set([c[0], c[1], c[2], 255], (y * w + i * W + x) * 4);
      }
  });
  return encodePng(w, H, rgba);
}

function render(a: Anim): void {
  const { name, delay, steps, axis } = a;
  const sprites = a.frames();
  writeFileSync(join(outDir, `${name}_sheet.png`), sheet(sprites));
  writeFileSync(join(outDir, `${name}.gif`), gif(sprites.map((s, f) => stage(s, f, steps, axis).scaled(8)), delay));
  writeFileSync(join(outDir, `${name}_strip.png`), png(strip(sprites).scaled(6)));
  console.log(`${name}: ${sprites.length} frames`);
}

const only = process.argv.slice(3);
for (const a of ANIMS) if (only.length === 0 || only.includes(a.name)) render(a);
