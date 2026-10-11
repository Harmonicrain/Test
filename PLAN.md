# Sprite Forge: plan

A browser tool for building pixel-art characters out of swappable parts and exporting
them as complete 8-direction sprite sheets for a 2D isometric game. The art direction
follows the reference: chibi proportions (head about 1/3 of the height), dark selective
outlines, 4-tone hue-shifted shading, light from the top-left. The resolution is lower than
the reference, as requested.

## 1. Output

| Item              | Default                                                           |
| ----------------- | ----------------------------------------------------------------- |
| Frame size        | 32 × 48 px (also 32×56, 48×64, 64×64); character is grounded and centred |
| Directions        | 8: S, SE, E, NE, N, NW, W, SW (isometric facing)                    |
| Animations        | idle (4 frames), walk (8 frames), run (6 frames)                  |
| Sheet layout      | one row per direction, animations side by side in columns; or one row per animation × direction |
| Export            | PNG (1×, 2×, 4×, optional padding) + JSON atlas (TexturePacker "hash" format, works in Phaser, Pixi, Godot importers) with animation tags |
| Presets           | Character save/load as JSON; built-in example presets             |

## 2. How characters are drawn

Characters are not stored as bitmaps. Every part is code that draws onto a small pixel
grid, so a single part definition works in every direction and every animation frame.

1. **Rig**: for each (direction, frame) a pose gives the body anchor points: head centre,
   shoulders, hips, hand and foot positions. Walking moves the feet along the facing
   vector, swings the arms the opposite way and bobs the body.
2. **3D-aware parts**: the head is treated as a sphere. Hairstyles, hats, beards, eyes,
   ears and glasses are defined in head-local coordinates (forward / right / up) and
   projected for each yaw angle, which is how one hairstyle definition produces all 8 views.
   Limbs and torso use per-direction widths and depth ordering (far arm behind the torso,
   near arm in front).
3. **Masks, then shading**: every part first rasterises into a mask, then gets shaded with
   a 4-tone ramp (highlight, base, shadow, deep) using sphere or cylinder normals against
   a fixed top-left light. Ramps are generated from one picked colour with hue shifting
   (shadows lean cool, highlights lean warm).
4. **Outlines**: each part can outline its silhouette. Outer edges use the outline colour;
   edges inside the figure use a darkened tone of the part (selective outline). Styles:
   selective, black, coloured, none.
5. **Mirroring**: W, SW and NW are mirrored from E, SE and NE at the geometry stage,
   before shading, so the light stays on the same side in every direction.

## 3. Customisation

- **Body**: build (slim, average, broad, heavy), figure (straight, curvy), height, skin tone
- **Face**: eye style, eye colour, brows, nose, mouth, blush, freckles, facial hair
- **Hair**: 13 styles (bald, buzz, short, swept, messy bun, top bun, ponytail, pigtails,
  bob, long, afro, spiky, mohawk), colour
- **Outfit**: 12 tops (t-shirt, long sleeve, button-up, sweater, hoodie, tank, jacket, coat,
  tunic, dress, robe, none) with primary and secondary colour; bottoms (trousers, shorts,
  skirt, long skirt); footwear (shoes, boots, sneakers, sandals, barefoot)
- **Accessories**: hats (cap, beanie, headband, wizard), glasses (round, square,
  sunglasses), earrings, back item (backpack, cape)
- **Style**: outline mode and colour
- Randomise with per-option locks

## 4. App

- Plain HTML, CSS and JavaScript, no build step, no dependencies. Open `index.html`.
- Left: grouped option controls. Centre: large animated preview with an 8-way direction
  pad and animation picker, plus an all-directions strip. Right: the live sprite sheet and
  export settings.
- Isometric test floor: walk the character around a tile grid with WASD or the arrow keys
  to check the sheet in context.

## 5. Code layout

```
index.html
css/style.css
js/color.js     colour maths, ramp generation
js/raster.js    Mask (shape rasteriser) and Frame (shading, outlines, compositing)
js/catalog.js   option lists, palettes, presets
js/head.js      head, face, hair, hats, glasses, earrings
js/body.js      rig, poses, torso, arms, legs, clothing, back items, frame assembly
js/sheet.js     animation table, sheet builder, atlas JSON
js/ui.js        controls, preview, export, presets
js/iso.js       isometric test floor
```

## 6. Extending

New parts are entries in the catalog plus a draw function. Hairstyles are mostly a
predicate over head-local coordinates, so a new style is usually a few lines.
New animations are a pose function in `js/sheet.js`.
