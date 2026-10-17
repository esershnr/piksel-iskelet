// Front and back views share one way of drawing: the limbs of each pose are letter rows (in frame
// coordinates, generated from the side walk below), the head and torso are grids moved by `bob`. The
// pixel language follows Eris Esra's character template (studied for ideas, no pixels copied): straight
// vertical limbs, arms meeting the torso without an outline (their shade column separates them), an arm
// swinging away hidden behind the body as a shaded sliver with its side of the torso in shade, feet
// that grow toward the camera, symmetric shading.
//
// UVs: arm v runs shoulder -> hand (0..5; a longer arm is scaled into the same range, hand letters land
// on v >= 4), leg v counts rows from the hip (0..5) and feet continue at FOOT_V. u counts columns from
// the limb's left edge in that row.

import { cleanOutlines, gridFill, paint, Sprite, type Fill } from "../../sprite.ts";
import { FOOT_V, H, isLeg, W } from "./body.ts";
import { ARM_SWING, STEP, WALK_BOB } from "./side.ts";

export type Turn = "even" | "left" | "right";

export interface FrontPose {
  /** Head and torso offset (rows); limb rows are already in frame coordinates. */
  bob: number;
  /** Which side of the torso is turned away into shade. */
  turn: Turn;
  /** Limb letters, one 24-wide row per frame row starting at LIMB_TOP. */
  limbs: string[];
  /** Arms swung in front of the torso: outlined over it instead of meeting it through their shade. */
  front?: ("near" | "far")[];
}

export interface FacingLayout {
  head: string[];
  torso: Record<Turn, string[]>;
}

export const LIMB_TOP = 14;

const isTorso = (ch: string): boolean => ch === "T" || ch === "t";

const GROUPS = {
  armNear: "AaP",
  armFar: "BbQ",
  legNear: "LlF",
  legFar: "KkJ",
} as const;
type Group = keyof typeof GROUPS;
const FEET = "FJ";

/** Splits the limb rows into one fill per limb, with UVs. */
function limbFills(p: FrontPose): Record<Group, Fill> {
  const out = {} as Record<Group, Fill>;
  for (const [group, letters] of Object.entries(GROUPS) as [Group, string][]) {
    const f: Fill = new Map();
    const rows: number[] = [];
    p.limbs.forEach((row, i) => {
      if ([...row].some((ch) => letters.includes(ch))) rows.push(LIMB_TOP + i);
    });
    const top = rows[0] ?? 0;
    const arm = group.startsWith("arm");
    const scale = Math.min(1, 6 / Math.max(1, rows.length));
    let footRow = -1;
    for (const y of rows) {
      const row = p.limbs[y - LIMB_TOP]!;
      const xs = [...row].flatMap((ch, x) => (letters.includes(ch) ? [x] : []));
      const left = Math.min(...xs);
      if (footRow < 0 && xs.some((x) => FEET.includes(row[x]!))) footRow = y;
      for (const x of xs) {
        const ch = row[x]!;
        const v = arm
          ? Math.floor((y - top) * scale)
          : FEET.includes(ch)
            ? FOOT_V + (y - footRow)
            : Math.max(0, Math.min(5, y - (23 + p.bob)));
        f.set(y * W + x, { ch, part: arm ? "arm" : "leg", u: x - left, v });
      }
    }
    out[group] = f;
  }
  return out;
}

/** One front- or back-view frame as a letter sprite. */
export function frontFrame(p: FrontPose, lay: FacingLayout): Sprite {
  const s = new Sprite(W, H);
  const l = limbFills(p);
  paint(s, l.legFar);
  paint(s, l.legNear);
  paint(s, gridFill(W, lay.torso[p.turn], 7, 16 + p.bob, H, "torso"), { outlineOver: (u) => !isLeg(u) });
  paint(s, gridFill(W, lay.head, 5, 3 + p.bob, H, "head"));
  const noTorso = { outlineOver: (u: string) => !isTorso(u) };
  paint(s, l.armFar, p.front?.includes("far") ? {} : noTorso);
  paint(s, l.armNear, p.front?.includes("near") ? {} : noTorso);
  cleanOutlines(s);
  return s;
}

const SWAP: Record<string, string> = { A: "B", a: "b", P: "Q", B: "A", b: "a", Q: "P", L: "K", l: "k", F: "J", K: "L", k: "l", J: "F" };

/** The same pose with left and right exchanged (near limbs become far ones and vice versa). */
export function mirrorPose(p: FrontPose): FrontPose {
  const turn: Turn = p.turn === "left" ? "right" : p.turn === "right" ? "left" : "even";
  const front = p.front?.map((a) => (a === "near" ? "far" : "near"));
  return { bob: p.bob, turn, limbs: p.limbs.map((r) => [...r].reverse().map((ch) => SWAP[ch] ?? ch).join("")), ...(front ? { front } : {}) };
}

