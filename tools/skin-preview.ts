// Renders every animation of the template dressed in a skin.
//   node tools/skin-preview.ts <skin> [outDir] [anim...]     (skin = src/skin/skins/<skin>.ts; default outDir: out/skins/<skin>)
// Per animation: <anim>.gif (x8) and <anim>_strip.png (x6; side views get a second, mirrored row).

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { encodeGif } from "../src/gif.ts";
import { hex, type RGB } from "../src/palette.ts";
import { encodePng } from "../src/png.ts";
import { dress, loadSkin, mirrorPicture, type Facing, type Picture } from "../src/skin/skin.ts";
import { ANIMS, facingOf, H, W } from "../src/templates/chibi24x32/index.ts";

const skin = await loadSkin(process.argv[2] ?? "");
const outDir = process.argv[3] ?? join("out", "skins", skin.name);
const only = process.argv.slice(4);
mkdirSync(outDir, { recursive: true });

const BG = hex("#e8e2d6");
const GROUND = hex("#c2b59e");

/** Pictures laid out in rows on the background, scaled. */
function board(rows: Picture[][], scale: number, ground: boolean): { w: number; h: number; px: RGB[] } {
  const gap = 2;
  const cols = Math.max(...rows.map((r) => r.length));
  const cellH = H + (ground ? 2 : 0);
  const w = cols * (W + gap) + gap;
  const h = rows.length * (cellH + gap) + gap;
  const px: RGB[] = Array.from({ length: w * h }, () => BG);
  rows.forEach((row, ri) =>
    row.forEach((pic, ci) => {
      const ox = gap + ci * (W + gap);
      const oy = gap + ri * (cellH + gap);
      if (ground) for (let y = H; y < cellH; y++) for (let x = 0; x < W; x++) px[(oy + y) * w + ox + x] = GROUND;
      pic.px.forEach((c, i) => {
        if (c) px[(oy + Math.floor(i / W)) * w + ox + (i % W)] = c;
      });
    }),
  );
  const sw = w * scale;
  const sh = h * scale;
  const spx: RGB[] = new Array(sw * sh);
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) spx[y * sw + x] = px[Math.floor(y / scale) * w + Math.floor(x / scale)]!;
  return { w: sw, h: sh, px: spx };
}

function png(b: { w: number; h: number; px: RGB[] }): Buffer {
  const rgba = new Uint8Array(b.w * b.h * 4);
  b.px.forEach((c, i) => rgba.set([c[0], c[1], c[2], 255], i * 4));
  return encodePng(b.w, b.h, rgba);
}

function gif(frames: { w: number; h: number; px: RGB[] }[], delay: number): Buffer {
  const colors: RGB[] = [];
  const index = new Map<string, number>();
  const out = frames.map((b) => {
    const idx = new Uint8Array(b.px.length);
    b.px.forEach((c, i) => {
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
  return encodeGif(frames[0]!.w, frames[0]!.h, colors, out);
}

for (const a of ANIMS) {
  if (only.length && !only.includes(a.name)) continue;
  const facing: Facing = facingOf(a);
  const pics = a.frames().map((s) => dress(s, skin, facing));
  const rows = facing === "side" ? [pics, pics.map(mirrorPicture)] : [pics];
  writeFileSync(join(outDir, `${a.name}_strip.png`), png(board(rows, 6, false)));
  writeFileSync(join(outDir, `${a.name}.gif`), gif(pics.map((p) => board([[p]], 8, true)), a.delay));
  console.log(`${skin.name} ${a.name}: ${pics.length} frames`);
}
