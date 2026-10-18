// Review poses: every prop in every facing in a holding pose (each orientation on its own row), and
// the seated poses. Not animations; tools/props-preview.ts draws them and test/poses.test.ts checks
// them. A prop's orientation may differ per facing ("fwd" from the side is "flat" from the front).

import type { PropAttach } from "../../props.ts";
import type { Facing } from "./index.ts";
import { HANDS, type ArmTarget, type BodyPose } from "./pose.ts";
import { PROPS } from "./props.ts";

export interface Showcase {
  label: string;
  stance?: BodyPose["stance"];
  arms: { near: ArmTarget; far: ArmTarget };
  prop?: { name: keyof typeof PROPS; view: string | Partial<Record<Facing, string>>; hand: "near" | "far"; z?: PropAttach["z"] };
}

const ahead: ArmTarget = { fwd: 4.5, up: -1.5, out: 0.5, elbow: "down" };
const fwdFlat = { side: "fwd", down: "flat", up: "flat" };

export const SHOWCASE: Showcase[] = [
  { label: "hammer down", arms: { near: HANDS.hang, far: HANDS.hang }, prop: { name: "hammer", view: "down", hand: "near" } },
  { label: "hammer up", arms: { near: HANDS.raise, far: HANDS.hang }, prop: { name: "hammer", view: "up", hand: "near" } },
  { label: "hammer back", arms: { near: HANDS.windup, far: HANDS.hang }, prop: { name: "hammer", view: "back", hand: "near" } },
  { label: "hammer fwd", arms: { near: ahead, far: HANDS.hang }, prop: { name: "hammer", view: fwdFlat, hand: "near" } },
  { label: "brick hold", arms: { near: HANDS.chest, far: HANDS.hang }, prop: { name: "brick", view: "hold", hand: "near" } },
  { label: "bricks carry", arms: { near: HANDS.chest, far: HANDS.chest }, prop: { name: "bricks", view: "carry", hand: "near" } },
  { label: "trowel down", arms: { near: HANDS.hang, far: HANDS.hang }, prop: { name: "trowel", view: "down", hand: "near" } },
  { label: "trowel fwd", arms: { near: ahead, far: HANDS.hang }, prop: { name: "trowel", view: fwdFlat, hand: "near" } },
  { label: "shovel dig", arms: { near: { fwd: 3.5, up: -3.5, out: -4, elbow: "down" }, far: { fwd: 1, up: -2, out: -4, elbow: "down" } }, prop: { name: "shovel", view: "dig", hand: "near" } },
  { label: "shovel lift", arms: { near: { fwd: 3.5, up: -1, out: -3, elbow: "down" }, far: { fwd: 1, up: -2.5, out: -3, elbow: "down" } }, prop: { name: "shovel", view: "lift", hand: "near" } },
  { label: "roller up", arms: { near: HANDS.raise, far: HANDS.hang }, prop: { name: "roller", view: "up", hand: "near" } },
  { label: "roller down", arms: { near: HANDS.hang, far: HANDS.hang }, prop: { name: "roller", view: "down", hand: "near" } },
  { label: "radio hold", arms: { near: HANDS.face, far: HANDS.hang }, prop: { name: "radio", view: "hold", hand: "near" } },
  { label: "tea hold", arms: { near: HANDS.drink, far: HANDS.hang }, prop: { name: "tea", view: "hold", hand: "near" } },
  { label: "plan read", arms: { near: HANDS.chest, far: HANDS.chest }, prop: { name: "plan", view: "hold", hand: "near" } },
  { label: "clipboard", arms: { near: HANDS.chest, far: HANDS.hang }, prop: { name: "clipboard", view: "hold", hand: "near" } },
  { label: "sit lap", stance: "sit", arms: { near: HANDS.lap, far: HANDS.lap } },
  { label: "sit table", stance: "sit", arms: { near: HANDS.table, far: HANDS.table } },
];

/** The pose of a showcase row in a facing; null when the prop has no view for that facing. */
export function showcasePose(d: Showcase, facing: Facing): BodyPose | null {
  const p: BodyPose = { bob: 0, arms: d.arms };
  if (d.stance) p.stance = d.stance;
  if (d.prop) {
    const prop = PROPS[d.prop.name];
    const view = typeof d.prop.view === "string" ? d.prop.view : d.prop.view[facing];
    if (!view || !prop.views[facing]?.[view]) return null;
    p.props = [{ prop, view, hand: d.prop.hand, ...(d.prop.z ? { z: d.prop.z } : {}) }];
  }
  return p;
}
