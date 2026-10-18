// The props this template draws (props.ts has the model). Every grid is fill only in the prop letters
// (digit light, upper case base, lower case shade; 'e' a drawn line) and names the cell the holding
// hand's top-left pixel sits on. Side views face right; a grid drawn for the screen-left hand of the
// front view serves the other hand through `flip`. Handles are 1 px of fill and get their 1-px outline
// from paint(); nothing ends in a single pixel that sticks out of the silhouette on one row.
//
// The hand is 2x2 and is painted over the grip and the cell below it, with its own outline around,
// so a handle needs 4 cells past the grip for 2 to show. A hanging tool is gripped one cell down its
// handle (a pixel of handle shows above the fist and the tool clears the boots). Small things held
// from below (glass, handset) are `overHand`: their bottom row sits on the hand's top row.
//
// Orientation names are shared across facings where the orientation makes sense: "down" hangs from the
// hand, "up" is raised above it, "fwd" points ahead (side views), "flat" lies across the screen (front
// and back views), "hold" is the one natural way to hold a small thing.

import { flipView, type Prop, type PropView } from "../../props.ts";

// Hammer: steel head on a wooden handle. Hanging and raised look the same from every facing; the
// strike is "fwd" from the side and "flat" from the front and the back, the head toward the midline
// for the near hand (screen left facing down, screen right facing up; the far hand flips it).
const HAMMER_DOWN = { rows: [".W.", ".W.", ".W.", ".W.", ".W.", ".W.", "1MM", "Mmm"], grip: { x: 1, y: 1 } };
const HAMMER_UP = { rows: ["1MM", "Mmm", ".W.", ".W.", ".W.", ".W.", ".W."], grip: { x: 1, y: 6 } };
const HAMMER_FWD = { rows: [".....1M", "WWWWWMm", ".....mm"], grip: { x: 0, y: 1 } };
// Raised from the side the handle leans ahead so the head clears the face (a vertical handle would
// put the head on the hat); the fist is at the chin (HANDS.raise).
const HAMMER_UP_SIDE = { rows: [".....1MM", ".....Mmm", "....W...", "...W....", "..W.....", ".W......", "W......."], grip: { x: 0, y: 6 } };
// Wound up from the side (HANDS.windup): the handle leans back over the shoulder, the head clears the
// back of the head. Front and back views wind up with the plain raised hammer.
const HAMMER_BACK_SIDE = { rows: ["1MM.....", "Mmm.....", "...W....", "....W...", ".....W..", "......W.", ".......W"], grip: { x: 7, y: 6 } };
const HAMMER: Prop = {
  name: "hammer",
  views: {
    side: { down: HAMMER_DOWN, up: HAMMER_UP_SIDE, back: HAMMER_BACK_SIDE, fwd: HAMMER_FWD },
    down: { down: HAMMER_DOWN, up: HAMMER_UP, back: HAMMER_UP, flat: HAMMER_FWD },
    up: { down: HAMMER_DOWN, up: HAMMER_UP, back: HAMMER_UP, flat: flipView(HAMMER_FWD) },
  },
};

// One brick, held from below: the fingers over its near bottom corner, the brick ahead of the hand
// (from the side, clear of the fist's outline). One-handed grids are drawn for the screen-left hand;
// the back view's near hand is screen right, so it takes the mirror (the brick then points in, and
// hides behind the body as it should).
const BRICK_HOLD = { rows: ["4RRR", "RRrr"], grip: { x: -1, y: 1 } };
const BRICK: Prop = {
  name: "brick",
  views: { side: { hold: { ...BRICK_HOLD, grip: { x: -2, y: 1 } } }, down: { hold: BRICK_HOLD }, up: { hold: flipView(BRICK_HOLD) } },
};

// A stack of bricks carried at the chest, three courses with mortar joints, the hands under its two
// ends. From behind the stack is wider than the body so its ends show beside it, the hands below them.
const BRICKS: Prop = {
  name: "bricks",
  views: {
    side: { carry: { rows: ["4RRR", "RRRr", "oooo", "RRoR", "RRor"], grip: { x: -2, y: 4 }, grip2: { x: -1, y: 4 } } },
    down: {
      carry: {
        rows: ["4RRRoRRRRoRR", "RRRRoRRRRoRr", "oooooooooooo", "RRoRRRRoRRRR", "RRoRRRRoRRRr"],
        grip: { x: 0, y: 4 },
        grip2: { x: 10, y: 4 },
      },
    },
    up: {
      carry: {
        rows: ["4RRRoRRRRoRRRRoRRR", "RRRRoRRRRoRRRRoRRr", "oooooooooooooooooo", "RRoRRRRoRRRRoRRRRo", "RRoRRRRoRRRRoRRRRr"],
        grip: { x: 13, y: 5 },
        grip2: { x: 3, y: 5 },
      },
    },
  },
};

