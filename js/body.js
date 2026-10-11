// Rig, body, clothing, held items and frame assembly.
// Native frame is 48 x 72: about one 64 x 32 floor tile wide, feet planted at the pivot.
(function () {
  const SG = (window.SG = window.SG || {});
  const { ramp, rampSoft, pack, hexToRgb, mix } = SG.color;
  const { BUILDS, HEIGHTS } = SG.catalog;
  const TAG = SG.TAG;

  const DIRS = (SG.DIRS = ['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW']);
  const FRAME = (SG.FRAME = { w: 48, h: 72, pivotFromBottom: 5 });
  const r6 = (v) => Math.round(v * 1e6) / 1e6;
  const hex = (h) => pack(...hexToRgb(h));

  const TOPS = {
    none: { sleeve: 'none', skinTorso: true },
    tank: { sleeve: 'none', tank: true },
    tshirt: { sleeve: 'short', neck: 'crew' },
    longsleeve: { sleeve: 'long', neck: 'crew' },
    buttonup: { sleeve: 'long', collar: true, buttons: true },
    sweater: { sleeve: 'long', neck: 'crew', band: true },
    hoodie: { sleeve: 'long', hood: true, pocket: true, band: true },
    jacket: { sleeve: 'long', open: true, hem: 2, flare: 0.5, cuffs: true },
    coat: { sleeve: 'long', open: true, hem: 12, flare: 2, cuffs: true },
    apron: { sleeve: 'short', apron: true, neck: 'crew', shirtFromTrim: true },
    tunic: { sleeve: 'long', hem: 5, flare: 1, belt: true, neck: 'crew' },
    dress: { sleeve: 'short', hem: 12, flare: 4, neck: 'scoop' },
    robe: { sleeve: 'long', hem: 22, flare: 3.5, belt: true, wide: true, neck: 'v' },
  };

  function makeRig(cfg, dirName, pose, W, H, style) {
    const di = DIRS.indexOf(dirName);
    let deg = di * 45, mirror = false;
    if (deg > 180) { deg = 360 - deg; mirror = true; }
    const t = (deg * Math.PI) / 180;
    const c = r6(Math.cos(t)), s = r6(Math.sin(t));
    const b = BUILDS[cfg.build] || BUILDS.average;
    const hg = HEIGHTS[cfg.height] || 0;
    const cx = W / 2;
    const ground = H - FRAME.pivotFromBottom; // bottom shoe row when standing
    const up = -hg + (pose.bob || 0);
    const breath = pose.breath || 0;
    const lean = pose.lean || 0;
    const hipY = ground - 20 + up;
    const sy = hipY - 12 + breath;
    const hcx = cx + s * lean;
    const hcy = sy - 11;
    // a turned torso keeps its front width in 3/4 views and only slims in profile
    const hw = Math.round(b.bw * (1 - 0.3 * s ** 4));
    const carrying = cfg.held && cfg.held !== 'none';

    const ramps = {
      skin: rampSoft(cfg.skin), hair: ramp(cfg.hairColor), top: ramp(cfg.topColor), top2: ramp(cfg.top2Color),
      bottom: ramp(cfg.bottomColor), shoe: ramp(cfg.shoeColor), hat: ramp(cfg.hatColor), back: ramp(cfg.backColor),
    };

    const R = {
      cfg, pose, W, H, mirror, deg, c, s, F: { x: s, z: c }, Rv: { x: -c, z: s }, b, cx, ground, sy, hipY, hcx, hcy, hw,
      face: { cx: hcx, cy: hcy, rx: 8, ry: 8.2 }, ramps, style, carrying,
    };

    // arms: index 0 = character's right. Each arm grows out of the shoulder, drifts out at the
    // elbow and comes back in toward the hip, like a relaxed arm rather than a straight tube.
    R.arms = [1, -1].map((r, i) => {
      const out = -c * r; // screen-x direction away from the body
      const side = Math.sign(out);
      const reach = r * s < -0.3 ? hw - 1.8 : hw + 0.3; // the far arm in 3/4 views tucks behind
      const shx = cx + s * lean * 0.6 + side * reach;
      const shy = sy + 2.4;
      if (carrying && i === 0) {
        // carry pose: elbow tucked, forearm forward across the chest
        const ex = shx + side * 0.6 - s * 0.5, ey = sy + 6.4;
        const wx = cx + s * (hw + 0.5) - c * r * 0.8, wy = sy + 8 + c * 0.5;
        return { r, out, depth: r * s, carry: true, sh: [shx, shy], el: [ex, ey], wr: [wx, wy], hand: [wx + s * 0.4, wy + 0.4] };
      }
      const sw = (pose.arms && pose.arms[i]) || 0;
      const ex = shx + side * 1.2 + s * sw * 0.45, ey = sy + 7.2 + c * sw * 0.2;
      const wx = shx + side * 1.0 + s * sw, wy = sy + 12.6 + c * sw * 0.5 - Math.abs(sw) * 0.35;
      return { r, out, depth: r * s, sh: [shx, shy], el: [ex, ey], wr: [wx, wy], hand: [wx + s * 0.4, wy + 1.4] };
    });

    // legs: feet step along the facing direction, in depth as well as sideways
    R.legs = [1, -1].map((r, i) => {
      const L = (pose.legs && pose.legs[i]) || { st: 0, lift: 0 };
      const lift = L.lift || 0;
      const hipX = cx - c * r * (b.lw / 2 + 0.2);
      const fx = hipX - c * r * 0.6 + s * L.st;
      const fy = ground + Math.round(c * L.st * 0.5) - Math.round(lift);
      const ankle = [fx, fy - 3];
      const hip = [hipX, hipY - 1];
      const bend = lift * 0.9 + Math.max(0, -L.st) * 0.12;
      const knee = [(hip[0] + ankle[0]) / 2 + s * bend, hip[1] + (ankle[1] - hip[1]) * 0.47 + c * bend * 0.5];
      return { r, depth: r * s + c * L.st * 0.03, hip, knee, ankle, fx, fy, lift };
    });
    return R;
  }

  // ---------------------------------------------------------------- legs & feet
  function legMask(fr, R, leg, grow = 0) {
    const { lw } = R.b;
    return fr.mask().stroke([leg.hip, leg.knee, leg.ankle], [lw / 2 + grow, lw / 2 - 0.7 + grow]);
  }

  function drawLeg(fr, R, leg) {
    const bot = R.cfg.bottom;
    const dim = leg.depth < -0.3 ? 1 : 0;
    if (bot === 'trousers' || bot === 'jeans') {
      fr.draw(legMask(fr, R, leg), { ramp: R.ramps.bottom, shade: 'cyl', dim, outline: 'full', tag: TAG.cloth, th: [0.84, 0.25, -0.5] });
      if (bot === 'jeans') {
        // rolled cuff: a lighter band just above the shoe
        const y1 = Math.round(leg.ankle[1]) + 1;
        const cuff = legMask(fr, R, leg, 0.4).clipY(y1 - 3, y1);
        fr.draw(cuff, { ramp: R.ramps.bottom, shade: 'flat', flat: dim ? 1 : 0, outline: 'full', tag: TAG.cloth });
      }
      return;
    }
    fr.draw(legMask(fr, R, leg), { ramp: R.ramps.skin, shade: 'cyl', dim, outline: 'full', tag: TAG.skin, th: [0.9, 0.2, -0.6] });
    if (bot === 'shorts') {
      const m = legMask(fr, R, leg, 0.4).clipY(0, Math.round(leg.knee[1]) - 1);
      fr.draw(m, { ramp: R.ramps.bottom, shade: 'cyl', dim, outline: 'full', tag: TAG.cloth });
    }
  }

  function drawShoe(fr, R, leg) {
    const kind = R.cfg.shoes;
    const { lw } = R.b;
    const dim = leg.depth < -0.3 ? 1 : 0;
    const B = leg.fy;
    const bare = kind === 'sandals' || kind === 'barefoot';
    const h = bare ? 3 : 5;
    const w = lw + 2;
    const x0 = Math.round(leg.fx - w / 2);
    const m = fr.mask().rect(x0, B - h + 1, w, h);
    m.ellipse(leg.fx + R.s * 2.6, B - 1.6 + R.c * 0.3, 3.1, bare ? 1.4 : 2.4);
    m.clipY(0, B + 1);
    if (kind === 'boots') m.rect(x0 + 0.5, B - 9, w - 1, 6);
    const footRamp = bare ? R.ramps.skin : R.ramps.shoe;
    fr.draw(m, { ramp: footRamp, shade: 'cyl', dim, outline: 'full', tag: bare ? TAG.skin : TAG.cloth, th: [0.8, 0.25, -0.5] });
    if (kind === 'sneakers') {
      fr.draw(m.clone().clipY(B, B + 1), { ramp: ramp('#cfcac4'), shade: 'flat', flat: 1 + dim, outline: 'none', tag: TAG.cloth });
      // laces
      const lx = Math.round(leg.fx + R.s * 1.2);
      if (R.c > -0.3) { fr.px(lx - 1, B - 3, footRamp, 2 + dim); fr.px(lx, B - 3, footRamp, 2 + dim); }
    } else if (kind === 'shoes') {
      fr.px(Math.round(leg.fx + R.s * 2.5) - (R.s > 0.5 ? 0 : 1), B - 2, footRamp, 0 + dim);
    } else if (kind === 'sandals') {
      fr.draw(m.clone().clipY(B - 1, B), { ramp: R.ramps.shoe, shade: 'flat', flat: 1 + dim, outline: 'none', tag: TAG.cloth });
      fr.draw(m.clone().clipY(B, B + 1), { ramp: R.ramps.shoe, shade: 'flat', flat: 2 + dim, outline: 'none', tag: TAG.cloth });
    } else if (kind === 'boots') {
      fr.draw(m.clone().clipY(B - 9, B - 8), { ramp: R.ramps.shoe, shade: 'flat', flat: 0 + dim, outline: 'none', tag: TAG.cloth });
      fr.draw(m.clone().clipY(B, B + 1), { ramp: R.ramps.shoe, shade: 'flat', flat: 3, outline: 'none', tag: TAG.cloth });
    }
  }

  function drawSkirt(fr, R) {
    const kind = R.cfg.bottom;
    if (kind !== 'skirt' && kind !== 'longskirt') return;
    const { cx, hw } = R;
    const top = R.hipY - 3;
    const bot = kind === 'skirt' ? R.hipY + 11 : R.ground - 6;
    const sw = (R.pose.sway || 0) * 0.6;
    const flare = kind === 'skirt' ? 2.5 : 3.5;
    const m = fr.mask().poly([[cx - hw + 0.5, top], [cx + hw - 0.5, top], [cx + hw + flare + sw, bot], [cx - hw - flare + sw, bot]]);
    fr.draw(m, { ramp: R.ramps.bottom, shade: 'cyl', outline: 'full', tag: TAG.cloth,
      tone: (sx, sy, t) => (sy > top + 4 && (sx + Math.floor((sy - top) / 6)) % 4 === 0 ? t + 1 : t) });
  }

  // ---------------------------------------------------------------- torso
  function torsoPts(R, hemExtra = 0, flare = 0) {
    const { cx, hw, sy, s } = R;
    const curvy = R.cfg.figure === 'curvy';
    const belly = R.b.belly || 0;
    const top = sy;
    const chest = curvy ? s * 1 : 0;
    const wW = hw - (curvy ? 1.6 : 1.1) + belly;
    const hipW = hw - 0.4 + (curvy ? 0.7 : 0) + flare;
    const hem = R.hipY + 1 + hemExtra;
    const lx = cx + s * (R.pose.lean || 0) * 0.5;
    return [
      [lx - hw + 2.6, top], [lx + hw - 2.6, top], [lx + hw - 0.6, top + 1.4], [lx + hw, top + 3.2],
      [lx + hw - 0.3 + chest, top + 5.5], [cx + wW + belly * s, top + 8.5], [cx + hipW, hem], [cx - hipW, hem],
      [cx - wW - belly * s * 0.3, top + 8.5], [lx - hw + 0.3, top + 5.5], [lx - hw, top + 3.2], [lx - hw + 0.6, top + 1.4],
    ];
  }

  function drawNeck(fr, R) {
    const nw = Math.abs(R.c) > 0.5 ? 4 : 3;
    const x = Math.round(R.hcx - nw / 2 + R.s * 0.6);
    const y0 = R.hcy + 4;
    const m = fr.mask().rect(x, y0, nw, R.sy - y0 + 3);
    fr.draw(m, { ramp: R.ramps.skin, shade: 'flat', outline: 'outer', tag: TAG.skin, tone: (sx, sy) => (sy < R.hcy + 6 ? 2 : 1) });
  }

  const CLOTH_TH = [0.84, 0.25, -0.5];

  function drawTorso(fr, R) {
    const def = TOPS[R.cfg.top] || TOPS.tshirt;
    const { cx, sy, c, s, hw } = R;
    const front = c > 0.05;
    const nx = Math.floor(cx + s * hw * 0.6); // front-centre column
    const shirt = def.shirtFromTrim ? R.ramps.top2 : R.ramps.top;
    const bandTone = def.band ? (sx, sy2, t) => (sy2 >= R.hipY - 1 ? t + 1 : t) : undefined;

    if (def.skinTorso || def.tank) {
      fr.draw(fr.mask().poly(torsoPts(R)), { ramp: R.ramps.skin, shade: 'cyl', outline: 'full', tag: TAG.skin, th: [0.9, 0.2, -0.6] });
      if (def.skinTorso) {
        if (front) { fr.px(nx, sy + 9, R.ramps.skin, 2, TAG.skin); fr.px(nx - 2, sy + 5, R.ramps.skin, 2, TAG.skin); fr.px(nx + 1, sy + 5, R.ramps.skin, 2, TAG.skin); }
        return;
      }
      const m = fr.mask().poly(torsoPts(R)).clipY(sy + 3, 999);
      const strapX = Math.abs(c) < 0.3 ? [cx - 0.5] : [cx - (hw - 2.6) * c, cx + (hw - 2.6) * c];
      for (const x of strapX) m.rect(Math.round(x - 1), sy, 2, 3);
      fr.draw(m, { ramp: R.ramps.top, shade: 'cyl', outline: 'full', tag: TAG.cloth, th: CLOTH_TH });
      if (front) for (let x = Math.round(cx - 2); x <= Math.round(cx + 1); x++) fr.px(x + Math.round(s * 2), sy + 3, R.ramps.top, 2);
      return;
    }

    const outerPts = torsoPts(R, def.hem || 0, def.flare || 0);
    if (def.open) {
      // shirt underneath, then the jacket with a V opening and lapels
      fr.draw(fr.mask().poly(torsoPts(R)), { ramp: R.ramps.top2, shade: 'cyl', outline: 'full', tag: TAG.cloth, th: CLOTH_TH });
      const outer = fr.mask().poly(outerPts);
      if (c > -0.05) {
        const ox = cx + s * hw * 0.6;
        const wt = Math.max(1.2, 3.4 * c), close = sy + 9;
        const open = fr.mask().poly([[ox - wt, sy - 1], [ox + wt, sy - 1], [ox + 0.6, close], [ox - 0.6, close]]);
        // cutaway below the last button
        open.poly([[ox, R.hipY - 2], [ox + 1.6 * c + 0.5, R.hipY + 1 + (def.hem || 0)], [ox - 1.6 * c - 0.5, R.hipY + 1 + (def.hem || 0)]]);
        outer.subtract(open);
        fr.draw(outer, { ramp: R.ramps.top, shade: 'cyl', outline: 'outer', tag: TAG.cloth, th: CLOTH_TH });
        // lapels: light fold beside the opening, dark crease outside it
        for (let y = sy; y < sy + 7; y++) for (let x = 0; x < fr.w; x++) {
          if (!outer.has(x, y)) continue;
          const dl = open.has(x - 1, y) || open.has(x + 1, y);
          const d2 = open.has(x - 2, y) || open.has(x + 2, y);
          if (dl) fr.putTone(x, y, R.ramps.top, 0, TAG.cloth);
          else if (d2 && y > sy) fr.putTone(x, y, R.ramps.top, 2, TAG.cloth);
          else if ((open.has(x - 3, y) || open.has(x + 3, y)) && y > sy + 1 && y < sy + 6) fr.putTone(x, y, R.ramps.top, 3, TAG.cloth);
        }
        for (let y = sy + 7; y < R.hipY + (def.hem || 0); y++) for (let x = 0; x < fr.w; x++) {
          if (outer.has(x, y) && (open.has(x - 1, y) || open.has(x + 1, y))) fr.putTone(x, y, R.ramps.top, 3, TAG.cloth);
        }
        // shirt collar and skin V
        const vx = Math.floor(ox);
        if (c > 0.5) {
          fr.px(vx, sy, R.ramps.skin, 1, TAG.skin); fr.px(vx - 1, sy, R.ramps.skin, 1, TAG.skin);
          fr.px(vx, sy + 1, R.ramps.skin, 2, TAG.skin); fr.px(vx - 1, sy + 1, R.ramps.skin, 2, TAG.skin);
          fr.px(vx - 2, sy, R.ramps.top2, 0); fr.px(vx + 1, sy, R.ramps.top2, 0);
          fr.px(vx - 2, sy + 1, R.ramps.top2, 0); fr.px(vx + 1, sy + 1, R.ramps.top2, 0);
          fr.px(vx - 1, sy + 2, R.ramps.top2, 1); fr.px(vx, sy + 2, R.ramps.top2, 2);
        } else if (c > 0.05) {
          fr.px(vx, sy, R.ramps.skin, 1, TAG.skin); fr.px(vx, sy + 1, R.ramps.skin, 2, TAG.skin);
          fr.px(vx + 1, sy, R.ramps.top2, 0);
        }
        // buttons and pockets
        const bx = Math.floor(ox) - (c > 0.5 ? 1 : 0);
        if (c > 0.3) { fr.px(bx, sy + 10, R.ramps.top, 3); fr.px(bx, sy + 12, R.ramps.top, 3); }
        if (c > 0.3) {
          for (const side of [-1, 1]) {
            if (side > 0 && s > 0.5) continue;
            const px0 = Math.round(cx + side * (hw - 3.2) * c + s * 1.5) - 1;
            for (let i = 0; i < 3; i++) fr.darken(px0 + i, R.hipY - 2, 1);
          }
        }
      } else {
        fr.draw(outer, { ramp: R.ramps.top, shade: 'cyl', outline: 'full', tag: TAG.cloth, th: CLOTH_TH });
        if (c < -0.5) for (let y = sy + 3; y < R.hipY + (def.hem || 0); y++) fr.darken(Math.floor(cx), y, 1);
        // collar band at the back of the neck
        for (let x = Math.round(cx - 3); x <= Math.round(cx + 2); x++) fr.px(x + Math.round(s * 1.5), sy, R.ramps.top, 0);
      }
    } else {
      const m = fr.mask().poly(outerPts);
      fr.draw(m, { ramp: shirt, shade: 'cyl', outline: 'full', tag: TAG.cloth, tone: bandTone, th: CLOTH_TH });
      if (front) {
        if (def.neck === 'crew') {
          for (let x = nx - 2; x <= nx + 1; x++) fr.px(x, sy, R.ramps.skin, 2, TAG.skin);
          for (let x = nx - 2; x <= nx + 1; x++) fr.px(x, sy + 1, shirt, 3);
        }
        if (def.neck === 'scoop' || def.neck === 'v') {
          const rows = def.neck === 'v' ? [[-2, 1], [-1, 0], [-1, 0], [0, 0]] : [[-3, 2], [-2, 1], [-1, 0]];
          rows.forEach(([a, b], j) => { for (let x = nx + a; x <= nx + b; x++) fr.px(x, sy + j, R.ramps.skin, j === 0 ? 2 : 1, TAG.skin); });
        }
        if (def.collar) {
          fr.px(nx - 1, sy, R.ramps.skin, 2, TAG.skin); fr.px(nx, sy, R.ramps.skin, 2, TAG.skin);
          fr.px(nx - 1, sy + 1, R.ramps.skin, 1, TAG.skin); fr.px(nx, sy + 1, R.ramps.skin, 1, TAG.skin);
          const pts = c > 0.5 ? [nx - 3, nx - 2, nx + 1, nx + 2] : [nx + 1, nx + 2];
          for (const x of pts) { fr.px(x, sy, shirt, 0); fr.px(x, sy + 1, shirt, 0); }
          if (c > 0.5) { fr.px(nx - 2, sy + 2, shirt, 0); fr.px(nx + 1, sy + 2, shirt, 0); }
          for (let y = sy + 3; y < R.hipY; y++) fr.darken(nx, y, 1);
          if (def.buttons) for (let y = sy + 4; y < R.hipY; y += 3) fr.px(nx - 1, y, R.ramps.top2, 1);
        }
        if (def.pocket && c > 0.3) {
          const pl = Math.round(cx - 3.5 + s * 1.5), pr = Math.round(cx + 2.5 + s * 1.5);
          for (let x = pl + 1; x < pr; x++) fr.darken(x, sy + 7, 1);
          for (let y = sy + 7; y < R.hipY - 1; y++) { fr.darken(pl, y, 1); fr.darken(pr, y, 1); }
        }
        if (def.hood) {
          const dx = c > 0.5 ? [nx - 2, nx + 1] : [nx];
          for (const x of dx) { fr.px(x, sy + 2, R.ramps.top2, 0); fr.px(x, sy + 3, R.ramps.top2, 1); fr.px(x, sy + 4, R.ramps.top2, 1); }
        }
      } else if (c < -0.5 && def.neck) {
        for (let x = Math.round(cx - 2); x <= Math.round(cx + 1); x++) fr.px(x, sy, shirt, 2);
      }
    }

    if (R.cfg.badge === 'badge' && c > 0.2 && !def.skinTorso) {
      // a small gold bar on the left breast
      const g = ramp('#e8b84a');
      const bx = Math.round(cx + c * (hw - 3.5) + s * hw * 0.9) - 1;
      fr.px(bx, sy + 5, g, 0, TAG.other); fr.px(bx + 1, sy + 5, g, 1, TAG.other);
    }

    if (def.belt) {
      const belt = fr.mask().poly(outerPts).clipY(sy + 9, sy + 11);
      fr.draw(belt, { ramp: R.ramps.top2, shade: 'cyl', outline: 'none', tag: TAG.cloth });
      if (front) { const g = ramp('#e8b030'); fr.px(nx, sy + 9, g, 0, TAG.other); fr.px(nx, sy + 10, g, 2, TAG.other); fr.px(nx - 1, sy + 9, g, 1, TAG.other); fr.px(nx - 1, sy + 10, g, 2, TAG.other); }
    }
  }

  // An apron goes over the shirt and the top of the legs.
  function drawApron(fr, R) {
    const def = TOPS[R.cfg.top];
    if (!def || !def.apron) return;
    const { cx, sy, c, s, hw, hipY } = R;
    const A = R.ramps.top;
    if (c > -0.1) {
      const ax = cx + s * hw * 0.55;
      const half = Math.max(1.5, (hw - 1.5) * c + 1.2 * s);
      const m = fr.mask().poly([
        [ax - half + 1, sy + 3], [ax + half - 1, sy + 3], [ax + half - 0.5, sy + 8],
        [ax + half + 1.2, hipY + 9], [ax - half - 1.2, hipY + 9], [ax - half + 0.5, sy + 8],
      ]);
      fr.draw(m, { ramp: A, shade: 'cyl', outline: 'full', tag: TAG.cloth, th: CLOTH_TH });
      // neck strap and pocket
      if (c > 0.3) {
        for (const side of [-1, 1]) {
          const x = Math.round(ax + side * (half - 1.5)) - (side > 0 ? 1 : 0);
          fr.px(x, sy + 1, A, 2); fr.px(x, sy + 2, A, 2);
        }
        const pl = Math.round(ax - 2.5), pr = Math.round(ax + 1.5);
        for (let x = pl; x <= pr; x++) fr.px(x, hipY + 1, A, 3);
        for (let y = hipY + 1; y <= hipY + 4; y++) { fr.px(pl, y, A, 3); fr.px(pr, y, A, 3); }
        fr.px(Math.round(ax) - 1, sy + 6, A, 0); // small logo stitch
      }
    } else {
      // ties at the back of the waist
      const y = sy + 8;
      const m = fr.mask().rect(Math.round(cx - hw + 0.5), y, Math.round(hw * 2 - 1), 1);
      m.ellipse(cx - 1.5 + s * 1, y + 1, 1.5, 1.3).ellipse(cx + 1.5 + s * 1, y + 1, 1.5, 1.3).rect(Math.round(cx - 1 + s), y + 1, 2, 4);
      fr.draw(m, { ramp: A, shade: 'flat', flat: 1, outline: 'full', tag: TAG.cloth });
      for (const side of [-1, 1]) for (let yy = sy + 1; yy < y; yy++) fr.px(Math.round(cx + side * (2.5 - (yy - sy) * 0.15)) - (side > 0 ? 1 : 0), yy, A, 2);
    }
  }

  function drawHood(fr, R) {
    const def = TOPS[R.cfg.top];
    if (!def || !def.hood) return;
    const { cx, sy, hw, c } = R;
    if (c > -0.1) {
      const e = { cx: cx - R.F.x * 2.5, cy: sy + 0.5, rx: Math.max(3, hw - 1.6), ry: 2.6 };
      fr.draw(fr.mask().ellipse(e.cx, e.cy, e.rx, e.ry), { ramp: R.ramps.top, shade: 'flat', flat: 2, outline: 'full', tag: TAG.cloth });
    } else {
      const e = { cx: cx - R.F.x * 2, cy: sy + 3, rx: hw - 1.5, ry: 4 };
      fr.draw(fr.mask().ellipse(e.cx, e.cy, e.rx, e.ry), { ramp: R.ramps.top, shade: 'sphere', ell: e, outline: 'full', tag: TAG.cloth,
        tone: (sx, sy2, t) => (sy2 === Math.floor(e.cy + 1) ? t + 1 : t) });
    }
  }

  // ---------------------------------------------------------------- arms
  function drawArm(fr, R, arm) {
    const def = TOPS[R.cfg.top] || TOPS.tshirt;
    const r = R.b.aw / 2;
    const dim = arm.depth < -0.3 ? 1 : 0;
    // seen from behind, a carrying arm shows only the upper arm and elbow: the forearm,
    // hand and item are in front of the body
    const backCarry = arm.carry && R.c < -0.1;
    const pts = backCarry ? [arm.sh, arm.el] : [arm.sh, arm.el, arm.wr];
    const sleeveRamp = def.shirtFromTrim ? R.ramps.top2 : R.ramps.top;
    if (def.sleeve !== 'long') {
      fr.draw(fr.mask().stroke(pts, [r, r * 0.8]), { ramp: R.ramps.skin, shade: 'cyl', dim, outline: 'full', tag: TAG.skin, th: [0.9, 0.2, -0.6] });
    }
    if (def.sleeve !== 'none') {
      const end = def.sleeve === 'short' ? arm.sh[1] + 5.5 : (backCarry ? arm.el[1] + 3 : arm.wr[1] + 0.8);
      const rr = def.wide ? [r + 0.3, r + 1.6] : [r + 0.25, r * 0.85];
      const m = fr.mask().stroke(pts, rr).clipY(0, Math.round(end));
      fr.draw(m, { ramp: sleeveRamp, shade: 'cyl', dim, outline: 'full', tag: TAG.cloth, th: CLOTH_TH });
      const endRow = Math.round(end) - 1;
      if (backCarry) {
        // no cuff: the sleeve continues forward out of sight
      } else if (def.cuffs && def.sleeve === 'long') {
        // a sliver of shirt cuff at the wrist
        fr.draw(m.clone().clipY(endRow, endRow + 1), { ramp: R.ramps.top2, shade: 'flat', flat: 1 + dim, outline: 'none', tag: TAG.cloth });
      } else if (def.band && def.sleeve === 'long') {
        fr.draw(m.clone().clipY(endRow - 1, endRow + 1), { ramp: sleeveRamp, shade: 'flat', flat: 2 + dim, outline: 'none', tag: TAG.cloth });
      } else if (def.sleeve === 'short') {
        fr.draw(m.clone().clipY(endRow, endRow + 1), { ramp: sleeveRamp, shade: 'flat', flat: 2 + dim, outline: 'none', tag: TAG.cloth });
      }
    }
    if (backCarry) return;
    const [hx, hy] = arm.hand;
    const he = { cx: hx, cy: hy, rx: 1.6, ry: 1.9 };
    fr.draw(fr.mask().ellipse(hx, hy, he.rx, he.ry), { ramp: R.ramps.skin, shade: 'sphere', ell: he, th: [0.95, 0.15, -0.6], dim, outline: 'full', softInner: true, tag: TAG.skin });
  }

  // ---------------------------------------------------------------- held items
  function drawHeld(fr, R, arm) {
    const kind = R.cfg.held;
    if (!kind || kind === 'none' || !arm) return;
    const [hx, hy] = arm.hand;
    const { c, s } = R;
    const wFace = Math.max(1, Math.abs(c)); // how much of the item's face we see
    if (kind === 'clipboard') {
      // held by its lower edge, the board leaning toward the body's centre
      const w = Math.max(2, Math.round(6 * Math.abs(c) + 2 * s)), h = 8;
      const toward = -arm.out || 1;
      const x0 = Math.round(toward > 0 ? hx - 1 : hx - w + 2), y0 = Math.round(hy - h + 2);
      const board = fr.mask().rect(x0, y0, w, h);
      fr.draw(board, { ramp: ramp('#9a6a3e'), shade: 'flat', flat: 1, outline: 'full', tag: TAG.other });
      if (c > 0.2 && w >= 4) {
        const paper = ramp('#f6f2e8');
        fr.draw(fr.mask().rect(x0 + 1, y0 + 1, w - 2, h - 2), { ramp: paper, shade: 'flat', flat: 1, outline: 'none', tag: TAG.other });
        for (let y = y0 + 3; y < y0 + h - 1; y += 2) for (let x = x0 + 1; x < x0 + w - 2; x++) fr.px(x, y, paper, 3, TAG.other);
        const clip = ramp('#c8ccd4');
        const mx = Math.round(x0 + w / 2 - 1);
        fr.px(mx, y0, clip, 0, TAG.other); fr.px(mx + 1, y0, clip, 1, TAG.other);
      }
    } else if (kind === 'plant') {
      const x0 = Math.round(hx - 2), y0 = Math.round(hy - 3);
      fr.draw(fr.mask().rect(x0, y0, 5, 4), { ramp: ramp('#b8603a'), shade: 'cyl', outline: 'full', tag: TAG.other });
      const leaves = fr.mask().ellipse(hx + 0.5, y0 - 2, 3, 2.4).ellipse(hx - 1.5, y0 - 3.5, 1.6, 1.6).ellipse(hx + 2.2, y0 - 4, 1.5, 1.5);
      fr.draw(leaves, { ramp: ramp('#4e9a3e'), shade: 'sphere', ell: { cx: hx + 0.5, cy: y0 - 2.5, rx: 3.5, ry: 3 }, outline: 'full', tag: TAG.other });
      if (c > 0.2) fr.px(Math.round(hx + 1.5), y0 - 5, ramp('#f4f0e6'), 0, TAG.other);
    } else if (kind === 'camera') {
      const w = Math.max(2, Math.round(6 * Math.abs(c) + 3 * s)), x0 = Math.round(hx - w / 2), y0 = Math.round(hy - 4);
      fr.draw(fr.mask().rect(x0, y0, w, 4).rect(x0 + 1, y0 - 1, 2, 1), { ramp: ramp('#2a2a34'), shade: 'flat', flat: 1, outline: 'full', tag: TAG.other });
      if (c > 0.2 && w >= 4) { const g = ramp('#9ab0c8'); fr.px(Math.round(hx), y0 + 1, g, 0, TAG.other); fr.px(Math.round(hx), y0 + 2, g, 2, TAG.other); fr.px(Math.round(hx) - 1, y0 + 1, g, 1, TAG.other); fr.px(Math.round(hx) - 1, y0 + 2, g, 2, TAG.other); }
    } else if (kind === 'mic') {
      const x0 = Math.round(hx), y0 = Math.round(hy - 6);
      fr.draw(fr.mask().rect(x0, y0 + 2, 1, 5), { ramp: ramp('#2a2a34'), shade: 'flat', outline: 'full', tag: TAG.other });
      fr.draw(fr.mask().ellipse(x0 + 0.5, y0 + 1, 1.6, 1.6), { ramp: ramp('#a8a8b8'), shade: 'sphere', ell: { cx: x0 + 0.5, cy: y0 + 1, rx: 1.6, ry: 1.6 }, outline: 'full', tag: TAG.other });
    } else if (kind === 'wrench') {
      const x0 = Math.round(hx), y0 = Math.round(hy - 7);
      const m = fr.mask().rect(x0, y0 + 2, 1, 6).rect(x0 - 1, y0, 3, 2);
      m.unset(x0, y0);
      fr.draw(m, { ramp: ramp('#b8bcc8'), shade: 'flat', flat: 1, outline: 'full', tag: TAG.other });
    } else if (kind === 'record') {
      const rx = Math.max(1, 3.2 * Math.abs(c) + 0.6 * s);
      fr.draw(fr.mask().ellipse(hx, hy - 3, rx, 3.2), { ramp: ramp('#26242c'), shade: 'flat', flat: 1, outline: 'full', tag: TAG.other });
      if (c > 0.3) { fr.px(Math.floor(hx), Math.floor(hy - 3), ramp('#c8383c'), 1, TAG.other); fr.px(Math.floor(hx) - 1, Math.floor(hy - 4), ramp('#26242c'), 0, TAG.other); }
    } else if (kind === 'coffee') {
      const x0 = Math.round(hx - 1.5), y0 = Math.round(hy - 5);
      const cup = fr.mask().rect(x0, y0, 4, 5);
      fr.draw(cup, { ramp: ramp('#f2eee6'), shade: 'cyl', outline: 'full', tag: TAG.other });
      fr.draw(fr.mask().rect(x0, y0 + 2, 4, 2), { ramp: ramp('#9a6a3e'), shade: 'cyl', outline: 'none', tag: TAG.other });
      fr.draw(fr.mask().rect(x0 - 0.5, y0 - 1, 5, 1), { ramp: ramp('#3a3038'), shade: 'flat', outline: 'full', tag: TAG.other });
    } else if (kind === 'phone') {
      const w = Math.max(1, Math.round(3 * wFace)), x0 = Math.round(hx - w / 2), y0 = Math.round(hy - 4);
      fr.draw(fr.mask().rect(x0, y0, w, 5), { ramp: ramp('#2a2a36'), shade: 'flat', outline: 'full', tag: TAG.other });
      if (c > 0.3) fr.px(x0 + w - 1, y0 + 1, ramp('#7ab0e0'), 0, TAG.other);
    } else if (kind === 'book') {
      const w = Math.max(2, Math.round(6 * Math.abs(c) + 2 * s)), x0 = Math.round(hx - w / 2), y0 = Math.round(hy - 5);
      fr.draw(fr.mask().rect(x0, y0, w, 7), { ramp: ramp('#8a2e3a'), shade: 'flat', flat: 1, outline: 'full', tag: TAG.other });
      if (w > 3) for (let y = y0 + 1; y < y0 + 6; y++) fr.px(x0 + (R.s > 0 ? w - 1 : 0), y, ramp('#f0e8d8'), 1, TAG.other);
    }
  }

  // ---------------------------------------------------------------- back items
  function backItems(R) {
    const kind = R.cfg.back;
    const out = [];
    const { cx, sy, hw, c, s } = R;
    const B = R.ramps.back;
    if (kind === 'backpack') {
      const z = -c;
      const px = cx - s * (hw + 2);
      const half = (12 * Math.abs(c) + 6 * s) / 2;
      const top = sy + 1, bot = sy + 13;
      const draw = (fr) => {
        const m = fr.mask().poly([[px - half + 1.5, top], [px + half - 1.5, top], [px + half, top + 2], [px + half, bot], [px - half, bot], [px - half, top + 2]]);
        fr.draw(m, { ramp: B, shade: 'cyl', outline: 'full', tag: TAG.cloth, th: CLOTH_TH,
          tone: (sx, sy2, t) => (sy2 === top + 4 || (sy2 === bot - 5 && c < -0.3) ? t + 1 : t) });
      };
      out.push({ layer: z < -0.2 ? 'behind' : 'afterTorso', draw });
      if (c > 0.3) {
        out.push({
          layer: 'afterTorso',
          draw(fr) {
            for (const side of [-1, 1]) {
              if (side > 0 && s > 0.3) continue;
              const x = Math.round(cx + side * (hw - 2.5) + s * 2) - (side > 0 ? 1 : 0);
              fr.draw(fr.mask().rect(x, sy, 2, 10), { ramp: B, shade: 'flat', flat: 2, outline: 'full', tag: TAG.cloth });
            }
          },
        });
      }
    } else if (kind === 'cape') {
      const sw = (R.pose.sway || 0) * 1;
      const ht = (hw - 0.5) * Math.abs(c) + 2 * s;
      const hb = (hw + 4) * Math.abs(c) + 4 * s;
      const xt = cx - s * hw * 0.6, xb = cx - s * (hw * 0.6 + 3.5) - Math.abs(sw) * s + sw * Math.abs(c) * 0.5;
      const bot = R.hipY + 15;
      const draw = (fr) => {
        const m = fr.mask().poly([[xt - ht, sy - 0.5], [xt + ht, sy - 0.5], [xb + hb, bot], [xb - hb, bot]]);
        fr.draw(m, { ramp: B, shade: 'cyl', outline: 'full', tag: TAG.cloth, th: CLOTH_TH,
          tone: (sx, sy2, t) => (sy2 > sy + 8 && (sx % 4 === 0) ? t + 1 : t) });
      };
      out.push({ layer: c < -0.1 ? 'overBack' : 'behind', draw });
      if (c > 0.3) {
        out.push({
          layer: 'afterTorso',
          draw(fr) {
            fr.draw(fr.mask().rect(Math.round(cx - hw + 0.5), sy, Math.round(hw * 2 - 1), 2), { ramp: B, shade: 'flat', flat: 1, outline: 'none', tag: TAG.cloth });
            const g = ramp('#e8b030');
            fr.px(Math.floor(cx + s * hw * 0.6), sy + 1, g, 0, TAG.other);
          },
        });
      }
    }
    return out;
  }

  // ---------------------------------------------------------------- assembly
  function renderFrame(cfg, dirName, pose, W = FRAME.w, H = FRAME.h) {
    const style = { mode: cfg.outline || 'selout', color: hex(cfg.outlineColor || '#1d1424') };
    const R = makeRig(cfg, dirName, pose, W, H, style);
    const fr = new SG.Frame(W, H, R.mirror, style);
    const extras = SG.head.hairExtras(R).concat(backItems(R));
    const run = (layer) => extras.filter((x) => x.layer === layer).forEach((x) => x.draw(fr));
    const carryArm = R.arms.find((a) => a.carry);
    const heldBehind = carryArm && R.c < -0.1; // the item is hidden by the body

    run('behind');
    const farArms = R.arms.filter((a) => a.depth < -0.3);
    const otherArms = R.arms.filter((a) => !farArms.includes(a));
    farArms.forEach((a) => drawArm(fr, R, a));
    const legs = R.legs.slice().sort((a, b) => a.depth - b.depth);
    for (const leg of legs) { drawLeg(fr, R, leg); drawShoe(fr, R, leg); }
    drawSkirt(fr, R);
    drawNeck(fr, R);
    drawTorso(fr, R);
    drawApron(fr, R);
    run('afterTorso');
    if (R.c <= -0.1) drawHood(fr, R);
    for (const a of otherArms) {
      if (a.carry && !heldBehind) {
        // the item sits in front of the body; the hand closes over it
        drawArm(fr, R, a);
        drawHeld(fr, R, a);
        const [hx, hy] = a.hand;
        const he = { cx: hx, cy: hy, rx: 1.6, ry: 1.9 };
        fr.draw(fr.mask().ellipse(hx, hy, he.rx, he.ry), { ramp: R.ramps.skin, shade: 'sphere', ell: he, th: [0.95, 0.15, -0.6], outline: 'full', softInner: true, tag: TAG.skin });
      } else drawArm(fr, R, a);
    }
    run('overBack');
    if (R.c > -0.1) drawHood(fr, R);
    SG.head.drawHead(fr, R, extras);
    return fr;
  }

  SG.body = { TOPS, makeRig, renderFrame };
})();
