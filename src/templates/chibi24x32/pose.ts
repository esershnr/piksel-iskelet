// General poses, shared by every facing: an arm is posed by where its hand goes in body space
// (forward, up, out from the shoulder), the legs by a stance (standing on the walk's leg tables, or
// seated). Each facing projects the same numbers onto its screen plane, so one pose table serves the
// side, front and back views alike (the rule the walk already follows).
//
// The arm is solved in 3D as a two-bone chain (upper arm; forearm + hand as one bone) and the facing
// projects the joints: the side view keeps (fwd, up), the front and back views keep (out, up), and
// whatever points at the camera shortens by itself.

import { FOREARM, HAND, UPPER_ARM, type Face } from "./body.ts";
import type { PropAttach } from "../../props.ts";
import type { LegPose } from "./side.ts";

/** Hand position relative to the shoulder, px: forward (facing direction), up, out (away from the
 * body's midline). `elbow` picks where the elbow points when the arm bends. */
export interface ArmTarget {
  fwd: number;
  up: number;
  out: number;
  elbow?: "back" | "fwd" | "out" | "down";
}

/** Common hand targets. `chest` is for two-handed props held in front of the body: the upper arms
 * hang, the forearms cross in toward the midline (negative out). `face` is the hand at the ear (a
 * handset, visible from behind; the ear sits at the middle of the profile, so the hand goes a little
 * back with the elbow behind), `drink` at the mouth (hidden from behind; in toward the midline, so that
 * from the front the glass, held by its side, lands on the mouth between the eyes). */
export const HANDS = {
  hang: { fwd: 0, up: -5.7, out: 0 },
  chest: { fwd: 3.5, up: -2.5, out: -1.5, elbow: "down" },
  face: { fwd: -0.5, up: 4.5, out: 0, elbow: "back" },
  drink: { fwd: 4, up: 4, out: -2.5, elbow: "down" },
  reach: { fwd: 5.5, up: 0, out: 0, elbow: "down" },
  /** Raised ahead: from the side the arm crosses only the corner of the chin, the tool clears the face. */
  raise: { fwd: 4, up: 4, out: 2, elbow: "down" },
  /** Wound up: the fist above the shoulder and a little back, the tool rising behind the head. */
  windup: { fwd: -1.5, up: 4, out: 2, elbow: "back" },
  /** Seated: hands resting on the thighs, hands at the desk in front of the belt. */
  lap: { fwd: 2, up: -6.5, out: -2, elbow: "back" },
  table: { fwd: 4, up: -5, out: -4, elbow: "down" },
} as const satisfies Record<string, ArmTarget>;

export type Stance = "stand" | "sit" | "kneel";

/** Seated: the hips (top of the thighs) sit on this frame row and the upper body drops SEAT_DY rows.
 * 25 keeps Siteyard's SEAT_OFFSETS valid (its v1 SEAT_HIP). */
export const SEAT_HIP = 25;
export const SEAT_DY = 2;
/** Kneeling on one knee (the far one; the near foot planted ahead): the upper body drops KNEEL_DY. */
export const KNEEL_DY = 4;

/** Rows the upper body drops in a stance. */
export const stanceDrop = (s: Stance | undefined): number => (s === "sit" ? SEAT_DY : s === "kneel" ? KNEEL_DY : 0);

/** One arm's pose: the walk's swing angle, or a hand target. */
export type ArmPose = number | ArmTarget;

/** A pose every facing can draw. Legs default to standing still; seated poses ignore `legs`. */
export interface BodyPose {
  bob: number;
  stance?: Stance;
  legs?: { near: LegPose; far: LegPose };
  arms: { near: ArmPose; far: ArmPose };
  props?: PropAttach[];
  /** Eyes and mouth (body.ts Face); open eyes, shut mouth by default. */
  face?: Face;
}

export interface V3 {
  fwd: number;
  up: number;
  out: number;
}

export interface ArmChain {
  elbow: V3;
  wrist: V3;
  tip: V3;
}

const len = (v: V3): number => Math.hypot(v.fwd, v.up, v.out);
const scale = (v: V3, k: number): V3 => ({ fwd: v.fwd * k, up: v.up * k, out: v.out * k });
const add = (a: V3, b: V3): V3 => ({ fwd: a.fwd + b.fwd, up: a.up + b.up, out: a.out + b.out });
const dot = (a: V3, b: V3): number => a.fwd * b.fwd + a.up * b.up + a.out * b.out;

const HINTS: Record<NonNullable<ArmTarget["elbow"]>, V3> = {
  back: { fwd: -1, up: 0, out: 0 },
  fwd: { fwd: 1, up: 0, out: 0 },
  out: { fwd: 0, up: 0, out: 1 },
  down: { fwd: 0, up: -1, out: 0 },
};

/** Joints of an arm reaching for `t`, relative to the shoulder. Out of reach -> straight toward it. */
export function solveArm(t: ArmTarget): ArmChain {
  const l1 = UPPER_ARM;
  const l2 = FOREARM + HAND;
  const d = Math.max(1e-6, len(t));
  const dir = scale(t, 1 / d);
  let elbow: V3;
  if (d >= l1 + l2) elbow = scale(dir, l1);
  else {
    const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    // The elbow sits off the shoulder-hand line on the side the hint points to (hanging arm: back).
    // A hint along the line itself says nothing; the elbow then goes back (hand below the shoulder) or
    // out (hand above it).
    const hint = HINTS[t.elbow ?? (t.up > 0 ? "out" : "back")];
    let n = add(hint, scale(dir, -dot(hint, dir)));
    if (len(n) < 1e-3) {
      const alt = HINTS[t.up > 0 ? "out" : "back"];
      n = add(alt, scale(dir, -dot(alt, dir)));
    }
    n = scale(n, 1 / Math.max(1e-6, len(n)));
    elbow = add(scale(dir, a), scale(n, h));
  }
  const reach = d >= l1 + l2 ? scale(dir, l1 + l2) : { fwd: t.fwd, up: t.up, out: t.out };
  const wrist = add(elbow, scale(add(reach, scale(elbow, -1)), FOREARM / l2));
  return { elbow, wrist, tip: reach };
}
