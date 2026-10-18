// Contact sheet of the role skins (src/skin/skins/roles.ts): a row per role and skin tone, with the
// idle in the three facings, a walk and a work frame, and the idle again with the hat band tinted by a
// model color (what a game does at runtime by overriding `materials.band`).
//   node tools/roles-preview.ts [outDir]     (default: out/roles)

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { hex, type RGB } from "../src/palette.ts";
import { encodePng } from "../src/png.ts";
import { dress, type Facing, type Picture, type Skin } from "../src/skin/skin.ts";
import { ROLE_NAMES, roleSkin, ROLES, TONES } from "../src/skin/skins/roles.ts";
import { ANIMS, facingOf, H, W } from "../src/templates/chibi24x32/index.ts";

const outDir = process.argv[2] ?? join("out", "roles");
mkdirSync(outDir, { recursive: true });

const BG = hex("#e8e2d6");
const GROUND = hex("#c2b59e");
const INK = hex("#5a5048");
const MODEL_TINT = "#f77622";

const anim = (name: string) => ANIMS.find((a) => a.name === name)!;
const frame = (name: string, i: number) => anim(name).frames()[i]!;

const FONT: Record<string, string[]> = {
  a: ["010", "101", "111", "101", "101"], b: ["110", "101", "110", "101", "110"], c: ["011", "100", "100", "100", "011"],
  d: ["110", "101", "101", "101", "110"], e: ["111", "100", "110", "100", "111"], f: ["111", "100", "110", "100", "100"],
  g: ["011", "100", "101", "101", "011"], h: ["101", "101", "111", "101", "101"], i: ["111", "010", "010", "010", "111"],
  k: ["101", "101", "110", "101", "101"], l: ["100", "100", "100", "100", "111"], m: ["101", "111", "111", "101", "101"],
  n: ["110", "101", "101", "101", "101"], o: ["010", "101", "101", "101", "010"], p: ["110", "101", "110", "100", "100"],
  r: ["110", "101", "110", "101", "101"], s: ["011", "100", "010", "001", "110"], t: ["111", "010", "010", "010", "010"],
  u: ["101", "101", "101", "101", "111"], w: ["101", "101", "111", "111", "101"], _: ["000", "000", "000", "000", "111"],
  " ": ["000", "000", "000", "000", "000"],
};

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
  picture(p: Picture, ox: number, oy: number): void {
    for (let y = H; y < H + 2; y++) for (let x = 0; x < W; x++) this.set(ox + x, oy + y, GROUND);
    p.px.forEach((c, i) => {
      if (c) this.set(ox + (i % p.w), oy + Math.floor(i / p.w), c);
    });
  }
  text(s: string, x: number, y: number): void {
    [...s].forEach((ch, i) => (FONT[ch] ?? FONT[" "]!).forEach((row, ry) => [...row].forEach((bit, rx) => bit === "1" && this.set(x + i * 4 + rx, y + ry, INK))));
  }
  scaled(n: number): Image {
    const out = new Image(this.w * n, this.h * n, BG);
    for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) out.px[y * out.w + x] = this.px[Math.floor(y / n) * this.w + Math.floor(x / n)]!;
    return out;
  }
  png(): Buffer {
    const rgba = new Uint8Array(this.w * this.h * 4);
    this.px.forEach((c, i) => rgba.set([c[0], c[1], c[2], 255], i * 4));
    return encodePng(this.w, this.h, rgba);
  }
}

/** The cells of a row: idle in three facings, a walk step, a work beat, the idle with the band tinted. */
function cells(skin: Skin, role: string): [string, number, Facing, Skin][] {
  const work = ROLES[role]!.clipboard ? "work_clipboard_down" : ROLES[role]!.suit ? "talk_down" : "work_down";
  const tinted: Skin = { ...skin, materials: { ...skin.materials, band: MODEL_TINT } };
  return [
    ["idle_side", 0, "side", skin],
    ["idle_down", 0, "down", skin],
    ["idle_up", 0, "up", skin],
    ["walk_side", 2, "side", skin],
    [work, 2, "down", skin],
    ["idle_down", 0, "down", tinted],
  ];
}

const gap = 2;
const cellW = W + gap;
const cellH = H + 2 + gap;
const labelW = 70;
const rows = ROLE_NAMES.flatMap((r) => TONES.map((t) => [r, t] as const));
const img = new Image(labelW + 6 * cellW + gap, 8 + rows.length * cellH + gap, BG);
["side", "down", "up", "walk", "work", "tint"].forEach((h, i) => img.text(h, labelW + i * cellW + 4, 2));
rows.forEach(([role, tone], ri) => {
  const oy = 8 + gap + ri * cellH;
  img.text(`${role} ${tone}`, 2, oy + 13);
  const skin = roleSkin(role, tone);
  cells(skin, role).forEach(([name, i, facing, sk], ci) => {
    const a = anim(name);
    img.picture(dress(frame(name, i), sk, facingOf(a) ?? facing), labelW + ci * cellW, oy);
  });
});
writeFileSync(join(outDir, "roles_sheet_x6.png"), img.scaled(6).png());
writeFileSync(join(outDir, "roles_sheet_1x.png"), img.png());

// Magenta check over every role, tone, animation and facing.
let bad = 0;
for (const [role, tone] of rows) {
  const skin = roleSkin(role, tone);
  for (const a of ANIMS) a.frames().forEach((s, i) => {
    if (dress(s, skin, facingOf(a)).px.some((c) => c && c[0] === 255 && c[1] === 0 && c[2] === 255)) {
      console.log(`  magenta: ${role} ${tone} ${a.name} ${i}`);
      bad++;
    }
  });
}
console.log(`${outDir}: ${rows.length} rows${bad ? `, ${bad} magenta frames` : ""}`);
