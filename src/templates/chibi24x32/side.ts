// Side view, facing right (facing left is the mirror). See body.ts for the frame layout and letters.

import { propFill, propView, secondHand, type PropAttach } from "../../props.ts";
import { shadeRight, stroke, type Pt } from "../../rig.ts";
import { cleanOutlines, gridFill, paint, Sprite, type Fill } from "../../sprite.ts";
import { faceGrid, FOOT_V, FOREARM, GROUND, H, HAND, isLeg, leg, SHIN, THIGH, UPPER_ARM, W, type Face, type FootStamp } from "./body.ts";
import { SEAT_HIP, solveArm, stanceDrop, type ArmTarget, type BodyPose, type Stance, type V3 } from "./pose.ts";

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
  /** General arm poses (pose.ts); an arm with a target ignores its swing angle. */
  arms?: { near?: ArmTarget; far?: ArmTarget };
  /** Standing (default) or seated with the hips on SEAT_HIP. */
  stance?: Stance;
  props?: PropAttach[];
  face?: Face;
}

/** Grid cells of the mouth in the side head: two pixels under the eye, one skin pixel short of the
 * face's front outline (against it they read as a notch in the chin). */
const MOUTH_SIDE: [number, number][] = [[10, 9], [11, 9]];

type ArmLetters = [arm: string, shade: string, hand: string];

/** Strokes an arm's bones: 2 px wide, shade on the right, the hand in its own letter. */
function strokeArm(shoulder: Pt, elbow: Pt, wrist: Pt, tip: Pt, [arm, shade, hand]: ArmLetters): Fill {
  const f: Fill = new Map();
  const fore = UPPER_ARM + FOREARM;
  stroke(f, W, H, shoulder, elbow, 2, arm, { part: "arm", v0: 0, v1: UPPER_ARM });
  stroke(f, W, H, elbow, wrist, 2, arm, { part: "arm", v0: UPPER_ARM, v1: fore });
  shadeRight(f, W, arm, shade);
  stroke(f, W, H, wrist, tip, 2, hand, { part: "arm", v0: fore, v1: fore + HAND });
  return f;
}

/** The walk's arm: swung by an upper-arm angle, the forearm following. */
function arm(shoulder: Pt, angle: number, arm: string, shade: string, hand: string): Fill {
  const rad = (angle * Math.PI) / 180;
  const elbow = { x: shoulder.x + UPPER_ARM * Math.sin(rad), y: shoulder.y + UPPER_ARM * Math.cos(rad) };
  // The forearm swings a little further forward than the upper arm (a relaxed elbow).
  const fr = rad + ((angle > 0 ? 6 + angle * 0.3 : 3) * Math.PI) / 180;
  const wrist = { x: elbow.x + FOREARM * Math.sin(fr), y: elbow.y + FOREARM * Math.cos(fr) };
  const tip = { x: wrist.x + HAND * Math.sin(fr), y: wrist.y + HAND * Math.cos(fr) };
  return strokeArm(shoulder, elbow, wrist, tip, [arm, shade, hand]);
}

/** An arm reaching for a hand target: the 3D solve projected onto the side plane (out is depth). */
function armTo(shoulder: Pt, t: ArmTarget, letters: ArmLetters): Fill {
  const c = solveArm(t);
  const at = (v: V3): Pt => ({ x: shoulder.x + v.fwd, y: shoulder.y - v.up });
  return strokeArm(shoulder, at(c.elbow), at(c.wrist), at(c.tip), letters);
}

/** Top-left pixel of the hand in an arm fill: where a prop's grip lands. */
export function handAnchor(f: Fill, hand: string): Pt {
  let x = Infinity;
  let y = Infinity;
  for (const [i, p] of f) {
    if (p.ch !== hand) continue;
    x = Math.min(x, i % W);
    y = Math.min(y, Math.floor(i / W));
  }
  return { x, y };
}

