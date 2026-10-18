// The template's animations beyond the walk and the idle: each is a table of key poses (hand targets,
// prop orientation, bob, stance, face) that every facing draws through the general pose path, so the
// side, front and back views share one motion (the rule the walk set); loaded walks reuse the walk's
// own legs and pace. Siteyard's v1 drawings were the brief (what each animation means, where the tool
// goes); the frame counts are ours, chosen so the motion reads as smoothly as the walk does.

import type { PropAttach } from "../../props.ts";
import type { Sprite } from "../../sprite.ts";
import type { Face } from "./body.ts";
import { downFrame, downPose, walkDownWith } from "./down.ts";
import type { WalkArms } from "./frontback.ts";
import { HANDS, type ArmTarget, type BodyPose, type Stance } from "./pose.ts";
import { PROPS } from "./props.ts";
import { sideFrame, sidePose, STEP, WALK_BOB, WALK_SIDE, WALK_SIDE_STEP } from "./side.ts";
import { upFrame, upPose, walkUpWith } from "./up.ts";

export type Facing = "side" | "down" | "up";

export interface Anim {
  name: string;
  frames: () => Sprite[];
  /** Frame delay, hundredths of a second. */
  delay: number;
  /** Per-frame movement in px along the facing (walks); empty for in-place animations. */
  steps: number[];
  /** Screen axis `steps` moves along: "x" for side views, "y" for front/back (the ground scrolls). */
  axis: "x" | "y";
  /** The view the frames are drawn in, when it is not the one the name says (climb_side is a back view). */
  facing?: Facing;
}

/** The view an animation's frames are drawn in (and a skin dresses them as). */
export const facingOf = (a: Anim): Facing => a.facing ?? ((a.name.split("_").pop() === "down" ? "down" : a.name.endsWith("_up") ? "up" : "side") as Facing);

/** A general pose drawn in a facing (side frames face right). */
export function frameOf(facing: Facing, p: BodyPose): Sprite {
  return facing === "side" ? sideFrame(sidePose(p)) : facing === "down" ? downFrame(downPose(p)) : upFrame(upPose(p));
}

/** One key pose: the near arm (and the far one, hanging by default), what the hands hold, the body. */
export interface Key {
  near: ArmTarget;
  far?: ArmTarget;
  props?: PropAttach[];
  bob?: number;
  stance?: Stance;
  face?: Face;
}

const pose = (k: Key): BodyPose => ({
  bob: k.bob ?? 0,
  arms: { near: k.near, far: k.far ?? HANDS.hang },
  ...(k.stance ? { stance: k.stance } : {}),
  ...(k.props ? { props: k.props } : {}),
  ...(k.face ? { face: k.face } : {}),
});

/** The pose of a key (what the facings draw). */
export const keyPose = pose;

/** What a game needs to know about an animation besides its frames. */
export interface AnimMeta {
  /** Frame delay, hundredths of a second. */
  delay: number;
  /** Loops, or holds its last frame (point). */
  loop: boolean;
  /** Hips on SEAT_HIP. */
  seated?: boolean;
  /** Facings that carry the motion; the rest show the same view (climb is a back view everywhere). */
  facings?: Facing[];
  note?: string;
}

type View = PropAttach["view"];
const held = (prop: PropAttach["prop"], view: View, hand: PropAttach["hand"] = "near"): PropAttach => ({ prop, view, hand });

// Orientations that point ahead from the side lie across the screen from the front and the back.
const FWD: View = { side: "fwd", down: "flat", up: "flat" };
const WINDUP: View = { side: "back", down: "up", up: "up" };

// --- hand targets of the tool work (body space, px from the shoulder) ----------------------------------

/** Hammer at the hip (work): wound up over the shoulder (the hammer behind the head, as in
 * HANDS.windup but lower), then down to a stake at knee height ahead. */
