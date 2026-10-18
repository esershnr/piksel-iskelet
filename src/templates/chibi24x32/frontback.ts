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
//
// Besides the walk's letter rows there is a general path (pose.ts): an arm posed by a hand target is
// the side view's 3D solve projected onto this plane (armFront), a seated stance replaces the legs
// (sitLegsFront), and props pin to the hands. The walk and idle never go through it.

import { propFill, propView, secondHand, type PropAttach } from "../../props.ts";
import { shadeEdge, stroke, type Pt } from "../../rig.ts";
import { cleanOutlines, gridFill, paint, Sprite, type Fill } from "../../sprite.ts";
import { faceGrid, FOOT_V, FOREARM, H, HAND, isLeg, UPPER_ARM, W, type Face } from "./body.ts";
import { SEAT_HIP, solveArm, stanceDrop, type ArmPose, type ArmTarget, type BodyPose, type Stance, type V3 } from "./pose.ts";
import { ARM_SWING, handAnchor, STEP, WALK_BOB } from "./side.ts";

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
  /** General arm poses (pose.ts), drawn by armFront instead of limb letters. */
  arms?: { near?: ArmTarget; far?: ArmTarget };
  /** Standing (default) or seated with the hips on SEAT_HIP. */
  stance?: Stance;
  props?: PropAttach[];
  face?: Face;
}

