// Head, face, hair, hats and face accessories. The head is modelled as a sphere:
// styles are written in head-local coordinates (f = forward, r = character's right,
// u = up) and projected for each facing angle, so one definition covers every direction.
(function () {
  const SG = (window.SG = window.SG || {});
  const { pack, mix, hexToRgb } = SG.color;
  const TAG = (SG.TAG = { skin: 1, hair: 2, cloth: 3, eye: 4, other: 5 });

  const hex = (h) => pack(...hexToRgb(h));
  const frac = (v) => v - Math.floor(v);

  // Local -> design-space screen point on ellipse e. Points nearer the camera sit slightly
  // lower (top-down 3/4 camera), controlled by tilt.
  function proj(R, e, f, r, u, kx = 1, tilt = 0) {
    const X = f * R.F.x + r * R.Rv.x;
    const Z = f * R.F.z + r * R.Rv.z;
    return { x: e.cx + X * e.rx * kx, y: e.cy - u * e.ry + Z * tilt, z: Z };
  }

  // Design-space pixel centre -> local coordinates on ellipse e (null if outside).
  function local(R, e, px, py) {
    const nx = (px - e.cx) / e.rx, ny = (py - e.cy) / e.ry;
    const q = nx * nx + ny * ny;
    if (q > 1) return null;
    const nz = Math.sqrt(1 - q);
    return { f: nx * R.F.x + nz * R.F.z, r: nx * R.Rv.x + nz * R.Rv.z, u: -ny, nx, ny };
  }

  const designX = (R, sx) => (R.mirror ? R.W - 1 - sx : sx);

  // ---------------------------------------------------------------- hairstyles
  // A "cap" covers the top of the head down to a fringe line, and the back and sides
  // down to the nape. Ears can be left uncovered.
  function cap({ hairline, nape = -0.45, front = 0.14, ears = true }) {
    return (f, r, u) => {
      const hl = typeof hairline === 'function' ? hairline(r, f) : hairline;
      if (u > hl) return true;
      if (f < front && u > nape) {
        if (ears && Math.abs(r) > 0.6 && u < 0.22 && u > -0.5 && f > -0.45) return false;
        return true;
      }
      return false;
    };
  }

  const HAIR = {
    bald: null,
    buzz: { vol: 0.25, pred: cap({ hairline: 0.42, nape: -0.2 }), tex: 'none' },
    short: { vol: 0.8, pred: cap({ hairline: (r) => 0.34 - 0.13 * Math.abs(Math.sin(r * 5.5)) }), tex: 'combed' },
    swept: { vol: 1.1, dy: 0.4, pred: cap({ hairline: (r) => 0.2 + 0.28 * r - 0.06 * Math.abs(Math.sin(r * 7)) }), tex: 'combed' },
    messybun: {
      vol: 1.3, dy: 0.3, tex: 'curly',
      pred: cap({ hairline: (r) => 0.24 + 0.16 * r - 0.12 * Math.abs(Math.sin(r * 6)), nape: -0.5, ears: false }),
      extras: ['bun', 'strands'], bun: { f: -0.62, r: 0.1, u: 0.76, rad: 3.5 },
    },
    topbun: {
      vol: 0.55, tex: 'combed', pred: cap({ hairline: 0.45, nape: -0.3 }),
      extras: ['bun'], bun: { f: -0.15, r: 0, u: 1, rad: 2.9 },
    },
    ponytail: {
      vol: 0.6, tex: 'combed', pred: cap({ hairline: (r) => 0.4 - 0.05 * Math.abs(Math.sin(r * 6)), nape: -0.3 }),
      extras: ['ponytail'],
    },
    pigtails: {
      vol: 0.8, tex: 'combed', pred: cap({ hairline: (r) => 0.3 - 0.1 * Math.abs(Math.sin(r * 5.5)), ears: false }),
      extras: ['pigtails'],
    },
    bob: {
      vol: 1.2, tex: 'combed',
      pred: cap({ hairline: (r) => 0.3 - 0.1 * Math.abs(Math.sin(r * 5.5)), nape: -0.62, front: 0.26, ears: false }),
    },
    long: {
      vol: 1.0, tex: 'combed',
      pred: cap({ hairline: (r) => 0.28 + 0.12 * r - 0.06 * Math.abs(Math.sin(r * 6)), nape: -0.55, front: 0.26, ears: false }),
      extras: ['curtain', 'locks'],
    },
    afro: {
      vol: 3, dy: 1.3, tex: 'curly',
      pred: cap({ hairline: (r) => 0.3 - 0.06 * Math.abs(Math.sin(r * 8)), nape: -0.55, front: 0.42, ears: false }),
    },
    spiky: { vol: 0.8, tex: 'combed', pred: cap({ hairline: (r) => 0.36 - 0.16 * Math.abs(Math.sin(r * 6)) }), extras: ['spikes'] },
    mohawk: {
      vol: 2.1, dy: 0.9, tex: 'combed',
      pred: (f, r, u) => Math.abs(r) < 0.3 && u > -0.25 && !(f > 0.3 && u < 0.5),
      shaved: true, twoSided: true,
    },
  };

  function hairEllipse(R, st) {
    const v = st.vol;
    return { cx: R.hcx, cy: R.hcy - 1 - (st.dy || 0), rx: 6 + v, ry: 6.3 + v * 0.9 };
  }

  function hairTone(R, e, tex) {
    return (sx, sy, t) => {
      const lc = local(R, e, designX(R, sx) + 0.5, sy + 0.5);
      if (!lc) return t;
      if (tex === 'combed') {
        const lon = Math.atan2(lc.r, lc.f);
        if (frac((lon * 6) / (2 * Math.PI) + 0.13) < 0.16 && lc.u < 0.86) return t + 1;
      } else if (tex === 'curly') {
        const lon = Math.atan2(lc.r, lc.f);
        if (Math.sin(lon * 7 + lc.u * 3) * Math.sin(lc.u * 9 + 0.6) > 0.45) return t + 1;
      }
      return t;
    };
  }

  const HAIR_TH = [0.86, 0.22, -0.4];

  function hasHat(R, kinds) {
    return kinds.includes(R.cfg.hat);
  }

  // Extras (bun, tails, curtain...) are collected with a depth so the body assembler can
  // put each one behind the body, over the back, or in front of the head.
  function hairExtras(R) {
    const st = HAIR[R.cfg.hair];
    if (!st || !st.extras) return [];
    const e = hairEllipse(R, st);
    const ramp = R.ramps.hair;
    const out = [];
    const sway = R.pose.sway || 0;
    const tailTone = (sx, sy, t) => ((designX(R, sx) + Math.floor(sy / 3)) % 3 === 0 ? t + 1 : t);

    for (const kind of st.extras) {
      if (kind === 'bun') {
        if (hasHat(R, ['cap', 'beanie', 'wizard'])) continue;
        const b = st.bun;
        const p = proj(R, e, b.f * 1.12, b.r * 1.12, b.u * 1.12);
        const rad = b.rad;
        out.push({
          layer: p.z < 0 ? 'behind' : 'front',
          draw(fr) {
            const m = fr.mask().ellipse(p.x, p.y, rad, rad * 0.95);
            const ell = { cx: p.x, cy: p.y, rx: rad, ry: rad };
            const ecx = R.mirror ? R.W - p.x : p.x;
            fr.draw(m, {
              ramp, shade: 'sphere', ell, th: HAIR_TH, outline: 'full', tag: TAG.hair,
              tone: (sx, sy, t) => {
                const dx = (sx + 0.5 - ecx) / rad, dy = (sy + 0.5 - p.y) / rad;
                const d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
                return d > 0.38 && d < 0.66 && Math.sin(a * 1.0 + d * 5) > -0.2 ? t + 1 : t;
              },
            });
          },
        });
      } else if (kind === 'ponytail' || kind === 'pigtails') {
        const anchors = kind === 'ponytail' ? [{ f: -0.92, r: 0, u: 0.32 }] : [{ f: -0.15, r: 0.95, u: 0.2 }, { f: -0.15, r: -0.95, u: 0.2 }];
        for (const a of anchors) {
          const p = proj(R, e, a.f, a.r, a.u);
          const side = kind === 'ponytail' ? -R.F.x : Math.sign(p.x - e.cx) || 1;
          const len = kind === 'ponytail' ? 11 : 9;
          const pts = [
            [p.x, p.y],
            [p.x + side * 2, p.y + 3],
            [p.x + side * 2.4 + sway * 0.5, p.y + len * 0.65],
            [p.x + side * 1.8 + sway, p.y + len],
          ];
          out.push({
            layer: p.z > 0.3 ? 'front' : p.z < -0.15 ? 'behind' : 'overBack',
            draw(fr) {
              const m = fr.mask().stroke(pts, [2.1, 1.2]);
              fr.draw(m, { ramp, shade: 'cyl', th: HAIR_TH, outline: 'full', tag: TAG.hair, tone: tailTone });
            },
          });
        }
      } else if (kind === 'curtain') {
        const cxh = R.hcx - R.F.x * 2.5;
        const hw = 6.6 * (0.62 + 0.38 * Math.abs(R.c));
        const top = R.hcy - 3, bot = R.sy + 9;
        const strands = (sx, sy, t) => ((Math.round(designX(R, sx) - cxh) % 3 === 0) && sy > R.hcy ? t + 1 : t);
        out.push({
          layer: R.c > 0.1 ? 'behind' : 'overBack',
          draw(fr) {
            const m = fr.mask().poly([
              [cxh - hw, top], [cxh + hw, top], [cxh + hw + 0.5, bot - 2], [cxh + hw - 1 + sway * 0.5, bot],
              [cxh - hw + 1 + sway * 0.5, bot], [cxh - hw - 0.5, bot - 2],
            ]);
            fr.draw(m, { ramp, shade: 'cyl', th: HAIR_TH, outline: 'full', tag: TAG.hair, tone: strands });
          },
        });
      } else if (kind === 'locks') {
        for (const side of [1, -1]) {
          const p = proj(R, e, 0.12, side * 0.93, -0.1);
          if (p.z < 0.05) continue;
          const sdir = Math.sign(p.x - e.cx) || side;
          out.push({
            layer: 'front',
            draw(fr) {
              const m = fr.mask().stroke([[p.x, p.y], [p.x + sdir * 0.6, R.sy + 3], [p.x + sdir * 0.4, R.sy + 6]], [1.5, 1.1]);
              fr.draw(m, { ramp, shade: 'cyl', th: HAIR_TH, outline: 'full', tag: TAG.hair, tone: tailTone });
            },
          });
        }
      } else if (kind === 'strands') {
        for (const side of [1, -1]) {
          const p = proj(R, R.face, 0.05, side * 0.98, 0.0);
          if (p.z < 0.1) continue;
          const sdir = Math.sign(p.x - R.face.cx) || side;
          out.push({
            layer: 'front',
            draw(fr) {
              const m = fr.mask().stroke([[p.x + sdir * 0.6, p.y - 1], [p.x + sdir * 1.0, p.y + 2], [p.x + sdir * 0.4, p.y + 4.5]], 0.5);
              fr.draw(m, { ramp, shade: 'flat', flat: 2, outline: 'outer', tag: TAG.hair });
            },
          });
        }
      }
    }
    return out;
  }

  function spikesMask(R, e, m) {
    const ring = [];
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      ring.push({ f: Math.cos(a) * 0.62, r: Math.sin(a) * 0.62, u: 0.78 });
    }
    ring.push({ f: 0, r: 0, u: 1 });
    for (const s of ring) {
      const b = proj(R, e, s.f * 0.95, s.r * 0.95, s.u * 0.95);
      const t = proj(R, e, s.f * 1.5, s.r * 1.5, s.u * 1.42);
      if (t.z < -0.5 && s.u < 0.9) continue;
      const dx = t.x - b.x, dy = t.y - b.y, ln = Math.hypot(dx, dy) || 1;
      const px = (-dy / ln) * 1.8, py = (dx / ln) * 1.8;
      m.poly([[b.x + px, b.y + py], [t.x, t.y], [b.x - px, b.y - py]]);
    }
  }

  // ---------------------------------------------------------------- face
  const EYES = {
    default: ['kk', 'ii'],
    beady: ['k', 'k'],
    big: ['kk', 'iw', 'ii'],
    sleepy: ['ss', 'kk'],
    closed: ['..', 'kk'],
    stern: ['kk', 'ik'],
  };

  function faceMask(R) {
    const e = R.face;
    const m = R.fr.mask();
    const s = R.s;
    m.fill(e.cx - e.rx - 2, e.cy - e.ry - 1, e.cx + e.rx + 2, e.cy + e.ry + 1, (px, py) => {
      const dyn = (py - e.cy) / e.ry;
      const jaw = dyn > 0 ? dyn : 0;
      const k = 1 - (0.32 + 0.4 * Math.max(0, -R.c)) * jaw * jaw;
      const dx = px - e.cx - s * 1.1 * jaw * jaw;
      if (R.c < -0.1 && dyn > 0.45 && Math.abs(dx) > 2.6) return false; // back view: only the neck shows below the skull
      return Math.abs(dx / (e.rx * k)) ** 2.6 + Math.abs(dyn) ** 2.6 <= 1;
    });
    return m;
  }

  function eyePositions(R) {
    const out = [];
    for (const side of [1, -1]) {
      const p = proj(R, R.face, 0.91, side * 0.4, -0.1, 0.75);
      if (p.z < 0.15) continue;
      const narrow = p.z < 0.55 || R.cfg.eyes === 'beady';
      const x0 = narrow ? Math.floor(p.x - 0.5) : Math.round(p.x - 1);
      const eye = { x: x0, y: Math.floor(p.y), w: narrow ? 1 : 2, side, cx: p.x, lensX: x0, lensW: narrow ? 1 : 2 };
      if (R.cfg.glasses && R.cfg.glasses !== 'none' && !narrow) {
        // behind lenses the eye shrinks to one column on the nose side, leaving a lit lens pixel
        const noseX = proj(R, R.face, 0.97, 0, -0.3, 0.75).x;
        eye.x = Math.abs(x0 + 1.5 - noseX) < Math.abs(x0 + 0.5 - noseX) ? x0 + 1 : x0;
        eye.w = 1;
        eye.glint = eye.x === x0 ? x0 + 1 : x0;
      }
      out.push(eye);
    }
    return out;
  }

  function drawFaceDetails(fr, R, eyes) {
    const cfg = R.cfg;
    const skin = R.ramps.skin;
    const dark = mix(skin[3], R.style.color, 0.72);
    const iris = hex(cfg.eyeColor);
    const white = hex('#f6f2ee');
    const browCol = R.ramps.hair[3];
    const tpl = EYES[cfg.eyes] || EYES.default;

    for (const ey of eyes) {
      tpl.forEach((row, j) => {
        for (let i = 0; i < ey.w; i++) {
          const ch = ey.w === 1 ? row[row.length > 1 ? (ey.side > 0 ? 1 : 0) : 0] : row[i];
          const x = ey.x + i, y = ey.y + j;
          if (ch === 'k') fr.pc(x, y, dark, TAG.eye);
          else if (ch === 'i') fr.pc(x, y, iris, TAG.eye);
          else if (ch === 'w') fr.pc(x, y, white, TAG.eye);
          else if (ch === 's') fr.px(x, y, skin, 2, TAG.skin);
        }
      });
      // brows
      const by = ey.y - 2 + (cfg.eyes === 'stern' ? 0 : 0);
      const noseX = proj(R, R.face, 0.97, 0, -0.3, 0.75).x;
      const inner = Math.abs(ey.lensX + ey.lensW - 0.5 - noseX) < Math.abs(ey.lensX + 0.5 - noseX) ? ey.lensX + ey.lensW - 1 : ey.lensX;
      const outer = inner === ey.lensX ? ey.lensX + ey.lensW - 1 : ey.lensX;
      if (cfg.brows !== 'none' && !(cfg.glasses && cfg.glasses !== 'none')) {
        for (let i = 0; i < ey.lensW; i++) {
          const x = ey.lensX + i;
          let y = by;
          if (cfg.brows === 'angry' || cfg.eyes === 'stern') y = x === inner ? by : by - 1;
          if (cfg.brows === 'worried') y = x === inner ? by - 1 : by;
          fr.pc(x, y, browCol, TAG.hair);
          if (cfg.brows === 'thick') fr.pc(x, y - 1, browCol, TAG.hair);
        }
        if (ey.lensW === 2 && cfg.brows === 'angry') fr.pc(outer, by - 1, browCol, TAG.hair);
      }
      // cheeks
      if (cfg.cheeks === 'blush' && ey.lensW === 2) {
        const pink = mix(skin[1], hex('#e0506a'), 0.4);
        fr.pc(ey.lensX, ey.y + 2 + (tpl.length > 2 ? 1 : 0), pink, TAG.skin);
        fr.pc(ey.lensX + 1, ey.y + 2 + (tpl.length > 2 ? 1 : 0), pink, TAG.skin);
      } else if (cfg.cheeks === 'freckles') {
        fr.px(outer, ey.y + 2 + (tpl.length > 2 ? 1 : 0), skin, 3, TAG.skin);
      }
    }

    // nose
    const profile = Math.abs(R.F.x) > 0.9;
    const np = proj(R, R.face, 0.97, 0, -0.3, 0.75);
    if (np.z > 0.1 && cfg.nose !== 'none') {
      if (profile) {
        const y = Math.floor(np.y);
        let edge = -1;
        for (let x = 0; x < R.W; x++) if (R.faceMask.hasD(x, y)) edge = x;
        if (edge >= 0) fr.bump(edge + 1, y, skin, 1, TAG.skin);
      } else {
        fr.px(Math.floor(np.x), Math.floor(np.y), skin, 2, TAG.skin);
      }
    }

    // facial hair
    drawFacialHair(fr, R);

    // mouth
    const mp = proj(R, R.face, 0.88, 0, -0.52, 0.75);
    if (mp.z > 0.1 && cfg.mouth !== 'none') {
      const mc = mix(skin[3], hex('#6a1e2c'), 0.25);
      const tongue = mix(skin[2], hex('#c04050'), 0.5);
      const pats = {
        neutral: [[-1, 0], [0, 0]],
        smile: [[-2, -1], [-1, 0], [0, 0], [1, -1]],
        frown: [[-2, 1], [-1, 0], [0, 0], [1, 1]],
        open: [[-1, 0], [0, 0], [-1, 1, 't'], [0, 1, 't']],
        smirk: [[-1, 0], [0, 0], [1, -1]],
      };
      const mx = Math.floor(mp.x), my = Math.floor(mp.y);
      for (const [dx, dy, k] of pats[cfg.mouth] || pats.neutral) {
        const x = profile ? mx + Math.min(0, dx + 1) : mx + dx;
        if (!R.faceMask.hasD(x, my + dy)) continue;
        fr.pc(x, my + dy, k === 't' ? tongue : mc, TAG.skin);
      }
    }
  }

  function drawFacialHair(fr, R) {
    const kind = R.cfg.facialHair;
    if (!kind || kind === 'none') return;
    const e = { ...R.face, ry: R.face.ry + 0.9 };
    const preds = {
      stubble: (l) => l.u < -0.22 && l.f > -0.2,
      beard: (l) => l.u < -0.2 && l.f > -0.25,
      goatee: (l) => l.u < -0.5 && Math.abs(l.r) < 0.34 && l.f > 0.3,
      mustache: (l) => l.u < -0.32 && l.u > -0.5 && Math.abs(l.r) < 0.42 && l.f > 0.4,
    };
    const pred = preds[kind];
    const m = fr.mask().fill(e.cx - e.rx - 2, e.cy - 1, e.cx + e.rx + 2, e.cy + e.ry + 1, (px, py) => {
      const l = local(R, e, px, py);
      if (!l || !pred(l)) return false;
      // keep within the face plus one row under the chin
      return R.faceMask.hasD(Math.floor(px), Math.floor(py)) || R.faceMask.hasD(Math.floor(px), Math.floor(py) - 1);
    });
    if (kind === 'stubble') {
      const c = mix(R.ramps.skin[1], R.ramps.hair[2], 0.38);
      const skinOnly = m.keep((x, y) => R.faceMask.has(x, y));
      for (let y = 0; y < fr.h; y++) for (let x = 0; x < fr.w; x++) if (skinOnly.has(x, y)) fr.putColor(x, y, c, TAG.skin);
      return;
    }
    fr.draw(m, { ramp: R.ramps.hair, shade: 'sphere', ell: R.face, th: HAIR_TH, outline: 'outer', tag: TAG.hair, tone: hairTone(R, R.face, 'curly') });
  }

  function ears(R) {
    const list = [];
    for (const side of [1, -1]) {
      const p = proj(R, R.face, -0.12, side, -0.12);
      if (p.z < -0.3) continue;
      const X = (p.x - R.face.cx) / R.face.rx;
      if (Math.abs(X) >= 0.85) list.push({ kind: 'edge', x: p.x + Math.sign(X) * 0.7, y: p.y + 0.6, side: Math.sign(X) });
      else if (p.z > 0.3) list.push({ kind: 'inner', x: Math.floor(p.x), y: Math.floor(p.y), back: -Math.sign(R.F.x) || -1 });
    }
    return list;
  }

  // ---------------------------------------------------------------- hats
  function drawHat(fr, R, phase) {
    const kind = R.cfg.hat;
    if (!kind || kind === 'none') return;
    const ramp = R.ramps.hat;
    const st = HAIR[R.cfg.hair];
    const vol = st ? Math.max(0.8, Math.min(st.vol, 1.6)) : 0.6;
    const e = { cx: R.hcx, cy: R.hcy - 1 - (st && st.dy ? Math.min(st.dy, 0.5) : 0), rx: 6 + vol, ry: 6.3 + vol * 0.9 };

    if (kind === 'cap') {
      const brim = () => {
        const pts = [];
        for (let a = -90; a <= 90; a += 15) {
          const t = (a * Math.PI) / 180;
          const p = proj(R, e, 0.5 + 0.62 * Math.cos(t), 0.86 * Math.sin(t), 0.14, 1, 1.6);
          pts.push([p.x, p.y]);
        }
        const q1 = proj(R, e, 0.2, -0.86, 0.14, 1, 1.6), q2 = proj(R, e, 0.2, 0.86, 0.14, 1, 1.6);
        pts.push([q1.x, q1.y]);
        pts.unshift([q2.x, q2.y]);
        fr.draw(fr.mask().poly(pts), { ramp, shade: 'flat', flat: 2, outline: 'full', tag: TAG.cloth });
      };
      const brimBehind = R.c < -0.2;
      if (phase === 'before') { if (brimBehind) brim(); return; }
      const m = fr.mask().fill(e.cx - e.rx - 1, e.cy - e.ry - 1, e.cx + e.rx + 1, e.cy + 1, (px, py) => {
        const l = local(R, e, px, py);
        return l && l.u > 0.14;
      });
      fr.draw(m, { ramp, shade: 'sphere', ell: e, outline: 'full', tag: TAG.cloth,
        tone: (sx, sy, t) => { const l = local(R, e, designX(R, sx) + 0.5, sy + 0.5); return l && Math.abs(l.r) < 0.08 && l.f > 0 ? t + 1 : t; } });
      if (!brimBehind) brim();
    } else if (kind === 'beanie') {
      if (phase === 'before') return;
      const eb = { ...e, rx: e.rx + 0.3, ry: e.ry + 0.4 };
      const m = fr.mask().fill(eb.cx - eb.rx - 1, eb.cy - eb.ry - 1, eb.cx + eb.rx + 1, eb.cy + 2, (px, py) => {
        const l = local(R, eb, px, py);
        return l && l.u > 0.02;
      });
      fr.draw(m, { ramp, shade: 'sphere', ell: eb, outline: 'full', tag: TAG.cloth,
        tone: (sx, sy, t) => {
          const l = local(R, eb, designX(R, sx) + 0.5, sy + 0.5);
          if (!l) return t;
          if (l.u < 0.26) return Math.max(t, 2);
          return frac((Math.atan2(l.r, l.f) * 8) / (2 * Math.PI)) < 0.25 ? t + 1 : t;
        } });
    } else if (kind === 'headband') {
      if (phase === 'before') return;
      const m = fr.mask().fill(e.cx - e.rx - 1, e.cy - e.ry, e.cx + e.rx + 1, e.cy + e.ry, (px, py) => {
        const l = local(R, e, px, py);
        return l && l.u > 0.3 && l.u < 0.5;
      });
      fr.draw(m, { ramp, shade: 'sphere', ell: e, outline: 'full', tag: TAG.cloth });
    } else if (kind === 'wizard') {
      if (phase === 'before') return;
      const bu = 0.42;
      const pts = [];
      for (let a = 0; a < 360; a += 20) {
        const t = (a * Math.PI) / 180;
        const p = proj(R, e, 1.28 * Math.cos(t), 1.28 * Math.sin(t), bu, 1, 1.1);
        pts.push([p.x, p.y]);
      }
      fr.draw(fr.mask().poly(pts), { ramp, shade: 'flat', flat: 2, outline: 'full', tag: TAG.cloth });
      const c = proj(R, e, 0, 0, bu);
      const base = e.rx * 0.95;
      const tipX = c.x - R.F.x * 3, tipY = Math.max(1, c.y - 11);
      const midX = c.x - R.F.x * 0.5, midY = c.y - 6;
      const cone = fr.mask().poly([[c.x - base, c.y + 0.5], [midX - base * 0.45, midY], [tipX, tipY], [midX + base * 0.45, midY], [c.x + base, c.y + 0.5]]);
      fr.draw(cone, { ramp, shade: 'cyl', outline: 'full', tag: TAG.cloth });
      // band
      const band = fr.mask().poly([[c.x - base, c.y + 0.5], [c.x - base * 0.85, c.y - 1.6], [c.x + base * 0.85, c.y - 1.6], [c.x + base, c.y + 0.5]]);
      band.intersect(cone);
      fr.draw(band, { ramp: R.ramps.top2, shade: 'cyl', outline: 'none', tag: TAG.cloth });
    }
  }

  // ---------------------------------------------------------------- glasses, earrings
  function drawGlasses(fr, R, eyes, earList) {
    const kind = R.cfg.glasses;
    if (!kind || kind === 'none' || !eyes.length) return;
    const col = hex(R.cfg.glassesColor);
    const lens = mix(hex('#20202c'), col, 0.25);
    const glint = hex('#9aa8c0');
    const boxes = [];
    for (const ey of eyes) {
      const w = ey.lensW === 2 ? 4 : 3;
      const x0 = ey.lensX - 1;
      const full = kind !== 'square';
      const y0 = ey.y - 1, h = full ? 4 : 3;
      boxes.push({ x0, y0, w, h, side: ey.side });
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        // square frames are half-rim: top bar and sides, open at the bottom
        const edge = i === 0 || j === 0 || i === w - 1 || (full && j === h - 1);
        const corner = (i === 0 || i === w - 1) && (j === 0 || j === h - 1);
        if (edge) {
          if (kind === 'round' && corner) continue;
          fr.pc(x0 + i, y0 + j, col, TAG.other);
        } else if (kind === 'shades') {
          fr.pc(x0 + i, y0 + j, i === 1 && j === 1 ? glint : lens, TAG.other);
        } else if (x0 + i === ey.glint && j === 1) {
          fr.pc(x0 + i, y0 + j, mix(R.ramps.skin[1], hex('#ffffff'), 0.45), TAG.other);
        }
      }
    }
    // temple arms toward visible inner ears (3/4 and profile views)
    const inner = earList.find((e) => e.kind === 'inner');
    if (inner && boxes.length) {
      const b = boxes.reduce((a, c) => (Math.abs(c.x0 - inner.x) < Math.abs(a.x0 - inner.x) ? c : a));
      const from = inner.x < b.x0 ? b.x0 - 1 : b.x0 + b.w;
      const step = inner.x < b.x0 ? -1 : 1;
      for (let x = from; step < 0 ? x > inner.x : x < inner.x; x += step) fr.pc(x, b.y0, col, TAG.other);
    } else if (boxes.length === 2) {
      // front view: short arms out to the face edge
      const [a, b] = boxes[0].x0 < boxes[1].x0 ? boxes : [boxes[1], boxes[0]];
      for (const [x, dir] of [[a.x0 - 1, -1], [b.x0 + b.w, 1]]) {
        if (R.faceMask.hasD(x, a.y0) || R.faceMask.hasD(x - dir, a.y0)) fr.pc(x, a.y0, col, TAG.other);
      }
    }
  }

  function drawEarrings(fr, R, earList) {
    const kind = R.cfg.earrings;
    if (!kind || kind === 'none') return;
    const ramp = kind === 'gold' ? SG.color.ramp('#e8b030') : SG.color.ramp('#d4d8e2');
    for (const ear of earList) {
      if (ear.kind === 'edge') fr.bump(Math.floor(ear.x), Math.floor(ear.y) + 2, ramp, 1, TAG.other);
      else fr.px(ear.x, ear.y + 2, ramp, 0, TAG.other);
    }
  }

  // ---------------------------------------------------------------- public entry points
  // Draws the full head: ears, face, features, hair, front hair extras, hat, glasses.
  function drawHead(fr, R, extras) {
    const skin = R.ramps.skin;
    const st = HAIR[R.cfg.hair];
    R.fr = fr;
    const fm = faceMask(R);
    R.faceMask = fm;
    const earList = ears(R);

    drawHat(fr, R, 'before');

    for (const ear of earList.filter((e) => e.kind === 'edge')) {
      fr.draw(fr.mask().ellipse(ear.x, ear.y, 1.25, 1.75), { ramp: skin, shade: 'flat', flat: 1, outline: 'full', tag: TAG.skin });
    }
    fr.draw(fm, { ramp: skin, shade: 'sphere', ell: R.face, th: [0.95, -0.12, -0.8], outline: 'full', tag: TAG.skin });

    for (const ear of earList.filter((e) => e.kind === 'inner')) {
      for (let j = -1; j <= 1; j++) fr.px(ear.x, ear.y + j, skin, 2, TAG.skin);
      fr.px(ear.x + ear.back, ear.y, skin, 3, TAG.skin);
    }

    const faceVisible = R.c > -0.2;
    const eyes = faceVisible ? eyePositions(R) : [];
    if (faceVisible) drawFaceDetails(fr, R, eyes);

    if (st) {
      const e = hairEllipse(R, st);
      const m = fr.mask().fill(e.cx - e.rx - 1, e.cy - e.ry - 1, e.cx + e.rx + 1, e.cy + e.ry + 1, (px, py) => {
        const l = local(R, e, px, py);
        if (!l) return false;
        if (st.pred(l.f, l.r, l.u)) return true;
        // fins like a mohawk stand outside the skull: also test the far side of the volume
        if (st.twoSided && !fm.hasD(Math.floor(px), Math.floor(py)) && Math.abs(R.Rv.z) > 0.2) {
          // point on the head's centre plane (r = 0) along this line of sight
          const z = (-l.nx * R.Rv.x) / R.Rv.z;
          if (Math.abs(z) <= Math.sqrt(Math.max(0, 1 - l.nx * l.nx - l.ny * l.ny))) {
            return st.pred(l.nx * R.F.x + z * R.F.z, 0, l.u);
          }
        }
        return false;
      });
      if (R.cfg.hair === 'spiky') spikesMask(R, e, m);
      if (st.shaved) {
        // shaved sides read as a stubble tone on the scalp
        const se = { ...R.face, cy: R.face.cy - 0.5 };
        const c = mix(skin[1], R.ramps.hair[2], 0.35);
        for (let y = 0; y < fr.h; y++) for (let x = 0; x < fr.w; x++) {
          if (!fm.has(x, y)) continue;
          const l = local(R, se, designX(R, x) + 0.5, y + 0.5);
          if (l && (l.u > 0.45 || (l.f < 0.2 && l.u > -0.3)) && !(Math.abs(l.r) > 0.6 && l.u < 0.2 && l.u > -0.5)) fr.putColor(x, y, c, TAG.skin);
        }
      }
      fr.draw(m, { ramp: R.ramps.hair, shade: 'sphere', ell: e, th: HAIR_TH, outline: 'full', tag: TAG.hair, tone: hairTone(R, e, st.tex) });
    }

    for (const x of extras.filter((x) => x.layer === 'front')) x.draw(fr);
    drawHat(fr, R, 'after');
    if (faceVisible) drawGlasses(fr, R, eyes, earList);
    drawEarrings(fr, R, earList);
  }

  SG.head = { HAIR, hairExtras, drawHead, proj, local };
})();