const HIP_WINDUP: ArmTarget = { fwd: -2, up: 3, out: 2, elbow: "back" };
const HIP_MID: ArmTarget = { fwd: 4, up: 0, out: 0.5, elbow: "down" };
const HIP_STRIKE: ArmTarget = { fwd: 3.5, up: -3.5, out: -2.5, elbow: "back" };

/** Hammer at a wall ahead at head height (hammer_wall). */
const WALL_STRIKE: ArmTarget = { fwd: 5.5, up: 1.5, out: 0.5, elbow: "down" };

/** Trowel work at a low wall ahead: scoop from the bucket, spread at waist height; the brick hand. */
const SCOOP: ArmTarget = { fwd: 3, up: -4.5, out: 0, elbow: "back" };
const LIFT: ArmTarget = { fwd: 4, up: -2, out: 0, elbow: "down" };
const SPREAD: ArmTarget = { fwd: 5.5, up: -0.5, out: 0, elbow: "down" };
const SPREAD_LOW: ArmTarget = { fwd: 5.5, up: -1.5, out: 0, elbow: "down" };
const BRICK_REST: ArmTarget = { fwd: 0.5, up: -4.5, out: -1, elbow: "back" };
const BRICK_PLACE: ArmTarget = { fwd: 7, up: -0.5, out: -3, elbow: "down" };
const BRICK_PRESS: ArmTarget = { fwd: 7, up: -1.5, out: -3, elbow: "down" };

/** Shovel: both hands on the shaft, the near one lower; in, push, lift, dump. */
const DIG_NEAR: ArmTarget = { fwd: 3.5, up: -3.5, out: -4, elbow: "down" };
const DIG_FAR: ArmTarget = { fwd: 1, up: -2, out: -4, elbow: "down" };
const PUSH_NEAR: ArmTarget = { fwd: 3.5, up: -4.5, out: -4, elbow: "down" };
const PUSH_FAR: ArmTarget = { fwd: 1, up: -3, out: -4, elbow: "down" };
/** Lifting: the back hand at the hip, the front hand mid-shaft, the blade ahead below the chest. */
const LIFT_NEAR: ArmTarget = { fwd: 3.5, up: -3.5, out: -3, elbow: "down" };
const LIFT_FAR: ArmTarget = { fwd: 1, up: -5.5, out: -1, elbow: "down" };
const HIGH_NEAR: ArmTarget = { fwd: 3.5, up: -2.5, out: -3, elbow: "down" };
const HIGH_FAR: ArmTarget = { fwd: 1, up: -5, out: -1, elbow: "down" };

/** Roller on the wall ahead: high, level, low. */
const ROLL_MID: ArmTarget = { fwd: 5.5, up: 0, out: 0.5, elbow: "down" };
const ROLL_LOW: ArmTarget = { fwd: 5.5, up: -3, out: -2, elbow: "back" };

/** Tape: both hands on the case at the chest, then the near hand draws the blade out ahead. */
const TAPE_OUT: ArmTarget = { fwd: 5.5, up: 1, out: 1.5, elbow: "down" };

/** Welding, kneeling: the torch hand low ahead past the planted knee (a little out, so the weld point
 * clears the boot from the front too), the other hand resting on the knee. */
const TORCH_HAND: ArmTarget = { fwd: 5.5, up: -2.5, out: 1.5, elbow: "back" };
const KNEE_HAND: ArmTarget = { fwd: 2.5, up: -3.5, out: 0, elbow: "back" };

/** Talking and thinking: the gesturing hand ahead at chest height, the hand at the chin, pointing
 * ahead (and a little out, so the front view points too), waving ahead of the face (so the side view
 * keeps the eye clear) and out beside the head. Cheering throws both arms up and out as a V beside the
 * head (out wins over fwd: the arm is too short for both), then pumps them down ahead with the bounce;
 * eye height is out of the arm's reach. */
