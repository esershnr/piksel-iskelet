// The tool animations side by side, for review: per animation a frame sheet (rows: side, down, up, each
// as the mannequin and dressed; columns: frames) and one GIF playing every animation at once (rows:
// animations, columns: side, down, up as mannequin and dressed), so the three facings can be compared
// beat for beat.
//   node tools/anim-sheet.ts [skin] [outDir] [anim...]     (default: yelekli, out/anims, every animation
//   that is not a walk or an idle; an anim is a base name such as "dig")

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { encodeGif } from "../src/gif.ts";
import { hex, MANNEQUIN, MISSING, type Palette, type RGB } from "../src/palette.ts";
import { encodePng } from "../src/png.ts";
import { dress, loadSkin, type Facing, type Picture } from "../src/skin/skin.ts";
import type { Sprite } from "../src/sprite.ts";
import { ANIMS, facingOf, H, W, type Anim } from "../src/templates/chibi24x32/index.ts";

const skin = await loadSkin(process.argv[2] ?? "yelekli");
const outDir = process.argv[3] ?? join("out", "anims");
const only = process.argv.slice(4);
mkdirSync(outDir, { recursive: true });

const FACINGS: Facing[] = ["side", "down", "up"];
const base = (name: string): string => name.replace(/_(side|down|up)$/, "");
const names = [...new Set(ANIMS.map((a) => base(a.name)))].filter((n) => !/^(walk|idle)$/.test(n) && (only.length === 0 || only.includes(n)));
const byName = new Map(ANIMS.map((a) => [a.name, a]));

const BG = hex("#e8e2d6");
const GROUND = hex("#c2b59e");
const INK = hex("#5a5048");

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
  blitPicture(p: Picture, ox: number, oy: number): void {
    p.px.forEach((c, i) => {
      if (c) this.set(ox + (i % p.w), oy + Math.floor(i / p.w), c);
    });
  }
  scaled(n: number): Image {
    const out = new Image(this.w * n, this.h * n, BG);
    for (let y = 0; y < out.h; y++)
      for (let x = 0; x < out.w; x++) out.px[y * out.w + x] = this.px[Math.floor(y / n) * this.w + Math.floor(x / n)]!;
    return out;
  }
  png(): Buffer {
    const rgba = new Uint8Array(this.w * this.h * 4);
    this.px.forEach((c, i) => rgba.set([c[0], c[1], c[2], 255], i * 4));
    return encodePng(this.w, this.h, rgba);
  }
}

// A 3x5 pixel font for the labels (lower case, digits, underscore, space).
const FONT: Record<string, string[]> = {
  a: ["010", "101", "111", "101", "101"], b: ["110", "101", "110", "101", "110"], c: ["011", "100", "100", "100", "011"],
  d: ["110", "101", "101", "101", "110"], e: ["111", "100", "110", "100", "111"], f: ["111", "100", "110", "100", "100"],
  g: ["011", "100", "101", "101", "011"], h: ["101", "101", "111", "101", "101"], i: ["111", "010", "010", "010", "111"],
  j: ["001", "001", "001", "101", "010"], k: ["101", "101", "110", "101", "101"], l: ["100", "100", "100", "100", "111"],
  m: ["101", "111", "111", "101", "101"], n: ["110", "101", "101", "101", "101"], o: ["010", "101", "101", "101", "010"],
  p: ["110", "101", "110", "100", "100"], q: ["010", "101", "101", "111", "011"], r: ["110", "101", "110", "101", "101"],
  s: ["011", "100", "010", "001", "110"], t: ["111", "010", "010", "010", "010"], u: ["101", "101", "101", "101", "111"],
  v: ["101", "101", "101", "101", "010"], w: ["101", "101", "111", "111", "101"], x: ["101", "101", "010", "101", "101"],
  y: ["101", "101", "010", "010", "010"], z: ["111", "001", "010", "100", "111"], " ": ["000", "000", "000", "000", "000"],
  _: ["000", "000", "000", "000", "111"],
};
function text(img: Image, s: string, x: number, y: number): void {
  [...s].forEach((ch, i) => {
    const g = FONT[ch] ?? FONT[" "]!;
    g.forEach((row, ry) => [...row].forEach((bit, rx) => bit === "1" && img.set(x + i * 4 + rx, y + ry, INK)));
  });
}

