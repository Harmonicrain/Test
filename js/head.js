// Head, face, hair, hats and face accessories. The head is a sphere seen by a fixed
// isometric camera: styles are written in head-local coordinates (f = forward,
// r = character's right, u = up) and projected for each facing, so one definition
// covers all eight directions.
(function () {
  const SG = (window.SG = window.SG || {});
  const { pack, mix, hexToRgb, ramp } = SG.color;
  const TAG = (SG.TAG = { skin: 1, hair: 2, cloth: 3, eye: 4, other: 5 });

  const hex = (h) => pack(...hexToRgb(h));
  const frac = (v) => v - Math.floor(v);
  const tri = (v) => 1 - 2 * Math.abs(frac(v) - 0.5); // 0 at integers, 1 at halves

  // The camera looks down on the character: the crown shows more and the face sits lower.
  const PITCH = (10 * Math.PI) / 180;
  const CP = Math.cos(PITCH), SP = Math.sin(PITCH);

  // Local -> design-space screen point on ellipse e. z > 0 faces the camera.
  function proj(R, e, f, r, u, kx = 1) {
    const X = f * R.F.x + r * R.Rv.x;
    const Z = f * R.F.z + r * R.Rv.z;
    const up = u * CP - Z * SP;
    return { x: e.cx + X * e.rx * kx, y: e.cy - up * e.ry, z: u * SP + Z * CP };
  }

  // Design-space pixel centre -> local coordinates on ellipse e (null if outside).
  function local(R, e, px, py) {
    const nx = (px - e.cx) / e.rx, nyUp = -(py - e.cy) / e.ry;
    const q = nx * nx + nyUp * nyUp;
    if (q > 1) return null;
    const nz = Math.sqrt(1 - q);
    const Y = nyUp * CP + nz * SP;
    const Z = -nyUp * SP + nz * CP;
    return { f: nx * R.F.x + Z * R.F.z, r: nx * R.Rv.x + Z * R.Rv.z, u: Y, nx, ny: -nyUp, nz };
  }

  const designX = (R, sx) => (R.mirror ? R.W - 1 - sx : sx);

  // ---------------------------------------------------------------- hairstyles
  // A cap covers the crown down to a fringe line, and the back and sides down to the
  // nape. Ears can be left uncovered.
  function cap({ hairline, nape = -0.45, front = 0.14, ears = true }) {
    return (f, r, u) => {
      const hl = (typeof hairline === 'function' ? hairline(r, f) : hairline) + 0.1;
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
    buzz: { vol: 0.3, tex: 'fine', pred: cap({ hairline: 0.4, nape: -0.25 }) },
    short: { vol: 1.0, tex: 'clumps', clumps: 9, twist: 0.5, pred: cap({ hairline: (r) => 0.32 - 0.16 * tri(r * 3 + 0.5) }) },
    swept: { vol: 1.4, dy: 0.4, tex: 'clumps', clumps: 8, twist: 1.1, pred: cap({ hairline: (r) => 0.14 + 0.3 * r - 0.1 * tri(r * 4) }) },
    messybun: {
      vol: 1.2, dy: 0.5, tex: 'curls', clumps: 6, twist: 0.7, tufts: 12,
      pred: cap({ hairline: (r) => 0.3 + 0.2 * r - 0.14 * tri(r * 3 + 0.2), nape: -0.5, ears: false }),
      extras: ['bun', 'curlLocks'], bun: { f: -0.5, r: 0.12, u: 0.82, rad: 4.4, cluster: true },
    },
    topbun: {
      vol: 0.8, tex: 'combed', clumps: 12, twist: 0, pred: cap({ hairline: 0.4, nape: -0.35 }),
      extras: ['bun'], bun: { f: -0.1, r: 0, u: 1, rad: 3.8 },
    },
    ponytail: { vol: 0.9, tex: 'combed', clumps: 12, twist: 0, pred: cap({ hairline: (r) => 0.36 - 0.06 * tri(r * 4) }), extras: ['ponytail'] },
    pigtails: { vol: 1.1, tex: 'clumps', clumps: 9, twist: 0.3, pred: cap({ hairline: (r) => 0.28 - 0.14 * tri(r * 3 + 0.5), ears: false }), extras: ['pigtails'] },
    bob: { vol: 1.5, tex: 'clumps', clumps: 11, twist: 0.2, pred: cap({ hairline: (r) => 0.28 - 0.1 * tri(r * 4 + 0.5), nape: -0.7, front: 0.26, ears: false }) },
    long: {
      vol: 1.3, tex: 'clumps', clumps: 11, twist: 0.3,
      pred: cap({ hairline: (r) => 0.22 + 0.14 * r - 0.08 * tri(r * 4), nape: -0.62, front: 0.24, ears: false }),
      extras: ['curtain', 'locks'],
    },
    afro: { vol: 3.6, dy: 1.7, tex: 'curls', clumps: 11, twist: 1.6, tufts: 26, pred: cap({ hairline: (r) => 0.3 - 0.06 * tri(r * 5), nape: -0.55, front: 0.42, ears: false }) },
    spiky: { vol: 1.1, tex: 'clumps', clumps: 8, twist: 0.4, pred: cap({ hairline: (r) => 0.32 - 0.22 * tri(r * 3.5 + 0.5) }), extras: ['spikes'] },
    mohawk: {
      vol: 2.8, dy: 1.2, tex: 'clumps', clumps: 7, twist: 0,
      pred: (f, r, u) => Math.abs(r) < 0.26 && u > -0.25 && !(f > 0.3 && u < 0.5), shaved: true, twoSided: true,
    },
  };

  function hairEllipse(R, st) {
    const v = st.vol;
    return { cx: R.hcx, cy: R.hcy - 1 - (st.dy || 0), rx: R.face.rx + 0.6 + v, ry: R.face.ry + 0.4 + v * 0.9 };
  }

  // Hair is shaded as locks radiating from the crown: each lock gets its own light side and
  // shadow side on top of the overall sphere shading, with a dark gap between locks.
  function hairTone(R, e, st) {
    const n = st.clumps || 9, tw = st.twist || 0;
    return (sx, sy, t) => {
      const l = local(R, e, designX(R, sx) + 0.5, sy + 0.5);
      if (!l || st.tex === 'fine') return t;
      if (l.u > 0.95) return t;
      const lon = Math.atan2(l.r, l.f);
      const v = frac((lon * n) / (2 * Math.PI) + l.u * tw + 0.3);
      if (st.tex === 'combed') return v < 0.14 ? t + 1 : t;
      if (v < 0.13) return Math.min(3, t + 1 + (t >= 1 ? 1 : 0));
      if (v < 0.32) return t + 1;
      if (v > 0.62 && v < 0.84 && t <= 1 && l.u > -0.2) return t - 1;
      return t;
    };
  }

  const HAIR_TH = [0.82, 0.18, -0.45];

  function hasHat(R, kinds) {
    return kinds.includes(R.cfg.hat);
  }

  // Extras (bun, tails, curtain...) carry a layer so the body assembler can put each one
  // behind the body, over the back, or in front of the head.
  function hairExtras(R) {
    const st = HAIR[R.cfg.hair];
    if (!st || !st.extras) return [];
    const e = hairEllipse(R, st);
    const hr = R.ramps.hair;
    const out = [];
    const sway = R.pose.sway || 0;
    const tailTone = (sx, sy, t) => ((designX(R, sx) + Math.floor(sy / 3)) % 3 === 0 ? t + 1 : t);

    const ball = (fr, cx, cy, rad) => {
      const ell = { cx, cy, rx: rad, ry: rad * 0.95 };
      const ecx = R.mirror ? R.W - cx : cx;
      fr.draw(fr.mask().ellipse(cx, cy, rad, rad * 0.95), {
        ramp: hr, shade: 'sphere', ell, th: HAIR_TH, outline: 'full', tag: TAG.hair,
        tone: (sx, sy, t) => {
          const dx = (sx + 0.5 - ecx) / rad, dy = (sy + 0.5 - cy) / rad;
          const d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
          return d > 0.35 && d < 0.62 && Math.sin(a + d * 6) > -0.1 ? t + 1 : t;
        },
      });
    };

    for (const kind of st.extras) {
      if (kind === 'bun') {
        if (hasHat(R, ['cap', 'beanie', 'wizard', 'sunhat'])) continue;
        const b = st.bun;
        const p = proj(R, e, b.f * 1.1, b.r * 1.1, b.u * 1.1);
        out.push({
          layer: p.z < 0 ? 'behind' : 'front',
          draw(fr) {
            if (b.cluster) {
              // a loose curly bun: three overlapping puffs
              const q1 = proj(R, e, b.f * 1.1 - 0.35, b.r * 1.1 + 0.4, b.u);
              const q2 = proj(R, e, b.f * 1.1 + 0.2, b.r * 1.1 - 0.45, b.u * 1.05);
              const back = [q1, q2].sort((a, c) => a.z - c.z);
              for (const q of back) ball(fr, q.x, q.y - 0.5, b.rad * 0.72);
            }
            ball(fr, p.x, p.y, b.rad);
          },
        });
      } else if (kind === 'ponytail' || kind === 'pigtails') {
        const anchors = kind === 'ponytail' ? [{ f: -0.92, r: 0, u: 0.32 }] : [{ f: -0.15, r: 0.96, u: 0.18 }, { f: -0.15, r: -0.96, u: 0.18 }];
        for (const a of anchors) {
          const p = proj(R, e, a.f, a.r, a.u);
          const side = kind === 'ponytail' ? -R.F.x : Math.sign(p.x - e.cx) || 1;
          const len = kind === 'ponytail' ? 16 : 13;
          const pts = [
            [p.x, p.y], [p.x + side * 2.6, p.y + 4],
            [p.x + side * 3 + sway * 0.6, p.y + len * 0.62], [p.x + side * 2.2 + sway, p.y + len],
          ];
          out.push({
            layer: p.z > 0.3 ? 'front' : p.z < -0.15 ? 'behind' : 'overBack',
            draw(fr) {
              fr.draw(fr.mask().stroke(pts, [2.9, 1.5]), { ramp: hr, shade: 'cyl', th: HAIR_TH, outline: 'full', tag: TAG.hair, tone: tailTone });
            },
          });
        }
      } else if (kind === 'curtain') {
        const cxh = R.hcx - R.F.x * 3;
        const hw = (R.face.rx + 1.2) * (0.62 + 0.38 * Math.abs(R.c));
        const top = R.hcy - 4, bot = R.sy + 13;
        const strands = (sx, sy, t) => ((Math.round(designX(R, sx) - cxh) % 3 === 0) && sy > R.hcy ? t + 1 : t);
        out.push({
          layer: R.c > 0.1 ? 'behind' : 'overBack',
          draw(fr) {
            const m = fr.mask().poly([
              [cxh - hw, top], [cxh + hw, top], [cxh + hw + 0.6, bot - 3], [cxh + hw - 1.5 + sway * 0.5, bot],
              [cxh - hw + 1.5 + sway * 0.5, bot], [cxh - hw - 0.6, bot - 3],
            ]);
            fr.draw(m, { ramp: hr, shade: 'cyl', th: HAIR_TH, outline: 'full', tag: TAG.hair, tone: strands });
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
              const m = fr.mask().stroke([[p.x, p.y], [p.x + sdir * 0.8, R.sy + 4], [p.x + sdir * 0.5, R.sy + 9]], [2, 1.4]);
              fr.draw(m, { ramp: hr, shade: 'cyl', th: HAIR_TH, outline: 'full', tag: TAG.hair, tone: tailTone });
            },
          });
        }
      } else if (kind === 'curlLocks') {
        // springy curls that fall beside the cheeks
        for (const side of [1, -1]) {
          const p = proj(R, R.face, 0.1, side * 0.99, 0.1);
          if (p.z < 0.1) continue;
          const d = Math.sign(p.x - R.face.cx) || side;
          const x = p.x + d * 0.8, y = p.y - 1;
          out.push({
            layer: 'front',
            draw(fr) {
              const m = fr.mask().stroke([[x, y], [x + d * 1.2, y + 2.5], [x - d * 0.2, y + 5], [x + d * 1, y + 7.5], [x + d * 0.2, y + 9]], 0.95);
              fr.draw(m, { ramp: hr, shade: 'flat', flat: 1, outline: 'outer', tag: TAG.hair,
                tone: (sx, sy, t) => ((sy + designX(R, sx)) % 3 === 0 ? 2 : t) });
            },
          });
        }
      }
    }
    return out;
  }

  function spikesMask(R, e, m) {
    const ring = [];
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2 + 0.3;
      ring.push({ f: Math.cos(a) * 0.62, r: Math.sin(a) * 0.62, u: 0.78 });
    }
    ring.push({ f: -0.2, r: 0, u: 1 });
    for (const s of ring) {
      const b = proj(R, e, s.f * 0.95, s.r * 0.95, s.u * 0.95);
      const t = proj(R, e, s.f * 1.5, s.r * 1.5, s.u * 1.4);
      if (t.z < -0.5 && s.u < 0.9) continue;
      const dx = t.x - b.x, dy = t.y - b.y, ln = Math.hypot(dx, dy) || 1;
      const px = (-dy / ln) * 2.4, py = (dx / ln) * 2.4;
      m.poly([[b.x + px, b.y + py], [t.x, t.y], [b.x - px, b.y - py]]);
    }
  }

  // Curly styles get a scalloped silhouette: small puffs where hair meets the rim.
  function tuftsMask(R, e, m, n) {
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      const rx = Math.cos(a), ry = Math.sin(a);
      const ix = e.cx + rx * (e.rx - 1.4), iy = e.cy + ry * (e.ry - 1.4);
      if (!m.hasD(Math.floor(ix), Math.floor(iy))) continue;
      m.ellipse(e.cx + rx * (e.rx - 0.1), e.cy + ry * (e.ry - 0.1), 1.9, 1.7);
    }
  }

  // ---------------------------------------------------------------- face
  // Eye templates: rows top to bottom; columns inner (nose side) to outer.
  // k = dark, i = iris, w = white glint, s = lid shadow, . = skin.
  const EYES = {
    default: ['kkk', 'wik', 'ii.'],
    round: ['kkk', 'iwi', 'iii'],
    happy: ['.k.', 'k.k'],
    sleepy: ['...', 'kkk', 'ii.'],
    closed: ['...', 'kkk'],
    stern: ['kk.', 'iik', 'ii.'],
    beady: ['.k.', '.k.'],
  };
  const BROWS = { normal: [0, 0, 0], thick: [0, 0, 0], angry: [1, 0, 0], worried: [-1, 0, 1], soft: [0, 0, 1] };

  function faceMask(R) {
    const e = R.face;
    const m = R.fr.mask();
    const s = R.s;
    m.fill(e.cx - e.rx - 2, e.cy - e.ry - 1, e.cx + e.rx + 2, e.cy + e.ry + 1, (px, py) => {
      const dyn = (py - e.cy) / e.ry;
      const jaw = dyn > 0 ? dyn : 0;
      const k = 1 - (0.36 + 0.35 * Math.max(0, -R.c)) * jaw * jaw;
      const dx = px - e.cx - s * 1.2 * jaw * jaw;
      if (R.c < -0.1 && dyn > 0.45 && Math.abs(dx) > 2.8) return false; // back view: only the neck below the skull
      return Math.abs(dx / (e.rx * k)) ** 2.4 + Math.abs(dyn) ** 2.4 <= 1;
    });
    return m;
  }

  function noseX(R) {
    return proj(R, R.face, 0.97, 0, -0.18, 0.8).x;
  }

  function eyePositions(R) {
    const out = [];
    const nx = noseX(R);
    for (const side of [1, -1]) {
      const p = proj(R, R.face, 0.8, side * 0.6, 0.02, 0.8);
      if (p.z < 0.15) continue;
      const narrow = p.z < 0.62;
      const x = Math.floor(p.x);
      const outward = x + 0.5 < nx ? -1 : 1;
      out.push({ x, top: Math.floor(p.y) - 1, outward, side, narrow });
    }
    return out;
  }

  // columns of an eye, inner to outer, as design-space x
  function eyeCols(ey) {
    const cols = [ey.x - ey.outward, ey.x, ey.x + ey.outward];
    return ey.narrow ? cols.slice(0, 2) : cols;
  }

  function lipColors(R) {
    const skin = R.ramps.skin;
    const lips = { natural: '#8a3a40', red: '#b0283a', plum: '#6a2448', pink: '#d0507a' }[R.cfg.lips || 'natural'] || '#8a3a40';
    return { line: mix(hex(lips), skin[3], R.cfg.lips === 'natural' || !R.cfg.lips ? 0.45 : 0.15), inner: mix(hex('#8a2030'), hex(lips), 0.4), tongue: mix(skin[2], hex('#d05060'), 0.6) };
  }

  function drawFaceDetails(fr, R, eyes) {
    const cfg = R.cfg;
    const skin = R.ramps.skin;
    const dark = mix(skin[3], R.style.color, 0.8);
    const iris = mix(hex(cfg.eyeColor), dark, 0.1);
    const white = hex('#fbf6f0');
    const browCol = mix(R.ramps.hair[3], R.style.color, 0.25);
    const tpl = EYES[cfg.eyes] || EYES.default;

    for (const ey of eyes) {
      const cols = eyeCols(ey);
      tpl.forEach((row, j) => {
        cols.forEach((x, i) => {
          const ch = row[i];
          const y = ey.top + j;
          if (ch === 'k') fr.pc(x, y, dark, TAG.eye);
          else if (ch === 'i') fr.pc(x, y, iris, TAG.eye);
          else if (ch === 'w') fr.pc(x, y, white, TAG.eye);
          else if (ch === 's') fr.px(x, y, skin, 2, TAG.skin);
        });
      });
      // brows two rows above the lash line
      if (cfg.brows !== 'none' && !(cfg.glasses && cfg.glasses !== 'none')) {
        const offs = BROWS[cfg.brows] || BROWS.normal;
        const lift = cfg.glasses && cfg.glasses !== 'none' ? 1 : 0; // keep a skin row between brow and frame
        cols.forEach((x, i) => {
          const y = ey.top - 2 - lift + offs[i] + (cfg.eyes === 'stern' && i === 0 ? 1 : 0);
          fr.pc(x, y, browCol, TAG.hair);
          if (cfg.brows === 'thick') fr.pc(x, y - 1, browCol, TAG.hair);
        });
      }
      // cheeks under the outer corner
      const cy = ey.top + tpl.length + 1;
      const outerX = cols[cols.length - 1];
      if (cfg.cheeks === 'blush') {
        const pink = mix(skin[1], hex('#e8607a'), 0.35);
        fr.pc(outerX, cy, pink, TAG.skin);
        if (!ey.narrow) fr.pc(cols[1], cy, pink, TAG.skin);
      } else if (cfg.cheeks === 'freckles') {
        fr.px(outerX, cy, skin, 3, TAG.skin);
        if (!ey.narrow) { fr.px(cols[1], cy + 1, skin, 3, TAG.skin); fr.px(cols[0], cy, skin, 2, TAG.skin); }
      }
    }

    // nose
    const profile = Math.abs(R.F.x) > 0.9;
    const np = proj(R, R.face, 0.97, 0, -0.18, 0.8);
    if (np.z > 0.1 && cfg.nose !== 'none') {
      const y = Math.floor(np.y);
      if (profile) {
        let edge = -1;
        for (let x = 0; x < R.W; x++) if (R.faceMask.hasD(x, y)) edge = x;
        if (edge >= 0) { fr.bump(edge + 1, y, skin, 1, TAG.skin); fr.px(edge, y + 1, skin, 2, TAG.skin); }
      } else {
        fr.px(Math.floor(np.x), y, skin, 2, TAG.skin);
        if (R.c > 0.9) fr.px(Math.floor(np.x), y - 1, skin, 0, TAG.skin);
      }
    }

    drawFacialHair(fr, R);

    // mouth: templates are written left to right on screen around the mouth centre
    const mp = proj(R, R.face, 0.84, 0, -0.42, 0.8);
    if (mp.z > 0.1 && cfg.mouth !== 'none') {
      const col = lipColors(R);
      const MOUTHS = {
        neutral: ['mm'],
        smile: ['m..m', '.mm.'],
        open: ['mmmm', '.rr.'],
        grin: ['mmmm', 'mwwm', '.mm.'],
        frown: ['.mm.', 'm..m'],
        smirk: ['...m', '.mm.'],
      };
      let rows = MOUTHS[cfg.mouth] || MOUTHS.neutral;
      if (Math.abs(R.F.x) > 0.5) rows = rows.map((r) => (r.length > 2 ? r.slice(1, -1) || r : r)); // turned head: narrower mouth
      if (profile) rows = rows.map((r) => r.slice(-2));
      const w = rows[0].length;
      const x0 = profile ? Math.floor(mp.x) - 1 : Math.round(mp.x - w / 2);
      const y0 = Math.floor(mp.y);
      rows.forEach((row, j) => {
        for (let i = 0; i < row.length; i++) {
          const ch = row[i];
          const x = x0 + i, y = y0 + j;
          if (ch === '.' || !R.faceMask.hasD(x, y)) continue;
          fr.pc(x, y, ch === 'm' ? col.line : ch === 'r' ? col.inner : ch === 'w' ? hex('#fbf6f0') : col.tongue, TAG.skin);
        }
      });
    }
  }

  function drawFacialHair(fr, R) {
    const kind = R.cfg.facialHair;
    if (!kind || kind === 'none') return;
    const e = { ...R.face, ry: R.face.ry + 1.2 };
    const preds = {
      stubble: (l) => l.u < -0.24 && l.f > -0.2,
      beard: (l) => l.u < -0.2 && l.f > -0.28,
      goatee: (l) => l.u < -0.48 && Math.abs(l.r) < 0.34 && l.f > 0.3,
      mustache: (l) => l.u < -0.3 && l.u > -0.48 && Math.abs(l.r) < 0.44 && l.f > 0.4,
    };
    const pred = preds[kind];
    const m = fr.mask().fill(e.cx - e.rx - 2, e.cy - 1, e.cx + e.rx + 2, e.cy + e.ry + 1, (px, py) => {
      const l = local(R, e, px, py);
      if (!l || !pred(l)) return false;
      const x = Math.floor(px), y = Math.floor(py);
      return R.faceMask.hasD(x, y) || R.faceMask.hasD(x, y - 1) || (kind === 'beard' && R.faceMask.hasD(x, y - 2));
    });
    if (kind === 'stubble') {
      const c = mix(R.ramps.skin[1], R.ramps.hair[2], 0.32);
      for (let y = 0; y < fr.h; y++) for (let x = 0; x < fr.w; x++) if (m.has(x, y) && R.faceMask.has(x, y) && fr.tag[y * fr.w + x] === TAG.skin) fr.putColor(x, y, c, TAG.skin);
      return;
    }
    fr.draw(m, { ramp: R.ramps.hair, shade: 'sphere', ell: R.face, th: HAIR_TH, outline: 'outer', tag: TAG.hair,
      tone: hairTone(R, R.face, { tex: 'curls', clumps: 14, twist: 0.5 }) });
  }

  function ears(R) {
    const list = [];
    for (const side of [1, -1]) {
      const p = proj(R, R.face, -0.08, side, -0.08);
      if (p.z < -0.25) continue;
      const X = (p.x - R.face.cx) / R.face.rx;
      const y = Math.floor(p.y) - 1;
      if (Math.abs(X) >= 0.85) {
        const dir = Math.sign(X);
        let edge = null;
        for (let x = 0; x < R.W; x++) if (R.faceMask.hasD(x, y + 1)) { if (dir < 0 && edge === null) edge = x; if (dir > 0) edge = x; }
        if (edge !== null) list.push({ kind: 'edge', x: edge + dir, y, side: dir });
      } else if (p.z > 0.3) {
        list.push({ kind: 'inner', x: Math.floor(p.x), y, back: -Math.sign(R.F.x) || -1 });
      }
    }
    return list;
  }

  // ---------------------------------------------------------------- hats
  function drawHat(fr, R, phase) {
    const kind = R.cfg.hat;
    if (!kind || kind === 'none') return;
    const hr = R.ramps.hat;
    const st = HAIR[R.cfg.hair];
    const vol = st ? Math.max(1, Math.min(st.vol, 1.8)) : 0.7;
    const e = { cx: R.hcx, cy: R.hcy - 1 - (st && st.dy ? Math.min(st.dy, 0.5) : 0), rx: R.face.rx + 0.6 + vol, ry: R.face.ry + 0.4 + vol * 0.9 };
    const crown = (cut, grow = 0) => {
      const eb = { ...e, rx: e.rx + grow, ry: e.ry + grow };
      return { eb, m: fr.mask().fill(eb.cx - eb.rx - 1, eb.cy - eb.ry - 1, eb.cx + eb.rx + 1, eb.cy + eb.ry, (px, py) => { const l = local(R, eb, px, py); return !!l && l.u > cut; }) };
    };
    const disc = (radF, radR, u, f0 = 0) => {
      const pts = [];
      for (let a = 0; a < 360; a += 15) {
        const t = (a * Math.PI) / 180;
        const p = proj(R, e, f0 + radF * Math.cos(t), radR * Math.sin(t), u);
        pts.push([p.x, p.y]);
      }
      return fr.mask().poly(pts);
    };

    if (kind === 'cap') {
      const brim = () => {
        const pts = [];
        for (let a = -90; a <= 90; a += 15) {
          const t = (a * Math.PI) / 180;
          const p = proj(R, e, 0.45 + 0.75 * Math.cos(t), 0.88 * Math.sin(t), 0.3);
          pts.push([p.x, p.y]);
        }
        fr.draw(fr.mask().poly(pts), { ramp: hr, shade: 'flat', flat: 2, outline: 'full', tag: TAG.cloth });
      };
      const behind = R.c < -0.2;
      if (phase === 'before') { if (behind) brim(); return; }
      const { m } = crown(0.3);
      fr.draw(m, { ramp: hr, shade: 'sphere', ell: e, outline: 'full', tag: TAG.cloth,
        tone: (sx, sy, t) => { const l = local(R, e, designX(R, sx) + 0.5, sy + 0.5); return l && Math.abs(l.r) < 0.06 && l.f > 0 ? t + 1 : t; } });
      const btn = proj(R, e, 0, 0, 1);
      fr.px(Math.floor(btn.x), Math.floor(btn.y) + 1, hr, 0, TAG.cloth);
      if (!behind) brim();
    } else if (kind === 'beanie') {
      if (phase === 'before') return;
      const { eb, m } = crown(0.04, 0.4);
      fr.draw(m, { ramp: hr, shade: 'sphere', ell: eb, outline: 'full', tag: TAG.cloth,
        tone: (sx, sy, t) => {
          const l = local(R, eb, designX(R, sx) + 0.5, sy + 0.5);
          if (!l) return t;
          if (l.u < 0.3) return Math.max(t, 1) + (frac((Math.atan2(l.r, l.f) * 10) / (2 * Math.PI)) < 0.3 ? 1 : 0);
          return frac((Math.atan2(l.r, l.f) * 9) / (2 * Math.PI)) < 0.22 ? t + 1 : t;
        } });
    } else if (kind === 'headband') {
      if (phase === 'before') return;
      // sits on the real hair volume, just behind the hairline
      const he = st ? hairEllipse(R, st) : e;
      const m = fr.mask().fill(he.cx - he.rx - 1, he.cy - he.ry, he.cx + he.rx + 1, he.cy + he.ry, (px, py) => {
        const l = local(R, he, px, py);
        return !!l && l.u > 0.34 && l.u < 0.56;
      });
      fr.draw(m, { ramp: hr, shade: 'sphere', ell: he, outline: 'full', tag: TAG.cloth,
        tone: (sx, sy, t) => ((designX(R, sx) + sy) % 4 === 0 ? t + 1 : t) });
    } else if (kind === 'sunhat') {
      if (phase === 'before') return;
      const brim = disc(1.75, 1.75, 0.3);
      fr.draw(brim, { ramp: hr, shade: 'flat', flat: 1, outline: 'full', tag: TAG.cloth,
        tone: (sx, sy, t) => ((designX(R, sx) + sy * 2) % 5 === 0 ? 2 : t) });
      // a rounded crown standing above the brim, with a ribbon round its base
      const ce = { cx: e.cx, cy: e.cy - e.ry * 0.42, rx: e.rx * 0.74, ry: e.ry * 0.6 };
      const cm = fr.mask().fill(ce.cx - ce.rx - 1, ce.cy - ce.ry - 1, ce.cx + ce.rx + 1, ce.cy + ce.ry + 1, (px, py) => {
        const l = local(R, ce, px, py);
        return !!l && l.u > -0.15;
      });
      fr.draw(cm, { ramp: hr, shade: 'sphere', ell: ce, outline: 'full', tag: TAG.cloth });
      const band = cm.clone().keep((x, y) => { const l = local(R, ce, designX(R, x) + 0.5, y + 0.5); return !!l && l.u < 0.22; });
      fr.draw(band, { ramp: R.ramps.top2, shade: 'cyl', outline: 'none', tag: TAG.cloth });
    } else if (kind === 'wizard') {
      if (phase === 'before') return;
      const bu = 0.42;
      fr.draw(disc(1.3, 1.3, bu), { ramp: hr, shade: 'flat', flat: 2, outline: 'full', tag: TAG.cloth });
      const c = proj(R, e, 0, 0, bu);
      const base = e.rx * 0.95;
      const tipX = c.x - R.F.x * 4, tipY = Math.max(1, c.y - 15);
      const midX = c.x - R.F.x * 0.6, midY = c.y - 8;
      const cone = fr.mask().poly([[c.x - base, c.y + 0.5], [midX - base * 0.45, midY], [tipX, tipY], [midX + base * 0.45, midY], [c.x + base, c.y + 0.5]]);
      fr.draw(cone, { ramp: hr, shade: 'cyl', outline: 'full', tag: TAG.cloth });
      const band = fr.mask().poly([[c.x - base, c.y + 0.5], [c.x - base * 0.85, c.y - 2], [c.x + base * 0.85, c.y - 2], [c.x + base, c.y + 0.5]]);
      band.intersect(cone);
      fr.draw(band, { ramp: R.ramps.top2, shade: 'cyl', outline: 'none', tag: TAG.cloth });
    }
  }

  // ---------------------------------------------------------------- glasses, earrings
  function drawGlasses(fr, R, eyes, earList) {
    const kind = R.cfg.glasses;
    if (!kind || kind === 'none' || !eyes.length) return;
    const col = hex(R.cfg.glassesColor);
    const lens = mix(hex('#1c1c2a'), col, 0.2);
    const glint = mix(R.ramps.skin[0], hex('#ffffff'), 0.6);
    const boxes = eyes.map((ey) => {
      const cols = eyeCols(ey);
      const inner = cols[0], outer = cols[cols.length - 1] + (ey.narrow ? 0 : ey.outward);
      const x0 = Math.min(inner, outer) - 1, x1 = Math.max(inner, outer) + 1;
      return { x0, x1, y0: ey.top - 1, y1: ey.top + 3, ey };
    });
    for (const b of boxes) {
      for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) {
        const edgeX = x === b.x0 || x === b.x1, edgeY = y === b.y0 || y === b.y1;
        const corner = edgeX && edgeY;
        if (kind === 'shades') {
          if (kind === 'shades' && corner) continue;
          fr.pc(x, y, x === b.x0 + 1 && y === b.y0 + 1 ? glint : edgeX || edgeY ? col : lens, TAG.other);
          continue;
        }
        if (!(edgeX || edgeY)) continue;
        if (kind === 'round' && corner) continue;
        fr.pc(x, y, col, TAG.other);
      }
      if (kind !== 'shades') fr.pc(b.ey.outward > 0 ? b.x1 - 1 : b.x0 + 1, b.y0 + 1, glint, TAG.other);
    }
    if (boxes.length === 2) {
      const [a, b] = boxes[0].x0 < boxes[1].x0 ? boxes : [boxes[1], boxes[0]];
      for (let x = a.x1 + 1; x < b.x0; x++) fr.pc(x, a.y0 + 1, col, TAG.other);
    }
    // temple arm toward a visible ear in 3/4 and side views
    const ear = earList.find((e) => e.kind === 'inner');
    if (ear) {
      const b = boxes.reduce((a, c) => (Math.abs((c.x0 + c.x1) / 2 - ear.x) < Math.abs((a.x0 + a.x1) / 2 - ear.x) ? c : a));
      const step = ear.x < b.x0 ? -1 : 1;
      for (let x = step < 0 ? b.x0 - 1 : b.x1 + 1; step < 0 ? x > ear.x : x < ear.x; x += step) fr.pc(x, b.y0 + 1, col, TAG.other);
    }
  }

  function drawEarrings(fr, R, earList) {
    const kind = R.cfg.earrings;
    if (!kind || kind === 'none') return;
    const g = ramp(R.cfg.earringColor || '#e0aa38');
    for (const ear of earList) {
      const x = ear.x, y = ear.y + 4;
      if (kind === 'studs') fr.bump(x, y, g, 0, TAG.other);
      else if (kind === 'hoops') {
        fr.bump(x, y + 1, g, 1, TAG.other); fr.bump(x - 1, y + 2, g, 1, TAG.other); fr.bump(x + 1, y + 2, g, 2, TAG.other); fr.bump(x, y + 3, g, 2, TAG.other);
      } else {
        fr.bump(x, y, g, 1, TAG.other); fr.bump(x, y + 1, g, 0, TAG.other); fr.bump(x, y + 2, g, 2, TAG.other);
      }
    }
  }

  // Hair throws a one-pixel shadow onto the skin right under its edge.
  function castShadow(fr, fm) {
    const { w, h } = fr;
    for (let y = 1; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!fm.has(x, y) || fr.tag[i] !== TAG.skin || fr.rid[i] < 0 || fr.tone[i] > 1) continue;
      const a = i - w;
      const above = fr.tag[a] === TAG.hair || (fr.rid[a] === -2 && y > 1 && fr.tag[a - w] === TAG.hair);
      if (above) { fr.tone[i] = 2; fr.col[i] = fr.ramps[fr.rid[i]][2]; }
    }
  }

  // ---------------------------------------------------------------- public entry point
  function drawHead(fr, R, extras) {
    const skin = R.ramps.skin;
    const st = HAIR[R.cfg.hair];
    R.fr = fr;
    const fm = faceMask(R);
    R.faceMask = fm;
    const earList = ears(R);

    drawHat(fr, R, 'before');
    for (const ear of earList.filter((e) => e.kind === 'edge')) {
      fr.draw(fr.mask().ellipse(ear.x + ear.side * 0.3, ear.y + 2, 1.4, 2.3), { ramp: skin, shade: 'flat', flat: 1, outline: 'full', tag: TAG.skin });
    }
    fr.draw(fm, { ramp: skin, shade: 'sphere', ell: R.face, th: [0.97, 0.02, -0.85], outline: 'full', tag: TAG.skin });
    for (const ear of earList) {
      if (ear.kind === 'edge') { fr.px(ear.x, ear.y + 1, skin, 2, TAG.skin); fr.px(ear.x, ear.y + 2, skin, 2, TAG.skin); }
      else {
        for (let j = 0; j < 4; j++) fr.px(ear.x, ear.y + j, skin, j === 0 || j === 3 ? 2 : 1, TAG.skin);
        fr.px(ear.x + ear.back, ear.y + 1, skin, 2, TAG.skin); fr.px(ear.x + ear.back, ear.y + 2, skin, 2, TAG.skin);
        fr.px(ear.x - ear.back, ear.y + 1, skin, 3, TAG.skin); fr.px(ear.x - ear.back, ear.y + 2, skin, 3, TAG.skin);
      }
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
        if (st.twoSided && !fm.hasD(Math.floor(px), Math.floor(py)) && Math.abs(R.Rv.z) > 0.2) {
          // a fin (mohawk) stands on the head's centre plane: test that plane along this line of sight
          const nyUp = -l.ny, X = l.nx;
          const dmax = Math.sqrt(Math.max(0, 1 - X * X - nyUp * nyUp));
          const Z = (-X * R.Rv.x) / R.Rv.z;
          const d = (Z + nyUp * SP) / CP;
          if (Math.abs(d) <= dmax) return st.pred(X * R.F.x + Z * R.F.z, 0, nyUp * CP + d * SP);
        }
        return false;
      });
      if (R.cfg.hair === 'spiky' && !hasHat(R, ['cap', 'beanie', 'sunhat', 'wizard'])) spikesMask(R, e, m);
      if (st.tufts) tuftsMask(R, e, m, st.tufts);
      if (st.shaved) {
        const se = { ...R.face, cy: R.face.cy - 0.5 };
        const c = mix(skin[1], R.ramps.hair[2], 0.25);
        for (let y = 0; y < fr.h; y++) for (let x = 0; x < fr.w; x++) {
          if (!fm.has(x, y)) continue;
          const l = local(R, se, designX(R, x) + 0.5, y + 0.5);
          if (l && (l.u > 0.5 || (l.f < 0.2 && l.u > -0.3)) && !(Math.abs(l.r) > 0.6 && l.u < 0.2 && l.u > -0.5)) fr.putColor(x, y, c, TAG.skin);
        }
      }
      fr.draw(m, { ramp: R.ramps.hair, shade: 'sphere', ell: e, th: HAIR_TH, outline: 'full', tag: TAG.hair, tone: hairTone(R, e, st) });
      castShadow(fr, fm);
    }

    for (const x of extras.filter((x) => x.layer === 'front')) x.draw(fr);
    drawHat(fr, R, 'after');
    if (faceVisible) drawGlasses(fr, R, eyes, earList);
    drawEarrings(fr, R, earList);
  }

  SG.head = { HAIR, EYES, hairExtras, drawHead, proj, local };
})();
