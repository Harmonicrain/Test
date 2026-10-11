// Isometric test floor, drawn as true pixel art: 64 x 32 tiles with 2:1 staircase edges,
// the same fixed camera as the game (SE = world +X = screen (+32, +16), SW = world +Y),
// whole-pixel positions, and integer display scaling so nothing shimmers.
(function () {
  const SG = (window.SG = window.SG || {});
  const TW = 64, TH = 32, N = 6;
  const VIEW_W = 448, VIEW_H = 300;
  const ORIGIN = [VIEW_W / 2, 74]; // screen position of the top corner of tile (0, 0)
  const EDGE = 6; // floor thickness in pixels
  const DIRV = { S: [1, 1], SW: [0, 1], W: [-1, 1], NW: [-1, 0], N: [-1, -1], NE: [0, -1], E: [1, -1], SE: [1, 0] };
  const SCREEN_ORDER = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE']; // by screen angle, 45 degree steps
  const OUTLINE = [29, 20, 36];

  let cv, ctx;
  let tiles, edges, props, shadow;
  const ch = { wx: 3, wy: 3, dir: 'S', moving: false, running: false, clock: 0, target: null };
  const keys = new Set();
  const cache = new WeakMap();

  // world -> screen, rounded once in screen space so motion along any direction is monotonic
  // (rounding the two world axes separately made the sprite hop sideways when walking N or S)
  function toScreen(wx, wy) {
    return [Math.round(ORIGIN[0] + ((wx - wy) * TW) / 2), Math.round(ORIGIN[1] + ((wx + wy) * TH) / 2)];
  }
  const toWorld = (sx, sy) => {
    const x = (sx - ORIGIN[0]) / (TW / 2), y = (sy - ORIGIN[1]) / (TH / 2);
    return [(x + y) / 2, (y - x) / 2];
  };

  // ---------------------------------------------------------------- pixel sprites
  function sprite(w, h, paint) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    const img = g.createImageData(w, h);
    const set = (x, y, rgb, a = 255) => {
      if (x < 0 || y < 0 || x >= w || y >= h) return;
      const k = (y * w + x) * 4;
      img.data[k] = rgb[0]; img.data[k + 1] = rgb[1]; img.data[k + 2] = rgb[2]; img.data[k + 3] = a;
    };
    paint(set);
    g.putImageData(img, 0, 0);
    return c;
  }
  const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

  // Half width of a 64 x 32 diamond on row y: 2 px wider per row, which gives a clean 2:1 edge.
  const halfW = (y) => (y < TH / 2 ? 2 * (y + 1) : 2 * (TH - y));

  // A wooden floor tile: four planks along world +X with staggered butt joints.
  function makeTile(variant) {
    const planks = ['#b47744', '#aa6d3b', '#b87c48', '#a66a38'].map(rgb);
    const seam = rgb('#7c4a27'), joint = rgb('#8e5730'), edge = rgb('#93592f'), hi = rgb('#c48a52');
    return sprite(TW, TH, (set) => {
      for (let y = 0; y < TH; y++) {
        const hw = halfW(y);
        for (let x = TW / 2 - hw; x < TW / 2 + hw; x++) {
          const sx = x + 0.5 - TW / 2, sy = y + 0.5;
          const wx = (sx / (TW / 2) + sy / (TH / 2)) / 2, wy = (sy / (TH / 2) - sx / (TW / 2)) / 2;
          const p = Math.min(3, Math.floor(wy * 4));
          let col = planks[(p + variant) % 4];
          if ((wy * 4) % 1 < 0.125) col = seam;
          const jx = 0.3 + 0.4 * ((p + variant) % 2);
          if (Math.abs(wx - jx) < 0.03) col = joint;
          if (col === planks[(p + variant) % 4] && ((wy * 4) % 1 > 0.85)) col = hi;
          set(x, y, col);
        }
        // the two upper edges trace the grid between neighbouring tiles
        set(TW / 2 - hw, y, edge);
        set(TW / 2 + hw - 1, y, edge);
        if (y < TH / 2) { set(TW / 2 - hw + 1, y, edge); set(TW / 2 + hw - 2, y, edge); }
      }
    });
  }

  // Floor thickness under the two front edges of a border tile.
  function makeEdge(side) {
    const face = rgb(side < 0 ? '#6e4426' : '#5a361d'), line = rgb('#3e2414');
    return sprite(TW / 2, TH / 2 + EDGE, (set) => {
      for (let i = 0; i < TW / 2; i++) {
        // left face runs down-right from the left corner; right face runs up-right to the right corner
        const top = side < 0 ? Math.floor(i / 2) : TH / 2 - 1 - Math.floor(i / 2);
        for (let k = 1; k <= EDGE; k++) set(i, top + k, k === EDGE ? line : face);
      }
    });
  }

  // A block standing on one tile: top diamond, two shaded side faces, dark outline.
  function makeBlock(height, top, left, right) {
    const w = 32, h = 16, H = height;
    const T = rgb(top), L = rgb(left), Rt = rgb(right), O = OUTLINE;
    const hw = (y) => (y < h / 2 ? 2 * (y + 1) : 2 * (h - y));
    return sprite(w + 2, h + H + 2, (set) => {
      const ox = 1, oy = 1;
      // side faces
      for (let x = 0; x < w; x++) {
        const half = x < w / 2;
        const yTop = h / 2 + (half ? Math.floor(x / 2) : Math.floor((w - 1 - x) / 2));
        for (let y = yTop; y < yTop + H; y++) set(ox + x, oy + y, half ? L : Rt);
      }
      // top face
      for (let y = 0; y < h; y++) for (let x = w / 2 - hw(y); x < w / 2 + hw(y); x++) set(ox + x, oy + y, T);
      // outline: trace the silhouette from the alpha we just painted
      const filled = new Set();
      for (let x = 0; x < w; x++) {
        const half = x < w / 2;
        const yTop = h / 2 + (half ? Math.floor(x / 2) : Math.floor((w - 1 - x) / 2));
        for (let y = 0; y < yTop + H; y++) {
          const inTop = y < h && x >= w / 2 - hw(y) && x < w / 2 + hw(y);
          if (inTop || y >= yTop) filled.add((ox + x) + ',' + (oy + y));
        }
      }
      for (const key of filled) {
        const [x, y] = key.split(',').map(Number);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (!filled.has((x + dx) + ',' + (y + dy))) set(x + dx, y + dy, O);
        }
      }
      // the top face's front edges catch a darker line, and the front vertical corner
      for (let x = 0; x < w; x++) {
        const half = x < w / 2;
        const y = h / 2 + (half ? Math.floor(x / 2) : Math.floor((w - 1 - x) / 2));
        set(ox + x, oy + y, O);
      }
      for (let y = h; y < h + H; y++) set(ox + w / 2, oy + y - 1, O);
    });
  }

  function makeShadow() {
    const w = 24, h = 9, a = 72;
    return sprite(w, h, (set) => {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const nx = (x + 0.5 - w / 2) / (w / 2), ny = (y + 0.5 - h / 2) / (h / 2);
        if (nx * nx + ny * ny <= 1) set(x, y, [20, 10, 22], a);
      }
    });
  }

  // ---------------------------------------------------------------- setup and input
  function init(canvas) {
    cv = canvas;
    cv.width = VIEW_W;
    cv.height = VIEW_H;
    ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    tiles = [makeTile(0), makeTile(1), makeTile(2), makeTile(3)];
    edges = { left: makeEdge(-1), right: makeEdge(1) };
    props = [
      { tx: 1, ty: 4, img: makeBlock(18, '#c08a58', '#8e5a32', '#74482a') },
      { tx: 4, ty: 1, img: makeBlock(12, '#6e9a52', '#4a6e38', '#3c5a2e') },
    ];
    shadow = makeShadow();

    const keyName = (e) => ({ ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' }[e.code]);
    cv.addEventListener('keydown', (e) => {
      const k = keyName(e);
      if (k) { keys.add(k); ch.target = null; e.preventDefault(); }
      ch.running = e.shiftKey;
    });
    cv.addEventListener('keyup', (e) => {
      const k = keyName(e);
      if (k) keys.delete(k);
      ch.running = e.shiftKey;
    });
    cv.addEventListener('blur', () => keys.clear());
    cv.addEventListener('pointerdown', (e) => {
      const r = cv.getBoundingClientRect();
      const sx = ((e.clientX - r.left) / r.width) * VIEW_W, sy = ((e.clientY - r.top) / r.height) * VIEW_H;
      const [wx, wy] = toWorld(sx, sy);
      ch.target = [clampW(wx), clampW(wy)];
      const dx = ch.target[0] - ch.wx, dy = ch.target[1] - ch.wy;
      if (Math.hypot(dx, dy) > 0.02) ch.dir = facing(((dx - dy) * TW) / 2, ((dx + dy) * TH) / 2);
      ch.running = e.shiftKey;
      cv.focus({ preventScroll: true });
    });
  }
  const clampW = (v) => Math.max(0.3, Math.min(N - 0.3, v));

  function facing(sx, sy) {
    const a = Math.atan2(sy, sx);
    return SCREEN_ORDER[((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8];
  }

  function update(dt) {
    const speed = ch.running ? 3.2 : 1.6; // tiles per second
    const kx = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0);
    const ky = (keys.has('down') ? 1 : 0) - (keys.has('up') ? 1 : 0);
    if (kx || ky) {
      const dir = facing(kx, ky);
      ch.dir = dir;
      ch.moving = true;
      const v = DIRV[dir], len = Math.hypot(v[0], v[1]);
      ch.wx = clampW(ch.wx + (v[0] / len) * speed * dt);
      ch.wy = clampW(ch.wy + (v[1] / len) * speed * dt);
      return;
    }
    if (ch.target) {
      // walk straight to the clicked spot. The facing is chosen once and only changes if the
      // heading drifts well away from it, so the sprite never flips between two facings.
      const dx = ch.target[0] - ch.wx, dy = ch.target[1] - ch.wy;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.02) { ch.target = null; ch.moving = false; return; }
      const sx = ((dx - dy) * TW) / 2, sy = ((dx + dy) * TH) / 2;
      const cur = (SCREEN_ORDER.indexOf(ch.dir) * Math.PI) / 4;
      const off = Math.abs(((Math.atan2(sy, sx) - cur + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
      if (off > 0.62) ch.dir = facing(sx, sy);
      const step = Math.min(dist, speed * dt);
      ch.wx += (dx / dist) * step;
      ch.wy += (dy / dist) * step;
      ch.moving = true;
      return;
    }
    ch.moving = false;
  }

  // ---------------------------------------------------------------- drawing
  function drawFloor() {
    ctx.fillStyle = '#1b2236';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const [sx, sy] = toScreen(x, y);
      ctx.drawImage(tiles[(x * 3 + y * 5) % 4], sx - TW / 2, sy);
    }
    // thickness under the two front edges: the lower-left edges of the y = N-1 row and the
    // lower-right edges of the x = N-1 row
    for (let i = 0; i < N; i++) {
      const [lx, ly] = toScreen(i, N - 1);
      ctx.drawImage(edges.left, lx - TW / 2, ly + TH / 2);
      const [rx, ry] = toScreen(N - 1, i);
      ctx.drawImage(edges.right, rx, ry + TH / 2);
    }
  }

  function spriteOf(img) {
    let c = cache.get(img);
    if (!c) {
      c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      c.getContext('2d').putImageData(img, 0, 0);
      cache.set(img, c);
    }
    return c;
  }

  function drawChar(frames) {
    if (!frames) return;
    const anim = ch.moving ? (ch.running ? 'run' : 'walk') : 'idle';
    const def = SG.sheet.ANIMS[anim];
    const i = Math.floor(ch.clock * def.fps) % def.frames;
    const img = frames[anim] && frames[anim][ch.dir] && frames[anim][ch.dir][i];
    if (!img) return;
    const [sx, sy] = toScreen(ch.wx, ch.wy);
    ctx.drawImage(shadow, sx - shadow.width / 2, sy - Math.floor(shadow.height / 2));
    const pivotY = img.height - SG.FRAME.pivotFromBottom - 1;
    ctx.drawImage(spriteOf(img), sx - img.width / 2, sy - pivotY);
  }

  function drawProp(p) {
    const [sx, sy] = toScreen(p.tx, p.ty); // top corner of its tile
    // the block's footprint is the middle of the tile: 32 x 16 centred on the tile
    ctx.drawImage(p.img, sx - p.img.width / 2, sy + TH / 2 + 8 - p.img.height + 1);
  }

  function tick(dt, frames) {
    if (!cv || cv.offsetParent === null) return;
    ch.clock += dt;
    update(dt);
    drawFloor();
    const items = props.map((p) => ({ z: p.tx + p.ty + 1, draw: () => drawProp(p) }));
    items.push({ z: ch.wx + ch.wy, draw: () => drawChar(frames) });
    items.sort((a, b) => a.z - b.z).forEach((it) => it.draw());
  }

  SG.iso = { init, tick, size: [VIEW_W, VIEW_H], state: ch };
})();
