// Siteyard's roles as skins: every worker wears the hi-vis vest of "yelekli" and the roles differ by
// hard hat and vest color; the owner (the player's avatar) wears a navy suit over a white shirt with a
// red tie and a white hat, no vest. Three skin tones. The hat band is its own material (`band`), the
// row under the crown, so a game can tint it per model color by overriding `materials.band` (it
// defaults to the hat's shade).
//
//   roleSkin("foreman", "mid")   ->  a Skin;  loadSkin("foreman:mid") finds it by that name.

import type { Ramp, Skin } from "../skin.ts";
import { ISCI } from "./isci.ts";

export type Tone = "light" | "mid" | "dark";

/** Skin ramps per tone (skin, and the ear one step darker). */
export const SKIN_TONES: Record<Tone, { s: Ramp; x: Ramp }> = {
  light: { s: ["#f7d2b4", "#e8b08a", "#c98a66", "#a06a4e"], x: ["#e8b08a", "#c98a66", "#a06a4e", "#7a4c36"] },
  mid: { s: ["#e8b58a", "#d49a6a", "#a86f47", "#7e4f31"], x: ["#d49a6a", "#a86f47", "#7e4f31", "#5a3722"] },
  dark: { s: ["#b3835c", "#8d5b3c", "#6a3f2a", "#4a2a1b"], x: ["#8d5b3c", "#6a3f2a", "#4a2a1b", "#331c12"] },
};

export interface RoleLook {
  hat: Ramp;
  /** Vest color; none for the suit. */
  vest?: Ramp;
  /** Navy suit with a white shirt and a red tie instead of shirt and vest. */
  suit?: boolean;
  /** Works with a clipboard instead of a hammer (the foreman). */
  clipboard?: boolean;
  /** The same look in Siteyard's palette letters (exported into Siteyard's skeleton.ts as SKELETON_ROLES). */
  siteyard: SiteyardLook;
}

/**
 * A role in Siteyard's palette letters (siteyard/src/theme/construction/palette.ts): hat H, highlight L,
 * shade I; top X with shade Q (the vest, or the owner's suit jacket). `vest` drives Siteyard's reflective
 * stripe color, `clipboard` swaps the hammer for a clipboard, `extra` are substitutions applied last
 * (sleeve/trouser letters and the shirt-front symbols ^ ; ~), `anims` limits the drawn anims.
 */
export interface SiteyardLook {
  H: string;
  L: string;
  I: string;
  X: string;
  Q: string;
  vest: boolean;
  clipboard: boolean;
  extra?: Record<string, string>;
  anims?: string[];
}

// The hex ramps color the previews (roles-preview, Aseprite); the Siteyard letters below color the game.
// Keep the two in step when a role changes; Siteyard's palette is the game's truth for the actual colors.
const WHITE: Ramp = ["#ffffff", "#f0f2f4", "#c0cbdc", "#8b9bb4"];
const YELLOW: Ramp = ["#ffe27a", "#f7c531", "#d99a1e", "#b07414"];
const ORANGE: Ramp = ["#ffb347", "#f77622", "#be4a2f", "#8a3320"];
const BLUE: Ramp = ["#5fc4ff", "#0099db", "#124e89", "#0c3660"];
const GREY: Ramp = ["#c0cbdc", "#8b9bb4", "#5a6988", "#3a4466"];
const HIVIS: Ramp = ["#e6f57a", "#c4de3a", "#93ad22", "#6a7d18"];
const ORANGE_VEST: Ramp = ["#ffa559", "#f77622", "#be4a2f", "#8a3320"];
const BLUE_VEST: Ramp = ["#6fb4ff", "#3f82d6", "#2a5b9c", "#1d3f6e"];
const GREY_VEST: Ramp = ["#aab2bb", "#8b9bb4", "#5a6988", "#3a4466"];

// Siteyard letters: hats (H, L, I) and tops (X, Q).
const SY_WHITE = { H: "w", L: "W", I: "3" };
const SY_ORANGE = { H: "o", L: "P", I: "O" };
const SY_YELLOW = { H: "y", L: "l", I: "Y" };
const SY_BLUE = { H: "b", L: "a", I: "B" };
const SY_GREY = { H: "c", L: "3", I: "m" };
const SY_HIVIS = { X: "v", Q: "V" };
const SY_ORANGE_VEST = { X: "o", Q: "O" };
const SY_BLUE_VEST = { X: "b", Q: "B" };
const SY_GREY_VEST = { X: "c", Q: "m" };
const worker = (hat: typeof SY_WHITE, vest: typeof SY_HIVIS, clipboard = false): SiteyardLook => ({ ...hat, ...vest, vest: true, clipboard });

export const ROLES: Record<string, RoleLook> = {
  site_manager: { hat: WHITE, vest: HIVIS, siteyard: worker(SY_WHITE, SY_HIVIS) },
  lead: { hat: WHITE, vest: HIVIS, siteyard: worker(SY_WHITE, SY_HIVIS) },
  foreman: { hat: ORANGE, vest: ORANGE_VEST, clipboard: true, siteyard: worker(SY_ORANGE, SY_ORANGE_VEST, true) },
  crew: { hat: YELLOW, vest: HIVIS, siteyard: worker(SY_YELLOW, SY_HIVIS) },
  worker: { hat: YELLOW, vest: HIVIS, siteyard: worker(SY_YELLOW, SY_HIVIS) },
  helper: { hat: BLUE, vest: BLUE_VEST, siteyard: worker(SY_BLUE, SY_BLUE_VEST) },
  unknown: { hat: GREY, vest: GREY_VEST, siteyard: worker(SY_GREY, SY_GREY_VEST) },
  // The site owner (the player's avatar): navy suit over a white shirt and a red tie, white hard hat;
  // in Siteyard the suit recolors the sleeves and trousers, and draws only a few anims.
  owner: {
    hat: WHITE,
    suit: true,
    siteyard: {
      ...SY_WHITE, X: "M", Q: "e", vest: false, clipboard: false,
      extra: { i: "M", j: "e", d: "M", D: "e", "^": "w", ";": "w", "~": "r" },
      anims: ["idle", "walk", "talk", "point", "wave", "sit_side", "drink"],
    },
  },
};

