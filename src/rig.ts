// Two-bone limbs: a pose gives the root (hip, shoulder) and the end (ankle, hand); the middle joint is
// solved by IK and each bone is stroked as a fixed-width band of pixels. Pixel centers sit on integer
// coordinates, so a band of width w around x covers columns round(x - (w-1)/2) .. +w-1.
//
// Limb UVs: u is the column across the band (0 = the -x edge for steep bones), v runs along the limb in
// rest-length units, so a bone keeps the same v range however much the pose shortens it and a sleeve or
// trouser hem painted at some v stays put in every frame.

import type { Fill } from "./sprite.ts";

export interface Pt {
  x: number;
  y: number;
}

/**
 * Middle joint of a two-bone chain from `root` to `end`. `bend` picks the side the joint points to
 * (+1: toward +x, the facing direction for knees and elbows). Out of reach -> the straight limb.
 */
export function ik(root: Pt, end: Pt, l1: number, l2: number, bend: 1 | -1): Pt {
  const dx = end.x - root.x;
  const dy = end.y - root.y;
  const d = Math.hypot(dx, dy);
  if (d < 1e-6) return { x: root.x, y: root.y + l1 };
  if (d >= l1 + l2) return { x: root.x + (dx * l1) / d, y: root.y + (dy * l1) / d };
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const mx = root.x + (dx * a) / d;
  const my = root.y + (dy * a) / d;
  // Two perpendiculars; pick the one on the requested side.
  const px = -dy / d;
  const py = dx / d;
  const c1 = { x: mx + px * h, y: my + py * h };
  const c2 = { x: mx - px * h, y: my - py * h };
  return (c1.x - c2.x) * bend >= 0 ? c1 : c2;
}

export interface Bone {
  /** Part name written into every pixel (e.g. "arm", "leg"). */
  part: string;
  /** v at `a` and at `b` (rest-length units along the limb). */
  v0: number;
  v1: number;
}

/** Strokes a bone as a band `width` pixels across (horizontal spans if steep, vertical if flat). */
export function stroke(fill: Fill, w: number, h: number, a: Pt, b: Pt, width: number, letter: string, bone: Bone): void {
  const steep = Math.abs(b.y - a.y) >= Math.abs(b.x - a.x);
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const steps = Math.max(1, Math.ceil(len * 4));
  const off = (width - 1) / 2;
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    const v = Math.floor(bone.v0 + (bone.v1 - bone.v0) * t);
    for (let k = 0; k < width; k++) {
      const px = steep ? Math.round(x - off) + k : Math.round(x);
      const py = steep ? Math.round(y) : Math.round(y - off) + k;
      if (px < 0 || py < 0 || px >= w || py >= h) continue;
      fill.set(py * w + px, { ch: letter, part: bone.part, u: k, v });
    }
  }
}

/** Re-letters the pixels of `fill` whose right neighbour is outside it (shade side, light from the left). */
export function shadeRight(fill: Fill, w: number, from: string, to: string): void {
  for (const [i, p] of fill) {
    if (p.ch !== from) continue;
    const x = i % w;
    if (x === w - 1 || !fill.has(i + 1)) fill.set(i, { ...p, ch: to });
  }
}
