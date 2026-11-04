// The Siteyard skin (skins/siteyard.ts), run with `node --test`: every animation frame dressed into
// symbols holds only letters Siteyard can resolve (its palette, or a symbol it substitutes per role and
// skin tone), the outline is 'e' and never 'k' (Siteyard's prop outline; only the wheelbarrow's tyre
// is painted k), and the hat band is one row of 'A' at BAND_RECT. The wheelbarrow wears the map prop's
// colors.

import assert from "node:assert/strict";
import { test } from "node:test";
import { PROP_LETTERS } from "../src/props.ts";
import { dressSymbols } from "../src/skin/skin.ts";
import { BAND_RECT } from "../src/skin/skins/roles.ts";
import { SITEYARD } from "../src/skin/skins/siteyard.ts";
import { ANIMS, facingOf } from "../src/templates/chibi24x32/index.ts";

/** The keys of PALETTE in siteyard/src/theme/construction/palette.ts (copied; keep in step with it). */
const PALETTE_KEYS = "K k e * 0 N n 1 2 h t 5 6 M m C c 3 G g 8 9 B b a Y y l O o P r w W d D i j v V F u s z x p S Z U q T J R".split(" ");
/** Symbols Siteyard substitutes before rasterizing (role look, skin tone, shirt front). */
const SYMBOLIC = "H L I A X Q _ ^ ; ~ S z x p".split(" ");
const ALLOWED = new Set([".", "e", ...SYMBOLIC, ...PALETTE_KEYS.filter((k) => k !== "k")]);

/** A prop pixel (not its generated outline) of the given material. */
const isMaterial = (s: { at(x: number, y: number): { ch: string; part: string; u: number } | null }, x: number, y: number, m: string): boolean => {
  const p = s.at(x, y);
  return !!p && p.part.startsWith("prop:") && p.u >= 0 && PROP_LETTERS[p.ch]?.[0] === m;
};

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
      bad.delete("k");
      assert.deepEqual([...bad], [], `${at}: letters outside Siteyard's palette`);
      rows.forEach((r, yy) =>
        [...r].forEach((ch, x) => {
          if (ch === "k") assert.ok(isMaterial(s, x, yy, "tyre"), `${at}: k at ${x},${yy} is not a tyre pixel`);
        }),
      );
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

test("siteyard skin: the pushed wheelbarrow is the map's (green tray, sand load, tyre k on an M rim)", () => {
  // tray 8/g/G, sand 2/1/N, tyre k, rim M round a c hub; grey plastic legs m/M, wooden handles t
  const CART = new Set(["8", "g", "G", "2", "1", "N", "k", "M", "c", "m", "t"]);
  const carts = ANIMS.filter((a) => a.name.startsWith("push_cart_"));
  assert.equal(carts.length, 3);
  for (const a of carts) {
    const facing = facingOf(a);
    a.frames().forEach((s, i) => {
      const rows = dressSymbols(s, SITEYARD, facing);
      const at = `${a.name} frame ${i}`;
      const seen = new Set<string>();
      rows.forEach((r, y) =>
        [...r].forEach((ch, x) => {
          const p = s.at(x, y);
          if (!p || p.part !== "prop:cart" || p.u < 0 || ch === "e") return;
          assert.ok(CART.has(ch), `${at}: cart pixel ${x},${y} is ${ch}`);
          seen.add(ch);
        }),
      );
      assert.ok(seen.has("g") || seen.has("G"), `${at}: no tray`);
      if (facing !== "up") for (const ch of ["1", "k", "c"]) assert.ok(seen.has(ch), `${at}: no ${ch} (sand, tyre, hub)`);
    });
  }
});