/** Poses an arm so that its hand anchor lands on `want` (a two-handed prop's second grip). */
function armAnchored(shoulder: Pt, t: ArmTarget, want: Pt, letters: ArmLetters): Fill {
  let target = { ...t };
  let f = armTo(shoulder, target, letters);
  for (let i = 0; i < 3; i++) {
    const a = handAnchor(f, letters[2]);
    const dx = want.x - a.x;
    const dy = want.y - a.y;
    if (dx === 0 && dy === 0) break;
    target = { ...target, fwd: target.fwd + dx, up: target.up - dy };
    f = armTo(shoulder, target, letters);
  }
  return f;
}

/**
 * A leg bent at the knee with the foot planted ahead (seated, or the front leg of a kneel): the thigh
 * level and forward from the hips on row `hipRow`, the shin down from the knee, the boot flat on the
 * ground. UVs keep the standing ranges (thigh 0..THIGH along the thigh, shin on to the ankle, the foot
 * rows after), so hems and boots stay where the skin put them.
 */
function bentLegSide(hipRow: number, l: string, shade: string, foot: string): Fill {
  const f: Fill = new Map();
  const y = hipRow + 0.5;
  const shinX = 15.5;
  const ankleY = GROUND - FEET.flat.length;
  stroke(f, W, H, { x: 9.5, y }, { x: 14.5, y }, 2, l, { part: "leg", v0: 0, v1: THIGH });
  stroke(f, W, H, { x: shinX, y: y + 0.5 }, { x: shinX, y: ankleY }, 4, l, { part: "leg", v0: THIGH, v1: THIGH + SHIN });
  shadeRight(f, W, l, shade);
  const c = Math.round(shinX - 1.5);
  FEET.flat.forEach(([a, b], r) => {
    for (let x = c + a; x <= c + b; x++) f.set((ankleY + 1 + r) * W + x, { ch: foot, part: "leg", u: x - c, v: FOOT_V + r });
  });
  return f;
}

/**
 * The kneeling leg (the far one): the thigh straight down from the hips to the knee on the ground, the
 * shin lying back along the ground behind it, the boot at its end with the toes down.
 */
function kneelLegSide(hipRow: number, l: string, shade: string, foot: string): Fill {
  const f: Fill = new Map();
  const hip = { x: 11.5, y: hipRow + 0.5 };
  const knee = { x: 11.5, y: GROUND - 1 };
  stroke(f, W, H, hip, knee, 4, l, { part: "leg", v0: 0, v1: THIGH });
  stroke(f, W, H, { x: 10, y: GROUND - 0.5 }, { x: 6, y: GROUND - 0.5 }, 2, l, { part: "leg", v0: THIGH, v1: THIGH + SHIN });
  shadeRight(f, W, l, shade);
  for (let r = 0; r < 2; r++) for (let x = 3; x <= 5; x++) f.set((GROUND - 1 + r) * W + x, { ch: foot, part: "leg", u: x - 3, v: FOOT_V + r });
  return f;
}

const sideLeg = (hip: Pt, p: LegPose, l: string, shade: string, foot: string): Fill =>
  leg(hip, p.dx, p.lift, FEET[p.foot], { leg: l, shade, foot }, { bend: 1 });

const NEAR_ARM: ArmLetters = ["A", "a", "P"];
const FAR_ARM: ArmLetters = ["B", "b", "Q"];

/**
 * One side-view frame (facing right) as a letter sprite. Paint order, back to front: props behind the
 * body, far arm, legs, torso, head, props in front, near arm. A prop in the near hand is in front by
 * default, one in the far hand behind; hands are painted after props so the fingers wrap the grip.
 */
