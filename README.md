# piksel-iskelet

Pixel-art character skeletons. A template's mannequin is animated once; characters are skins that
dress it, so every character inherits the same walk without any frame being redrawn. Project-agnostic:
Siteyard is the first consumer, other games pick a template or add one.

Every pixel of a frame is a letter that names a body part and tone (`H` head, `L`/`K` near/far leg,
`e` outline...) and also remembers its part and UV (`u`, `v` inside that part). A palette turns
letters into colors (the mannequin and the part map are the first two); a skin turns UVs into
materials.

## Templates

| Template | Frame | View | Animations |
| --- | --- | --- | --- |
| `chibi24x32` | 24x32 | 3/4 top-down: side (left = mirrored right), down, up | `walk_side`, `walk_down`, `walk_up` (8 frames, 10 fps, 2 px/frame; front and back are the side walk projected), `idle_side`, `idle_down`, `idle_up` (4 frames, 4 fps) |

## Skins

A skin (`src/skin/skins/*.ts`) names materials (4-tone ramps) and places them:

- head and torso: one text grid per facing, aligned with that facing's mannequin grid;
- arm and leg: one strip shared by all facings, row = v along the limb (shoulder to hand, hip to foot);
- overlays for what leaves the silhouette (hair volume, hats), anchored to a part.

Tones come from the mannequin letters, so light and shade stay consistent across characters.

## Tools

```sh
node tools/preview.ts out                       # mannequin: GIF (x8, scrolling ground), strip (x6), 1x sheet
node tools/skin-preview.ts isci                 # a skin on every animation -> out/skins/isci/
node tools/aseprite-export.ts isci              # .aseprite with walk_right/left, idle_right/left... tags
node tools/compare-siteyard.ts ../siteyard      # Siteyard v1 walk next to the skeleton's walk
```

The ground ticks in the mannequin walk GIF scroll at the walk speed: a planted foot must stay on its tick.

Node 24+, no dependencies. `aseprite-export` needs Aseprite (Steam path or `ASEPRITE=<exe>`).
