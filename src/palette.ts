// Letter -> color maps. A palette is the simplest skin: the mannequin palette shows the skeleton as a
// grey figure, the part map gives every body part its own hue so overlaps and limb order are readable.

export type RGB = [number, number, number];
export type Palette = Record<string, RGB>;

export function hex(s: string): RGB {
  const n = parseInt(s.replace("#", ""), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

const OUTLINE = hex("#2f2433");

export const MANNEQUIN: Palette = {
  e: OUTLINE,
  G: hex("#e4ddd3"),
  H: hex("#c4bbaf"),
  h: hex("#9a9086"),
  T: hex("#bbb2a6"),
  t: hex("#8f857b"),
  A: hex("#c9c0b4"),
  a: hex("#9d9389"),
  P: hex("#d6cec3"),
  B: hex("#8a8077"),
  b: hex("#6c635b"),
  Q: hex("#968c82"),
  L: hex("#b5ab9f"),
  l: hex("#8c8278"),
  F: hex("#6f665d"),
  K: hex("#857b72"),
  k: hex("#655d56"),
  J: hex("#4f4842"),
};

export const PART_MAP: Palette = {
  e: OUTLINE,
  G: hex("#ffd9bf"),
  H: hex("#f0b48f"),
  h: hex("#c98566"),
  T: hex("#5b8dd6"),
  t: hex("#3f66a8"),
  A: hex("#f2d34f"),
  a: hex("#c9a92f"),
  P: hex("#ffefb0"),
  B: hex("#a8902e"),
  b: hex("#7f6c1f"),
  Q: hex("#c4b06a"),
  L: hex("#5fbf66"),
  l: hex("#3f9447"),
  F: hex("#2f6d36"),
  K: hex("#3d8045"),
  k: hex("#2c5f33"),
  J: hex("#1f4425"),
};

export const MISSING: RGB = [255, 0, 255];
