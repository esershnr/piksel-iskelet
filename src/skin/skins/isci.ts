// "İşçi": a construction worker in the Siteyard spirit (hard hat, short-sleeved shirt, jeans, boots).
// Drawn for chibi24x32; the head and torso grids line up with that template's side-view grids.

import type { Skin } from "../skin.ts";

// Hard hat seen from the front or the back: symmetric crown, the brim one band across.
const HAT_FRONT = [
  "....LLYYYYYY....",
  "..LLYYYYYYYYSS..",
  ".LYYYYYYYYYYYSS.",
  ".YYYYYYYYYYYYYS.",
  "bbbbbbbbbbbbbbbb",
];

export const ISCI: Skin = {
  name: "isci",
  outline: "#2f2433",
  materials: {
    s: ["#f7d2b4", "#e8b08a", "#c98a66", "#a06a4e"], // skin
    x: ["#e8b08a", "#c98a66", "#a06a4e", "#7a4c36"], // ear (skin, one step darker)
    r: ["#8a5a3c", "#6b4430", "#4e3022", "#3a2219"], // hair
    c: ["#6b9ee0", "#3f78c8", "#2d589a", "#203f70"], // shirt
    k: ["#6b4a32", "#523726", "#3d281c", "#2b1c14"], // belt
    j: ["#5d6f9c", "#465783", "#344168", "#26304d"], // jeans
    o: ["#7a4f33", "#5e3a25", "#452a1b", "#311e13"], // boots
    y: ["#ffe27a", "#f7c531", "#d99a1e", "#b07414"], // hard hat
  },
  head: {
    base: "s",
    // Hair at the back of the head, an ear, the face in front; the hat (overlay) covers the crown.
    side: [
      "....rrrrrr....",
      "..rrrrrrrrrr..",
      ".rrrrrrrrrrrr.",
      ".rrrrrrsssssss",
      "rrrrrrssssssss",
      "rrrrrsssssssss",
      "rrrrrxxsssssss",
      "rrrrrxxsssssss",
      "rrrrssssssssss",
      ".rrrsssssssss.",
      "..rrssssssss..",
      "....ssssss....",
    ],
    // Facing us: hair at the temples, ears on both sides.
    down: [
      "....rrrrrr....",
      "..rrrrrrrrrr..",
      ".rrrrrrrrrrrr.",
      "rrrsssssssssrr",
      "rrssssssssssrr",
      "rssssssssssssr",
      "xssssssssssssx",
      "xssssssssssssx",
      "ssssssssssssss",
      ".ssssssssssss.",
      "..ssssssssss..",
      "....ssssss....",
    ],
    // From behind: hair all over, ears peeking out, the neck under the nape.
    up: [
      "....rrrrrr....",
      "..rrrrrrrrrr..",
      ".rrrrrrrrrrrr.",
      "rrrrrrrrrrrrrr",
      "rrrrrrrrrrrrrr",
      "rrrrrrrrrrrrrr",
      "xrrrrrrrrrrrrx",
      "xrrrrrrrrrrrrx",
      "rrrrrrrrrrrrrr",
      ".rrrrrrrrrrrr.",
      "..rrrrrrrrrr..",
      "....ssssss....",
    ],
  },
  torso: {
    base: "c",
    side: [".cccccccc", "ccccccccc", "ccccccccc", "ccccccccc", "ccccccccc", "ccccccccc", "kkkkkkkkk"],
    down: [".ccccccccc", "cccccccccc", "cccccccccc", "cccccccccc", "cccccccccc", "cccccccccc", "kkkkkkkkkk"],
    up: [".ccccccccc", "cccccccccc", "cccccccccc", "cccccccccc", "cccccccccc", "cccccccccc", "kkkkkkkkkk"],
  },
  // Short sleeves to just above the elbow, bare forearm and hand.
  arm: ["cc", "cc", "ss", "ss", "ss", "ss"],
  // Jeans down to the ankle, boots for the foot rows.
  leg: ["j", "j", "j", "j", "j", "j", "o", "o", "o"],
  overlays: [
    {
      anchor: "head",
      z: "front",
      // Crown over the top of the head, brim pushed forward past the face.
      side: {
        x: -1,
        y: -2,
        rows: [
          "....LLLYYY......",
          "..LLYYYYYYYY....",
          ".LYYYYYYYYYYS...",
          ".YYYYYYYYYYYSS..",
          "bbbbbbbbbbbbbbbb",
        ],
      },
      down: { x: -1, y: -2, rows: HAT_FRONT },
      up: { x: -1, y: -2, rows: HAT_FRONT },
      legend: { L: ["y", 0], Y: ["y", 1], S: ["y", 2], b: ["y", 2] },
    },
  ],
};
