// Template "chibi-24x32": the Siteyard v1 proportion (big head, short legs), 3/4 top-down, light from
// the top-left. The template is the skeleton: a grey mannequin whose every pixel letter names a body
// part, so a skin can later dress it without redrawing any frame. This file holds what every facing
// shares; each facing (side.ts, down.ts, up.ts) draws its own head, torso and poses.
//
// Frame layout (standing, bob = 0): headroom rows 0-1 (hats, hair), head rows 2-15 with outline, torso
// rows 16-22, legs 23-30, row 31 is the sole outline (ground contact). `bob` moves the head, torso and
// arms down; the legs are solved again from the lowered hip, so the knees take the bob.
//
// Letters: H head, h head shade, G head light; T torso, t torso shade; near / far pairs for the limbs
// (the far side is drawn darker): A/a near arm, B/b far arm, P/Q near/far hand, L/l near leg, K/k far
// leg, F/J near/far foot; e outline (also the eye). In the front and back views "near" is the
// character's right side (screen left facing down, screen right facing up) so that a skin can tell the
// two limbs apart in every facing.

import { ik, shadeRight, stroke, type Pt } from "../../rig.ts";
import type { Fill } from "../../sprite.ts";

export const W = 24;
export const H = 32;

export const GROUND = 30; // last filled row; row 31 is the sole outline

export const LEG_W = 4;
export const THIGH = 2.85;
export const SHIN = 2.85;
export const UPPER_ARM = 2.8;
export const FOREARM = 1.6;
export const HAND = 1.3;

/** v of a foot's first row: feet continue the leg's UV strip below the shin. */
export const FOOT_V = Math.ceil(THIGH + SHIN);

/** Foot stamp under the ankle: rows of [from, to] column offsets from the leg's first column. */
export type FootStamp = [number, number][];

export interface LegOptions {
  /** Knee direction: +1 / -1 bends toward +x / -x (side views); 0 keeps the leg straight and only
   * shortens it (front and back views, where the knee points at the viewer). */
  bend: 1 | -1 | 0;
  width?: number;
}

export interface LegLetters {
  leg: string;
  shade: string;
  foot: string;
}

/**
 * A leg from `hip` to an ankle `dx` px forward and `lift` rows off the ground, with `stamp` as its foot.
 * A leg only slightly short of full reach stays straight: a one-pixel knee kink at this size reads as a
 * broken leg, not a bent one.
 */
export function leg(hip: Pt, dx: number, lift: number, stamp: FootStamp, l: LegLetters, o: LegOptions): Fill {
  const width = o.width ?? LEG_W;
  const ankleY = GROUND - stamp.length - lift;
  const ankle = { x: hip.x + dx, y: ankleY };
  const slack = THIGH + SHIN - Math.hypot(ankle.x - hip.x, ankle.y - hip.y);
  const straight = o.bend === 0 || slack < 1.3;
  const knee = straight ? { x: (hip.x + ankle.x) / 2, y: (hip.y + ankle.y) / 2 } : ik(hip, ankle, THIGH, SHIN, o.bend === -1 ? -1 : 1);
  const f: Fill = new Map();
  stroke(f, W, H, hip, knee, width, l.leg, { part: "leg", v0: 0, v1: THIGH });
  stroke(f, W, H, knee, ankle, width, l.leg, { part: "leg", v0: THIGH, v1: THIGH + SHIN });
  shadeRight(f, W, l.leg, l.shade);
  const c = Math.round(ankle.x - (width - 1) / 2);
  stamp.forEach(([a, b], r) => {
    for (let x = c + a; x <= c + b; x++) f.set((ankleY + 1 + r) * W + x, { ch: l.foot, part: "leg", u: x - c, v: FOOT_V + r });
  });
  return f;
}

export const isLeg = (ch: string): boolean => "LlKkFJ".includes(ch);
