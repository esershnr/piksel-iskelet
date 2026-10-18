// "Siteyard": a symbolic skin. Its ramps hold Siteyard palette letters instead of colors, so
// `dressSymbols` turns a frame into the letter grid Siteyard's character sprites are made of
// (siteyard/src/theme/construction/palette.ts). The letters Siteyard substitutes per role and skin tone
// stay symbolic: H/L/I hat, A hat band, X/Q top (vest or shirt), _ reflective stripe, ^ collar, ~ tie,
// ; shirt over a stripe, S/z/x skin; the rest are literal palette letters (e outline, i/j shirt sleeves,
// d/D trousers, F/h boots, 0 hair and belt). The worker of "yelekli" is the base: a vest over the shirt,
// the hard hat of skins/roles.ts with its band row.
//
// tools/siteyard-export.ts renders every animation with this skin into a module Siteyard imports.

import type { Skin } from "../skin.ts";
import { roleSkin } from "./roles.ts";

const ROLE = roleSkin("worker", "light");

export const SITEYARD: Skin = {
  ...ROLE,
  name: "siteyard",
  outline: "e",
  materials: {
    s: ["S", "S", "z", "x"], // skin (the mannequin's light tone is plain skin, as in v1)
    x: ["z", "z", "x", "x"], // ear
    r: "0", // hair
    c: ["i", "i", "j", "j"], // shirt (sleeves, armholes)
    k: "0", // belt
    j: ["d", "d", "D", "D"], // trousers
    o: ["h", "F", "F", "F"], // boots
    y: ["L", "H", "I", "I"], // hard hat: highlight, hat color, shade
    band: "A", // hat band, tinted by Siteyard at runtime
    g: ["X", "X", "Q", "Q"], // top: the vest (a plain shirt for roles without one)
    w: "_", // reflective stripe (top color without a vest)
    "^": "^", // collar opening (shirt under a jacket, top color otherwise)
    "~": "~", // tie (top color otherwise)
    ";": ";", // shirt over a stripe pixel (stripe color otherwise)
  },
  torso: {
    base: "g",
    // As v1: the shirt front (collar, tie) down the middle and the stripe column as shirt-over-stripe,
    // so the owner's suit shows a white shirt and a red tie while every vest or shirt stays closed.
    side: [".ggg;gggg", "gggg;gggg", "gggg;gggg", "wwwwwwwww", "ggggggggg", "ggggggggg", "kkkkkkkkk"],
    down: [".gw^^^^wg.", "cgw^~~^wgc", "ggwg~~gwgg", "wwwwwwwwww", "gggggggggg", "gggggggggg", "kkkkkkkkkk"],
    up: [".gwggggwg.", "cgwggggwgc", "ggwggggwgg", "wwwwwwwwww", "gggggggggg", "gggggggggg", "kkkkkkkkkk"],
  },
  // The brim row is the hat color (Siteyard checks the hat color at (10, 5) of idle_down), the band row
  // above it the band symbol.
  overlays: ROLE.overlays!.map((o) => ({ ...o, legend: { ...o.legend, b: ["y", 1] } })),
  props: {
    steel: ["3", "m", "M", "M"],
    wood: ["5", "t", "h", "0"],
    paper: ["w", "2", "2", "1"], // the light tone is also the sleep zzz (white text in Siteyard)
    ink: "b",
    brick: ["5", "h", "6", "6"],
    mortar: "0",
    glass: ["W", "a", "B", "B"],
    tea: ["h", "6", "6", "6"],
    plastic: ["c", "m", "M", "K"],
    led: "r",
    paint: ["a", "b", "B", "B"],
    tape: ["l", "y", "Y", "Y"],
    spark: ["l", "a", "a", "a"],
    earth: ["1", "N", "0", "0"],
    visor: "B",
  },
};