const GESTURE_LOW: ArmTarget = { fwd: 3, up: 0.5, out: 1, elbow: "down" };
const GESTURE_HIGH: ArmTarget = { fwd: 3.5, up: 1.5, out: 1, elbow: "down" };
/** The hand at the chin, low and in toward the midline (from the front, its outline clear of the eye
 * looking down), rubbing it a row lower. */
const CHIN: ArmTarget = { fwd: 3, up: 2.5, out: -3, elbow: "down" };
const CHIN_RUB: ArmTarget = { fwd: 3, up: 1.5, out: -3, elbow: "down" };
const POINT_HALF: ArmTarget = { fwd: 3.5, up: -1.5, out: 2, elbow: "down" };
/** Pointing: the arm level and straight ahead, past the chest from the side. */
const POINT: ArmTarget = { fwd: 5.5, up: 0.5, out: 2.5, elbow: "down" };
/** Waving: in, the hand ahead of the chin close to the head; out, swung up and out beside it. Out of
 * reach, `out` shortens what the side view shows, so the side sees the hand rock back and up while
 * the front sees it swing out. */
const WAVE_IN: ArmTarget = { fwd: 4.5, up: 3.5, out: 1, elbow: "out" };
const WAVE_OUT: ArmTarget = { fwd: 2.5, up: 5, out: 3, elbow: "out" };
const CHEER: ArmTarget = { fwd: 1, up: 4.5, out: 4.5, elbow: "out" };
const CHEER_PUMP: ArmTarget = { fwd: 4.5, up: 5, out: 3.5, elbow: "out" };
const GLASS_CHEST: ArmTarget = { fwd: 3, up: -1.5, out: 0, elbow: "down" };

/** Writing: the pen hand over the sheet on the desk, moving across. */
const PEN_A: ArmTarget = { fwd: 4, up: -3.5, out: -2.5, elbow: "down" };
const PEN_B: ArmTarget = { fwd: 4, up: -3.5, out: -3.5, elbow: "down" };
const PEN_C: ArmTarget = { fwd: 4, up: -3, out: -4.5, elbow: "down" };
/** A hand lifted off the keys: back in reach, so the elbow bends out (from behind, the elbow rises a
 * row; the hand itself is hidden behind the body). */
const TABLE_UP: ArmTarget = { fwd: 3.5, up: -3, out: -3, elbow: "out" };

const SHUT: Face = { eyes: "shut" };
const DOWN: Face = { eyes: "down" };
const TALK: Face = { mouth: "open" };

// --- the tables ----------------------------------------------------------------------------------------

const hammer = (view: View): PropAttach[] => [held(PROPS.hammer, view)];

/** Hammer at the hip, a two-beat strike at something at knee height ahead. `tool` is for roles that
 * work with something else in hand. */
export function workKeys(tool: (view: View) => PropAttach[] = hammer): Key[] {
  return [
    { near: HIP_WINDUP, props: tool(WINDUP) },
    { near: HIP_MID, props: tool(FWD) },
    { near: HIP_STRIKE, props: tool("down"), bob: 1 },
    { near: HIP_STRIKE, props: tool("down") },
    { near: HIP_MID, props: tool(FWD) },
    { near: HIP_WINDUP, props: tool(WINDUP) },
  ];
}

/** The foreman's work: the clipboard at the chest in the far hand, the near hand ticking it with a pen. */
const clipboardWork = (near: ArmTarget, extra: Partial<Key> = {}): Key => ({
  near,
  far: HANDS.chest,
  props: [{ ...held(PROPS.clipboard, "hold", "far"), flip: { down: true, up: true } }, held(PROPS.pen, "hold")],
  face: DOWN,
  ...extra,
});
// The breath falls on the second tick: from behind, where the pen hand is hidden, the ticks alone would
// not move.
const CLIPBOARD_WORK: Key[] = [clipboardWork(PEN_A), clipboardWork(PEN_B, { bob: 1 }), clipboardWork(PEN_A), clipboardWork(GESTURE_LOW, { face: undefined })];

