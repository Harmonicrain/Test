// Isometric test floor: walk the current character over 64 x 32 tiles with the same
// fixed 2:1 camera as the game (SE = world +X = screen (+32, +16), SW = world +Y).
(function () {
  const SG = (window.SG = window.SG || {});
  const TW = 64, TH = 32, N = 6;
  const DIRV = { S: [1, 1], SW: [0, 1], W: [-1, 1], NW: [-1, 0], N: [-1, -1], NE: [0, -1], E: [1, -1], SE: [1, 0] };
  const SCREEN_ORDER = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE']; // by screen angle, 45 degree steps
  const PROPS = [{ wx: 1.5, wy: 4.5, h: 26, c: ['#8a5a34', '#6e4628', '#a8744a'] }, { wx: 4.5, wy: 1.5, h: 18, c: ['#4a6a3a', '#3a5430', '#5e8448'] }];

  let cv, ctx, origin;
  const ch = { wx: 3, wy: 3, dir: 'S', moving: false, running: false, clock: 0, target: null };
  const keys = new Set();
  const cache = new WeakMap();

  const toScreen = (wx, wy) => [origin[0] + ((wx - wy) * TW) / 2, origin[1] + ((wx + wy) * TH) / 2];
  const toWorld = (sx, sy) => {
    const x = (sx - origin[0]) / (TW / 2), y = (sy - origin[1]) / (TH / 2);
    return [(x + y) / 2, (y - x) / 2];
  };

  function init(canvas) {
    cv = canvas;
    ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    origin = [cv.width / 2, (cv.height - N * TH) / 2 + 10];
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
      const sx = ((e.clientX - r.left) / r.width) * cv.width, sy = ((e.clientY - r.top) / r.height) * cv.height;
      const [wx, wy] = toWorld(sx, sy);
      ch.target = [Math.max(0.3, Math.min(N - 0.3, wx)), Math.max(0.3, Math.min(N - 0.3, wy))];
      ch.running = e.shiftKey;
      cv.focus({ preventScroll: true });
    });
  }

  // nearest of the 8 facings for a screen-space vector
  function facing(sx, sy) {
    const a = Math.atan2(sy, sx);
    const i = ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8;
    return SCREEN_ORDER[i];
  }

  function update(dt) {
    let dir = null;
    const kx = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0);
    const ky = (keys.has('down') ? 1 : 0) - (keys.has('up') ? 1 : 0);
    if (kx || ky) dir = facing(kx, ky);
    else if (ch.target) {
      const dx = ch.target[0] - ch.wx, dy = ch.target[1] - ch.wy;
      if (Math.hypot(dx, dy) < 0.08) ch.target = null;
      else dir = facing((dx - dy) * TW / 2, (dx + dy) * TH / 2);
    }
    ch.moving = !!dir;
    if (!dir) return;
    ch.dir = dir;
    const v = DIRV[dir], len = Math.hypot(v[0], v[1]);
    const speed = ch.running ? 3.4 : 1.7; // tiles per second
    ch.wx = Math.max(0.3, Math.min(N - 0.3, ch.wx + (v[0] / len) * speed * dt));
    ch.wy = Math.max(0.3, Math.min(N - 0.3, ch.wy + (v[1] / len) * speed * dt));
  }

  function tile(x, y) {
    const [sx, sy] = toScreen(x, y);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + TW / 2, sy + TH / 2);
    ctx.lineTo(sx, sy + TH);
    ctx.lineTo(sx - TW / 2, sy + TH / 2);
    ctx.closePath();
  }

  function drawFloor() {
    ctx.fillStyle = '#1b2236';
    ctx.fillRect(0, 0, cv.width, cv.height);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      tile(x, y);
      ctx.fillStyle = (x + y) % 2 ? '#b07440' : '#a66a39';
      ctx.fill();
      // plank seams run along world +X
      const [sx, sy] = toScreen(x, y);
      ctx.strokeStyle = 'rgba(70,38,18,0.35)';
      ctx.lineWidth = 1;
      for (let k = 1; k < 4; k++) {
        const t = k / 4;
        ctx.beginPath();
        ctx.moveTo(Math.round(sx - (TW / 2) * t) + 0.5, Math.round(sy + (TH / 2) * t) + 0.5);
        ctx.lineTo(Math.round(sx - (TW / 2) * t + TW / 2) + 0.5, Math.round(sy + (TH / 2) * t + TH / 2) + 0.5);
        ctx.stroke();
      }
      tile(x, y);
      ctx.strokeStyle = 'rgba(60,32,14,0.6)';
      ctx.stroke();
    }
    // floor edge
    const [ax, ay] = toScreen(0, N), [bx, by] = toScreen(N, N), [cx2, cy2] = toScreen(N, 0);
    ctx.fillStyle = '#6e4426';
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(bx, by + 8); ctx.lineTo(ax, ay + 8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#58361e';
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(cx2, cy2); ctx.lineTo(cx2, cy2 + 8); ctx.lineTo(bx, by + 8); ctx.closePath(); ctx.fill();
  }

  function drawProp(p) {
    const [sx, sy] = toScreen(p.wx, p.wy);
    const w = 16, d = 8;
    const top = sy - p.h;
    ctx.fillStyle = p.c[1];
    ctx.beginPath(); ctx.moveTo(sx - w, sy - d + 8); ctx.lineTo(sx, sy + 8); ctx.lineTo(sx, top + 8); ctx.lineTo(sx - w, top - d + 8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = p.c[0];
    ctx.beginPath(); ctx.moveTo(sx + w, sy - d + 8); ctx.lineTo(sx, sy + 8); ctx.lineTo(sx, top + 8); ctx.lineTo(sx + w, top - d + 8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = p.c[2];
    ctx.beginPath(); ctx.moveTo(sx, top + 8); ctx.lineTo(sx + w, top - d + 8); ctx.lineTo(sx, top - 2 * d + 8); ctx.lineTo(sx - w, top - d + 8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#1d1424';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function sprite(img) {
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
    ctx.fillStyle = 'rgba(20,10,20,0.28)';
    ctx.beginPath(); ctx.ellipse(Math.round(sx), Math.round(sy) + 0.5, 11, 4.5, 0, 0, Math.PI * 2); ctx.fill();
    const pivotY = img.height - SG.FRAME.pivotFromBottom;
    ctx.drawImage(sprite(img), Math.round(sx - img.width / 2), Math.round(sy - pivotY));
  }

  function tick(dt, frames) {
    if (!cv || cv.offsetParent === null) return;
    ch.clock += dt;
    update(dt);
    drawFloor();
    const items = PROPS.map((p) => ({ z: p.wx + p.wy, draw: () => drawProp(p) }));
    items.push({ z: ch.wx + ch.wy, draw: () => drawChar(frames) });
    items.sort((a, b) => a.z - b.z).forEach((it) => it.draw());
  }

  SG.iso = { init, tick };
})();
