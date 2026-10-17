// The template's animation registry: what the preview renders and, later, what exports and skins use.
// Each facing module adds its own entries; side-view frames face right (left is their mirror).

import type { Sprite } from "../../sprite.ts";
import { downFrame, IDLE_DOWN, WALK_DOWN, WALK_DOWN_STEP } from "./down.ts";
import { IDLE_SIDE, sideFrame, WALK_SIDE, WALK_SIDE_STEP } from "./side.ts";
import { IDLE_UP, upFrame, WALK_UP, WALK_UP_STEP } from "./up.ts";

export { H, W } from "./body.ts";

export interface Anim {
  name: string;
  frames: () => Sprite[];
  /** Frame delay, hundredths of a second. */
  delay: number;
  /** Per-frame movement in px along the facing (walks); empty for in-place animations. */
  steps: number[];
  /** Screen axis `steps` moves along: "x" for side views, "y" for front/back (the ground scrolls). */
  axis: "x" | "y";
}

export const ANIMS: Anim[] = [
  { name: "walk_side", frames: () => WALK_SIDE.map(sideFrame), delay: 10, steps: WALK_SIDE_STEP, axis: "x" },
  { name: "idle_side", frames: () => IDLE_SIDE.map(sideFrame), delay: 25, steps: [], axis: "x" },
  { name: "walk_down", frames: () => WALK_DOWN.map(downFrame), delay: 10, steps: WALK_DOWN_STEP, axis: "y" },
  { name: "idle_down", frames: () => IDLE_DOWN.map(downFrame), delay: 25, steps: [], axis: "y" },
  { name: "walk_up", frames: () => WALK_UP.map(upFrame), delay: 10, steps: WALK_UP_STEP, axis: "y" },
  { name: "idle_up", frames: () => IDLE_UP.map(upFrame), delay: 25, steps: [], axis: "y" },
];