export function sideFrame(p: SidePose): Sprite {
  const s = new Sprite(W, H);
  const b = p.bob + stanceDrop(p.stance);
  const hipY = 22.5 + b;
  const shoulder = { x: 11, y: 17.5 + b };
  // Arms: the walk's swing, or a hand target. A two-handed prop pins the other hand to its second grip.
  let nearArm = p.arms?.near ? armTo(shoulder, p.arms.near, NEAR_ARM) : arm(shoulder, p.armNear, ...NEAR_ARM);
  let farArm = p.arms?.far ? armTo(shoulder, p.arms.far, FAR_ARM) : arm(shoulder, p.armFar, ...FAR_ARM);
  const props: { fill: Fill; z: "front" | "back"; over: boolean; outline: boolean }[] = [];
  for (const a of p.props ?? []) {
    const view = propView(a.prop, "side", a);
    // Worn on the head: pinned to the head grid origin, drawn over the face.
    const hand = a.hand === "head" ? { x: 5, y: 3 + b } : handAnchor(a.hand === "near" ? nearArm : farArm, a.hand === "near" ? "P" : "Q");
    const other = secondHand(view, hand);
    if (other && a.hand === "near" && p.arms?.far) farArm = armAnchored(shoulder, p.arms.far, other, FAR_ARM);
    if (other && a.hand === "far" && p.arms?.near) nearArm = armAnchored(shoulder, p.arms.near, other, NEAR_ARM);
    props.push({ fill: propFill(a.prop, view, hand, W, H), z: a.z ?? (a.hand === "far" ? "back" : "front"), over: !!view.overHand, outline: view.outline !== false });
  }
  const layer = (z: "front" | "back", over: boolean): void => {
    for (const pr of props) if (pr.z === z && pr.over === over) paint(s, pr.fill, pr.outline ? {} : { outlineOver: () => false });
  };
  layer("back", false);
  paint(s, farArm);
  layer("back", true);
  if (p.stance === "sit") {
    paint(s, bentLegSide(SEAT_HIP, "K", "k", "J"));
    paint(s, bentLegSide(SEAT_HIP, "L", "l", "F"));
  } else if (p.stance === "kneel") {
    // Down on the far knee, the near foot planted ahead; the hips sit a row above the knee.
    paint(s, kneelLegSide(22 + b, "K", "k", "J"));
    paint(s, bentLegSide(22 + b, "L", "l", "F"));
  } else {
    // A trailing lifted leg goes behind the planted one even on the near side: at this size a near swing
    // leg would hide the support leg completely and the passing frame would read as one leg with two feet.
    const far = sideLeg({ x: 11.5, y: hipY }, p.far, "K", "k", "J");
    const near = sideLeg({ x: 11.5, y: hipY }, p.near, "L", "l", "F");
    for (const l of p.near.lift > 0 && p.far.lift === 0 && p.near.dx <= p.far.dx ? [near, far] : [far, near]) paint(s, l);
  }
  paint(s, gridFill(W, TORSO_SIDE, 7, 16 + b, H, "torso"), { outlineOver: (u) => !isLeg(u) });
  paint(s, gridFill(W, faceGrid(HEAD_SIDE, p.face, MOUTH_SIDE), 5, 3 + b, H, "head"));
  layer("front", false);
  paint(s, nearArm);
  layer("front", true);
  // Posed arms keep the silhouette's edge where a hand's outline lands on the torso's (the walk's swing
  // never goes through this).
  cleanOutlines(s, { keepRuns: !!(p.arms?.near || p.arms?.far) });
  return s;
}

/** A general pose (pose.ts) as a side pose: swing angles stay angles, hand targets go to `arms`. */
export function sidePose(p: BodyPose): SidePose {
  const angle = (a: number | ArmTarget): number => (typeof a === "number" ? a : 0);
  const arms: SidePose["arms"] = {};
  if (typeof p.arms.near !== "number") arms.near = p.arms.near;
  if (typeof p.arms.far !== "number") arms.far = p.arms.far;
  return {
    bob: p.bob,
    near: p.legs?.near ?? STAND,
    far: p.legs?.far ?? STAND,
    armNear: angle(p.arms.near),
    armFar: angle(p.arms.far),
    arms,
    ...(p.stance ? { stance: p.stance } : {}),
    ...(p.props ? { props: p.props } : {}),
    ...(p.face ? { face: p.face } : {}),
  };
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
