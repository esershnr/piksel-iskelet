// The Siteyard skin (skins/siteyard.ts), run with `node --test`: every animation frame dressed into
// symbols holds only letters Siteyard can resolve (its palette, or a symbol it substitutes per role and
// skin tone), the outline is 'e' and never 'k', and the hat band is one row of 'A' at BAND_RECT.

import assert from "node:assert/strict";
import { test } from "node:test";
import { dressSymbols } from "../src/skin/skin.ts";
import { BAND_RECT } from "../src/skin/skins/roles.ts";
import { SITEYARD } from "../src/skin/skins/siteyard.ts";
import { ANIMS, facingOf } from "../src/templates/chibi24x32/index.ts";

/** The keys of PALETTE in siteyard/src/theme/construction/palette.ts (copied; keep in step with it). */
const PALETTE_KEYS = "K k e * 0 N n 1 2 h t 5 6 M m C c 3 G g 8 9 B b a Y y l O o P r w W d D i j v V F u s z x p S Z U q T J R".split(" ");
/** Symbols Siteyard substitutes before rasterizing (role look, skin tone, shirt front). */
const SYMBOLIC = "H L I A X Q _ ^ ; ~ S z x p".split(" ");
const ALLOWED = new Set([".", "e", ...SYMBOLIC, ...PALETTE_KEYS.filter((k) => k !== "k")]);

/** The hat band row (4 + the head's drop: bob, seat, kneel). */
const bandRow = (rows: string[]): number => rows.findIndex((r) => r.includes("A"));

test("siteyard skin: every frame is 24x32 Siteyard letters, outline e (never k), band all A", () => {
  for (const a of ANIMS) {
    const facing = facingOf(a);
    a.frames().forEach((s, i) => {
      const rows = dressSymbols(s, SITEYARD, facing);
      const at = `${a.name} frame ${i}`;
      assert.equal(rows.length, 32, at);
      for (const r of rows) assert.equal(r.length, 24, at);
      const bad = new Set([...rows.join("")].filter((ch) => !ALLOWED.has(ch)));
      assert.deepEqual([...bad], [], `${at}: letters outside Siteyard's palette`);
      const y = bandRow(rows);
      assert.ok(y >= 0, `${at}: no band`);
      const [bx, by, bw, bh] = BAND_RECT(facing, y - 4);
      assert.equal(by, y, at);
      for (let yy = by; yy < by + bh; yy++)
        for (let x = bx; x < bx + bw; x++) {
          // the sleep zzz may cross the band; the exporter lifts it into a layer of its own
          if (s.at(x, yy)?.part === "prop:zzz") continue;
          assert.equal(rows[yy]![x], "A", `${at}: band pixel ${x},${yy}`);
        }
      // nothing else on the frame is band
      assert.ok(rows.join("").split("A").length - 1 <= bw * bh, `${at}: band pixels outside BAND_RECT`);
    });
  }
});
