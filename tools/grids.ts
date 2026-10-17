// Prints the mannequin's rigid-part grids (head, torso) per facing, the shapes a skin's head and torso
// textures must line up with: one character per (u, v), 'e' marks the eyes, '.' is outside the part or
// never visible (the side torso's middle always sits under the near arm).
//   node tools/grids.ts
// Also prints the limb UV ranges a skin's arm and leg strips are indexed by.

import { ANIMS } from "../src/templates/chibi24x32/index.ts";

for (const facing of ["side", "down", "up"]) {
  // Union over every frame of the facing: an arm in front of the torso hides part of it in any one frame.
  const frames = ANIMS.filter((a) => a.name.endsWith(`_${facing}`)).flatMap((a) => a.frames());
  for (const part of ["head", "torso"]) {
    const cells = frames.flatMap((s) => s.info.filter((p) => p && p.part === part && p.u >= 0)) as { ch: string; u: number; v: number }[];
    const w = Math.max(...cells.map((c) => c.u)) + 1;
    const h = Math.max(...cells.map((c) => c.v)) + 1;
    const rows = Array.from({ length: h }, () => Array.from({ length: w }, () => "."));
    for (const c of cells) if (rows[c.v]![c.u] === "." || c.ch === "e") rows[c.v]![c.u] = c.ch;
    console.log(`${facing} ${part} (${w}x${h}):`);
    rows.forEach((r, v) => console.log(`  ${String(v).padStart(2)} "${r.join("")}",`));
  }
}

const limbs = { arm: new Map<number, number>(), leg: new Map<number, number>() };
for (const a of ANIMS)
  for (const s of a.frames())
    for (const p of s.info)
      if (p && (p.part === "arm" || p.part === "leg") && p.u >= 0) {
        const m = limbs[p.part];
        m.set(p.v, Math.max(m.get(p.v) ?? 0, p.u + 1));
      }
for (const [part, m] of Object.entries(limbs)) {
  const vs = [...m.keys()].sort((x, y) => x - y);
  console.log(`${part} strip: rows v=${vs[0]}..${vs[vs.length - 1]}, widest u per row: ${vs.map((v) => `${v}:${m.get(v)}`).join(" ")}`);
}
