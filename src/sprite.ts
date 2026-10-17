// Letter canvas: every pixel is one symbolic letter ('.' transparent) that a palette (mannequin, part
// map) resolves to a color. Parts are painted back to front; each part draws its own 1-px outline around
// its fill, so a near limb is always separated from whatever it overlaps.
//
// Besides its letter, every painted pixel remembers which body part it belongs to and where inside that
// part it sits (u, v). That is the skeleton's UV map: a skin colors a frame by looking (part, u, v) up in
// its own textures, so one texture dresses every frame of every animation.

export const EMPTY = ".";
export const OUTLINE = "e";

/** A painted pixel: its letter (part + tone), the part it belongs to and its texture coordinates. */
export interface Px {
  ch: string;
  part: string;
  u: number;
  v: number;
}

/** A part's fill before it is painted: pixel index (y * w + x) -> pixel. */
export type Fill = Map<number, Px>;

export class Sprite {
  readonly w: number;
  readonly h: number;
  readonly px: string[];
  /** Per pixel: the painted Px (outlines carry their part with u = v = -1), null where transparent. */
  readonly info: (Px | null)[];

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.px = Array.from({ length: w * h }, () => EMPTY);
    this.info = Array.from({ length: w * h }, () => null);
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  get(x: number, y: number): string {
    return this.inside(x, y) ? this.px[y * this.w + x]! : EMPTY;
  }

  at(x: number, y: number): Px | null {
    return this.inside(x, y) ? this.info[y * this.w + x]! : null;
  }

  rows(): string[] {
    const out: string[] = [];
    for (let y = 0; y < this.h; y++) out.push(this.px.slice(y * this.w, (y + 1) * this.w).join(""));
    return out;
  }

  /** Left-right mirror (facing left from facing right); u, v travel with their pixels. */
  mirrored(): Sprite {
    const m = new Sprite(this.w, this.h);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const i = y * this.w + x;
        const j = y * this.w + (this.w - 1 - x);
        m.px[j] = this.px[i]!;
        m.info[j] = this.info[i]!;
      }
    return m;
  }
}

export interface PaintOptions {
  /** May the outline cover this existing letter? Default: always. */
  outlineOver?: (under: string) => boolean;
}

/** Paints a fill, then its 4-connected outline on the pixels around it. */
export function paint(s: Sprite, fill: Fill, opts: PaintOptions = {}): void {
  for (const [i, p] of fill) {
    s.px[i] = p.ch;
    s.info[i] = p;
  }
  const over = opts.outlineOver ?? (() => true);
  for (const [i, p] of fill) {
    const x = i % s.w;
    const y = (i - x) / s.w;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (!s.inside(nx, ny)) continue;
      const j = ny * s.w + nx;
      if (fill.has(j)) continue;
      if (!over(s.px[j]!)) continue;
      s.px[j] = OUTLINE;
      s.info[j] = { ch: OUTLINE, part: p.part, u: -1, v: -1 };
    }
  }
}

/**
 * Drops outline pixels that no longer touch any fill (4-neighbours): leftovers of a part that is now
 * hidden behind another, which otherwise show up as doubled outlines.
 */
export function cleanOutlines(s: Sprite): void {
  const drop: number[] = [];
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++) {
      if (s.get(x, y) !== OUTLINE) continue;
      const touches = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        const n = s.get(x + dx!, y + dy!);
        return n !== EMPTY && n !== OUTLINE;
      });
      if (!touches) drop.push(y * s.w + x);
    }
  for (const i of drop) {
    s.px[i] = EMPTY;
    s.info[i] = null;
  }
}

/** Fill from a text grid ('.' skipped) placed at (x, y); u, v are the grid's own column and row. */
export function gridFill(w: number, rows: string[], x: number, y: number, h: number, part: string): Fill {
  const f: Fill = new Map();
  rows.forEach((row, ry) => {
    [...row].forEach((ch, rx) => {
      const px = x + rx;
      const py = y + ry;
      if (ch === EMPTY || px < 0 || py < 0 || px >= w || py >= h) return;
      f.set(py * w + px, { ch, part, u: rx, v: ry });
    });
  });
  return f;
}
