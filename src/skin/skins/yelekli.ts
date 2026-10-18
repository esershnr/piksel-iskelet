// "Yelekli işçi": the İşçi skin with a hi-vis vest over the shirt (reflective shoulder straps and a band
// across the chest); the sleeves stay shirt blue so the vest reads as a layer.

import type { Skin } from "../skin.ts";
import { ISCI } from "./isci.ts";

export const YELEKLI: Skin = {
  ...ISCI,
  name: "yelekli",
  materials: {
    ...ISCI.materials,
    g: ["#e6f57a", "#c4de3a", "#93ad22", "#6a7d18"], // hi-vis vest
    w: ["#f6f7f8", "#d6dbe0", "#aab2bb", "#7f8893"], // reflective stripe
  },
  torso: {
    base: "g",
    side: [".gggwgggg", "ggggwgggg", "ggggwgggg", "wwwwwwwww", "ggggggggg", "ggggggggg", "kkkkkkkkk"],
    // Open at the collar (shirt shows), shirt at the armholes.
    down: [".gwgccgwg.", "cgwgccgwgc", "ggwggggwgg", "wwwwwwwwww", "gggggggggg", "gggggggggg", "kkkkkkkkkk"],
    up: [".gwggggwg.", "cgwggggwgc", "ggwggggwgg", "wwwwwwwwww", "gggggggggg", "gggggggggg", "kkkkkkkkkk"],
  },
};