// Trowel: a wooden handle in the fist, the steel blade below it. "fwd" (side) and "flat" (front, back)
// point the blade level out of the fist, ahead or across toward the midline.
const TROWEL_DOWN = { rows: [".W..", ".W..", ".W..", ".W..", "1MMM", "MMmm", ".Mm."], grip: { x: 1, y: 1 } };
const TROWEL_FLAT = { rows: ["WWW1MMMM", "...mmmmm"], grip: { x: 0, y: 0 } };
// The same with a lump of mortar on the blade (bricklaying).
const TROWEL_LOAD = { rows: ["....ooo.", "WWW1MMMM", "...mmmmm"], grip: { x: 0, y: 1 } };
const TROWEL: Prop = {
  name: "trowel",
  views: {
    side: { down: TROWEL_DOWN, fwd: TROWEL_FLAT, load: TROWEL_LOAD },
    down: { down: TROWEL_DOWN, flat: TROWEL_FLAT, load: TROWEL_LOAD },
    up: { down: TROWEL_DOWN, flat: flipView(TROWEL_FLAT), load: flipView(TROWEL_LOAD) },
  },
};

// Shovel, two hands on the shaft. Side: "dig" runs from the hands down ahead into the ground, "lift"
// brings the blade up ahead with earth on it, "dump" tips it so the earth falls, "empty" is the raised
// blade bare. Front: the shaft slants from the upper hand to the blade at the feet ("dig") or across
// the body, the blade up at the far shoulder; the back view mirrors these, so what stays outside the
// body (the blade at the feet) shows on the same side as from the front.
const SHOVEL_DIG_FRONT = {
  rows: ["......W", ".....W.", ".....W.", "....W..", "....W..", "...W...", "...W...", "..W....", "..W....", ".W.....", "1MM....", "MMm....", "mmm...."],
  grip: { x: 3, y: 5 },
  grip2: { x: 5, y: 1 },
};
// Lifted: the shaft lies almost level across the belly from the back hand at the hip to the front
// hand mid-shaft, the blade just past the body at waist height (beside it from the front, ahead of it
// from the side); the earth rides on the blade and falls off beyond it.
const SHOVEL_EMPTY_FRONT = {
  rows: ["1MMM..........", "MMMmWWW.......", "mmmm...WWW....", "..........WWWW"],
  grip: { x: 5, y: 1 },
  grip2: { x: 11, y: 3 },
};
const SHOVEL_LIFT_FRONT = {
  rows: ["9Z............", "ZZZz..........", "1MMM..........", "MMMmWWW.......", "mmmm...WWW....", "..........WWWW"],
  grip: { x: 5, y: 3 },
  grip2: { x: 11, y: 5 },
};
const SHOVEL_DUMP_FRONT = {
  rows: ["1MMM..........", "MMMmWWW.......", "mmmm...WWW....", "Zz........WWWW", ".9Z..........."],
  grip: { x: 5, y: 1 },
  grip2: { x: 11, y: 3 },
};
const SHOVEL_DIG_SIDE = {
  rows: ["W......", ".W.....", ".W.....", "..W....", "..W....", "...W...", "...W...", "....W..", "....W..", "....1MM", "....MMm", "....mmm"],
  grip: { x: 1, y: 1 },
  grip2: { x: -1, y: -1 },
};
const SHOVEL_EMPTY_SIDE = {
  rows: ["..........1MMM", ".......WWWMMMm", "....WWW...mmmm", ".WWW.........."],
  grip: { x: 5, y: 2 },
  grip2: { x: 1, y: 3 },
};
const SHOVEL_LIFT_SIDE = {
  rows: ["...........9Z.", "..........ZZZz", "..........1MMM", ".......WWWMMMm", "....WWW...mmmm", ".WWW.........."],
  grip: { x: 5, y: 4 },
  grip2: { x: 1, y: 5 },
};
const SHOVEL_DUMP_SIDE = {
  rows: ["..........1MMM", ".......WWWMMMm", "....WWW...mmmm", ".WWW........Zz", "...........9Z."],
  grip: { x: 5, y: 2 },
  grip2: { x: 1, y: 3 },
};
const SHOVEL: Prop = {
  name: "shovel",
  views: {
    side: { dig: SHOVEL_DIG_SIDE, lift: SHOVEL_LIFT_SIDE, dump: SHOVEL_DUMP_SIDE, empty: SHOVEL_EMPTY_SIDE },
    down: { dig: SHOVEL_DIG_FRONT, lift: SHOVEL_LIFT_FRONT, dump: SHOVEL_DUMP_FRONT, empty: SHOVEL_EMPTY_FRONT },
    up: { dig: flipView(SHOVEL_DIG_FRONT), lift: flipView(SHOVEL_LIFT_FRONT), dump: flipView(SHOVEL_DUMP_FRONT), empty: flipView(SHOVEL_EMPTY_FRONT) },
  },
};