const gap = 2;
const cellW = W + gap;
const cellH = H + 2 + gap;

function cell(img: Image, s: Sprite, a: Anim, dressed: boolean, ox: number, oy: number): void {
  for (let y = H; y < H + 2; y++) for (let x = 0; x < W; x++) img.set(ox + x, oy + y, GROUND);
  if (dressed) img.blitPicture(dress(s, skin, facingOf(a)), ox, oy);
  else img.blit(s, MANNEQUIN, ox, oy);
}

/** Frame sheet of one animation: six rows (facing x mannequin/skin), a column per frame. */
function frameSheet(name: string): Image {
  const anims = FACINGS.map((f) => byName.get(`${name}_${f}`)!);
  const frames = anims.map((a) => a.frames());
  const cols = Math.max(...frames.map((f) => f.length));
  const labelW = 40;
  const img = new Image(labelW + cols * cellW + gap, 6 * cellH + gap, BG);
  FACINGS.forEach((facing, fi) =>
    frames[fi]!.forEach((s, c) => {
      for (let k = 0; k < 2; k++) {
        const oy = gap + (fi * 2 + k) * cellH;
        if (c === 0) text(img, k === 0 ? facing : skin.name.slice(0, 9), 2, oy + 13);
        cell(img, s, anims[fi]!, k === 1, labelW + c * cellW, oy);
      }
    }),
  );
  return img;
}

/** Every animation playing at once; a frame every `tick` hundredths, each animation on its own beat. */
function sheetGif(tick: number, maxTicks: number): Buffer {
  const rows = names.map((n) => FACINGS.map((f) => byName.get(`${n}_${f}`)!));
  const frames = rows.map((r) => r.map((a) => a.frames()));
  const labelW = 48;
  const w = labelW + 6 * cellW + gap;
  const h = 8 + names.length * cellH + gap;
  const cycle = (a: Anim, n: number): number => Math.ceil((a.delay * n) / tick);
  const total = Math.min(maxTicks, rows.flatMap((r, i) => r.map((a, j) => cycle(a, frames[i]![j]!.length))).reduce((l, c) => lcm(l, c), 1));
  const colors: RGB[] = [];
  const index = new Map<string, number>();
  const gifFrames = [];
  for (let t = 0; t < total; t++) {
    const img = new Image(w, h, BG);
    FACINGS.forEach((f, i) => text(img, f, labelW + i * 2 * cellW + 8, 2));
    rows.forEach((r, ri) => {
      const oy = 8 + gap + ri * cellH;
      text(img, names[ri]!, 2, oy + 13);
      r.forEach((a, fi) => {
        const fr = frames[ri]![fi]!;
        const s = fr[Math.floor((t * tick) / a.delay) % fr.length]!;
        for (let k = 0; k < 2; k++) cell(img, s, a, k === 1, labelW + (fi * 2 + k) * cellW, oy);
      });
    });
    const big = img.scaled(3);
    const idx = new Uint8Array(big.px.length);
    big.px.forEach((c, i) => {
      const key = c.join(",");
      let v = index.get(key);
      if (v === undefined) {
        v = colors.length;
        colors.push(c);
        index.set(key, v);
      }
      idx[i] = v;
    });
    gifFrames.push({ indices: idx, delay: tick });
  }
  if (colors.length > 256) throw new Error("too many colors for a gif");
  return encodeGif(w * 3, h * 3, colors, gifFrames);
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const lcm = (a: number, b: number): number => (a * b) / gcd(a, b);

for (const n of names) writeFileSync(join(outDir, `${n}_frames_x6.png`), frameSheet(n).scaled(6).png());
writeFileSync(join(outDir, "sheet.gif"), sheetGif(2, 120));
console.log(`${outDir}: ${names.join(", ")} (${skin.name})`);