export interface FacingLayout {
  head: string[];
  torso: Record<Turn, string[]>;
  proj: Projection;
  /** Grid cells of the mouth (the front view; the back has no face). */
  mouth?: [number, number][];
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

type Depth = -1 | 0 | 1;

/** An arm's two halves and how far forward each reaches (fwd of the elbow and of the hand): the upper
 * arm hangs beside the torso while the forearm crosses in front of it (or, from behind, vanishes
 * behind it), so the halves are placed separately. */
interface GeneralArm {
  upper: Fill;
  /** Forearm and hand. */
  lower: Fill;
  upperFwd: number;
  lowerFwd: number;
  /** Hand height above the shoulder and distance out from the body (a raised arm beside the head). */
  up: number;
  out: number;
}

/** Shoulder of an arm on a screen side: the walk's arm columns (5-6 and 17-18) centred, the top row 17. */
const shoulderAt = (side: Side, b: number): Pt => ({ x: side === "left" ? 5.5 : 17.5, y: 16.5 + b });

/**
 * A bone in the front view's language: straight bands, not diagonals. The bone runs as a 2-px vertical
 * band from `a` to the row of `b`, then across to `b` if that is further than `snap` px away (a
 * forearm folding in toward the chest); a 2-px diagonal would stair-step into lone pixels. Returns
 * where the band ended, so the next bone starts on the same columns.
 */
function manhattan(fill: Fill, a: Pt, b: Pt, letter: string, bone: { part: string; v0: number; v1: number }, snap = 1.5): Pt {
  const dx = Math.abs(b.x - a.x);
  const dy = Math.abs(b.y - a.y);
  if (dx < snap) {
    // Straight down (or up) with the bone's full projected length, so a sideways drift that is dropped
    // does not shorten it: the elbow still lands on its row.
    const end = { x: a.x, y: a.y + Math.sign(b.y - a.y) * Math.hypot(dx, dy) };
    stroke(fill, W, H, a, end, 2, letter, bone);
    return end;
  }
  if (dy < 1.5) {
    stroke(fill, W, H, a, { x: b.x, y: a.y }, 2, letter, bone);
    return { x: b.x, y: a.y };
  }
  const corner = { x: a.x, y: b.y };
  const vm = bone.v0 + ((bone.v1 - bone.v0) * dy) / (dx + dy);
  stroke(fill, W, H, a, corner, 2, letter, { ...bone, v1: vm });
  stroke(fill, W, H, corner, b, 2, letter, { ...bone, v0: vm });
  return b;
}

/** The fill mirrored about the frame's middle column (the body is symmetric about x = 11.5). */
function mirrorFill(f: Fill): Fill {
  const m: Fill = new Map();
  for (const [i, p] of f) {
    const x = i % W;
    m.set(i - x + (W - 1 - x), p);
  }
  return m;
}

/**
 * An arm posed by a hand target: the 3D solve projected onto the screen plane (x = out, y = up; what
 * points at the camera shortens). Bones are 2-px bands like the side view's, the hand a 2x2 block, the
 * shade on the side toward the body (the walk's language: the shade column meets the torso). The
 * screen-right arm is the screen-left one mirrored, so the two never differ by a rounding pixel.
 */
function armFront(side: Side, b: number, t: ArmTarget, letters: string): GeneralArm {
  if (side === "right") {
    const l = armFront("left", b, t, letters);
    return { ...l, upper: mirrorFill(l.upper), lower: mirrorFill(l.lower) };
  }
  const [arm, shade, hand] = letters;
  const sh = shoulderAt("left", b);
  const c = solveArm(t);
  const at = (v: V3): Pt => ({ x: sh.x - v.out, y: sh.y - v.up });
  const fore = UPPER_ARM + FOREARM;
  const upper: Fill = new Map();
  const lower: Fill = new Map();
  const upperBone = { part: "arm", v0: 0, v1: UPPER_ARM };
  const lowerBone = { part: "arm", v0: UPPER_ARM, v1: fore };
  // A straight arm raised out to the side (a cheer, a wave) is one straight band from the shoulder,
  // the V of raised arms: folded into the bands below it read as a shrug. Its steps shift one column a
  // row at most, so the 2-px band stays connected.
  const straight = Math.hypot(t.fwd, t.up, t.out) >= UPPER_ARM + FOREARM + HAND;
  let wr: Pt;
  if (straight && c.tip.up >= 2 && c.tip.out >= 2.25) {
    stroke(upper, W, H, sh, at(c.elbow), 2, arm!, upperBone);
    stroke(lower, W, H, at(c.elbow), at(c.wrist), 2, arm!, lowerBone);
    wr = at(c.wrist);
    // Shaded as one band: shading the halves apart put a second shade pixel where they meet.
    const band: Fill = new Map([...upper, ...lower]);
    shadeEdge(band, W, arm!, shade!, 1);
    for (const half of [upper, lower]) for (const [i, p] of half) half.set(i, { ...p, ch: band.get(i)!.ch });
  } else {
    // The upper arm keeps the shoulder's columns however the elbow drifts (the walk's language; from
    // behind it stays beside the torso while the forearm vanishes in front); the forearm folds across.
    const elbow = manhattan(upper, sh, at(c.elbow), arm!, upperBone, 2.5);
    wr = manhattan(lower, elbow, at(c.wrist), arm!, lowerBone);
    shadeEdge(upper, W, arm!, shade!, 1);
    shadeEdge(lower, W, arm!, shade!, 1);
  }
  const tp = at(c.tip);
  const hx = Math.round((wr.x + tp.x) / 2 - 0.5);
  const hy = Math.round((wr.y + tp.y) / 2 - 0.5);
  for (let dy = 0; dy < 2; dy++)
    for (let dx = 0; dx < 2; dx++) {
      const x = hx + dx;
      const y = hy + dy;
      if (x >= 0 && y >= 0 && x < W && y < H) lower.set(y * W + x, { ch: hand!, part: "arm", u: dx, v: Math.floor(fore) + dy });
    }
  return { upper, lower, upperFwd: c.elbow.fwd, lowerFwd: c.tip.fwd, up: c.tip.up, out: c.tip.out };
}

/**
 * Poses an arm so that its hand's top-left pixel lands on `want` (a two-handed prop's second grip).
 * The depth stays the pose's own: the hand is wherever the prop is, however the solve had to stretch
 * sideways to get there.
 */
function armFrontAnchored(side: Side, b: number, t: ArmTarget, letters: string, want: Pt): GeneralArm {
  const outSign = side === "left" ? -1 : 1;
  const base = solveArm(t);
  let target = { ...t };
  let a = armFront(side, b, target, letters);
  for (let i = 0; i < 3; i++) {
    const h = handAnchor(a.lower, letters[2]!);
    const dx = want.x - h.x;
    const dy = want.y - h.y;
    if (dx === 0 && dy === 0) break;
    target = { ...target, out: target.out + dx * outSign, up: target.up - dy };
    a = armFront(side, b, target, letters);
  }
  return { ...a, upperFwd: base.elbow.fwd, lowerFwd: base.tip.fwd, up: base.tip.up, out: base.tip.out };
}

/**
 * Seated legs, hips on SEAT_HIP. Facing the camera the thighs come at the viewer and foreshorten to two
 * lit rows, the shins drop in shade (the knee's shade, as on a lifted walking leg) and the boots stand
 * on the ground; the legs widen to the stride width since the knees are nearest the camera. From behind
 * only the top of the thighs shows above the seat. UVs: thigh rows v 0-1, shin rows v 4-5, feet FOOT_V.
 */
function sitLegsFront(p: Projection): Fill[] {
  const farSide: Side = p.near === "left" ? "right" : "left";
  const one = (side: Side, [base, shade, foot]: string): Fill => {
    const f: Fill = new Map();
    const front = p.toward === 1;
    const left = side === "left" ? (front ? 7 : 8) : 13;
    const right = side === "left" ? 10 : front ? 16 : 15;
    const inner = side === "left" ? 10 : 13;
    const rows: [string, number][] = front
      ? [[base, 0], [base, 1], [shade, 4], [shade, 5], [foot, FOOT_V], [foot, FOOT_V + 1]]
      : [[base, 0], [shade, 1]];
    rows.forEach(([ch, v], r) => {
      for (let x = left; x <= right; x++) f.set((SEAT_HIP + r) * W + x, { ch: ch === base && x === inner ? shade : ch, part: "leg", u: x - left, v });
    });
    return f;
  };
  return [one(farSide, "KkJ"), one(p.near, "LlF")];
}

/**
 * Kneeling legs, the hips KNEEL_DY rows down. Facing the camera: the near leg planted ahead, its thigh
 * foreshortened to two lit rows over the boot; the far leg down on its knee, its shin lying toward the
 * camera in shade. From behind: the planted leg shows its shin and boot, the kneeling leg its shin and
 * the sole of its boot turned up at the camera.
 */
function kneelLegsFront(p: Projection, top: number): Fill[] {
  const farSide: Side = p.near === "left" ? "right" : "left";
  const one = (side: Side, [base, shade, foot]: string, kneeling: boolean): Fill => {
    const f: Fill = new Map();
    const front = p.toward === 1;
    const wide = front || kneeling;
    const left = side === "left" ? (wide ? 7 : 8) : 13;
    const right = side === "left" ? 10 : wide ? 16 : 15;
    const inner = side === "left" ? 10 : 13;
    const rows: [string, number][] = kneeling
      ? front
        ? [[base, 0], [base, 1], [shade, 4], [shade, 5]]
        : [[shade, 4], [shade, 5], [foot, FOOT_V], [foot, FOOT_V + 1]]
      : [[base, 0], [base, 1], [foot, FOOT_V], [foot, FOOT_V + 1]];
    rows.forEach(([ch, v], r) => {
      for (let x = left; x <= right; x++) f.set((top + r) * W + x, { ch: ch === base && x === inner ? shade : ch, part: "leg", u: x - left, v });
    });
    return f;
  };
  return [one(farSide, "KkJ", true), one(p.near, "LlF", false)];
}

/**
 * One front- or back-view frame as a letter sprite. Paint order, back to front: props and arms behind
 * the body, legs, torso, head, props in front, arms beside the body (meeting the torso through their
 * shade) and arms in front of it (outlined over it). Hands are painted after props so the fingers wrap
 * the grip; a two-handed prop pins the other hand to its second grip.
 */
export function frontFrame(p: FrontPose, lay: FacingLayout): Sprite {
  const s = new Sprite(W, H);
  const proj = lay.proj;
  const sit = p.stance === "sit";
  const b = p.bob + stanceDrop(p.stance);
  const l = limbFills(p);
  const farSide: Side = proj.near === "left" ? "right" : "left";
  const sideOf = (hand: "near" | "far"): Side => (hand === "near" ? proj.near : farSide);
  const letters = (hand: "near" | "far"): string => (hand === "near" ? "AaP" : "BbQ");
  // Where an arm half or a prop sits, from how far forward it reaches and what it lands on. On the
  // torso or the legs it is never beside the body: ahead it is in front (facing the camera) or behind
  // (facing away), and lying in the body plane it goes with the camera side. On the head the same,
  // except an arm raised out beside the head (up 3+, out 1+), which stays beside it up to five pixels
  // of forward so a raised arm shows from behind; what it holds still hides behind the head. Off the
  // body the depth does not matter and it is simply beside.
  const torso = gridFill(W, lay.torso[p.turn], 7, 16 + b, H, "torso");
  const head = gridFill(W, lay.mouth ? faceGrid(lay.head, p.face, lay.mouth) : lay.head, 5, 3 + b, H, "head");
  const legFills = sit ? sitLegsFront(proj) : p.stance === "kneel" ? kneelLegsFront(proj, 23 + b) : [l.legFar, l.legNear];
  const body = new Set([...torso.keys(), ...legFills.flatMap((f) => [...f.keys()])]);
  const settle = (fill: Fill, fwd: number, raised = false): Depth => {
    const keys = [...fill.keys()];
    const d = fwd * proj.toward;
    if (keys.some((i) => body.has(i))) return d < 0 ? -1 : 1;
    if (keys.some((i) => head.has(i))) {
      const limit = raised ? 5 : 1;
      return d >= limit ? 1 : d <= -limit ? -1 : 0;
    }
    return 0;
  };
  const raised = (g: GeneralArm): boolean => g.up >= 3 && g.out >= 1;
  const general: { near?: GeneralArm; far?: GeneralArm } = {};
  if (p.arms?.near) general.near = armFront(proj.near, b, p.arms.near, "AaP");
  if (p.arms?.far) general.far = armFront(farSide, b, p.arms.far, "BbQ");
  const props: { fill: Fill; z: "front" | "back"; over: boolean; outline: boolean }[] = [];
  for (const a of p.props ?? []) {
    const view = propView(a.prop, proj.toward === 1 ? "down" : "up", a);
    const held = a.hand === "head" ? undefined : general[a.hand];
    // Worn on the head: pinned to the head grid origin, drawn over the face.
    const hand = a.hand === "head" ? { x: 5, y: 3 + b } : handAnchor(held ? held.lower : a.hand === "near" ? l.armNear : l.armFar, letters(a.hand)[2]!);
    const other = a.hand === "near" ? "far" : a.hand === "far" ? "near" : null;
    const want = other ? secondHand(view, hand) : null;
    const otherTarget = other ? p.arms?.[other] : undefined;
    if (want && other && otherTarget) general[other] = armFrontAnchored(sideOf(other), b, otherTarget, letters(other), want);
    // The prop sits where the hand reaches; whether that is behind the body is judged on the prop
    // itself (a hammer held level crosses the back even when the fist is beside it).
    const fill = propFill(a.prop, view, hand, W, H);
    const z = a.z ?? (held && settle(fill, held.lowerFwd) < 0 ? "back" : "front");
    props.push({ fill, z, over: !!view.overHand, outline: view.outline !== false });
  }
  const layer = (z: "front" | "back", over: boolean): void => {
    for (const pr of props) if (pr.z === z && pr.over === over) paint(s, pr.fill, pr.outline ? {} : { outlineOver: () => false });
  };
  // Each general arm's halves, merged when they sit at the same depth (no outline at the elbow then).
  // Split halves never outline over each other: the arm stays one piece at the elbow.
  const pieces: { fill: Fill; depth: Depth; own: string }[] = [];
  const touchesTorso = (fill: Fill): boolean => [...fill.keys()].some((i) => [1, -1, W, -W].some((d) => torso.has(i + d)));
  for (const [g, own] of [[general.far, "BbQ"], [general.near, "AaP"]] as const) {
    if (!g) continue;
    let upperDepth = settle(g.upper, g.upperFwd, raised(g));
    let lowerDepth = settle(g.lower, g.lowerFwd, raised(g));
    // An arm beside the torso with its hand brought forward at the camera is in front of it, as the
    // walk's forward swing is (putArm "front"): outlined over the torso instead of meeting it through
    // its shade, where the hand fused into the shirt.
    const atCamera = proj.toward === 1 && g.lowerFwd >= 2;
    if (upperDepth === 0 && lowerDepth === 0 && atCamera && touchesTorso(new Map([...g.upper, ...g.lower]))) upperDepth = lowerDepth = 1;
    if (upperDepth === lowerDepth) pieces.push({ fill: new Map([...g.upper, ...g.lower]), depth: lowerDepth, own: "" });
    else pieces.push({ fill: g.upper, depth: upperDepth, own }, { fill: g.lower, depth: lowerDepth, own });
  }
  const noTorso = { outlineOver: (u: string) => !isTorso(u) };
  const over = (a: { depth: Depth; own: string }) => ({ outlineOver: (u: string) => !a.own.includes(u) && (a.depth > 0 || !isTorso(u)) });
  layer("back", false);
  for (const a of pieces) if (a.depth < 0) paint(s, a.fill, over(a));
  layer("back", true);
  for (const f of legFills) paint(s, f);
  paint(s, torso, { outlineOver: (u) => !isLeg(u) });
  paint(s, head);
  layer("front", false);
  paint(s, l.armFar, p.front?.includes("far") ? {} : noTorso);
  paint(s, l.armNear, p.front?.includes("near") ? {} : noTorso);
  for (const a of pieces) if (a.depth === 0) paint(s, a.fill, over(a));
  for (const a of pieces) if (a.depth > 0) paint(s, a.fill, over(a));
  layer("front", true);
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

interface PoseExtra {
  stance?: Stance;
  props?: PropAttach[];
  face?: Face;
}

/**
 * A pose from the side tables: leg depth and lift, and per arm either the walk's swing angle (drawn as
 * limb rows) or a hand target (left to frontFrame's general path). A seated stance skips the legs.
 */
function pose(p: Projection, bob: number, near: { dx: number; lift: number }, far: { dx: number; lift: number }, armNear: ArmPose, armFar: ArmPose, extra: PoseExtra = {}): FrontPose {
  const g: Grid = Array.from({ length: H - LIMB_TOP }, () => Array.from({ length: W }, () => "."));
  const farSide: Side = p.near === "left" ? "right" : "left";
  const hip = 23 + bob;
  // The pelvis settles a pixel over the planted leg only at passing, when that leg is straight under
  // the hip: held for the whole single-support phase it read as too much sway (Eser, 2026-10-17).
  const toward = (s: Side): number => (s === "left" ? -1 : 1);
  const pelvis = near.lift > 0 && far.lift === 0 && far.dx === 0 ? toward(farSide) : far.lift > 0 && near.lift === 0 && near.dx === 0 ? toward(p.near) : 0;
  if (extra.stance !== "sit") {
    putLeg(g, p.near, "LlF", hip, near.dx, near.lift, p.toward, pelvis);
    putLeg(g, farSide, "KkJ", hip, far.dx, far.lift, p.toward, pelvis);
  }
  const nearArm = typeof armNear === "number" ? putArm(g, p.near, "AaP", 17 + bob, armNear, p.toward) : "shown";
  const farArm = typeof armFar === "number" ? putArm(g, farSide, "BbQ", 17 + bob, armFar, p.toward) : "shown";
  const turn: Turn = nearArm === "hidden" ? p.near : farArm === "hidden" ? farSide : "even";
  const front = [...(nearArm === "front" ? ["near" as const] : []), ...(farArm === "front" ? ["far" as const] : [])];
  const arms: FrontPose["arms"] = {};
  if (typeof armNear !== "number") arms.near = armNear;
  if (typeof armFar !== "number") arms.far = armFar;
  return {
    bob,
    turn,
    limbs: g.map((r) => r.join("")),
    ...(front.length ? { front } : {}),
    ...(Object.keys(arms).length ? { arms } : {}),
    ...(extra.stance ? { stance: extra.stance } : {}),
    ...(extra.props ? { props: extra.props } : {}),
    ...(extra.face ? { face: extra.face } : {}),
  };
}

/** A general pose (pose.ts) seen from the front or the back. */
export function frontPose(p: Projection, body: BodyPose): FrontPose {
  const stand = { dx: 0, lift: 0 };
  const extra: PoseExtra = {};
  if (body.stance) extra.stance = body.stance;
  if (body.props) extra.props = body.props;
  if (body.face) extra.face = body.face;
  return pose(p, body.bob, body.legs?.near ?? stand, body.legs?.far ?? stand, body.arms.near, body.arms.far, extra);
}

/** Per-frame arm targets and props for a walk that carries or pushes something. */
export interface WalkArms {
  arms: (f: number) => { near: ArmTarget; far: ArmTarget };
  props?: (f: number) => PropAttach[];
}

/**
 * The walk with the arms posed by targets instead of the swing (a load carried, a barrow pushed): the
 * same leg tables, bob and pace as the walk, so the feet plant exactly as they do unloaded.
 */
export function frontWalkWith(p: Projection, w: WalkArms): FrontPose[] {
  return STEP.map((near, f) => {
    const a = w.arms(f);
    return pose(p, WALK_BOB[f]!, near, STEP[(f + 4) % STEP.length]!, a.near, a.far, w.props ? { props: w.props(f) } : {});
  });
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
