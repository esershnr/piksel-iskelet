// Side-by-side GIF: Siteyard v1's side walk (left, its own timing) next to the skeleton's walk (right).
//   node tools/compare-siteyard.ts <siteyard repo> [out.gif]
// Reads Siteyard's sprites straight from its source tree; nothing from it is copied into this repo.

import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { encodeGif } from "../src/gif.ts";
import { hex, MANNEQUIN, MISSING, type RGB } from "../src/palette.ts";
import { H, W } from "../src/templates/chibi24x32/body.ts";
import { sideFrame, WALK_SIDE } from "../src/templates/chibi24x32/side.ts";

const repo = resolve(process.argv[2] ?? "../siteyard");
const out = process.argv[3] ?? "out/compare_siteyard_walk.gif";
const mod = (p: string) => import(pathToFileURL(join(repo, p)).href);
const { characterFrames } = await mod("src/theme/construction/sprites/character.ts");
const { PALETTE } = await mod("src/theme/construction/palette.ts");

const v1 = (characterFrames() as { name: string; grid: { rows: string[] } }[])
  .filter((f) => /^crew_mid_walk_right_\d$/.test(f.name))
  .map((f) => f.grid.rows);
if (v1.length === 0) throw new Error("no crew_mid_walk_right_* frames found in Siteyard");
const ours = WALK_SIDE.map((p) => sideFrame(p).rows());

const BG = hex("#e8e2d6");
const SCALE = 8;
const PAD = 4;
const CW = W + PAD * 2;
const IW = CW * 2;
const IH = H + PAD;

// Timings: v1 runs at 8 fps (125 ms), the skeleton at 10 fps (100 ms); merge on a 25 ms tick.
const V1_MS = 125;
const OURS_MS = 100;
const cycle = 4000;

const colors: RGB[] = [];
const index = new Map<string, number>();
const colorIndex = (c: RGB): number => {
  const k = c.join(",");
  let v = index.get(k);
  if (v === undefined) {
    v = colors.length;
    colors.push(c);
    index.set(k, v);
  }
  return v;
};

function frame(a: string[], b: string[]): Uint8Array {
  const px: RGB[] = Array.from({ length: IW * IH }, () => BG);
  const put = (rows: string[], ox: number, pal: (ch: string) => RGB) =>
    rows.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        if (ch !== ".") px[(y + PAD / 2) * IW + ox + x] = pal(ch);
      }),
    );
  put(a, PAD, (ch) => (PALETTE[ch] ? hex(PALETTE[ch]) : MISSING));
  put(b, CW + PAD, (ch) => MANNEQUIN[ch] ?? MISSING);
  const idx = new Uint8Array(IW * SCALE * IH * SCALE);
  for (let y = 0; y < IH * SCALE; y++)
    for (let x = 0; x < IW * SCALE; x++) idx[y * IW * SCALE + x] = colorIndex(px[Math.floor(y / SCALE) * IW + Math.floor(x / SCALE)]!);
  return idx;
}

const frames: { indices: Uint8Array; delay: number }[] = [];
let last = "";
for (let t = 0; t < cycle; t += 25) {
  const ia = Math.floor(t / V1_MS) % v1.length;
  const ib = Math.floor(t / OURS_MS) % ours.length;
  const key = `${ia}:${ib}`;
  if (key === last) {
    frames[frames.length - 1]!.delay += 2.5;
    continue;
  }
  last = key;
  frames.push({ indices: frame(v1[ia]!, ours[ib]!), delay: 2.5 });
}
// GIF delays are whole hundredths; 2.5 cs ticks always add up in pairs except at the edges.
for (const f of frames) f.delay = Math.round(f.delay);
writeFileSync(out, encodeGif(IW * SCALE, IH * SCALE, colors, frames));
console.log(`${out}: v1 ${v1.length} frames vs skeleton ${ours.length} frames, ${frames.length} gif frames`);
