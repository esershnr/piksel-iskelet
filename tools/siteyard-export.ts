// Exports the skeleton's animations in Siteyard's letter-grid format: every animation dressed with the
// symbolic skin (skins/siteyard.ts) into 24x32 rows of palette letters, with the hat-band rectangle and
// what Siteyard needs to play it (frames, fps, loop, facings, seated). Side frames face right; Siteyard
// mirrors them for "left" itself. The sleep zzz is lifted out of the body rows into a `fixed` layer that
// Siteyard pastes un-mirrored, so the text still reads on a left-facing sleeper. push_cart is exported
// without the cart: Siteyard draws its map wheelbarrow as a held layer on the pusher. The role looks
// (skins/roles.ts, in Siteyard's palette letters) go along as SKELETON_ROLES: roles are defined in
// piksel-iskelet, Siteyard only reads them.
//   node tools/siteyard-export.ts <siteyardRoot | outFile.ts> [--json]
//     (siteyardRoot: writes <root>/src/theme/construction/sprites/skeleton.ts; --json also writes the
//     same data as <out>.json)

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { dressSymbols } from "../src/skin/skin.ts";
import { SITEYARD_ROLES } from "../src/skin/skins/roles.ts";
import { SITEYARD } from "../src/skin/skins/siteyard.ts";
import { keyPose, KEY_TABLES, PUSH_CART_BARE, WALK_META, type AnimMeta } from "../src/templates/chibi24x32/anims.ts";
import { ANIMS, facingOf, poseFrame, type Facing } from "../src/templates/chibi24x32/index.ts";

type SyFacing = "down" | "up" | "right" | "left";
type Band = [number, number, number, number];
interface Fixed {
  rows: string[];
  x: number;
  y: number;
}
interface Frame {
  rows: string[];
  band: Band;
  fixed?: Fixed[];
}
interface Meta {
  frames: number;
  fps: number;
  loop: boolean;
  facings: SyFacing[];
  seated?: boolean;
  note?: string;
}

const args = process.argv.slice(2);
const json = args.includes("--json");
const target = args.find((a) => !a.startsWith("--"));
if (!target) {
  console.error("usage: node tools/siteyard-export.ts <siteyardRoot | outFile.ts> [--json]");
  process.exit(1);
}
const outFile = target.endsWith(".ts") ? resolve(target) : join(resolve(target), "src", "theme", "construction", "sprites", "skeleton.ts");

// Siteyard draws the pushed wheelbarrow itself (its map prop as a held layer), so push_cart goes out bare.
const byName = new Map([...ANIMS, ...PUSH_CART_BARE].map((a) => [a.name, a]));
const SY: Record<Facing, SyFacing> = { side: "right", down: "down", up: "up" };
const ALL: Facing[] = ["down", "up", "side"];

// Every animation with its metadata: the walk and the idle (index.ts), the key tables, the loaded walks.
const SOURCES: [string, AnimMeta][] = [
  ["idle", { delay: byName.get("idle_down")!.delay, loop: true }],
  ["walk", { delay: byName.get("walk_down")!.delay, loop: true }],
  ...Object.entries(KEY_TABLES).map(([n, t]): [string, AnimMeta] => [n, t.meta]),
  ...Object.entries(WALK_META),
];

/** The hat band: the one row holding 'A', its x span; every pixel in it must be 'A'. */
function bandOf(rows: string[], at: string): Band {
  const ys = rows.flatMap((r, y) => (r.includes("A") ? [y] : []));
  if (ys.length !== 1) throw new Error(`${at}: band on ${ys.length} rows`);
  const y = ys[0]!;
  const row = rows[y]!;
  const x0 = row.indexOf("A");
  const x1 = row.lastIndexOf("A");
  if (row.slice(x0, x1 + 1) !== "A".repeat(x1 - x0 + 1)) throw new Error(`${at}: band row ${y} broken: ${row}`);
  return [x0, y, x1 - x0 + 1, 1];
}

/** Pixels of `a` that differ from `b`, as one layer: the bounding box with '.' outside. */
function diffLayer(a: string[], b: string[]): Fixed | null {
  const pts: [number, number][] = [];
  a.forEach((r, y) => [...r].forEach((ch, x) => ch !== b[y]![x] && pts.push([x, y])));
  if (pts.length === 0) return null;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const w = Math.max(...xs) - x + 1;
  const h = Math.max(...ys) - y + 1;
  const rows = Array.from({ length: h }, () => Array<string>(w).fill("."));
  for (const [px, py] of pts) rows[py - y]![px - x] = a[py]![px]!;
  return { rows: rows.map((r) => r.join("")), x, y };
}

