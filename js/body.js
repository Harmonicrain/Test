// Rig, body, clothing and frame assembly.
(function () {
  const SG = (window.SG = window.SG || {});
  const { ramp, pack, hexToRgb } = SG.color;
  const { BUILDS, HEIGHTS } = SG.catalog;
  const TAG = SG.TAG;

  const DIRS = (SG.DIRS = ['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW']);
  const r6 = (v) => Math.round(v * 1e6) / 1e6;

  const TOPS = {
    none: { sleeve: 'none', skinTorso: true },
    tank: { sleeve: 'none', tank: true },
    tshirt: { sleeve: 'short', neck: 'crew' },
    longsleeve: { sleeve: 'long', neck: 'crew' },
    buttonup: { sleeve: 'long', collar: true, buttons: true },
    sweater: { sleeve: 'long', neck: 'crew', band: true },
    hoodie: { sleeve: 'long', hood: true, pocket: true },
    jacket: { sleeve: 'long', open: true, hem: 1 },
    coat: { sleeve: 'long', open: true, hem: 8, flare: 1.5 },
    tunic: { sleeve: 'long', hem: 4, flare: 1, belt: true, neck: 'crew' },
    dress: { sleeve: 'short', hem: 9, flare: 3, neck: 'scoop' },
    robe: { sleeve: 'long', hem: 11, flare: 2.5, belt: true, wide: true, neck: 'v' },
  };

  function makeRig(cfg, dirName, pose, W, H, style) {
    const di = DIRS.indexOf(dirName);
    let deg = di * 45, mirror = false;
    if (deg > 180) { deg = 360 - deg; mirror = true; }
    const t = (deg * Math.PI) / 180;
    const c = r6(Math.cos(t)), s = r6(Math.sin(t));
    const b = BUILDS[cfg.build] || BUILDS.average;
    const hg = HEIGHTS[cfg.height] || 0;
    const oy = H - 48;
    const cx = W / 2;
    const ground = 46 + oy;
    const up = -hg + (pose.bob || 0);
    const breath = pose.breath || 0;
    const sy = 22 + oy + up + breath;
    const hipY = 32 + oy + up;
    const hcx = cx;
    const hcy = 15 + oy + up + breath;
    const hw = Math.round(b.bw * (0.62 + 0.38 * Math.abs(c)));

    const ramps = {
      skin: ramp(cfg.skin), hair: ramp(cfg.hairColor), top: ramp(cfg.topColor), top2: ramp(cfg.top2Color),
      bottom: ramp(cfg.bottomColor), shoe: ramp(cfg.shoeColor), hat: ramp(cfg.hatColor), back: ramp(cfg.backColor),
    };

    const R = {
      cfg, pose, W, H, mirror, deg, c, s, F: { x: s, z: c }, Rv: { x: -c, z: s }, b, cx, ground, sy, hipY, hcx, hcy, hw,
      face: { cx: hcx, cy: hcy, rx: 6, ry: 6.3 }, ramps, style,
    };

    // limbs; index 0 = character's right, 1 = left
    R.arms = [1, -1].map((r, i) => {
      const sw = (pose.arms && pose.arms[i]) || 0;
      const shx = cx - c * r * (b.bw + b.aw / 2 - 0.3);
      const out = -c * r;
      const wx = shx + out * 0.6 + s * sw;
      const wy = sy + 9.4 + c * sw * 0.3 - Math.abs(sw) * 0.25;
      return { r, depth: r * s, sh: [shx, sy + 1.6], wr: [wx, wy], hand: [wx + out * 0.5 + s * 0.6, wy + 1.4] };
    });
    R.legs = [1, -1].map((r, i) => {
      const L = (pose.legs && pose.legs[i]) || { st: 0, lift: 0 };
      const hipX = cx - c * r * (b.lw / 2);
      const dy = Math.min(0, Math.round(c * L.st * 0.35));
      const ax = hipX - c * r * 1 + s * L.st;
      return { r, depth: r * s + c * L.st * 0.02, hipX, ax, bottom: ground + dy - Math.round(L.lift || 0), lift: L.lift || 0 };
    });
    return R;
  }

  // ---------------------------------------------------------------- legs & feet
  function drawLeg(fr, R, leg) {
    const { lw } = R.b;
    const bot = R.cfg.bottom;
    const dim = leg.depth < -0.3 ? 1 : 0;
    const yTop = R.hipY - 1, yBot = leg.bottom - 1.5;
    const pts = [[leg.hipX - lw / 2, yTop], [leg.hipX + lw / 2, yTop], [leg.ax + lw / 2 - 0.3, yBot], [leg.ax - lw / 2 + 0.3, yBot]];
    const full = fr.mask().poly(pts);
    if (bot === 'trousers') {
      fr.draw(full, { ramp: R.ramps.bottom, shade: 'cyl', dim, outline: 'full', tag: TAG.cloth });
      return;
    }
    fr.draw(full, { ramp: R.ramps.skin, shade: 'cyl', dim, outline: 'full', tag: TAG.skin });
    if (bot === 'shorts') {
      const m = fr.mask().poly(pts).clipY(0, R.hipY + 6);
      fr.draw(m, { ramp: R.ramps.bottom, shade: 'cyl', dim, outline: 'full', tag: TAG.cloth });
    }
  }

  function drawShoe(fr, R, leg) {
    const kind = R.cfg.shoes;
    const { lw } = R.b;
    const dim = leg.depth < -0.3 ? 1 : 0;
    const B = leg.bottom;
    const x0 = Math.round(leg.ax - (lw + 1) / 2);
    const short = kind === 'sandals' || kind === 'barefoot';
    const h = short ? 2 : 3;
    const m = fr.mask().rect(x0, B - h + 1, lw + 1, h);
    m.ellipse(leg.ax + R.s * 2.1, B - 0.4, 1.9, short ? 1 : 1.4);
    m.clipY(0, B + 1);
    if (kind === 'boots') m.rect(x0 + 0.3, B - 5, lw + 0.4, 4);
    const footRamp = short ? R.ramps.skin : R.ramps.shoe;
    fr.draw(m, { ramp: footRamp, shade: 'cyl', dim, outline: 'full', tag: short ? TAG.skin : TAG.cloth });
    if (kind === 'sneakers') {
      const sole = m.clone().clipY(B, B + 1);
      fr.draw(sole, { ramp: ramp('#eeeae4'), shade: 'flat', flat: 1 + dim, outline: 'none', tag: TAG.cloth });
    } else if (kind === 'sandals') {
      const strap = m.clone().clipY(B - 1, B);
      fr.draw(strap, { ramp: R.ramps.shoe, shade: 'flat', flat: 1 + dim, outline: 'none', tag: TAG.cloth });
    } else if (kind === 'boots') {
      const cuff = m.clone().clipY(B - 5, B - 4);
      fr.draw(cuff, { ramp: R.ramps.shoe, shade: 'flat', flat: 0 + dim, outline: 'none', tag: TAG.cloth });
    }
  }

  function drawSkirt(fr, R) {
    const kind = R.cfg.bottom;
    if (kind !== 'skirt' && kind !== 'longskirt') return;
    const { cx, hw } = R;
    const top = R.hipY - 2;
    const bot = kind === 'skirt' ? R.hipY + 7 : R.ground - 3;
    const sw = (R.pose.sway || 0) * 0.5;
    const flare = kind === 'skirt' ? 2 : 2.5;
    const m = fr.mask().poly([[cx - hw + 0.5, top], [cx + hw - 0.5, top], [cx + hw + flare + sw, bot], [cx - hw - flare + sw, bot]]);
    fr.draw(m, { ramp: R.ramps.bottom, shade: 'cyl', outline: 'full', tag: TAG.cloth,
      tone: (sx, sy, t) => (sy > top + 3 && ((sx + 1) % 3 === 0) ? t + 1 : t) });
  }

  // ---------------------------------------------------------------- torso
  function torsoPts(R, hemExtra = 0, flare = 0) {
    const { cx, hw, sy, s } = R;
    const curvy = R.cfg.figure === 'curvy';
    const belly = R.b.belly || 0;
    const top = sy;
    const wW = hw - (curvy ? 1.3 : 0.7) + belly * 0.8;
    const hipW = hw - 0.3 + (curvy ? 0.4 : 0) + flare;
    const hem = R.hipY + 1 + hemExtra;
    const chest = curvy ? s * 1 : 0;
    return [
      [cx - hw + 1.2, top], [cx + hw - 1.2, top], [cx + hw, top + 1.8], [cx + hw + chest, top + 4.5],
      [cx + wW + belly * s, top + 7.5], [cx + hipW, hem], [cx - hipW, hem], [cx - wW - belly * s * 0.3, top + 7.5], [cx - hw, top + 1.8],
    ];
  }

  function drawNeck(fr, R) {
    const nw = Math.abs(R.c) > 0.5 ? 4 : 3;
    const x = Math.round(R.cx - nw / 2 + R.s * 0.5);
    const m = fr.mask().rect(x, R.hcy + 4, nw, R.sy - (R.hcy + 4) + 2);
    fr.draw(m, { ramp: R.ramps.skin, shade: 'flat', flat: 2, outline: 'outer', tag: TAG.skin });
  }

  function drawTorso(fr, R) {
    const def = TOPS[R.cfg.top] || TOPS.tshirt;
    const { cx, sy, c, s, hw } = R;
    const front = c > 0.05;
    const tone = def.band ? (sx, sy2, t) => (sy2 >= R.hipY ? t + 1 : t) : undefined;

    if (def.skinTorso || def.tank) {
      fr.draw(fr.mask().poly(torsoPts(R)), { ramp: R.ramps.skin, shade: 'cyl', outline: 'full', tag: TAG.skin });
      if (def.skinTorso) {
        if (front) fr.px(Math.floor(cx + s * hw * 0.5), sy + 8, R.ramps.skin, 2, TAG.skin);
        return;
      }
      const m = fr.mask().poly(torsoPts(R)).clipY(sy + 2, 99);
      for (const side of [-1, 1]) {
        if (Math.abs(c) < 0.3 && side === 1) continue;
        const x = cx + side * (hw - 2.2) * Math.abs(c) - (Math.abs(c) < 0.3 ? 0.5 : 0);
        m.rect(Math.round(x - 0.75), sy, 2, 3);
      }
      fr.draw(m, { ramp: R.ramps.top, shade: 'cyl', outline: 'full', tag: TAG.cloth });
      return;
    }

    const outerPts = torsoPts(R, def.hem || 0, def.flare || 0);
    if (def.open) {
      fr.draw(fr.mask().poly(torsoPts(R)), { ramp: R.ramps.top2, shade: 'cyl', outline: 'full', tag: TAG.cloth });
      const outer = fr.mask().poly(outerPts);
      if (front || Math.abs(c) < 0.05) {
        const ox = cx + s * hw * 0.72;
        const wt = Math.max(1, 2.3 * c), wb = Math.max(0.6, 1.2 * c);
        const hem0 = R.hipY + 1;
        const open = fr.mask().poly([[ox - wt, sy - 1], [ox + wt, sy - 1], [ox + wb, hem0], [ox - wb, hem0]]);
        outer.subtract(open);
        fr.draw(outer, { ramp: R.ramps.top, shade: 'cyl', outline: 'full', tag: TAG.cloth });
        // skin V at the open collar
        const vx = Math.floor(ox);
        fr.px(vx - (c > 0.5 ? 1 : 0), sy, R.ramps.skin, 1, TAG.skin);
        fr.px(vx, sy, R.ramps.skin, 1, TAG.skin);
        if (c > 0.5) fr.px(vx - 1 + (s > 0 ? 1 : 0), sy + 1, R.ramps.skin, 2, TAG.skin);
      } else {
        fr.draw(outer, { ramp: R.ramps.top, shade: 'cyl', outline: 'full', tag: TAG.cloth });
        // back seam
        if (c < -0.5) for (let y = sy + 3; y < R.hipY + (def.hem || 0); y++) fr.darken(Math.floor(cx), y, 1);
      }
    } else {
      const m = fr.mask().poly(outerPts);
      fr.draw(m, { ramp: R.ramps.top, shade: 'cyl', outline: 'full', tag: TAG.cloth, tone });
      if (front) {
        const nx = Math.floor(cx + s * hw * 0.55);
        if (def.neck === 'crew') { fr.px(nx - 1, sy, R.ramps.top, 3); fr.px(nx, sy, R.ramps.top, 3); }
        if (def.neck === 'scoop' || def.neck === 'v') {
          fr.px(nx - 1, sy, R.ramps.skin, 1, TAG.skin); fr.px(nx, sy, R.ramps.skin, 1, TAG.skin);
          if (def.neck === 'v' && c > 0.5) { fr.px(nx - 1, sy + 1, R.ramps.skin, 2, TAG.skin); fr.px(nx, sy + 1, R.ramps.skin, 2, TAG.skin); }
          if (def.neck === 'scoop' && c > 0.5) { fr.px(nx - 2, sy, R.ramps.skin, 1, TAG.skin); fr.px(nx + 1, sy, R.ramps.skin, 1, TAG.skin); }
        }
        if (def.collar) {
          fr.px(nx - 1, sy, R.ramps.skin, 1, TAG.skin); fr.px(nx, sy, R.ramps.skin, 1, TAG.skin);
          for (const x of c > 0.5 ? [nx - 2, nx + 1] : [nx + 1]) { fr.px(x, sy, R.ramps.top, 0); fr.px(x, sy + 1, R.ramps.top, 0); }
        }
        if (def.buttons) for (let y = sy + 3; y < R.hipY; y += 3) fr.px(nx, y, R.ramps.top2, 1);
        if (def.pocket && c > 0.5) {
          const pl = Math.round(cx - 3), pr = Math.round(cx + 2);
          for (let x = pl; x <= pr; x++) fr.darken(x, sy + 7, 1);
          fr.darken(pl, sy + 8, 1); fr.darken(pr, sy + 8, 1);
        }
        if (def.hood) {
          fr.px(nx - 1 - (c > 0.5 ? 1 : 0), sy + 1, R.ramps.top2, 0); fr.px(nx - 1 - (c > 0.5 ? 1 : 0), sy + 2, R.ramps.top2, 1);
          if (c > 0.5) { fr.px(nx + 1, sy + 1, R.ramps.top2, 0); fr.px(nx + 1, sy + 2, R.ramps.top2, 1); }
        }
      }
    }

    if (def.belt) {
      const belt = fr.mask().poly(outerPts).clipY(sy + 8, sy + 10);
      fr.draw(belt, { ramp: R.ramps.top2, shade: 'cyl', outline: 'none', tag: TAG.cloth });
      if (front) fr.px(Math.floor(cx + s * hw * 0.55), sy + 8, ramp('#e8b030'), 1, TAG.other);
    }
  }

  function drawHood(fr, R) {
    const def = TOPS[R.cfg.top];
    if (!def || !def.hood) return;
    const { cx, sy, hw, c } = R;
    if (c > -0.1) {
      const m = fr.mask().ellipse(cx - R.F.x * 2, sy + 0.3, Math.max(2.5, hw - 1.5), 2.2);
      fr.draw(m, { ramp: R.ramps.top, shade: 'flat', flat: 2, outline: 'full', tag: TAG.cloth });
    } else {
      const m = fr.mask().ellipse(cx - R.F.x * 1.5, sy + 2.5, hw - 1.5, 3.2);
      fr.draw(m, { ramp: R.ramps.top, shade: 'sphere', ell: { cx: cx - R.F.x * 1.5, cy: sy + 2.5, rx: hw - 1.5, ry: 3.2 }, outline: 'full', tag: TAG.cloth,
        tone: (sx, sy2, t) => (sy2 === Math.floor(sy + 3) ? t + 1 : t) });
    }
  }

  // ---------------------------------------------------------------- arms
  function drawArm(fr, R, arm) {
    const def = TOPS[R.cfg.top] || TOPS.tshirt;
    const r = R.b.aw / 2;
    const dim = arm.depth < -0.3 ? 1 : 0;
    const pts = [arm.sh, arm.wr];
    if (def.sleeve !== 'long') {
      fr.draw(fr.mask().stroke(pts, [r, r * 0.9]), { ramp: R.ramps.skin, shade: 'cyl', dim, outline: 'full', tag: TAG.skin });
    }
    if (def.sleeve !== 'none') {
      const end = def.sleeve === 'short' ? arm.sh[1] + 4 : arm.wr[1] + 0.6;
      const rr = def.wide ? [r + 0.2, r + 1.1] : [r + 0.1, r];
      const m = fr.mask().stroke(pts, rr).clipY(0, Math.round(end));
      fr.draw(m, { ramp: R.ramps.top, shade: 'cyl', dim, outline: 'full', tag: TAG.cloth });
    }
    const [hx, hy] = arm.hand;
    const hm = fr.mask().ellipse(hx, hy, 2, 1.9);
    fr.draw(hm, { ramp: R.ramps.skin, shade: 'sphere', ell: { cx: hx, cy: hy, rx: 2, ry: 1.9 }, th: [0.95, 0.25, -0.5], dim, outline: 'full', tag: TAG.skin });
  }

  // ---------------------------------------------------------------- back items
  function backItems(R) {
    const kind = R.cfg.back;
    const out = [];
    const { cx, sy, hw, c, s } = R;
    const ramp_ = R.ramps.back;
    if (kind === 'backpack') {
      const z = -c;
      const px = cx - s * (hw + 1.4);
      const half = (9 * Math.abs(c) + 4.5 * s) / 2;
      const top = sy + 1, bot = sy + 11;
      const draw = (fr) => {
        const m = fr.mask().poly([[px - half + 1, top], [px + half - 1, top], [px + half, top + 1.5], [px + half, bot], [px - half, bot], [px - half, top + 1.5]]);
        fr.draw(m, { ramp: ramp_, shade: 'cyl', outline: 'full', tag: TAG.cloth,
          tone: (sx, sy2, t) => (sy2 === top + 3 || (sy2 === bot - 3 && c < -0.3) ? t + 1 : t) });
      };
      out.push({ layer: z < -0.2 ? 'behind' : 'afterTorso', draw });
      if (c > 0.3) {
        out.push({
          layer: 'afterTorso',
          draw(fr) {
            for (const side of [-1, 1]) {
              if (c < 0.9 && side * 1 > 0 && s > 0.3) continue;
              const x = Math.round(cx + side * (hw - 2.2) + s * 1.5 - (side > 0 ? 1 : 0));
              const m = fr.mask().rect(x, sy, 1, 7);
              fr.draw(m, { ramp: ramp_, shade: 'flat', flat: 2, outline: 'none', tag: TAG.cloth });
            }
          },
        });
      }
    } else if (kind === 'cape') {
      const sw = (R.pose.sway || 0) * 0.8;
      const ht = (hw - 0.5) * Math.abs(c) + 1.5 * s;
      const hb = (hw + 3) * Math.abs(c) + 3 * s;
      const xt = cx - s * hw * 0.6, xb = cx - s * (hw * 0.6 + 2.5) - Math.abs(sw) * s + sw * Math.abs(c) * 0.5;
      const bot = R.hipY + 10;
      const draw = (fr) => {
        const m = fr.mask().poly([[xt - ht, sy - 0.5], [xt + ht, sy - 0.5], [xb + hb, bot], [xb - hb, bot]]);
        fr.draw(m, { ramp: ramp_, shade: 'cyl', outline: 'full', tag: TAG.cloth,
          tone: (sx, sy2, t) => (sy2 > sy + 6 && (sx % 3 === 0) ? t + 1 : t) });
      };
      out.push({ layer: c < -0.1 ? 'overBack' : 'behind', draw });
      if (c > 0.3) {
        out.push({
          layer: 'afterTorso',
          draw(fr) {
            const m = fr.mask().rect(Math.round(cx - hw + 0.5), sy, Math.round(hw * 2 - 1), 1);
            fr.draw(m, { ramp: ramp_, shade: 'flat', flat: 1, outline: 'none', tag: TAG.cloth });
            fr.px(Math.floor(cx + s * hw * 0.55), sy, ramp('#e8b030'), 1, TAG.other);
          },
        });
      }
    }
    return out;
  }

  // ---------------------------------------------------------------- assembly
  function renderFrame(cfg, dirName, pose, W = 32, H = 48) {
    const style = { mode: cfg.outline || 'selout', color: pack(...hexToRgb(cfg.outlineColor || '#1b1220')) };
    const R = makeRig(cfg, dirName, pose, W, H, style);
    const fr = new SG.Frame(W, H, R.mirror, style);
    const extras = SG.head.hairExtras(R).concat(backItems(R));
    const run = (layer) => extras.filter((x) => x.layer === layer).forEach((x) => x.draw(fr));

    run('behind');
    const farArms = R.arms.filter((a) => a.depth < -0.3);
    const otherArms = R.arms.filter((a) => a.depth >= -0.3);
    farArms.forEach((a) => drawArm(fr, R, a));
    const legs = R.legs.slice().sort((a, b) => a.depth - b.depth);
    for (const leg of legs) { drawLeg(fr, R, leg); drawShoe(fr, R, leg); }
    drawSkirt(fr, R);
    drawNeck(fr, R);
    drawTorso(fr, R);
    run('afterTorso');
    if (R.c <= -0.1) drawHood(fr, R);
    otherArms.forEach((a) => drawArm(fr, R, a));
    run('overBack');
    if (R.c > -0.1) drawHood(fr, R);
    SG.head.drawHead(fr, R, extras);
    return fr;
  }

  SG.body = { TOPS, makeRig, renderFrame };
})();
