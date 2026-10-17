// Front view, facing down toward the camera. The character's right side is on the screen's left.
// See body.ts for the frame layout and letters, frontback.ts for how the poses are drawn.

import type { Sprite } from "../../sprite.ts";
import { frontFrame, frontIdle, frontWalk, torsoTurns, WALK_FRONT_STEP, type FacingLayout, type FrontPose, type Projection } from "./frontback.ts";

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

const DOWN: FacingLayout = { head: HEAD_DOWN, torso: torsoTurns(TORSO) };

const PROJ: Projection = { near: "left", toward: 1 };

/** One front-view frame as a letter sprite. */
export const downFrame = (p: FrontPose): Sprite => frontFrame(p, DOWN);

export const WALK_DOWN = frontWalk(PROJ);
export const WALK_DOWN_STEP = WALK_FRONT_STEP;
export const IDLE_DOWN = frontIdle(PROJ);
