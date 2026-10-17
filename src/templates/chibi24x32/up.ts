// Back view, facing up away from the camera. The character's right side is on the screen's right.
// See body.ts for the frame layout and letters, frontback.ts for how the poses are drawn.

import type { Sprite } from "../../sprite.ts";
import { frontFrame, frontIdle, frontWalk, torsoTurns, WALK_FRONT_STEP, type FacingLayout, type FrontPose, type Projection } from "./frontback.ts";

// Fill only: outlines are generated. No face; the nape is in shade so the back of the head reads as
// the back without a hairline the skin may not want.
const HEAD_UP = [
  "....GGHHHH....",
  "..GGGHHHHHHH..",
  ".GGHHHHHHHHHh.",
  "GGHHHHHHHHHHHh",
  "GHHHHHHHHHHHHh",
  "GHHHHHHHHHHHHh",
  "HHHHHHHHHHHHHh",
  "HHHHHHHHHHHHhh",
  "hHHHHHHHHHHhhh",
  ".hHHHHHHHHhhh.",
  "..hhHHHHhhhh..",
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

const UP: FacingLayout = { head: HEAD_UP, torso: torsoTurns(TORSO) };

const PROJ: Projection = { near: "right", toward: -1 };

/** One back-view frame as a letter sprite. */
export const upFrame = (p: FrontPose): Sprite => frontFrame(p, UP);

export const WALK_UP = frontWalk(PROJ);
export const WALK_UP_STEP = WALK_FRONT_STEP;
export const IDLE_UP = frontIdle(PROJ);