const HAMMER_WALL: Key[] = [
  { near: HANDS.windup, props: hammer(WINDUP) },
  { near: HANDS.raise, props: hammer("up") },
  { near: WALL_STRIKE, props: hammer(FWD), bob: 1 },
  { near: WALL_STRIKE, props: hammer(FWD) },
  { near: HANDS.raise, props: hammer("up") },
  { near: HANDS.windup, props: hammer(WINDUP) },
];

// The brick in the far hand: its grids are drawn for the near hand, so the front and back views mirror it.
const brick = (): PropAttach => ({ ...held(PROPS.brick, "hold", "far"), flip: { down: true, up: true } });
const TROWEL: Key[] = [
  { near: SCOOP, far: BRICK_REST, props: [held(PROPS.trowel, "down"), brick()] },
  { near: LIFT, far: BRICK_REST, props: [held(PROPS.trowel, "load"), brick()] },
  { near: SPREAD, far: BRICK_REST, props: [held(PROPS.trowel, "load"), brick()] },
  { near: SPREAD_LOW, far: BRICK_REST, props: [held(PROPS.trowel, FWD), brick()], bob: 1 },
  { near: LIFT, far: BRICK_REST, props: [held(PROPS.trowel, FWD), brick()] },
  { near: SCOOP, far: BRICK_PLACE, props: [held(PROPS.trowel, "down"), brick()] },
  { near: SCOOP, far: BRICK_PRESS, props: [held(PROPS.trowel, "down"), brick()], bob: 1 },
  { near: SCOOP, far: BRICK_REST, props: [held(PROPS.trowel, "down"), brick()] },
];

const shovel = (view: string): PropAttach[] => [held(PROPS.shovel, view)];
const DIG: Key[] = [
  { near: DIG_NEAR, far: DIG_FAR, props: shovel("dig") },
  { near: PUSH_NEAR, far: PUSH_FAR, props: shovel("dig"), bob: 1 },
  { near: PUSH_NEAR, far: PUSH_FAR, props: shovel("dig") },
  // Prising the earth loose (from behind the change of grip is hidden, the dip shows).
  { near: LIFT_NEAR, far: LIFT_FAR, props: shovel("dig"), bob: 1 },
  { near: LIFT_NEAR, far: LIFT_FAR, props: shovel("lift") },
  { near: HIGH_NEAR, far: HIGH_FAR, props: shovel("lift") },
  { near: HIGH_NEAR, far: HIGH_FAR, props: shovel("dump") },
  { near: LIFT_NEAR, far: LIFT_FAR, props: shovel("empty") },
  { near: LIFT_NEAR, far: LIFT_FAR, props: shovel("dig") },
];

const roller = (view: View): PropAttach[] => [held(PROPS.roller, view)];
const PAINT: Key[] = [
  { near: HANDS.raise, props: roller("up") },
  { near: ROLL_MID, props: roller(FWD) },
  { near: ROLL_LOW, props: roller("down"), bob: 1 },
  { near: ROLL_LOW, props: roller("down") },
  { near: ROLL_MID, props: roller(FWD) },
  { near: HANDS.raise, props: roller("up") },
];

const tape = (view: string): PropAttach[] => [held(PROPS.tape, view)];
const MEASURE: Key[] = [
  { near: HANDS.chest, far: HANDS.chest, props: tape("hold") },
  { near: TAPE_OUT, far: HANDS.chest, props: tape("run") },
  { near: TAPE_OUT, far: HANDS.chest, props: tape("run"), bob: 1 },
  { near: TAPE_OUT, far: HANDS.chest, props: tape("run") },
  { near: HANDS.chest, far: HANDS.chest, props: tape("hold") },
  { near: HANDS.chest, far: HANDS.chest, props: tape("hold"), bob: 1 },
];