function framesOf(name: string, facing: Facing): Frame[] {
  const a = byName.get(`${name}_${facing}`);
  if (!a) throw new Error(`no animation ${name}_${facing}`);
  const view = facingOf(a);
  return a.frames().map((s, i) => {
    const at = `${name}_${facing} frame ${i}`;
    const full = dressSymbols(s, SITEYARD, view);
    if (name !== "sleep") return { rows: full, band: bandOf(full, at) };
    // Sleep: the same key without the zzz; the difference is the zzz, a layer of its own.
    const k = KEY_TABLES["sleep"]!.keys[i]!;
    const body = dressSymbols(poseFrame(view, keyPose({ ...k, props: (k.props ?? []).filter((p) => p.prop.name !== "zzz") })), SITEYARD, view);
    const zzz = diffLayer(full, body);
    const f: Frame = { rows: body, band: bandOf(body, at) };
    if (zzz) {
      if (zzz.rows.some((r) => /[^.w]/.test(r))) throw new Error(`${at}: the zzz layer holds more than the zzz: ${zzz.rows.join("/")}`);
      f.fixed = [zzz];
    }
    return f;
  });
}

const META: Record<string, Meta> = {};
const FRAMES: Record<string, Partial<Record<"right" | "down" | "up", Frame[]>>> = {};
for (const [name, m] of SOURCES) {
  const facings = m.facings ?? ALL;
  const frames: Partial<Record<"right" | "down" | "up", Frame[]>> = {};
  for (const f of facings) frames[SY[f] as "right" | "down" | "up"] = framesOf(name, f);
  const counts = new Set(Object.values(frames).map((fs) => fs.length));
  if (counts.size !== 1) throw new Error(`${name}: frame counts differ across facings`);
  META[name] = {
    frames: [...counts][0]!,
    fps: Math.round(100 / m.delay),
    loop: m.loop,
    facings: facings.flatMap((f): SyFacing[] => (f === "side" ? ["right", "left"] : [SY[f]])),
    ...(m.seated ? { seated: true } : {}),
    ...(m.note ? { note: m.note } : {}),
  };
  FRAMES[name] = frames;
}

const q = (v: unknown): string => JSON.stringify(v);
const frameTs = (f: Frame): string =>
  `{rows:${q(f.rows)},band:${q(f.band)}${f.fixed ? `,fixed:[${f.fixed.map((l) => `{rows:${q(l.rows)},x:${l.x},y:${l.y}}`).join(",")}]` : ""}}`;
const lines = [
  "// generated by piksel-iskelet tools/siteyard-export.ts, do not edit",
  "// Skeleton animations dressed with skins/siteyard.ts: 24x32 rows of palette letters and role/skin-tone",
  "// symbols, side frames facing right (left = mirror), `band` the hat band [x, y, w, h], `fixed` layers",
  "// pasted after mirroring (the sleep zzz). SKELETON_ROLES: the role looks of skins/roles.ts in palette",
  "// letters (Siteyard's ROLE_LOOKS).",
  "",
  "export interface SkeletonFrame { rows: string[]; band: [number, number, number, number]; fixed?: { rows: string[]; x: number; y: number }[] }",
  "",
  'export const SKELETON_META: Record<string, { frames: number; fps: number; loop: boolean; facings: ("down" | "up" | "right" | "left")[]; seated?: boolean; note?: string }> = {',
  ...Object.entries(META).map(([n, m]) => `  ${n}: ${q(m)},`),
  "};",
  "",
  "export const SKELETON_ROLES: Record<string, { H: string; L: string; I: string; X: string; Q: string; vest: boolean; clipboard: boolean; extra?: Record<string, string>; anims?: string[] }> = {",
  ...Object.entries(SITEYARD_ROLES).map(([r, l]) => `  ${r}: ${q(l)},`),
  "};",
  "",
  'export const SKELETON_FRAMES: Record<string, Partial<Record<"right" | "down" | "up", SkeletonFrame[]>>> = {',
  ...Object.entries(FRAMES).flatMap(([n, fs]) => [
    `  ${n}: {`,
    ...Object.entries(fs).flatMap(([f, list]) => [`    ${f}: [`, ...list.map((fr) => `      ${frameTs(fr)},`), "    ],"]),
    "  },",
  ]),
  "};",
  "",
];
const text = lines.join("\n");
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, text);
const total = Object.values(FRAMES).reduce((n, fs) => n + Object.values(fs).reduce((k, list) => k + list.length, 0), 0);
console.log(`${outFile}: ${Object.keys(SITEYARD_ROLES).length} roles, ${Object.keys(META).length} animations, ${total} frames, ${(text.length / 1024).toFixed(1)} KiB`);
if (json) {
  const jf = outFile.replace(/\.ts$/, ".json");
  const data = JSON.stringify({ meta: META, roles: SITEYARD_ROLES, frames: FRAMES });
  writeFileSync(jf, data);
  console.log(`${jf}: ${(data.length / 1024).toFixed(1)} KiB`);
}
