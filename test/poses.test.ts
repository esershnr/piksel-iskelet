// Checks on the skeleton's frames, run with `node --test`.
//   lock:     the walk and idle frames (letters and UVs) are approved and must not change; their dump
//             hashes to a known value. Update the hash only when Eser approves a new walk.
//   back view: facing away, an arm reaching ahead of the body is hidden behind it; no arm pixel may
//             land on the torso in the up facing (a hand across the belly seen from behind was once
//             painted on the shirt).
//   skins:    every review pose and animation frame dresses without a magenta (unknown material) pixel.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { dress, loadSkin } from "../src/skin/skin.ts";
import { keyPose, KEY_TABLES } from "../src/templates/chibi24x32/anims.ts";
import { ANIMS, facingOf, poseFrame, type BodyPose, type Facing } from "../src/templates/chibi24x32/index.ts";
import { stanceDrop } from "../src/templates/chibi24x32/pose.ts";
import { SHOWCASE, showcasePose } from "../src/templates/chibi24x32/showcase.ts";

const FACINGS: Facing[] = ["side", "down", "up"];
const LOCK_SHA256 = "557fe228081fdcfa119c5972187db160f034a1e3c85535511c65d882946b3f05";

test("walk and idle frames are locked", () => {
  const out: Record<string, unknown[]> = {};
  for (const a of ANIMS)
    if (/^(walk|idle)_/.test(a.name)) out[a.name] = a.frames().map((s) => ({ rows: s.rows(), info: s.info.map((p) => (p ? [p.ch, p.part, p.u, p.v] : null)) }));
  assert.equal(createHash("sha256").update(JSON.stringify(out)).digest("hex"), LOCK_SHA256);
});

/** Arm pixels on the torso of a back-view frame (none allowed when both hands reach ahead). */
function backLeaks(p: BodyPose): string[] {
  const s = poseFrame("up", p);
  const top = 16 + stanceDrop(p.stance);
  const leaks: string[] = [];
  for (let y = top; y <= top + 6; y++)
    for (let x = 7; x <= 16; x++) {
      if (y === top && (x === 7 || x === 16)) continue; // the torso's rounded shoulders
      const px = s.at(x, y);
      if (px && px.part === "arm" && px.u >= 0) leaks.push(`(${x},${y})`);
    }
  return leaks;
}

const reachesAhead = (p: BodyPose): boolean => [p.arms.near, p.arms.far].every((a) => typeof a !== "number" && a.fwd >= 0);

test("facing away, no arm lands on the torso", () => {
  // Loaded walks seen from behind: both hands reach ahead, so nothing of the arms may land on the back.
  for (const name of ["carry_up", "push_cart_up"]) {
    const a = ANIMS.find((x) => x.name === name)!;
    a.frames().forEach((s, i) => {
      const leaks: string[] = [];
      for (let y = 16; y <= 23; y++)
        for (let x = 7; x <= 16; x++) {
          const px = s.at(x, y);
          if (px && px.part === "arm" && px.u >= 0 && !(y <= 17 && (x === 7 || x === 16))) leaks.push(`(${x},${y})`);
        }
      assert.deepEqual(leaks, [], `${name} frame ${i}: arm pixels on the back`);
    });
  }
  for (const d of SHOWCASE) {
    const p = showcasePose(d, "up");
    if (!p || !reachesAhead(p)) continue; // a hand behind the back may show
    assert.deepEqual(backLeaks(p), [], `${d.label}: arm pixels on the back`);
  }
  for (const [name, t] of Object.entries(KEY_TABLES))
    t.keys.forEach((k, i) => {
      const p = keyPose(k);
      if (reachesAhead(p)) assert.deepEqual(backLeaks(p), [], `${name} key ${i}: arm pixels on the back`);
    });
});

const magenta = (pic: { px: (readonly number[] | null)[] }): boolean => pic.px.some((c) => c && c[0] === 255 && c[1] === 0 && c[2] === 255);

test("review poses and animations dress without magenta", async () => {
  for (const name of ["isci", "yelekli", "owner:dark", "foreman:mid"]) {
    const skin = await loadSkin(name);
    for (const d of SHOWCASE)
      for (const facing of FACINGS) {
        const p = showcasePose(d, facing);
        if (p) assert.ok(!magenta(dress(poseFrame(facing, p), skin, facing)), `${name}: ${d.label} (${facing}) has magenta`);
      }
    for (const a of ANIMS) a.frames().forEach((s, i) => assert.ok(!magenta(dress(s, skin, facingOf(a))), `${name}: ${a.name} frame ${i} has magenta`));
  }
});