const weld = (sparks?: string): Key => ({
  stance: "kneel",
  near: TORCH_HAND,
  far: KNEE_HAND,
  props: [held(PROPS.mask, "on", "head"), held(PROPS.torch, sparks ? "hold" : "off"), ...(sparks ? [held(PROPS.sparks, sparks)] : [])],
});
const WELD: Key[] = [weld("a"), weld("b"), weld(), weld("b")];

/** Talking: the near hand gestures at chest height, the mouth opens on the beat. */
const TALK_KEYS: Key[] = [
  { near: GESTURE_LOW, face: TALK },
  { near: GESTURE_HIGH },
  { near: GESTURE_LOW, face: TALK, bob: 1 },
  { near: GESTURE_HIGH, bob: 1 },
];

/** Reading the plan held in both hands, eyes down; a breath and the sheet shifting a pixel. */
const plan = (): PropAttach[] => [held(PROPS.plan, "hold")];
const CHEST_UP: ArmTarget = { ...HANDS.chest, up: HANDS.chest.up + 0.5 };
const READ: Key[] = [
  { near: HANDS.chest, far: HANDS.chest, props: plan(), face: DOWN },
  { near: HANDS.chest, far: HANDS.chest, props: plan(), face: DOWN, bob: 1 },
  { near: CHEST_UP, far: CHEST_UP, props: plan(), face: DOWN },
  { near: CHEST_UP, far: CHEST_UP, props: plan(), face: DOWN, bob: 1 },
];

/** On the radio at the ear, talking, then listening with the handset a row lower (seen from behind too,
 * where the face does not show). */
const radio = (): PropAttach[] => [held(PROPS.radio, "hold")];
const EAR_LOW: ArmTarget = { ...HANDS.face, up: HANDS.face.up - 1 };
const PHONE: Key[] = [
  { near: HANDS.face, props: radio(), face: TALK },
  { near: EAR_LOW, props: radio() },
  { near: HANDS.face, props: radio(), face: TALK, bob: 1 },
  { near: EAR_LOW, props: radio(), bob: 1 },
];

/** Tea: the glass up from the chest to the mouth, eyes shut and the head dipping on the sip (so the back
 * view, where the glass is hidden, still moves), back down. */
const tea = (): PropAttach[] => [held(PROPS.tea, "hold")];
const DRINK: Key[] = [
  { near: GLASS_CHEST, props: tea() },
  { near: HANDS.drink, props: tea() },
  { near: HANDS.drink, props: tea(), face: SHUT, bob: 1 },
  { near: GLASS_CHEST, props: tea(), bob: 1 },
];

/** Thinking: the hand at the chin, rubbing it, eyes down. */
const THINK: Key[] = [
  { near: CHIN, face: DOWN },
  { near: CHIN_RUB, face: DOWN },
  { near: CHIN, face: DOWN, bob: 1 },
  { near: CHIN_RUB, face: DOWN, bob: 1 },
];

/** Pointing ahead (and a little out): the arm comes up and holds. */
const POINT_KEYS: Key[] = [{ near: POINT_HALF }, { near: POINT }];

/** Waving beside the head. */
const WAVE: Key[] = [{ near: WAVE_IN }, { near: WAVE_OUT }, { near: WAVE_IN, bob: 1 }, { near: WAVE_OUT, bob: 1 }];

/** Cheering: both arms up, a bounce, the mouth open. */
const CELEBRATE: Key[] = [
  { near: CHEER, far: CHEER, face: TALK },
  { near: CHEER_PUMP, far: CHEER_PUMP, bob: 1 },
  { near: CHEER, far: CHEER, face: TALK },
  { near: CHEER_PUMP, far: CHEER_PUMP, bob: 1, face: TALK },
];

/** Seated, hands on the thighs, breathing. */
const SIT: Key[] = [
  { stance: "sit", near: HANDS.lap, far: HANDS.lap },
  { stance: "sit", near: HANDS.lap, far: HANDS.lap, bob: 1 },
];

