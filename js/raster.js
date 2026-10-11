// Mask: rasterises shapes in "design space" (unmirrored). Frame: composites shaded,
// outlined parts into a pixel buffer in screen space.
(function () {
  const SG = (window.SG = window.SG || {});
  const { mix } = SG.color;

  // Light from the top-left, slightly toward the viewer.
  const L = (() => {
    const v = [-0.6, -0.55, 0.6];
    const n = Math.hypot(...v);
    return v.map((x) => x / n);
  })();

  function segDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let t = len2 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }

  class Mask {
    constructor(w, h, mirror) {
      this.w = w;
      this.h = h;
      this.mirror = !!mirror;
      this.d = new Uint8Array(w * h);
    }
    // Design-space x -> screen-space x.
    sx(x) {
      return this.mirror ? this.w - 1 - x : x;
    }
    set(x, y) {
      x = Math.floor(x); y = Math.floor(y);
      if (this.mirror) x = this.w - 1 - x;
      if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = 1;
      return this;
    }
    unset(x, y) {
      x = Math.floor(x); y = Math.floor(y);
      if (this.mirror) x = this.w - 1 - x;
      if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = 0;
      return this;
    }
    // Screen-space test.
    has(x, y) {
      return x >= 0 && y >= 0 && x < this.w && y < this.h && this.d[y * this.w + x] === 1;
    }
    // Design-space test.
    hasD(x, y) {
      return this.has(this.sx(x), y);
    }
    // Calls pred with pixel-centre coordinates over a design-space box.
    fill(x0, y0, x1, y1, pred) {
      const i0 = Math.max(-this.w, Math.floor(x0)), i1 = Math.min(this.w * 2, Math.ceil(x1));
      const j0 = Math.max(0, Math.floor(y0)), j1 = Math.min(this.h - 1, Math.ceil(y1));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (pred(i + 0.5, j + 0.5)) this.set(i, j);
      return this;
    }
    rect(x, y, w, h) {
      return this.fill(x, y, x + w, y + h, (px, py) => px > x && px < x + w && py > y && py < y + h);
    }
    ellipse(cx, cy, rx, ry) {
      rx = Math.max(rx, 0.01); ry = Math.max(ry, 0.01);
      return this.fill(cx - rx - 1, cy - ry - 1, cx + rx + 1, cy + ry + 1,
        (px, py) => ((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2 <= 1.0001);
    }
    poly(pts) {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      return this.fill(x0 - 1, y0 - 1, x1 + 1, y1 + 1, (px, py) => {
        let inside = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i], [xj, yj] = pts[j];
          if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
        }
        return inside;
      });
    }
    // Thick polyline with round caps; r may be a number or [rStart, rEnd].
    stroke(pts, r) {
      const r0 = Array.isArray(r) ? r[0] : r, r1 = Array.isArray(r) ? r[1] : r;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      const m = Math.max(r0, r1) + 1;
      const n = pts.length - 1;
      return this.fill(x0 - m, y0 - m, x1 + m, y1 + m, (px, py) => {
        for (let i = 0; i < n; i++) {
          const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
          const rr = r0 + ((r1 - r0) * (i + 0.5)) / n;
          if (segDist(px, py, ax, ay, bx, by) <= rr) return true;
        }
        return false;
      });
    }
    // Integer Bresenham line.
    line(x0, y0, x1, y1) {
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (;;) {
        this.set(x0, y0);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
      return this;
    }
    union(m) { for (let i = 0; i < this.d.length; i++) this.d[i] |= m.d[i]; return this; }
    subtract(m) { for (let i = 0; i < this.d.length; i++) if (m.d[i]) this.d[i] = 0; return this; }
    intersect(m) { for (let i = 0; i < this.d.length; i++) this.d[i] &= m.d[i]; return this; }
    keep(pred) { // pred in screen space
      for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
        const i = y * this.w + x;
        if (this.d[i] && !pred(x, y)) this.d[i] = 0;
      }
      return this;
    }
    clipY(y0, y1) { return this.keep((x, y) => y >= y0 && y < y1); }
    clone() { const m = new Mask(this.w, this.h, this.mirror); m.d.set(this.d); return m; }
    empty() { for (let i = 0; i < this.d.length; i++) if (this.d[i]) return false; return true; }
  }

  const OUTLINE = -2;

  class Frame {
    constructor(w, h, mirror, style) {
      this.w = w;
      this.h = h;
      this.mirror = !!mirror;
      this.style = style; // { mode: 'selout'|'black'|'colored'|'none', color: packed }
      this.col = new Uint32Array(w * h);
      this.rid = new Int16Array(w * h).fill(-1);
      this.tone = new Int8Array(w * h);
      this.tag = new Uint8Array(w * h); // part tag, for later queries (eg. "is this skin?")
      this.ramps = [];
    }
    mask() { return new Mask(this.w, this.h, this.mirror); }
    sx(x) { return this.mirror ? this.w - 1 - Math.floor(x) : Math.floor(x); }
    rampIndex(r) {
      let i = this.ramps.indexOf(r);
      if (i < 0) { this.ramps.push(r); i = this.ramps.length - 1; }
      return i;
    }
    inb(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }

    // Screen-space writes.
    putTone(x, y, ramp, t, tag = 0) {
      if (!this.inb(x, y)) return;
      const i = y * this.w + x;
      t = Math.max(0, Math.min(3, t));
      this.col[i] = ramp[t];
      this.rid[i] = this.rampIndex(ramp);
      this.tone[i] = t;
      this.tag[i] = tag;
    }
    putColor(x, y, c, tag = 0) {
      if (!this.inb(x, y)) return;
      const i = y * this.w + x;
      this.col[i] = c;
      this.rid[i] = -1;
      this.tag[i] = tag;
    }
    putOutline(x, y, c) {
      if (!this.inb(x, y)) return;
      const i = y * this.w + x;
      this.col[i] = c;
      this.rid[i] = OUTLINE;
      this.tag[i] = 0;
    }

    // Design-space helpers for hand-placed detail pixels.
    px(x, y, ramp, t, tag) { this.putTone(this.sx(x), Math.floor(y), ramp, t, tag); }
    pc(x, y, c, tag) { this.putColor(this.sx(x), Math.floor(y), c, tag); }
    filled(x, y) { const sx = this.sx(x); y = Math.floor(y); return this.inb(sx, y) && this.col[y * this.w + sx] !== 0; }
    tagAt(x, y) { const sx = this.sx(x); y = Math.floor(y); return this.inb(sx, y) ? this.tag[y * this.w + sx] : 0; }
    isOutline(x, y) { const sx = this.sx(x); y = Math.floor(y); return this.inb(sx, y) && this.rid[y * this.w + sx] === OUTLINE; }
    // Darken an already-shaded pixel by n tones (design space).
    darken(x, y, n = 1) {
      const sx = this.sx(x); y = Math.floor(y);
      if (!this.inb(sx, y)) return;
      const i = y * this.w + sx;
      const r = this.rid[i];
      if (r < 0) return;
      const t = Math.min(3, this.tone[i] + n);
      this.tone[i] = t;
      this.col[i] = this.ramps[r][t];
    }
    // A detail pixel that sticks out of the silhouette (nose tip, ear lobe): paints it and
    // outlines any empty 4-neighbours.
    bump(x, y, ramp, t, tag) {
      this.px(x, y, ramp, t, tag);
      if (this.style.mode === 'none') return;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const sx = this.sx(x + dx), yy = Math.floor(y + dy);
        if (this.inb(sx, yy) && this.col[yy * this.w + sx] === 0) this.putOutline(sx, yy, this.outerColor(ramp));
      }
    }
    outerColor(ramp) {
      return this.style.mode === 'colored' ? mix(ramp[3], this.style.color, 0.6) : this.style.color;
    }
    innerColor(ramp) {
      return this.style.mode === 'black' ? this.style.color : mix(ramp[3], this.style.color, 0.55);
    }

    /**
     * Composite a shaded part.
     * o.ramp     4-tone ramp
     * o.shade    'flat' | 'cyl' | 'sphere' | 'edge'
     * o.ell      {cx, cy, rx, ry} in design space for 'sphere'
     * o.th       tone thresholds [hi, base, shadow]
     * o.dim      tone offset (far limbs)
     * o.flat     tone for 'flat' (default 1)
     * o.tone     (sx, sy, t, m) => t   per-pixel override, screen space
     * o.outline  'full' | 'outer' | 'none'
     * o.tag      tag stored per pixel
     */
    draw(m, o) {
      const { w, h } = this;
      const ramp = o.ramp;
      const th = o.th || [0.9, 0.3, -0.45];
      const dim = o.dim || 0;
      const shade = o.shade || 'flat';
      let rowMin, rowMax;
      if (shade === 'cyl') {
        rowMin = new Int16Array(h).fill(9999);
        rowMax = new Int16Array(h).fill(-9999);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m.d[y * w + x]) {
          if (x < rowMin[y]) rowMin[y] = x;
          if (x > rowMax[y]) rowMax[y] = x;
        }
      }
      let ecx = 0;
      if (shade === 'sphere') ecx = this.mirror ? w - o.ell.cx : o.ell.cx;
      const toneOf = (d) => (d > th[0] ? 0 : d > th[1] ? 1 : d > th[2] ? 2 : 3);

      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (!m.d[y * w + x]) continue;
        let t = o.flat == null ? 1 : o.flat;
        if (shade === 'cyl') {
          const a = rowMin[y], b = rowMax[y] + 1;
          const half = (b - a) / 2;
          const nx = half > 0.5 ? ((x + 0.5) - (a + b) / 2) / half : 0;
          const nz = Math.sqrt(Math.max(0, 1 - nx * nx));
          t = toneOf(nx * 0.95 * L[0] + nz * L[2] + (o.ny || 0) * L[1]);
        } else if (shade === 'sphere') {
          let nx = (x + 0.5 - ecx) / o.ell.rx, ny = (y + 0.5 - o.ell.cy) / o.ell.ry;
          const ln = Math.hypot(nx, ny);
          if (ln > 1) { nx /= ln; ny /= ln; }
          const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
          t = toneOf(nx * L[0] + ny * L[1] + nz * L[2]);
        } else if (shade === 'edge') {
          t = 1;
          if (!m.has(x + 1, y) || !m.has(x, y + 1)) t = 2;
        }
        t += dim;
        if (o.tone) t = o.tone(x, y, t, m);
        this.putTone(x, y, ramp, t, o.tag || 0);
      }

      const mode = o.outline || 'full';
      if (mode === 'none' || this.style.mode === 'none') return;
      const outer = this.outerColor(ramp), inner = this.innerColor(ramp);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (m.d[i]) continue;
        if (!(m.has(x - 1, y) || m.has(x + 1, y) || m.has(x, y - 1) || m.has(x, y + 1))) continue;
        if (this.col[i] === 0) this.putOutline(x, y, outer);
        else if (mode === 'full' && this.rid[i] !== OUTLINE) this.putOutline(x, y, inner);
      }
    }

    toImageData() {
      const img = new ImageData(this.w, this.h);
      new Uint32Array(img.data.buffer).set(this.col);
      return img;
    }
  }

  SG.Mask = Mask;
  SG.Frame = Frame;
  SG.LIGHT = L;
})();