// Paint roller: a painted sleeve on a steel frame at its near end, short wooden handle; raised to the
// wall ahead or rolled low.
const ROLLER_UP = { rows: ["7UUUu", "UUUuu", "M....", "W....", "W....", "W...."], grip: { x: 0, y: 5 } };
const ROLLER_UP_SIDE = { rows: ["....7UUUu", "....UUUuu", "...M.....", "..W......", ".W.......", "W........"], grip: { x: 0, y: 5 } };
const ROLLER_DOWN = { rows: ["W....", "W....", "W....", "W....", "M....", "7UUUu", "UUUuu"], grip: { x: 0, y: 1 } };
// Level, the sleeve ahead of the fist at the end of the handle (mid-wall).
const ROLLER_FWD = { rows: ["....7UU", "WWWMUUu", "....Uuu"], grip: { x: 0, y: 1 } };
const ROLLER: Prop = {
  name: "roller",
  views: {
    side: { up: ROLLER_UP_SIDE, down: ROLLER_DOWN, fwd: ROLLER_FWD },
    down: { up: ROLLER_UP, down: ROLLER_DOWN, flat: ROLLER_FWD },
    up: { up: flipView(ROLLER_UP), down: flipView(ROLLER_DOWN), flat: flipView(ROLLER_FWD) },
  },
};

// Radio handset: grey body with a red LED and a stub antenna, held from below at the face. It stands a
// row above the hand, so its outline covers the fingers' top row and the bottom row shows under it.
const RADIO_HOLD = { rows: ["d.", "d.", "6D", "xD", "DD", "Dd"], grip: { x: 0, y: 6 }, overHand: true };
const RADIO: Prop = {
  name: "radio",
  views: { side: { hold: RADIO_HOLD }, down: { hold: RADIO_HOLD }, up: { hold: flipView(RADIO_HOLD) } },
};

// Tea glass: clear rim, dark tea, a glass base, held from below. Facing the camera it is held by its
// side, the hand on the outer side sharing one outline column with it: raised to the mouth the glass
// covers the mouth while the hand stays below the eye (held from below it hid an eye).
const TEA_HOLD = { rows: ["5gg", "CCc", "CCc", "CCc", "ggg"], grip: { x: 0, y: 4 }, overHand: true };
const TEA_FRONT = { rows: ["...5gg", "...CCc", "...CCc", "...CCc", "...ggg"], grip: { x: 0, y: 2 } };
const TEA: Prop = {
  name: "tea",
  views: { side: { hold: TEA_HOLD }, down: { hold: TEA_FRONT }, up: { hold: flipView(TEA_FRONT) } },
};

// Plan sheet in two hands: ruled paper facing the reader, its edge ahead of the hands from the side,
// its blank back wider than the body from behind with the hands below it. Facing the camera it spans
// the torso under the chin, the hands over its bottom corners, and leaves the lower vest showing.
const PLAN: Prop = {
  name: "plan",
  views: {
    side: { hold: { rows: ["3N", "NN", "NN", "NN", "NN", "nn"], grip: { x: -1, y: 4 }, grip2: { x: -1, y: 4 } } },
    down: {
      hold: {
        rows: ["3NNNNNNNNN", "NiiiNNiiiN", "NiiiiiNNNn", "nnnnnnnnnn"],
        grip: { x: -1, y: 3 },
        grip2: { x: 9, y: 3 },
      },
    },
    up: {
      hold: {
        rows: ["3NNNNNNNNNNNNNNN", "NNNNNNNNNNNNNNNN", "NNNNNNNNNNNNNNNN", "NNNNNNNNNNNNNNNN", "NNNNNNNNNNNNNNNn", "nnnnnnnnnnnnnnnn"],
        grip: { x: 12, y: 5 },
        grip2: { x: 2, y: 5 },
      },
    },
  },
};

