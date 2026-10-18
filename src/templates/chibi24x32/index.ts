// The template's animation registry: what the preview renders and, later, what exports and skins use.
// The walk and idle come from the facing modules (side-view frames face right, left is their mirror);
// the tool animations (anims.ts) are key-pose tables drawn by every facing.
//
// Beyond the registry, `poseFrame` draws any general pose (pose.ts: hand targets, stance, props) in a
// facing; the props the template draws live in props.ts.

import { frameOf, LOAD_ANIMS, TOOL_ANIMS, type Anim } from "./anims.ts";
import { downFrame, IDLE_DOWN, WALK_DOWN, WALK_DOWN_STEP } from "./down.ts";
import { IDLE_SIDE, sideFrame, WALK_SIDE, WALK_SIDE_STEP } from "./side.ts";
import { IDLE_UP, upFrame, WALK_UP, WALK_UP_STEP } from "./up.ts";

export { H, W } from "./body.ts";
export { HANDS, KNEEL_DY, SEAT_DY, SEAT_HIP, type ArmPose, type ArmTarget, type BodyPose, type Stance } from "./pose.ts";
export { PROPS } from "./props.ts";
export { facingOf, type Anim, type Facing } from "./anims.ts";

/** A general pose drawn in a facing (side frames face right). */
export const poseFrame = frameOf;

export const ANIMS: Anim[] = [
  { name: "walk_side", frames: () => WALK_SIDE.map(sideFrame), delay: 10, steps: WALK_SIDE_STEP, axis: "x" },
  { name: "idle_side", frames: () => IDLE_SIDE.map(sideFrame), delay: 25, steps: [], axis: "x" },
  { name: "walk_down", frames: () => WALK_DOWN.map(downFrame), delay: 10, steps: WALK_DOWN_STEP, axis: "y" },
  { name: "idle_down", frames: () => IDLE_DOWN.map(downFrame), delay: 25, steps: [], axis: "y" },
  { name: "walk_up", frames: () => WALK_UP.map(upFrame), delay: 10, steps: WALK_UP_STEP, axis: "y" },
  { name: "idle_up", frames: () => IDLE_UP.map(upFrame), delay: 25, steps: [], axis: "y" },
  ...LOAD_ANIMS,
  ...TOOL_ANIMS,
];
