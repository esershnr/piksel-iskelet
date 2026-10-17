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
import { hex, type RGB } from "../palette.ts";

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

function color(skin: Skin, material: string, tone: number): RGB {
  const m = skin.materials[material];
  if (m === undefined) return [255, 0, 255];
  return hex(typeof m === "string" ? m : m[Math.max(0, Math.min(3, tone))]!);
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

/** Dresses one mannequin frame. Side frames face right; mirror the picture for facing left. */
export function dress(s: Sprite, skin: Skin, facing: Facing): Picture {
  const out = skin.outline;
  const px: (RGB | null)[] = s.info.map((p) => {
    if (!p) return null;
    // Generated outlines carry u = -1; eye pixels are outline letters inside a grid (u >= 0).
    if (p.u < 0) return hex(out);
    let key: string;
    if (p.part === "head") key = textureKey(skin.head, facing, p.u, p.v);
    else if (p.part === "torso") key = textureKey(skin.torso, facing, p.u, p.v);
    else if (p.part === "arm") key = stripKey(skin.arm, p.u, p.v);
    else if (p.part === "leg") key = stripKey(skin.leg, p.u, p.v);
    else key = "?";
    if (p.ch === "e") return hex(out); // the mannequin's eyes; a skin draws other eyes with an overlay
    return color(skin, key, TONE[p.ch] ?? 1);
  });
  const pic: Picture = { w: s.w, h: s.h, px };
  for (const o of skin.overlays ?? []) paintOverlay(pic, s, skin, o, facing);
  return pic;
}

function paintOverlay(pic: Picture, s: Sprite, skin: Skin, o: Overlay, facing: Facing): void {
  const place = o[facing];
  const at = origin(s, o.anchor);
  if (!place || !at) return;
  const fill = new Map<number, RGB>();
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
      if (entry) fill.set(y * pic.w + x, color(skin, entry[0], entry[1]));
    }),
  );
  const free = (i: number): boolean => o.z === "front" || pic.px[i] === null;
  for (const [i, c] of fill) if (free(i)) pic.px[i] = c;
  if (o.outline === false) return;
  const line = hex(skin.outline);
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

/** Loads `src/skin/skins/<name>.ts` and returns the skin it exports. */
export async function loadSkin(name: string): Promise<Skin> {
  if (!/^[a-z0-9_-]+$/.test(name)) throw new Error(`bad skin name: ${name}`);
  const mod: Record<string, unknown> = await import(`./skins/${name}.ts`);
  const skin = Object.values(mod).find((v): v is Skin => typeof v === "object" && v !== null && "materials" in v);
  if (!skin) throw new Error(`no skin exported from skins/${name}.ts`);
  return skin;
}