// Clipboard in one hand at the chest: paper on a board with a steel clip on top (hidden from behind).
const CLIPBOARD_FACE = { rows: [".MM..", "3NNNN", "NiiNN", "NNNNN", "NiiiN", "nnnnn"], grip: { x: 0, y: 4 } };
const CLIPBOARD: Prop = {
  name: "clipboard",
  views: {
    side: { hold: { rows: ["M", "N", "N", "N", "N", "n"], grip: { x: -1, y: 4 } } },
    down: { hold: CLIPBOARD_FACE },
    up: { hold: flipView(CLIPBOARD_FACE) },
  },
};

// Tape measure: a yellow case with a steel lip, held in both hands ("hold"); "run" has the blade drawn
// out from the case (far hand, at the chest) to the near hand. From the side the near fist goes up
// ahead and the blade runs up to it (measuring up a wall); facing the camera the near hand is out to
// the side and the blade crosses the chest.
const TAPE_HOLD = { rows: ["8YYY", "YYYy", "Myyy"], grip: { x: 0, y: 3 }, grip2: { x: 2, y: 3 } };
const TAPE_RUN_SIDE = { rows: ["M...", "M...", "M...", "M...", "M...", "8YYY", "YYYy", "Myyy"], grip: { x: 0, y: 0 }, grip2: { x: -2, y: 5 }, overHand: true };
const TAPE_RUN_FRONT = { rows: ["..........8YYY", "MMMMMMMMMMYYYy", "..........Myyy"], grip: { x: 0, y: 1 }, grip2: { x: 10, y: 3 } };
const TAPE: Prop = {
  name: "tape",
  views: {
    side: { hold: { ...TAPE_HOLD, grip: { x: -3, y: 0 }, grip2: { x: -3, y: 0 } }, run: TAPE_RUN_SIDE },
    down: { hold: TAPE_HOLD, run: TAPE_RUN_FRONT },
    up: { hold: flipView(TAPE_HOLD), run: flipView(TAPE_RUN_FRONT) },
  },
};

// Welding mask, worn on the head (hand "head": the grip lands on the head grid origin). Side: a steel
// visor over the front of the face with a dark glass slit; front: the whole face plate; back: the strap.
const MASK: Prop = {
  name: "mask",
  views: {
    side: { on: { rows: ["MMMMM", "MMMMm", "MMMMm", "vvvMm", "MMMMm", "MMMMm", "mmmmm"], grip: { x: -9, y: -4 } } },
    down: { on: { rows: ["MMMMMMMMMMMM", "MMMMMMMMMMMm", "MvvvvMMvvvvm", "MMMMMMMMMMMm", "MMMMMMMMMMMm", "MMMMMMMMMMMm", "mmmmmmmmmmmm"], grip: { x: -1, y: -4 } } },
    up: { on: { rows: ["666666666666"], grip: { x: -1, y: -4 } } },
  },
};

// Welding torch: a short grey handle in the fist, the steel nozzle and the flame at its tip. From the
// side the nozzle slants down ahead past the planted boot; from the front it points down.
const TORCH_SIDE = { rows: ["6D...", "DD...", ".Mm..", "..Mm.", "...Ss"], grip: { x: 0, y: 0 } };
const TORCH_FRONT = { rows: ["6D", "DD", "DD", "Mm", "Ss"], grip: { x: 0, y: 1 } };
const TORCH_SIDE_OFF = { ...TORCH_SIDE, rows: TORCH_SIDE.rows.slice(0, -1) };
const TORCH_FRONT_OFF = { ...TORCH_FRONT, rows: TORCH_FRONT.rows.slice(0, -1) };
const TORCH: Prop = {
  name: "torch",
  views: {
    side: { hold: TORCH_SIDE, off: TORCH_SIDE_OFF },
    down: { hold: TORCH_FRONT, off: TORCH_FRONT_OFF },
    up: { hold: flipView(TORCH_FRONT), off: flipView(TORCH_FRONT_OFF) },
  },
};

// Sparks around the weld point at the flame, two phases, no outline. Pinned to the torch hand and
// placed clear of the boot: ahead of the toe from the side, outside the leg from the front.
const SPARK_ROWS = { a: [".s.S.", "S...s", "..f.."], b: ["s...S", ".S.s.", "f...f"] };
const sparks = (phase: "a" | "b", grip: { x: number; y: number }): PropView => ({ rows: SPARK_ROWS[phase], grip, outline: false });
const SPARKS: Prop = {
  name: "sparks",
  views: {
    side: { a: sparks("a", { x: -3, y: -3 }), b: sparks("b", { x: -3, y: -3 }) },
    down: { a: sparks("a", { x: 2, y: -4 }), b: sparks("b", { x: 2, y: -4 }) },
    up: { a: flipView(sparks("a", { x: 2, y: -4 })), b: flipView(sparks("b", { x: 2, y: -4 })) },
  },
};

