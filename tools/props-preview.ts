// Contact sheet of the review poses (src/templates/chibi24x32/showcase.ts): every prop in every facing
// in a holding pose (each orientation on its own row), then the seated poses. Columns: side, down, up,
// each as the mannequin and dressed in a skin.
//   node tools/props-preview.ts [skin] [outDir] [row...]     (default: isci, out/props, every row; a row
//   filter is a label prefix, e.g. "hammer" "sit")
// Writes props_sheet_x6.png (labelled rows, x6) and props_sheet_1x.png (same, 1x), and props_sheet_part_x6.png
// (the part map, to check z order and the prop parts).

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { hex, MANNEQUIN, MISSING, PART_MAP, type Palette, type RGB } from "../src/palette.ts";
import { encodePng } from "../src/png.ts";
import { dress, loadSkin, type Facing } from "../src/skin/skin.ts";
import type { Sprite } from "../src/sprite.ts";
import { H, poseFrame, W } from "../src/templates/chibi24x32/index.ts";
import { SHOWCASE, showcasePose } from "../src/templates/chibi24x32/showcase.ts";

const skin = await loadSkin(process.argv[2] ?? "isci");
const outDir = process.argv[3] ?? join("out", "props");
const only = process.argv.slice(4);
mkdirSync(outDir, { recursive: true });

const FACINGS: Facing[] = ["side", "down", "up"];
const ROWS = only.length ? SHOWCASE.filter((d) => only.some((o) => d.label.startsWith(o))) : SHOWCASE;

// --- drawing -----------------------------------------------------------------------------------------

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
  blitPicture(p: { w: number; h: number; px: (RGB | null)[] }, ox: number, oy: number): void {
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

// A 3x5 pixel font for the row labels (lower case, digits, space).
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
  "0": ["111", "101", "101", "101", "111"], "1": ["010", "110", "010", "010", "111"], "2": ["111", "001", "111", "100", "111"],
  "3": ["111", "001", "111", "001", "111"], "4": ["101", "101", "111", "001", "001"], "5": ["111", "100", "111", "001", "111"],
  "6": ["111", "100", "111", "101", "111"], "7": ["111", "001", "001", "001", "001"], "8": ["111", "101", "111", "101", "111"],
  "9": ["111", "101", "111", "001", "111"], "-": ["000", "000", "111", "000", "000"], _: ["000", "000", "000", "000", "111"],
};

function text(img: Image, s: string, x: number, y: number): void {
  [...s].forEach((ch, i) => {
    const g = FONT[ch] ?? FONT[" "]!;
    g.forEach((row, ry) => [...row].forEach((bit, rx) => bit === "1" && img.set(x + i * 4 + rx, y + ry, INK)));
  });
}

/** The sheet: one row per demo, six cells (side, down, up as mannequin + skin), labels on the left. */
function sheet(pal: Palette, skinned: boolean): Image {
  const gap = 2;
  const labelW = 56;
  const cellW = W + gap;
  const cellH = H + 2 + gap;
  const img = new Image(labelW + 6 * cellW + gap, ROWS.length * cellH + gap + 8, BG);
  FACINGS.forEach((f, i) => text(img, f, labelW + i * 2 * cellW + 8, 2));
  ROWS.forEach((d, r) => {
    const oy = 8 + gap + r * cellH;
    text(img, d.label, 2, oy + 13);
    FACINGS.forEach((facing, i) => {
      const p = showcasePose(d, facing);
      for (let k = 0; k < 2; k++) {
        const ox = labelW + (i * 2 + k) * cellW;
        for (let y = H; y < H + 2; y++) for (let x = 0; x < W; x++) img.set(ox + x, oy + y, GROUND);
        if (!p) continue;
        const s = poseFrame(facing, p);
        if (k === 0) img.blit(s, pal, ox, oy);
        else if (skinned) img.blitPicture(dress(s, skin, facing), ox, oy);
        else img.blit(s, PART_MAP, ox, oy);
      }
    });
  });
  return img;
}

/** Every pose, so a missing prop view or a magenta pixel is reported. */
let missing = 0;
for (const d of ROWS)
  for (const facing of FACINGS) {
    const p = showcasePose(d, facing);
    if (!p) {
      console.log(`  missing: ${d.label} (${facing})`);
      missing++;
      continue;
    }
    const pic = dress(poseFrame(facing, p), skin, facing);
    if (pic.px.some((c) => c && c[0] === 255 && c[1] === 0 && c[2] === 255)) console.log(`  magenta: ${d.label} (${facing})`);
  }

const main = sheet(MANNEQUIN, true);
writeFileSync(join(outDir, "props_sheet_x6.png"), main.scaled(6).png());
writeFileSync(join(outDir, "props_sheet_1x.png"), main.png());
writeFileSync(join(outDir, "props_sheet_part_x6.png"), sheet(MANNEQUIN, false).scaled(6).png());
console.log(`${outDir}: ${ROWS.length} rows, skin ${skin.name}${missing ? `, ${missing} missing` : ""}`);
