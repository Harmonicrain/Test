# Sprite Forge

A character creator for Pixel City that builds complete 8-direction sprite sheets for the
game's fixed 2:1 isometric camera (64 × 32 floor tiles). Pick a body, face, hair, outfit and
accessories, preview every direction and animation live, walk the result around an
isometric test floor, then export a PNG sheet and a JSON atlas.

Plain HTML, CSS and JavaScript with no dependencies and no build step.

## Run it

Open `index.html` in a browser. Everything runs locally. To serve it instead:

```sh
npx http-server -p 8080 .
```

## Output

| Setting      | Default                                                                 |
| ------------ | ----------------------------------------------------------------------- |
| Frame        | 48 × 72 px, character about 26 × 56 px. Padded 64 × 80 and 64 × 96 are also available |
| Pivot        | Feet, 5 px above the bottom of the frame (`pivot` in the atlas)          |
| Directions   | S, SE, E, NE, N, NW, W, SW. W, SW and NW are mirrored from E, SE and NE  |
| Animations   | idle (4 frames, 5 fps), walk (8 frames, 10 fps), run (6 frames, 14 fps)  |
| Layout       | One row per direction with animations side by side, or one row per animation and direction |
| Scale        | 1×, 2×, 3× or 4×, with optional 1–2 px padding                           |

Directions follow the game's camera guide: SE is world +X (screen +32, +16), SW is world +Y
(screen −32, +16), and E and W run along the screen horizontal. Walk cycles step the feet in
depth along the facing direction, so diagonal walks track the tile edges.

### Atlas JSON

The JSON is in the TexturePacker "hash" format, which Phaser, Pixi and most engine importers
read directly. Frame names are `anim_DIR_index`, for example `walk_SE_3`. An extra
`animations` map lists the frame names for every animation and direction, and
`meta.frameTags` holds the frame counts and fps. `meta.character` stores the full character
settings, so an exported atlas can be loaded back into the editor with **Load character**.

Phaser 3:

```js
// preload()
this.load.atlas('mara', 'mara-finch_sheet.png', 'mara-finch_sheet.json');

// create()
for (const dir of ['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW']) {
  this.anims.create({
    key: `walk_${dir}`,
    frames: this.anims.generateFrameNames('mara', { prefix: `walk_${dir}_`, start: 0, end: 7 }),
    frameRate: 10,
    repeat: -1,
  });
}
const sprite = this.add.sprite(x, y, 'mara', 'idle_S_0');
sprite.setOrigin(0.5, 67.5 / 72); // feet on the tile point (48 x 72 frames)
sprite.play('walk_SE');
```

Godot 4: import the PNG, then build `SpriteFrames` from the frame rectangles in the JSON
(each rectangle is `frames[name].frame`). Set the sprite offset so the pivot lands on the
character's tile position.

### Example

`examples/mara-finch_sheet.png` and `examples/mara-finch_sheet.json` are Mara Finch exported
with the default settings (idle, walk and run, 1×, row per direction).

## Options

- **Body**: build, figure, height, skin tone
- **Face**: eyes (including closed happy eyes), eye colour, brows, nose, mouth, lip colour,
  blush or freckles, facial hair
- **Hair**: 13 styles (messy curly bun, top bun, short, side swept, buzz, ponytail, pigtails,
  bob, long, afro, spiky, mohawk, bald) and colour
- **Outfit**: blazer, t-shirt, long sleeve, button-up, sweater, hoodie, apron over tee, tank,
  long coat, belted tunic, dress, robe, or none; trousers, cuffed jeans, shorts, skirt, long
  skirt; shoes, sneakers, boots, sandals, barefoot
- **Accessories**: glasses, earrings (drops, hoops, studs), hats (cap, beanie, sun hat,
  headband, headscarf, wizard), a held item (clipboard, coffee cup, phone, book, plant, camera,
  microphone, wrench, vinyl record), a gold lapel badge, backpack or cape
- **Style**: outline mode (selective, black, coloured, none) and outline colour

Every option has a lock, so **Randomise** only changes what is unlocked. Presets cover the whole
cast: all 26 NPCs from the portrait sheet plus Maya from the cafe scene. Characters save and
load as JSON.

## How it draws

Characters are drawn by code, not stored as bitmaps, so one part definition works in every
direction and frame.

1. A rig places the head, shoulders, elbows, hands, hips, knees and feet for each direction
   and pose. Feet step along the facing vector with 2:1 ground foreshortening.
2. The head is a sphere seen by the fixed camera. Hairstyles, hats, beards, eyes, ears and
   glasses are written in head-local coordinates (forward, right, up) and projected for each
   facing.
3. Every part rasterises into a mask, then gets shaded with a 4-tone ramp generated from one
   colour (hue-shifted shadows and highlights, softer steps for skin), lit from the top left.
4. Parts outline themselves: dark on the silhouette, a darkened tone of the part inside it.
5. W, SW and NW mirror the geometry before shading, so the light stays on the same side.

## Code layout

```
index.html       page
css/style.css    editor styles
js/color.js      colour maths and ramp generation
js/raster.js     Mask (shape rasteriser) and Frame (shading, outlines, compositing)
js/catalog.js    option lists, palettes, presets, body builds
js/head.js       head, face, hair, hats, glasses, earrings
js/body.js       rig, torso, arms, legs, clothing, held and back items, frame assembly
js/sheet.js      animation poses, sheet layout, atlas JSON
js/ui.js         editor controls, preview, export
js/iso.js        isometric test floor
```

## Extending

- **Hairstyle**: add an entry to `HAIR` in `js/head.js`. Most styles are a `cap({ hairline,
  nape, front, ears })` predicate plus optional extras (`bun`, `ponytail`, `curtain`, `locks`,
  `curlLocks`, `spikes`). Then add its key to the `hair` options in `js/catalog.js`.
- **Top**: add an entry to `TOPS` in `js/body.js` (sleeve length, hem, flare, neckline, details).
- **Animation**: add a pose function to `ANIMS` in `js/sheet.js`. A pose sets `bob`, `breath`,
  `lean`, `sway`, per-leg `st` (stride) and `lift`, and per-arm swing.
- **Palette or preset**: edit `PALETTES` or `PRESETS` in `js/catalog.js`.
