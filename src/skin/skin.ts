// Skins: a character is a set of textures looked up through the skeleton's UV map, never a redrawn frame.
//
// A skin names materials (a 4-tone ramp: light, base, shade, dark) and says, per body part, which
// material sits where:
//   - rigid parts (head, torso) get a texture per facing, a text grid aligned with that facing's
//     mannequin grid (u = column, v = row);
//   - limbs (arm, leg) get one strip shared by every facing: row = v (shoulder -> hand, hip -> foot),
//     column = u across the limb (a short row repeats its last character).
// The tone comes from the mannequin letter (light G, base H/T/A/L, shade h/t/a/l, far limbs one step
// darker), so lighting stays consistent across every character without being painted into the skin.
// Overlays add what leaves the body silhouette (hair volume, hats, tools), anchored to a part.

import type { Sprite } from "../sprite.ts";
import { hex, MISSING, type RGB } from "../palette.ts";
import { isPropPart, PROP_LETTERS, PROP_MATERIALS } from "../props.ts";

export type Facing = "side" | "down" | "up";

/** Light, base, shade, dark. A single color fills every tone (flat materials: eyes, stripes). */
export type Ramp = [string, string, string, string] | string;

export interface PartTexture {
  /** Material for pixels the facing's grid leaves blank or that have no grid. */
  base: string;
  /** Per-facing grids of material keys; '.' falls back to `base`. Facing-specific `base` overrides. */
  side?: string[];
  down?: string[];
  up?: string[];
  baseBy?: Partial<Record<Facing, string>>;
}

export interface Overlay {
  /** Part whose grid origin (u = 0, v = 0) the overlay is placed against. */
  anchor: string;
  /** "front" paints over the body, "back" only into empty pixels. */
  z: "front" | "back";
  /** Per-facing placement relative to the anchor origin, and the grid ('.' empty). */
  side?: { x: number; y: number; rows: string[] };
  down?: { x: number; y: number; rows: string[] };
  up?: { x: number; y: number; rows: string[] };
  /** Overlay letter -> [material, tone 0-3]. A '-' in the grid erases the frame there (to reshape the
   * silhouette, e.g. the gaps between hair spikes cut into the round top of the head). */
  legend: Record<string, [string, number]>;
  /** 1-px outline around the overlay: everywhere (default), only against the background ("edge": hair
   * merging into the head's own hair), or none (thin straps). */
  outline?: boolean | "edge";
}

export interface Skin {
  name: string;
  outline: string;
  materials: Record<string, Ramp>;
  head: PartTexture;
  torso: PartTexture;
  arm: string[];
  leg: string[];
  overlays?: Overlay[];
  /** Prop materials this skin overrides (props.ts PROP_MATERIALS has the defaults): a foreman's red
   * clipboard, a tea glass with a gold rim. */
  props?: Record<string, Ramp>;
}

// Tone of each mannequin letter. Far limbs sit one step darker than the near ones.
const TONE: Record<string, number> = {
  G: 0,
  H: 1, T: 1, A: 1, L: 1, P: 1, F: 1,
  h: 2, t: 2, a: 2, l: 2, B: 2, K: 2, Q: 2, J: 2,
  b: 3, k: 3,
};

/** A skinned frame: one color per pixel, null where transparent. */
export interface Picture {
  w: number;
  h: number;
  px: (RGB | null)[];
}

/** A frame resolved to anything per pixel (a color, a palette symbol), null where transparent. */
interface Canvas<T> {
  w: number;
  h: number;
  px: (T | null)[];
}

/** How a resolved ramp entry becomes a pixel value: `dress` parses hex colors, `dressSymbols` keeps the
 * entry itself (a palette letter). `missing` marks an unknown material. */
interface Pick<T> {
  entry: (e: string) => T;
  missing: T;
}

/** The ramp entry for a tone (a flat material fills every tone). */
const toneOf = (r: Ramp, tone: number): string => (typeof r === "string" ? r : r[Math.max(0, Math.min(3, tone))]!);

function material<T>(skin: Skin, pick: Pick<T>, key: string, tone: number): T {
  const m = skin.materials[key];
  return m === undefined ? pick.missing : pick.entry(toneOf(m, tone));
}

function textureKey(t: PartTexture, facing: Facing, u: number, v: number): string {
  const ch = t[facing]?.[v]?.[u];
  return ch && ch !== "." ? ch : (t.baseBy?.[facing] ?? t.base);
}

function stripKey(strip: string[], u: number, v: number): string {
  const row = strip[Math.min(v, strip.length - 1)] ?? "";
  return row[Math.min(u, row.length - 1)] ?? "?";
}

/** Grid origin of `part` in the frame: any of its pixels minus its own (u, v). */
function origin(s: Sprite, part: string): { x: number; y: number } | null {
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++) {
      const p = s.at(x, y);
      if (p && p.part === part && p.u >= 0) return { x: x - p.u, y: y - p.v };
    }
  return null;
}

/** The one lookup behind `dress` and `dressSymbols`: part textures, limb strips, prop materials and
 * overlays, with every ramp entry turned into a pixel value by `pick`. */