// Wheelbarrow, pushed with both hands on the handles, the wheel on the ground; its spokes alternate
// between two phases ("a", "b") as it rolls. Side: ahead of the body; front: in front of the legs,
// the wheel between the feet; back: hidden behind the body but for the tray's sides and legs.
// Side: the 4x4 wheel on the ground ahead under the tray's front, its rim highlight swapping
// diagonals as it turns; the short rear legs hang off the ground while it is pushed. Front: the tray
// over the legs, the wheel below it between the feet. Back: only the tray's sides past the hips.
const cartSide = (phase: "a" | "b"): PropView => {
  const [s0, s1] = phase === "a" ? ["D6dD", "Dd6D"] : ["Dd6D", "D6dD"];
  return {
    rows: ["..1MMMMM.", "WWMMMMMMm", "..mMMMMm.", "...mmmm..", "D...D....", "D...D....", "....DD...", `...${s0}..`, `...${s1}..`, "....DD..."],
    grip: { x: 0, y: 1 },
    grip2: { x: 0, y: 1 },
  };
};
const cartFront = (phase: "a" | "b"): PropView => {
  const [w0, w1, w2] = phase === "a" ? ["DdD", "d6d", "DdD"] : ["dDd", "D6D", "dDd"];
  return {
    rows: ["W.........W", ".1MMMMMMMM.", "MMMMMMMMMMM", "MMMMMMMMMMm", ".....D.....", `....${w0}....`, `....${w1}....`, `....${w2}....`],
    grip: { x: 0, y: 0 },
    grip2: { x: 10, y: 0 },
  };
};
const cartBack = (): PropView => ({
  rows: ["..W.........W...", "1MMMMMMMMMMMMMMM", "MMMMMMMMMMMMMMMm", "MMMMMMMMMMMMMMMm", "mmmmmmmmmmmmmmmm"],
  grip: { x: 12, y: 0 },
  grip2: { x: 2, y: 0 },
});
const CART: Prop = {
  name: "cart",
  views: {
    side: { a: cartSide("a"), b: cartSide("b") },
    down: { a: cartFront("a"), b: cartFront("b") },
    up: { a: cartBack(), b: cartBack() },
  },
};

// Pen in the fist, point down ahead (writing): yellow cap above the fist, dark body, steel tip below.
// Facing the camera the 2x2 fist's outline hides the cap, and the cap's own outline was left as a bump
// (a pinhole against the shoulder), so those views have no cap.
const PEN_HOLD = { rows: ["Y", "D", "D", "D", "M"], grip: { x: 0, y: 1 } };
const PEN_FRONT = { rows: ["D", "D", "D", "M"], grip: { x: 0, y: 0 } };
const PEN: Prop = {
  name: "pen",
  views: { side: { hold: PEN_HOLD }, down: { hold: PEN_FRONT }, up: { hold: PEN_FRONT } },
};

// Sleep: a small and a big "z" over the head (pale, no outline), pinned to the head grid origin.
const ZZZ_SMALL = { rows: ["333", "..3", ".3.", "333"], grip: { x: -13, y: 2 }, outline: false as const };
const ZZZ_BIG = { rows: ["3333", "...3", "..3.", ".3..", "3333"], grip: { x: -15, y: 4 }, outline: false as const };
const ZZZ: Prop = {
  name: "zzz",
  views: {
    side: { small: ZZZ_SMALL, big: ZZZ_BIG },
    down: { small: ZZZ_SMALL, big: ZZZ_BIG },
    up: { small: ZZZ_SMALL, big: ZZZ_BIG },
  },
};

export const PROPS = {
  hammer: HAMMER,
  brick: BRICK,
  bricks: BRICKS,
  trowel: TROWEL,
  shovel: SHOVEL,
  roller: ROLLER,
  radio: RADIO,
  tea: TEA,
  plan: PLAN,
  clipboard: CLIPBOARD,
  tape: TAPE,
  mask: MASK,
  torch: TORCH,
  sparks: SPARKS,
  cart: CART,
  pen: PEN,
  zzz: ZZZ,
} as const satisfies Record<string, Prop>;