/** Typing at a desk: hands at the keys, one then the other lifting a little, eyes down. */
const TYPE: Key[] = [
  { stance: "sit", near: HANDS.table, far: HANDS.table, face: DOWN },
  { stance: "sit", near: TABLE_UP, far: HANDS.table, face: DOWN },
  { stance: "sit", near: HANDS.table, far: HANDS.table, face: DOWN },
  { stance: "sit", near: HANDS.table, far: TABLE_UP, face: DOWN, bob: 1 },
];

/** Writing at the desk: the far hand holds the sheet, the pen hand moves across it, eyes down. */
const WRITE: Key[] = [
  { stance: "sit", near: PEN_A, far: HANDS.table, props: [held(PROPS.pen, "hold")], face: DOWN },
  { stance: "sit", near: PEN_B, far: HANDS.table, props: [held(PROPS.pen, "hold")], face: DOWN },
  { stance: "sit", near: PEN_C, far: HANDS.table, props: [held(PROPS.pen, "hold")], face: DOWN },
  { stance: "sit", near: PEN_B, far: HANDS.table, props: [held(PROPS.pen, "hold")], face: DOWN, bob: 1 },
];

/** Asleep on the seat: eyes shut, hands on the thighs, breathing, a z over the head on every frame
 * (Siteyard looks for it), small and big in turn against the breath so neighbours always differ. */
const zzz = (size: "small" | "big"): PropAttach[] => [held(PROPS.zzz, size, "head")];
const SLEEP: Key[] = [
  { stance: "sit", near: HANDS.lap, far: HANDS.lap, face: SHUT, props: zzz("small") },
  { stance: "sit", near: HANDS.lap, far: HANDS.lap, face: SHUT, props: zzz("big"), bob: 1 },
  { stance: "sit", near: HANDS.lap, far: HANDS.lap, face: SHUT, props: zzz("small"), bob: 1 },
  { stance: "sit", near: HANDS.lap, far: HANDS.lap, face: SHUT, props: zzz("big") },
];

/** The key tables by animation name, with what a game needs to know about each. */
export const KEY_TABLES: Record<string, { meta: AnimMeta; keys: Key[] }> = {
  work: { meta: { delay: 10, loop: true, note: "hammer at the hip; work_clipboard for the foreman" }, keys: workKeys() },
  work_clipboard: { meta: { delay: 15, loop: true, note: "clipboard at the chest, ticking it" }, keys: CLIPBOARD_WORK },
  hammer_wall: { meta: { delay: 10, loop: true }, keys: HAMMER_WALL },
  trowel: { meta: { delay: 12, loop: true }, keys: TROWEL },
  dig: { meta: { delay: 12, loop: true }, keys: DIG },
  paint: { meta: { delay: 12, loop: true }, keys: PAINT },
  measure: { meta: { delay: 20, loop: true }, keys: MEASURE },
  weld: { meta: { delay: 10, loop: true }, keys: WELD },
  talk: { meta: { delay: 15, loop: true }, keys: TALK_KEYS },
  read: { meta: { delay: 25, loop: true }, keys: READ },
  phone: { meta: { delay: 15, loop: true }, keys: PHONE },
  drink: { meta: { delay: 25, loop: true }, keys: DRINK },
  think: { meta: { delay: 25, loop: true }, keys: THINK },
  point: { meta: { delay: 15, loop: false }, keys: POINT_KEYS },
  wave: { meta: { delay: 15, loop: true }, keys: WAVE },
  celebrate: { meta: { delay: 15, loop: true }, keys: CELEBRATE },
  sit_down: { meta: { delay: 25, loop: true, seated: true, facings: ["down"] }, keys: SIT },
  sit_side: { meta: { delay: 25, loop: true, seated: true, facings: ["side"] }, keys: SIT },
  type: { meta: { delay: 8, loop: true, seated: true, facings: ["down", "up"] }, keys: TYPE },
  write: { meta: { delay: 15, loop: true, seated: true, facings: ["down"] }, keys: WRITE },
  sleep: { meta: { delay: 50, loop: true, seated: true, facings: ["side", "down"] }, keys: SLEEP },
};