/** Torso grids: even, and with the left or right two columns turned away into shade. */
export function torsoTurns(even: string[]): Record<Turn, string[]> {
  const turn = (row: string, from: number, to: number): string =>
    [...row].map((ch, x) => (x >= from && x <= to && ch === "T" ? "t" : ch)).join("");
  return {
    even,
    left: even.map((r) => turn(r, 0, 2)),
    right: even.map((r) => turn(r, r.length - 3, r.length - 1)),
  };
}

// --- the walk, projected from the side walk ------------------------------------------------------------
// The side walk's tables (leg depth dx and lift, bob, arm swing) are the motion; a facing only decides
// how depth reads on screen. A foot coming toward the camera stays on the ground row and, at full
// stride, grows (facing down: one pixel wider with the toe turned out; facing up: the heel lifts and the sole
// shows); a foot going away rises up the screen and narrows. Arms: see putArm; an arm hidden at the end
// of its swing turns its side of the torso into shade.

export interface Projection {
  /** Screen side of the near (character's right) limbs. */
  near: "left" | "right";
  /** +1 when forward is toward the camera (facing down), -1 when it is away (facing up). */
  toward: 1 | -1;
}

type Grid = string[][];
type Side = "left" | "right";

const put = (g: Grid, x: number, y: number, ch: string): void => {
  const row = g[y - LIMB_TOP];
  if (row && x >= 0 && x < W) row[x] = ch;
};

type ArmState = "shown" | "front" | "hidden";

/**
 * An arm beside the torso. `angle` is its swing in degrees (+ = forward), `toward` says whether forward
 * comes at the camera (+1, facing down) or goes away from it (-1, facing up). Like a knee, the elbow
 * bends when the arm swings back: the forearm turns into shade. Swung forward toward the camera the
 * elbow folds and the hand comes up in front of the body, above the belt. An arm swinging away from the
 * camera shortens and at the end of its swing hides behind (or, seen from behind, in front of) the body
 * as a shaded sliver.
 */
function putArm(g: Grid, side: Side, [base, shade, hand]: string, top: number, angle: number, toward: 1 | -1): ArmState {
  const outer = side === "left" ? 5 : 18;
  const inner = side === "left" ? 6 : 17;
  const out = side === "left" ? -1 : 1;
  const inw = -out;
  const a = Math.abs(angle);
  const t = angle * toward; // + = toward the camera
  const column = (from: number, to: number, ch: (r: number) => [string, string]): void => {
    for (let r = from; r <= to; r++) {
      const [o, i] = ch(r);
      put(g, outer, top + r, o);
      put(g, inner, top + r, i);
    }
  };
  const hands = (rows: number[][], from: number): void => rows.forEach((xs, r) => xs.forEach((x) => put(g, x, top + from + r, hand)));
  if (t <= -30) {
    for (let r = 0; r < 4; r++) put(g, inner, top + r, shade);
    return "hidden";
  }
  if (a < 10) {
    // Relaxed: hanging, the hand opens one pixel outward.
    column(0, 3, () => [base, shade]);
    hands([[outer + out, outer, inner], [outer + out, outer]], 4);
    return "shown";
  }
  if (t > 0 && angle > 0) {
    // Forward, toward the camera: the elbow folds, the hand rises over the torso.
    if (a < 25) {
      column(0, 3, () => [base, shade]);
      hands([[inner, inner + inw], [inner, inner + inw]], 4);
    } else {
      // The hand reaches one pixel over the torso; two read as grabbing the belt (Eser, 2026-10-17).
      column(0, 2, () => [base, shade]);
      put(g, outer, top + 3, shade);
      put(g, inner, top + 3, base);
      hands([[inner + inw], [inner, inner + inw]], 3);
    }
    return "front";
  }
  if (t > 0) {
    // Back, toward the camera (seen from behind): full length, the bent forearm in shade.
    const bend = a < 25 ? 3 : 2;
    column(0, 3, (r) => (r >= bend ? [shade, shade] : [base, shade]));
    hands([[outer, inner], [outer, inner]], 4);
    return "shown";
  }
  // Swinging away and not hidden yet: shorter; going back (facing down) the elbow bends into shade.
  column(0, 2, (r) => (r === 2 && angle < 0 ? [shade, shade] : [base, shade]));
  hands([[outer, inner], [outer, inner]], 3);
  return "shown";
}