/** Every role's Siteyard look, in ROLES order (what tools/siteyard-export.ts writes). */
export const SITEYARD_ROLES: Record<string, SiteyardLook> = Object.fromEntries(Object.entries(ROLES).map(([r, l]) => [r, l.siteyard]));

export const ROLE_NAMES = Object.keys(ROLES);
export const TONES: Tone[] = ["light", "mid", "dark"];

// Hard hat: crown, the band under it (its own material), the brim. Front and back are symmetric; the
// side view pushes the brim past the face.
const HAT_FRONT = ["....LLYYYYYY....", "..LLYYYYYYYYSS..", ".LYYYYYYYYYYYSS.", ".AAAAAAAAAAAAAA.", "bbbbbbbbbbbbbbbb"];
const HAT_SIDE = ["....LLLYYY......", "..LLYYYYYYYY....", ".LYYYYYYYYYYS...", ".AAAAAAAAAAAAA..", "bbbbbbbbbbbbbbbb"];

/** Frame rectangle of the hat band in a facing: [x, y, w, h] with the head grid at (5, 3 + bob). */
export const BAND_RECT = (facing: "side" | "down" | "up", bob: number): [number, number, number, number] =>
  facing === "side" ? [5, 4 + bob, 13, 1] : [5, 4 + bob, 14, 1];

/** The skin of a role in a skin tone. */
export function roleSkin(role: string, tone: Tone): Skin {
  const look = ROLES[role];
  if (!look) throw new Error(`no role ${role}`);
  const skin = SKIN_TONES[tone];
  const materials: Record<string, Ramp> = {
    ...ISCI.materials,
    s: skin.s,
    x: skin.x,
    y: look.hat,
    band: typeof look.hat === "string" ? look.hat : look.hat[2]!,
    g: look.vest ?? HIVIS,
    w: ["#f6f7f8", "#d6dbe0", "#aab2bb", "#7f8893"], // reflective stripe
    n: ["#3f4f7a", "#2b3657", "#1e2640", "#141a2c"], // suit
    h: ["#ffffff", "#f0f2f4", "#c0cbdc", "#8b9bb4"], // shirt
    t: ["#ff6b6b", "#e43b44", "#a22633", "#6b1a22"], // tie
    o: look.suit ? ["#3a3a44", "#262630", "#1a1a22", "#101016"] : ISCI.materials["o"]!, // boots / shoes
  };
  const torso: Skin["torso"] = look.suit
    ? {
        base: "n",
        // The jacket open at the chest: shirt in a V, the tie down the middle.
        side: [".nnnnnhnn", "nnnnnhnnn", "nnnnntnnn", "nnnnntnnn", "nnnnnnnnn", "nnnnnnnnn", "nnnnnnnnn"],
        down: [".nnnhhhnnn", "nnnnhthnnn", "nnnnhthnnn", "nnnnntnnnn", "nnnnntnnnn", "nnnnnnnnnn", "nnnnnnnnnn"],
        up: [".nnnnnnnn.", "nnnnnnnnnn", "nnnnnnnnnn", "nnnnnnnnnn", "nnnnnnnnnn", "nnnnnnnnnn", "nnnnnnnnnn"],
      }
    : {
        base: "g",
        side: [".gggwgggg", "ggggwgggg", "ggggwgggg", "wwwwwwwww", "ggggggggg", "ggggggggg", "kkkkkkkkk"],
        down: [".gwgccgwg.", "cgwgccgwgc", "ggwggggwgg", "wwwwwwwwww", "gggggggggg", "gggggggggg", "kkkkkkkkkk"],
        up: [".gwggggwg.", "cgwggggwgc", "ggwggggwgg", "wwwwwwwwww", "gggggggggg", "gggggggggg", "kkkkkkkkkk"],
      };
  return {
    ...ISCI,
    name: `${role}_${tone}`,
    materials,
    torso,
    // Suit sleeves to the wrist; the workers' short shirt sleeves.
    arm: look.suit ? ["nn", "nn", "nn", "nn", "ss", "ss"] : ISCI.arm,
    leg: look.suit ? ["n", "n", "n", "n", "n", "n", "o", "o", "o"] : ISCI.leg,
    overlays: [
      {
        anchor: "head",
        z: "front",
        side: { x: -1, y: -2, rows: HAT_SIDE },
        down: { x: -1, y: -2, rows: HAT_FRONT },
        up: { x: -1, y: -2, rows: HAT_FRONT },
        legend: { L: ["y", 0], Y: ["y", 1], S: ["y", 2], A: ["band", 1], b: ["y", 2] },
      },
    ],
  };
}

/** Every role in every tone, by `<role>_<tone>`. */
export const ROLE_SKINS: Record<string, Skin> = Object.fromEntries(ROLE_NAMES.flatMap((r) => TONES.map((t) => [`${r}_${t}`, roleSkin(r, t)])));