/** The three facings of a key table, named like the walk (`<name>_side`, `_down`, `_up`). */
function anim(name: string, delay: number, keys: Key[]): Anim[] {
  const poses = keys.map(pose);
  return (["side", "down", "up"] as Facing[]).map((facing) => ({
    name: `${name}_${facing}`,
    frames: () => poses.map((p) => frameOf(facing, p)),
    delay,
    steps: [],
    axis: facing === "side" ? "x" : "y",
  }));
}

export const TOOL_ANIMS: Anim[] = Object.entries(KEY_TABLES).flatMap(([name, t]) => anim(name, t.meta.delay, t.keys));

// --- walks with a load ---------------------------------------------------------------------------------
// The locked walk's own poses (legs, bob, pace) with the arms re-posed by targets, so a loaded worker
// walks exactly like an unloaded one; only the arms and what they hold change.

/** The three facings of a loaded walk. */
function walkAnim(name: string, w: WalkArms): Anim[] {
  const side = WALK_SIDE.map((p, f) => ({ ...p, arms: w.arms(f), ...(w.props ? { props: w.props(f) } : {}) }));
  return [
    { name: `${name}_side`, frames: () => side.map(sideFrame), delay: 10, steps: WALK_SIDE_STEP, axis: "x" },
    { name: `${name}_down`, frames: () => walkDownWith(w).map(downFrame), delay: 10, steps: WALK_SIDE_STEP, axis: "y" },
    { name: `${name}_up`, frames: () => walkUpWith(w).map(upFrame), delay: 10, steps: WALK_SIDE_STEP, axis: "y" },
  ];
}

/** Carrying a brick stack at the chest: no arm swing, the stack rides the walk's bob. */
const CARRY: WalkArms = {
  arms: () => ({ near: HANDS.chest, far: HANDS.chest }),
  props: () => [held(PROPS.bricks, "carry")],
};

/** Pushing a wheelbarrow: both hands on the handles ahead at hip height, the wheel turning in two
 * phases every other frame. The hands rise against the walk's bob, so the barrow rolls on a fixed row
 * and the arms give instead. */
const push = (f: number): ArmTarget => ({ fwd: 3.5, up: -4 + WALK_BOB[f]!, out: -1, elbow: "down" });
const PUSH_CART: WalkArms = {
  arms: (f) => ({ near: push(f), far: push(f) }),
  props: (f) => [held(PROPS.cart, (f >> 1) & 1 ? "b" : "a")],
};

/**
 * Climbing a ladder, seen from behind: the hands reach the rungs alternately, opposite to the legs,
 * which step as in the walk; in place (the ladder is the scene's). A ladder is climbed facing it, so
 * every facing name draws this back view.
 */
const CLIMB: WalkArms = {
  arms: (f) => {
    const swing = Math.cos((2 * Math.PI * f) / STEP.length);
    const rung = (s: number): ArmTarget => ({ fwd: 2, up: 3.25 + 1.75 * s, out: 2, elbow: "out" });
    return { near: rung(-swing), far: rung(swing) };
  },
};
const climbAnim = (): Anim[] =>
  (["side", "down", "up"] as Facing[]).map((facing) => ({
    name: `climb_${facing}`,
    frames: () => walkUpWith(CLIMB).map(upFrame),
    delay: 10,
    steps: [],
    axis: "y",
    facing: "up",
  }));

/** The loaded walks' metadata (their frames come from the walk tables). */
export const WALK_META: Record<string, AnimMeta> = {
  carry: { delay: 10, loop: true },
  push_cart: { delay: 10, loop: true },
  climb: { delay: 10, loop: true, facings: ["up"], note: "a back view for every facing" },
};

export const LOAD_ANIMS: Anim[] = [...walkAnim("carry", CARRY), ...walkAnim("push_cart", PUSH_CART), ...climbAnim()];