function resolve<T>(s: Sprite, skin: Skin, facing: Facing, pick: Pick<T>): Canvas<T> {
  const out = pick.entry(skin.outline);
  const px: (T | null)[] = s.info.map((p) => {
    if (!p) return null;
    // Generated outlines carry u = -1; eye pixels are outline letters inside a grid (u >= 0).
    if (p.u < 0) return out;
    if (p.ch === "e") return out; // the mannequin's eyes and prop lines; a skin draws other eyes with an overlay
    if (isPropPart(p.part)) {
      // Props color by material: the skin's override if it has one, else the material's default.
      const entry = PROP_LETTERS[p.ch];
      if (!entry) return pick.missing;
      const [name, tone] = entry;
      const ramp = skin.props?.[name] ?? PROP_MATERIALS[name];
      if (ramp === undefined) return pick.missing;
      return pick.entry(typeof ramp === "string" ? ramp : ramp[tone]!);
    }
    let key: string;
    if (p.part === "head") key = textureKey(skin.head, facing, p.u, p.v);
    else if (p.part === "torso") key = textureKey(skin.torso, facing, p.u, p.v);
    else if (p.part === "arm") key = stripKey(skin.arm, p.u, p.v);
    else if (p.part === "leg") key = stripKey(skin.leg, p.u, p.v);
    else key = "?";
    return material(skin, pick, key, TONE[p.ch] ?? 1);
  });
  const c: Canvas<T> = { w: s.w, h: s.h, px };
  for (const o of skin.overlays ?? []) paintOverlay(c, s, skin, o, facing, pick);
  return c;
}

const COLORS: Pick<RGB> = { entry: hex, missing: MISSING };

/** Dresses one mannequin frame. Side frames face right; mirror the picture for facing left. */
export function dress(s: Sprite, skin: Skin, facing: Facing): Picture {
  return resolve(s, skin, facing, COLORS);
}

/**
 * Dresses one mannequin frame into palette symbols: a skin whose ramps hold one-character symbols (a
 * game's palette letters, e.g. skins/siteyard.ts) yields the frame as text rows, '.' transparent and
 * every outline (the mannequin's eyes and mouth included) "e". Unknown materials show as '?'.
 */
export function dressSymbols(s: Sprite, skin: Skin, facing: Facing): string[] {
  const c = resolve(s, { ...skin, outline: "e" }, facing, { entry: (e) => e, missing: "?" });
  const rows: string[] = [];
  for (let y = 0; y < c.h; y++) rows.push(c.px.slice(y * c.w, (y + 1) * c.w).map((ch) => ch ?? ".").join(""));
  return rows;
}

function paintOverlay<T>(pic: Canvas<T>, s: Sprite, skin: Skin, o: Overlay, facing: Facing, pick: Pick<T>): void {
  const place = o[facing];
  const at = origin(s, o.anchor);
  if (!place || !at) return;
  const fill = new Map<number, T>();
  place.rows.forEach((row, ry) =>
    [...row].forEach((ch, rx) => {
      const x = at.x + place.x + rx;
      const y = at.y + place.y + ry;
      if (x < 0 || y < 0 || x >= pic.w || y >= pic.h) return;
      if (ch === "-") {
        pic.px[y * pic.w + x] = null;
        return;
      }
      const entry = o.legend[ch];
      if (entry) fill.set(y * pic.w + x, material(skin, pick, entry[0], entry[1]));
    }),
  );
  // A prop drawn over the body (a raised hammer in front of the hat) stays over the overlay too.
  const free = (i: number): boolean => (o.z === "front" || pic.px[i] === null) && !isPropPart(s.info[i]?.part ?? "");
  for (const [i, c] of fill) if (free(i)) pic.px[i] = c;
  if (o.outline === false) return;
  const line = pick.entry(skin.outline);
  for (const i of fill.keys()) {
    const x = i % pic.w;
    const y = (i - x) / pic.w;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= pic.w || ny >= pic.h) continue;
      const j = ny * pic.w + nx;
      if (!fill.has(j) && free(j) && (o.outline !== "edge" || pic.px[j] === null)) pic.px[j] = line;
    }
  }
}

export function mirrorPicture(p: Picture): Picture {
  const px: (RGB | null)[] = new Array(p.px.length).fill(null);
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) px[y * p.w + (p.w - 1 - x)] = p.px[y * p.w + x]!;
  return { w: p.w, h: p.h, px };
}

/** Loads `src/skin/skins/<name>.ts` and returns the skin it exports; `<role>:<tone>` is a role skin
 * (skins/roles.ts). */
export async function loadSkin(name: string): Promise<Skin> {
  const role = /^([a-z_]+):(light|mid|dark)$/.exec(name);
  if (role) {
    const mod = await import("./skins/roles.ts");
    return mod.roleSkin(role[1]!, role[2] as "light" | "mid" | "dark");
  }
  if (!/^[a-z0-9_-]+$/.test(name)) throw new Error(`bad skin name: ${name}`);
  const mod: Record<string, unknown> = await import(`./skins/${name}.ts`);
  const skin = Object.values(mod).find((v): v is Skin => typeof v === "object" && v !== null && "materials" in v);
  if (!skin) throw new Error(`no skin exported from skins/${name}.ts`);
  return skin;
}
