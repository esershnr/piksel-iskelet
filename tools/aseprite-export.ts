// Builds an .aseprite file with every animation as a tagged frame range (side views become "_right" plus
// a mirrored "_left"), so the result opens in Aseprite ready to play, touch up or export.
//   node tools/aseprite-export.ts <skin|mannequin> [out.aseprite]     (default: out/aseprite/<name>.aseprite)
// Needs Aseprite; set ASEPRITE to its executable if it is not in the usual Steam location.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { MANNEQUIN, MISSING, type RGB } from "../src/palette.ts";
import { encodePng } from "../src/png.ts";
import { dress, loadSkin, mirrorPicture, type Facing, type Picture } from "../src/skin/skin.ts";
import type { Sprite } from "../src/sprite.ts";
import { ANIMS, H, W } from "../src/templates/chibi24x32/index.ts";

const ASEPRITE_CANDIDATES = [
  process.env.ASEPRITE,
  "C:/Program Files (x86)/Steam/steamapps/common/Aseprite/Aseprite.exe",
  "C:/Program Files/Aseprite/Aseprite.exe",
].filter((p): p is string => !!p);

const name = process.argv[2] ?? "";
const skin = name === "mannequin" ? null : await loadSkin(name);
const out = resolve(process.argv[3] ?? join("out", "aseprite", `${name}.aseprite`));
const work = join(dirname(out), `${name}_frames`);
mkdirSync(work, { recursive: true });

const facingOf = (anim: string): Facing => {
  const f = anim.split("_").pop();
  return f === "down" || f === "up" ? f : "side";
};

const picture = (s: Sprite, facing: Facing): Picture =>
  skin ? dress(s, skin, facing) : { w: s.w, h: s.h, px: s.px.map((ch): RGB | null => (ch === "." ? null : (MANNEQUIN[ch] ?? MISSING))) };

function writePng(p: Picture, path: string): void {
  const rgba = new Uint8Array(W * H * 4);
  p.px.forEach((c, i) => {
    if (c) rgba.set([c[0], c[1], c[2], 255], i * 4);
  });
  writeFileSync(path, encodePng(W, H, rgba));
}

// Frame list with tags; side animations are followed by their mirror.
const tags: { name: string; from: number; to: number; delay: number }[] = [];
const files: string[] = [];
for (const a of ANIMS) {
  const facing = facingOf(a.name);
  const pics = a.frames().map((s) => picture(s, facing));
  const variants: [string, Picture[]][] =
    facing === "side"
      ? [[a.name.replace(/_side$/, "_right"), pics], [a.name.replace(/_side$/, "_left"), pics.map(mirrorPicture)]]
      : [[a.name, pics]];
  for (const [tag, list] of variants) {
    const from = files.length + 1;
    list.forEach((p, i) => {
      const f = join(work, `${tag}_${i}.png`);
      writePng(p, f);
      files.push(f);
    });
    tags.push({ name: tag, from, to: files.length, delay: a.delay });
  }
}

const lua = (p: string): string => JSON.stringify(p.replace(/\\/g, "/"));
const script = [
  `local spr = Sprite(${W}, ${H}, ColorMode.RGB)`,
  `spr.layers[1].name = "body"`,
  ...files.map((f, i) => {
    const frame = i + 1;
    return `${frame > 1 ? "spr:newEmptyFrame()\n" : ""}spr:newCel(spr.layers[1], ${frame}, Image{ fromFile = ${lua(f)} }, Point(0, 0))`;
  }),
  ...tags.flatMap((t) => [
    `do local tag = spr:newTag(${t.from}, ${t.to}); tag.name = ${JSON.stringify(t.name)} end`,
    `for i = ${t.from}, ${t.to} do spr.frames[i].duration = ${t.delay / 100} end`,
  ]),
  `spr:saveAs(${lua(out)})`,
].join("\n");
const scriptPath = join(work, "build.lua");
writeFileSync(scriptPath, script);

const exe = ASEPRITE_CANDIDATES.find((p) => existsSync(p));
if (!exe) throw new Error(`Aseprite not found; set ASEPRITE. Script left at ${scriptPath}`);
execFileSync(exe, ["-b", "--script", scriptPath], { stdio: "inherit" });
console.log(`${out}: ${files.length} frames, tags ${tags.map((t) => t.name).join(", ")}`);
