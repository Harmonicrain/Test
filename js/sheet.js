// Animation poses, sprite sheet assembly and atlas metadata.
(function () {
  const SG = (window.SG = window.SG || {});

  // A pose: bob (upper body y offset), breath, legs[{st, lift}], arms[swing], sway (hair/cape).
  // Index 0 is the character's right limb.
  function gait(i, n, stride, lift, arm, bob) {
    const p = (i / n) * Math.PI * 2;
    const leg = (q) => ({ st: Math.round(Math.cos(q) * stride), lift: Math.round(Math.max(0, -Math.sin(q)) * lift) });
    const l0 = leg(p), l1 = leg(p + Math.PI);
    const passing = Math.abs(Math.cos(p)) < 0.5;
    return {
      bob: passing ? -bob : 0,
      legs: [l0, l1],
      arms: [Math.round(-Math.cos(p) * arm), Math.round(Math.cos(p) * arm)],
      sway: Math.round(Math.sin(p) * 1),
    };
  }

  const ANIMS = {
    idle: { frames: 4, fps: 5, pose: (i) => ({ bob: 0, breath: i >= 2 ? 1 : 0, sway: 0 }) },
    walk: { frames: 8, fps: 10, pose: (i, n) => gait(i, n, 5, 3, 3.5, 1) },
    run: { frames: 6, fps: 14, pose: (i, n) => ({ ...gait(i, n, 7, 5, 5, 2), lean: 1, sway: Math.round(Math.sin((i / n) * Math.PI * 2) * 2) }) },
  };

  const DIR_ORDERS = {
    'S, SE, E, NE, N, NW, W, SW': ['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW'],
    'S, SW, W, NW, N, NE, E, SE': ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'],
    'E, SE, S, SW, W, NW, N, NE': ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'],
  };

  // Renders every frame once: frames[anim][dir][i] = ImageData
  function renderAll(cfg, opts) {
    const out = {};
    for (const a of opts.anims) {
      const def = ANIMS[a];
      out[a] = {};
      for (const d of SG.DIRS) {
        out[a][d] = [];
        for (let i = 0; i < def.frames; i++) {
          out[a][d].push(SG.body.renderFrame(cfg, d, def.pose(i, def.frames), opts.fw, opts.fh).toImageData());
        }
      }
    }
    return out;
  }

  // Lays frames out, returns { canvas, meta }.
  function buildSheet(cfg, frames, opts) {
    const { fw, fh, pad = 0, scale = 1, layout = 'dir-rows' } = opts;
    const dirs = DIR_ORDERS[opts.dirOrder] || SG.DIRS;
    const anims = opts.anims;
    const cells = []; // {anim, dir, i, col, row}
    if (layout === 'dir-rows') {
      dirs.forEach((d, row) => {
        let col = 0;
        for (const a of anims) for (let i = 0; i < ANIMS[a].frames; i++) cells.push({ anim: a, dir: d, i, col: col++, row });
      });
    } else {
      let row = 0;
      for (const a of anims) for (const d of dirs) {
        for (let i = 0; i < ANIMS[a].frames; i++) cells.push({ anim: a, dir: d, i, col: i, row });
        row++;
      }
    }
    const cols = Math.max(...cells.map((c) => c.col)) + 1;
    const rows = Math.max(...cells.map((c) => c.row)) + 1;
    const cw = fw * scale + pad * 2, ch = fh * scale + pad * 2;
    const canvas = document.createElement('canvas');
    canvas.width = cols * cw;
    canvas.height = rows * ch;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const tmp = document.createElement('canvas');
    tmp.width = fw; tmp.height = fh;
    const tctx = tmp.getContext('2d');

    const name = cfg.name || 'character';
    const metaFrames = {};
    for (const c of cells) {
      tctx.putImageData(frames[c.anim][c.dir][c.i], 0, 0);
      const x = c.col * cw + pad, y = c.row * ch + pad;
      ctx.drawImage(tmp, 0, 0, fw, fh, x, y, fw * scale, fh * scale);
      metaFrames[`${c.anim}_${c.dir}_${c.i}`] = {
        frame: { x, y, w: fw * scale, h: fh * scale },
        rotated: false, trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: fw * scale, h: fh * scale },
        sourceSize: { w: fw * scale, h: fh * scale },
        pivot: { x: 0.5, y: (fh - SG.FRAME.pivotFromBottom + 0.5) / fh },
      };
    }
    const animations = {};
    for (const a of anims) for (const d of dirs) {
      animations[`${a}_${d}`] = Array.from({ length: ANIMS[a].frames }, (_, i) => `${a}_${d}_${i}`);
    }
    const meta = {
      frames: metaFrames,
      animations,
      meta: {
        app: 'Sprite Forge',
        version: '1.0',
        image: `${name}_sheet.png`,
        format: 'RGBA8888',
        size: { w: canvas.width, h: canvas.height },
        scale: String(scale),
        frameSize: { w: fw * scale, h: fh * scale },
        padding: pad,
        layout,
        directions: dirs,
        frameTags: anims.map((a) => ({ name: a, frames: ANIMS[a].frames, fps: ANIMS[a].fps, loop: true })),
        character: cfg,
      },
    };
    return { canvas, meta, cols, rows };
  }

  SG.sheet = { ANIMS, DIR_ORDERS, renderAll, buildSheet };
})();
