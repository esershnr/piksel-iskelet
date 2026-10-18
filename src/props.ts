// Props: hand-held things (a hammer, a brick, a tea glass) drawn as letter grids and pinned to a hand.
// Rotation looks bad at pixel scale, so a prop is a set of hand-drawn views: one grid per facing and
// orientation ("down" hanging from the hand, "up" raised, "fwd" pointing ahead...). A view marks its
// grip, the grid cell the hand's top-left pixel sits on, so the prop lands wherever the pose puts the
// hand; two-handed props name a second grip and the other arm is posed to reach it.
//
// Prop pixels carry part "prop:<name>" and the grid's own (u, v), so a skin can paint them like a body
// part. Their letters name a material and a tone (PROP_LETTERS): every material has a default ramp
// (PROP_MATERIALS) and a skin may override one. Props are fill only; paint() draws the 1-px outline.

import type { Pt } from "./rig.ts";
import { gridFill, type Fill } from "./sprite.ts";

/** Light, base, shade, dark; a single color is a flat material. */
export type MaterialRamp = [string, string, string, string] | string;

export const PROP_MATERIALS: Record<string, MaterialRamp> = {
  steel: ["#e6ecf1", "#a6b2bf", "#6a7786", "#434c5a"],
  wood: ["#dcae74", "#b57f45", "#84582c", "#5c3c1e"],
  paper: ["#fffdf5", "#f1e9d6", "#cfc2a8", "#a4967e"],
  ink: "#3f66a8",
  brick: ["#e6926a", "#c66843", "#984a2e", "#6d331f"],
  mortar: ["#ddd6ca", "#bcb4a7", "#968e82", "#716a60"],
  glass: ["#ffffff", "#e3ecf4", "#b2c2d2", "#8294a7"],
  tea: ["#f2a24a", "#d4652a", "#9e421c", "#6c2b12"],
  plastic: ["#9a98a8", "#6a6878", "#4a4856", "#33313c"],
  led: "#ff4b3e",
  paint: ["#86baff", "#4386d8", "#2c5d9e", "#1e4170"],
  tape: ["#ffe27a", "#f7c531", "#d99a1e", "#b07414"],
  spark: ["#fff6c8", "#ffd34a", "#ff9a2e", "#c9561e"],
  earth: ["#b08a5e", "#86623d", "#5f4429", "#3f2c1a"],
  visor: "#2b5a7c",
};

/** Prop letter -> [material, tone]. Digits are the light tone, upper case base, lower case shade. */
export const PROP_LETTERS: Record<string, [string, number]> = {
  "1": ["steel", 0], M: ["steel", 1], m: ["steel", 2],
  "2": ["wood", 0], W: ["wood", 1], w: ["wood", 2],
  "3": ["paper", 0], N: ["paper", 1], n: ["paper", 2],
  i: ["ink", 1],
  "4": ["brick", 0], R: ["brick", 1], r: ["brick", 2],
  o: ["mortar", 1],
  "5": ["glass", 0], g: ["glass", 1],
  C: ["tea", 1], c: ["tea", 2],
  "6": ["plastic", 0], D: ["plastic", 1], d: ["plastic", 2],
  x: ["led", 1],
  "7": ["paint", 0], U: ["paint", 1], u: ["paint", 2],
  "8": ["tape", 0], Y: ["tape", 1], y: ["tape", 2],
  S: ["spark", 0], s: ["spark", 1], f: ["spark", 2],
  "9": ["earth", 0], Z: ["earth", 1], z: ["earth", 2],
  v: ["visor", 1],
};

export const isPropLetter = (ch: string): boolean => ch in PROP_LETTERS;
export const isPropPart = (part: string): boolean => part.startsWith("prop:");

export interface PropView {
  /** Fill letters (PROP_LETTERS, 'e' for a drawn line, '.' empty). */
  rows: string[];
  /** Grid cell under the holding hand's top-left pixel. */
  grip: Pt;
  /** Second grip (two-handed props): where the other hand's top-left pixel must land. */
  grip2?: Pt;
  /** Painted after the hand instead of before it: small things held from below (a glass, a handset)
   * cover the fingers; a handle is covered by them. */
  overHand?: boolean;
  /** No 1-px outline (loose effect pixels: sparks). */
  outline?: false;
}

/** Views by facing, then by orientation name. Side views face right. */
export type PropViews = Partial<Record<PropFacing, Record<string, PropView>>>;

export interface Prop {
  name: string;
  views: PropViews;
}

/** A prop in a pose: which view, in which hand, and where it is drawn relative to the body. */
export type PropFacing = "side" | "down" | "up";

export interface PropAttach {
  prop: Prop;
  /** Orientation name, or one per facing ("fwd" from the side is "flat" from the front); the facing
   * must have it. */
  view: string | Partial<Record<PropFacing, string>>;
  /** The hand it is pinned to, or "head" for things worn on the head (a welding mask): the grip then
   * lands on the head grid's origin. */
  hand: "near" | "far" | "head";
  /** Drawn before the body ("back") or after it ("front"); default by hand (side views) or by how far
   * forward the hand is (front and back views). Hands are drawn over the prop unless its view says
   * `overHand`. */
  z?: "front" | "back";
  /** Mirror the view left-right (a view drawn for one hand, held in the other), for every facing or
   * per facing (the far hand is screen-right facing down and screen-left facing up). */
  flip?: boolean | Partial<Record<PropFacing, boolean>>;
}

/** The view a prop shows in an attachment; throws when the facing lacks that orientation. */
export function propView(p: Prop, facing: PropFacing, a: PropAttach): PropView {
  const name = typeof a.view === "string" ? a.view : a.view[facing];
  const v = name ? p.views[facing]?.[name] : undefined;
  if (!v) throw new Error(`prop ${p.name}: no "${name}" view facing ${facing}`);
  const flip = typeof a.flip === "object" ? a.flip[facing] : a.flip;
  return flip ? flipView(v) : v;
}

/** The view mirrored left-right, grips included. */
export function flipView(v: PropView): PropView {
  const w = Math.max(...v.rows.map((r) => r.length));
  const flip = (p: Pt): Pt => ({ x: w - 2 - p.x, y: p.y }); // a 2-px hand's top-left moves one cell in
  const out: PropView = { rows: v.rows.map((r) => [...r.padEnd(w, ".")].reverse().join("")), grip: flip(v.grip) };
  if (v.grip2) out.grip2 = flip(v.grip2);
  if (v.overHand) out.overHand = true;
  if (v.outline === false) out.outline = false;
  return out;
}

/** Fill of a view placed so that its grip sits on `hand` (the hand's top-left pixel). */
export function propFill(p: Prop, v: PropView, hand: Pt, w: number, h: number): Fill {
  return gridFill(w, v.rows, hand.x - v.grip.x, hand.y - v.grip.y, h, `prop:${p.name}`);
}

/** Where the second hand of a two-handed view must be once the first hand is at `hand`. */
export function secondHand(v: PropView, hand: Pt): Pt | null {
  return v.grip2 ? { x: hand.x - v.grip.x + v.grip2.x, y: hand.y - v.grip.y + v.grip2.y } : null;
}
