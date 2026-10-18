// Front view, facing down toward the camera. The character's right side is on the screen's left.
// See body.ts for the frame layout and letters, frontback.ts for how the poses are drawn.

import type { Sprite } from "../../sprite.ts";
import { frontFrame, frontIdle, frontPose, frontWalk, frontWalkWith, torsoTurns, WALK_FRONT_STEP, type FacingLayout, type FrontPose, type Projection, type WalkArms } from "./frontback.ts";
import type { BodyPose } from "./pose.ts";

// Fill only: outlines are generated. Two 1x2 eyes low on the face and wide apart carry the facing;
// no nose, no mouth (the mannequin keeps the face for the skin).
const HEAD_DOWN = [
  "....GGHHHH....",
  "..GGGHHHHHHH..",
  ".GGHHHHHHHHHh.",
  "GGHHHHHHHHHHHh",
  "GHHHHHHHHHHHHh",
  "GHHHHHHHHHHHHh",
  "HHHeHHHHHHeHHh",
  "HHHeHHHHHHeHHh",
  "hHHHHHHHHHHHHh",
  ".hHHHHHHHHHHh.",
  "..hhHHHHHHhh..",
  "....hhhhhh....",
];

const TORSO = [
  ".TTTTTTTT.",
  "tTTTTTTTTt",
  "tTTTTTTTTt",
  "tTTTTTTTTt",
  "tTTTTTTTTt",
  "tTTTTTTTTt",
  "tttttttttt",
];

const PROJ: Projection = { near: "left", toward: 1 };

const DOWN: FacingLayout = { head: HEAD_DOWN, torso: torsoTurns(TORSO), proj: PROJ, mouth: [[6, 9], [7, 9]] };

/** One front-view frame as a letter sprite. */
export const downFrame = (p: FrontPose): Sprite => frontFrame(p, DOWN);

/** A general pose (pose.ts) seen from the front. */
export const downPose = (p: BodyPose): FrontPose => frontPose(PROJ, p);

export const WALK_DOWN = frontWalk(PROJ);
export const WALK_DOWN_STEP = WALK_FRONT_STEP;
export const IDLE_DOWN = frontIdle(PROJ);

/** The front walk with the arms posed (carrying, pushing). */
export const walkDownWith = (w: WalkArms): FrontPose[] => frontWalkWith(PROJ, w);
