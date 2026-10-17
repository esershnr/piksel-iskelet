// Side view, facing right (facing left is the mirror). See body.ts for the frame layout and letters.

import { shadeRight, stroke, type Pt } from "../../rig.ts";
import { cleanOutlines, gridFill, paint, Sprite, type Fill } from "../../sprite.ts";
import { FOREARM, H, HAND, isLeg, leg, UPPER_ARM, W, type FootStamp } from "./body.ts";

// Fill only: outlines are generated. The eye is an outline pixel. No nose: Eser finds a pointed profile
// nose ugly (2026-10-17); the eye near the front edge carries the facing.
const HEAD_SIDE = [
  "....GGHHHH....",
  "..GGGHHHHHHH..",
  ".GGHHHHHHHHHH.",
  ".GHHHHHHHHHHHh",
  "GHHHHHHHHHHHHh",
  "GHHHHHHHHHHeHh",
  "HHHHHHHHHHHeHh",
  "HHHHHHHHHHHHHh",
  "hHHHHHHHHHHHHh",
  ".hHHHHHHHHHHh.",
  "..hhHHHHHHhh..",
  "....hhhhhh....",
];

const TORSO_SIDE = [
  ".TTTTTTTt",
  "TTTTTTTTt",
  "TTTTTTTTt",
  "TTTTTTTTt",
  "TTTTTTTTt",
  "TTTTTTTTt",
  "ttttttttt",
];

export type Foot = "flat" | "heel" | "toe";

// The toe fills both rows of the boot: a toe pixel on one row only read as a spike (Eser, 2026-10-17).
const FEET: Record<Foot, FootStamp> = {
  flat: [[0, 4], [0, 4]],
  heel: [[0, 4], [0, 4]], // the heel strikes first; at this size it reads like the flat boot
  toe: [[0, 3], [1, 4], [2, 4]], // heel up, weight on the toe
};

export interface LegPose {
  /** Ankle offset from the hip, pixels (+ = forward). */
  dx: number;
  /** Rows the foot is off the ground. */
  lift: number;
  foot: Foot;
}

export interface SidePose {
  bob: number;
  near: LegPose;
  far: LegPose;
  /** Upper-arm angle from vertical, degrees (+ = forward). */
  armNear: number;
  armFar: number;
}

function arm(shoulder: Pt, angle: number, arm: string, shade: string, hand: string): Fill {
  const rad = (angle * Math.PI) / 180;
  const elbow = { x: shoulder.x + UPPER_ARM * Math.sin(rad), y: shoulder.y + UPPER_ARM * Math.cos(rad) };
  // The forearm swings a little further forward than the upper arm (a relaxed elbow).
  const fr = rad + ((angle > 0 ? 6 + angle * 0.3 : 3) * Math.PI) / 180;
  const wrist = { x: elbow.x + FOREARM * Math.sin(fr), y: elbow.y + FOREARM * Math.cos(fr) };
  const tip = { x: wrist.x + HAND * Math.sin(fr), y: wrist.y + HAND * Math.cos(fr) };
  const f: Fill = new Map();
  const fore = UPPER_ARM + FOREARM;
  stroke(f, W, H, shoulder, elbow, 2, arm, { part: "arm", v0: 0, v1: UPPER_ARM });
  stroke(f, W, H, elbow, wrist, 2, arm, { part: "arm", v0: UPPER_ARM, v1: fore });
  shadeRight(f, W, arm, shade);
  stroke(f, W, H, wrist, tip, 2, hand, { part: "arm", v0: fore, v1: fore + HAND });
  return f;
}

const sideLeg = (hip: Pt, p: LegPose, l: string, shade: string, foot: string): Fill =>
  leg(hip, p.dx, p.lift, FEET[p.foot], { leg: l, shade, foot }, { bend: 1 });

/** One side-view frame (facing right) as a letter sprite. */
export function sideFrame(p: SidePose): Sprite {
  const s = new Sprite(W, H);
  const b = p.bob;
  const hipY = 22.5 + b;
  const shoulderY = 17.5 + b;
  paint(s, arm({ x: 11, y: shoulderY }, p.armFar, "B", "b", "Q"));
  // A trailing lifted leg goes behind the planted one even on the near side: at this size a near swing
  // leg would hide the support leg completely and the passing frame would read as one leg with two feet.
  const far = sideLeg({ x: 11.5, y: hipY }, p.far, "K", "k", "J");
  const near = sideLeg({ x: 11.5, y: hipY }, p.near, "L", "l", "F");
  for (const l of p.near.lift > 0 && p.far.lift === 0 && p.near.dx <= p.far.dx ? [near, far] : [far, near]) paint(s, l);
  paint(s, gridFill(W, TORSO_SIDE, 7, 16 + b, H, "torso"), { outlineOver: (u) => !isLeg(u) });
  paint(s, gridFill(W, HEAD_SIDE, 5, 3 + b, H, "head"));
  paint(s, arm({ x: 11, y: shoulderY }, p.armNear, "A", "a", "P"));
  cleanOutlines(s);
  return s;
}

// 8-beat walk: contact, down, passing, up, then the same with the other leg. The stride is 8 px and a
// planted ankle steps back exactly 2 px a frame, so the character must travel 2 px a frame (WALK_SIDE_STEP)
// for the feet not to skate.
export const STEP: LegPose[] = [
  { dx: 4, lift: 0, foot: "heel" }, // contact: front heel strikes
  { dx: 2, lift: 0, foot: "flat" }, // down: weight lands, knee gives
  { dx: 0, lift: 0, foot: "flat" }, // passing: under the hip
  { dx: -2, lift: 0, foot: "flat" }, // up: pushing the body over
  { dx: -4, lift: 0, foot: "toe" }, // (other contact) back leg on its toe
  { dx: -3, lift: 1, foot: "toe" }, // toe-off
  { dx: -2, lift: 1, foot: "toe" }, // passing: knee forward, foot trailing behind the support leg
  { dx: 2, lift: 1, foot: "flat" }, // reaching for the next contact
];
// The front and back walks (frontback.ts) project these same tables, so every facing walks alike.
export const WALK_BOB = [1, 1, 0, 0, 1, 1, 0, 0];
export const ARM_SWING = 35;

export const WALK_SIDE: SidePose[] = STEP.map((near, f) => {
  const swing = ARM_SWING * Math.cos((2 * Math.PI * f) / STEP.length);
  return { bob: WALK_BOB[f]!, near, far: STEP[(f + 4) % STEP.length]!, armNear: -swing, armFar: swing };
});

/** Pixels the character moves on each walk frame (planted ankle dx deltas). */
export const WALK_SIDE_STEP = [2, 2, 2, 2, 2, 2, 2, 2];

const STAND: LegPose = { dx: 0, lift: 0, foot: "flat" };

// Idle: a slow breath, the upper body sinks one row and comes back.
export const IDLE_SIDE: SidePose[] = [0, 0, 1, 1].map((bob) => ({ bob, near: STAND, far: STAND, armNear: -4, armFar: 6 }));