/**
 * A leg under the hip, its foot `dx` px forward in depth and `lift` rows up. `pelvis` shifts the top of
 * the leg sideways (the hip settling over the support leg), so a planted leg leans; at that moment the
 * lifted leg swings one pixel in toward the body's midline. A lifted leg bends at the knee (the shin
 * turns into shade below the thigh) and points its toe down (the foot narrows).
 */
function putLeg(g: Grid, side: Side, [base, shade, foot]: string, hipRow: number, dx: number, lift: number, toward: 1 | -1, pelvis: number): void {
  const t = dx * toward;
  const dy = t >= 0 ? 0 : Math.max(-2, Math.round(t / 2));
  const near = t >= 3;
  const sole = near && toward === -1;
  const ankle = (sole ? 27 : 28) + dy - lift;
  const inner = side === "left" ? 10 : 13;
  const outer = side === "left" ? (near ? 7 : 8) : near ? 16 : 15;
  const toMid = side === "left" ? 1 : -1;
  const lifted = lift > 0;
  // The swing in toward the midline only at passing, like the pelvis: held longer the knees read as
  // buckling inward (Eser, 2026-10-17).
  const footOff = lifted && pelvis !== 0 ? toMid : 0;
  const xs: number[] = [];
  for (let x = Math.min(inner, outer); x <= Math.max(inner, outer); x++) xs.push(x);
  const span = Math.max(1, ankle - hipRow);
  for (let y = hipRow; y <= ankle; y++) {
    const k = (y - hipRow) / span;
    const off = Math.round(pelvis + (footOff - pelvis) * k);
    const shin = lifted && k > 0.5;
    for (const x of xs) put(g, x + off, y, shin || x === inner ? shade : base);
  }
  const spill = !sole && !lifted && dy === 0;
  const footRows = sole ? 3 : 2;
  for (let r = 0; r < footRows; r++) {
    const row = lifted && r === footRows - 1 ? xs.filter((x) => x !== outer) : xs;
    for (const x of row) put(g, x + footOff, ankle + 1 + r, foot);
    // The toe turns out over the whole foot height: a single spilled pixel read as a spike (Eser).
    if (spill) put(g, outer - toMid, ankle + 1 + r, foot);
  }
}

function pose(p: Projection, bob: number, near: { dx: number; lift: number }, far: { dx: number; lift: number }, armNear: number, armFar: number): FrontPose {
  const g: Grid = Array.from({ length: H - LIMB_TOP }, () => Array.from({ length: W }, () => "."));
  const farSide: Side = p.near === "left" ? "right" : "left";
  const hip = 23 + bob;
  // The pelvis settles a pixel over the planted leg only at passing, when that leg is straight under
  // the hip: held for the whole single-support phase it read as too much sway (Eser, 2026-10-17).
  const toward = (s: Side): number => (s === "left" ? -1 : 1);
  const pelvis = near.lift > 0 && far.lift === 0 && far.dx === 0 ? toward(farSide) : far.lift > 0 && near.lift === 0 && near.dx === 0 ? toward(p.near) : 0;
  putLeg(g, p.near, "LlF", hip, near.dx, near.lift, p.toward, pelvis);
  putLeg(g, farSide, "KkJ", hip, far.dx, far.lift, p.toward, pelvis);
  const nearArm = putArm(g, p.near, "AaP", 17 + bob, armNear, p.toward);
  const farArm = putArm(g, farSide, "BbQ", 17 + bob, armFar, p.toward);
  const turn: Turn = nearArm === "hidden" ? p.near : farArm === "hidden" ? farSide : "even";
  const front = [...(nearArm === "front" ? ["near" as const] : []), ...(farArm === "front" ? ["far" as const] : [])];
  return { bob, turn, limbs: g.map((r) => r.join("")), ...(front.length ? { front } : {}) };
}

/** The 8-frame walk for a facing, frame for frame the side walk seen from the front or the back. */
export function frontWalk(p: Projection): FrontPose[] {
  return STEP.map((near, f) => {
    const swing = ARM_SWING * Math.cos((2 * Math.PI * f) / STEP.length);
    return pose(p, WALK_BOB[f]!, near, STEP[(f + 4) % STEP.length]!, -swing, swing);
  });
}

/** Idle: standing, the upper body sinks one row and comes back. */
export function frontIdle(p: Projection): FrontPose[] {
  const stand = { dx: 0, lift: 0 };
  return [0, 0, 1, 1].map((bob) => pose(p, bob, stand, stand, 0, 0));
}

/** Pixels the character moves on each walk frame: the side walk's pace. */
export { WALK_SIDE_STEP as WALK_FRONT_STEP } from "./side.ts";
