// Editor UI: option controls, live preview, sprite sheet and export.
(function () {
  const SG = window.SG;
  const { GROUPS, PALETTES, PRESETS, DEFAULT, BASE, label } = SG.catalog;
  const { ANIMS, DIR_ORDERS, renderAll, buildSheet } = SG.sheet;
  const $ = (id) => document.getElementById(id);

  const STORE_KEY = 'spriteforge.v2';
  const store = {
    load() { try { return JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) { return null; } },
    save(v) { try { localStorage.setItem(STORE_KEY, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
  };

  const saved = store.load();
  const state = {
    cfg: { ...BASE, ...DEFAULT, ...((saved && saved.cfg) || {}) },
    locks: new Set((saved && saved.locks) || []),
    preset: (saved && saved.preset) || 'Mara Finch',
    view: { anim: 'walk', dir: 'SE', playing: true, speed: 1, spin: false },
    exp: {
      frame: '48x72', scale: 1, layout: 'dir-rows', pad: 0, order: Object.keys(DIR_ORDERS)[0],
      anims: { idle: true, walk: true, run: true }, ...((saved && saved.exp) || {}),
    },
  };
  let frames = null; // frames[anim][dir][i] = ImageData
  let sheet = null;

  const persist = () => store.save({ cfg: state.cfg, locks: [...state.locks], preset: state.preset, exp: state.exp });
  const frameSize = () => state.exp.frame.split('x').map(Number);

  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { t.textContent = ''; }, 3200);
  }

  // ---------------------------------------------------------------- controls
  const LOCK_SVG = '<svg viewBox="0 0 12 12" aria-hidden="true"><path fill="currentColor" d="M3 5V3.5a3 3 0 0 1 6 0V5h1v6H2V5h1zm1.5 0h3V3.5a1.5 1.5 0 0 0-3 0V5z"/></svg>';
  const controls = {};

  function buildControls() {
    const root = $('groups');
    root.innerHTML = '';
    GROUPS.forEach((g, gi) => {
      const det = document.createElement('details');
      det.className = 'group';
      det.open = ['Body', 'Hair', 'Outfit'].includes(g.name);
      det.innerHTML = `<summary>${g.name}</summary><div class="group-body"></div>`;
      const body = det.querySelector('.group-body');
      for (const item of g.items) body.appendChild(buildControl(item));
      root.appendChild(det);
    });
  }

  function buildControl(item) {
    const row = document.createElement('div');
    row.className = 'opt';
    const lock = document.createElement('button');
    lock.type = 'button';
    lock.className = 'lock';
    lock.innerHTML = LOCK_SVG;
    lock.title = 'Keep this option when randomising';
    lock.setAttribute('aria-label', `Lock ${item.label}`);
    lock.setAttribute('aria-pressed', String(state.locks.has(item.key)));
    lock.addEventListener('click', () => {
      if (state.locks.has(item.key)) state.locks.delete(item.key); else state.locks.add(item.key);
      lock.setAttribute('aria-pressed', String(state.locks.has(item.key)));
      persist();
    });
    const main = document.createElement('div');
    main.className = 'opt-main';
    const id = `opt-${item.key}`;
    main.innerHTML = `<label class="opt-label" for="${id}">${item.label}</label>`;

    if (item.type === 'select') {
      const wrap = document.createElement('div');
      wrap.className = 'stepper';
      const prev = Object.assign(document.createElement('button'), { type: 'button', className: 'step', textContent: '‹' });
      const next = Object.assign(document.createElement('button'), { type: 'button', className: 'step', textContent: '›' });
      prev.setAttribute('aria-label', `Previous ${item.label}`);
      next.setAttribute('aria-label', `Next ${item.label}`);
      const sel = document.createElement('select');
      sel.id = id;
      for (const o of item.options) sel.add(new Option(label(o), o));
      sel.value = state.cfg[item.key];
      sel.addEventListener('change', () => set(item.key, sel.value));
      const step = (d) => {
        const i = item.options.indexOf(sel.value);
        sel.value = item.options[(i + d + item.options.length) % item.options.length];
        set(item.key, sel.value);
      };
      prev.addEventListener('click', () => step(-1));
      next.addEventListener('click', () => step(1));
      wrap.append(prev, sel, next);
      main.appendChild(wrap);
      controls[item.key] = { sync: () => { sel.value = state.cfg[item.key]; } };
    } else {
      const sw = document.createElement('div');
      sw.className = 'swatches';
      const pal = PALETTES[item.palette] || [];
      const buttons = pal.map((c) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'swatch';
        b.style.background = c;
        b.title = c;
        b.setAttribute('aria-label', `${item.label} ${c}`);
        b.addEventListener('click', () => set(item.key, c));
        sw.appendChild(b);
        return b;
      });
      const custom = document.createElement('input');
      custom.type = 'color';
      custom.id = id;
      custom.className = 'swatch-custom';
      custom.title = 'Custom colour';
      custom.addEventListener('input', () => set(item.key, custom.value));
      sw.appendChild(custom);
      main.appendChild(sw);
      controls[item.key] = {
        sync: () => {
          const v = String(state.cfg[item.key]).toLowerCase();
          custom.value = v;
          buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(pal[i].toLowerCase() === v)));
        },
      };
    }
    row.append(lock, main);
    return row;
  }

  function syncControls() {
    for (const k in controls) controls[k].sync();
    $('char-name').value = state.cfg.name || '';
    $('preset').value = PRESETS[state.preset] ? state.preset : '';
  }

  function set(key, value) {
    state.cfg[key] = value;
    if (state.preset && PRESETS[state.preset] && PRESETS[state.preset][key] !== value) state.preset = '';
    controls[key] && controls[key].sync();
    $('preset').value = PRESETS[state.preset] ? state.preset : '';
    schedule();
  }

  // ---------------------------------------------------------------- rendering
  let pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      renderNow();
    });
  }

  function renderNow() {
    const [fw, fh] = frameSize();
    const t0 = performance.now();
    frames = renderAll(state.cfg, { anims: Object.keys(ANIMS), fw, fh });
    rebuildSheet();
    const ms = Math.round(performance.now() - t0);
    $('preview').width = fw; $('preview').height = fh;
    stripCanvases.forEach((c) => { c.width = fw; c.height = fh; });
    persist();
    $('sheet-stats').dataset.ms = ms;
  }

  function selectedAnims() {
    return Object.keys(ANIMS).filter((a) => state.exp.anims[a]);
  }

  function rebuildSheet() {
    if (!frames) return;
    const anims = selectedAnims();
    if (!anims.length) {
      $('sheet-img').removeAttribute('src');
      $('sheet-stats').textContent = 'Pick at least one animation';
      sheet = null;
      return;
    }
    const [fw, fh] = frameSize();
    sheet = buildSheet(state.cfg, frames, {
      fw, fh, anims, scale: Number(state.exp.scale), pad: Number(state.exp.pad), layout: state.exp.layout, dirOrder: state.exp.order,
    });
    const img = $('sheet-img');
    img.src = sheet.canvas.toDataURL('image/png');
    img.style.maxWidth = `${Math.max(sheet.canvas.width, 1) * Math.max(1, Math.floor(2 / Number(state.exp.scale)))}px`;
    const count = Object.keys(sheet.meta.frames).length;
    $('sheet-stats').textContent = `${sheet.canvas.width} × ${sheet.canvas.height} px · ${count} frames · ${sheet.cols} × ${sheet.rows}`;
  }

  // ---------------------------------------------------------------- preview
  const pctx = $('preview').getContext('2d');
  const stripCanvases = [];
  function buildStrip() {
    const strip = $('strip');
    strip.innerHTML = '';
    for (const d of SG.DIRS) {
      const fig = document.createElement('figure');
      const c = document.createElement('canvas');
      c.width = SG.FRAME.w; c.height = SG.FRAME.h;
      c.setAttribute('aria-label', `Facing ${d}`);
      c.addEventListener('click', () => setDir(d));
      const cap = document.createElement('figcaption');
      cap.textContent = d;
      fig.append(c, cap);
      strip.appendChild(fig);
      stripCanvases.push(c);
    }
  }

  function buildAnimSeg() {
    const seg = $('anim-seg');
    for (const a of Object.keys(ANIMS)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.textContent = a.charAt(0).toUpperCase() + a.slice(1);
      b.dataset.anim = a;
      b.addEventListener('click', () => { state.view.anim = a; syncView(); });
      seg.appendChild(b);
    }
  }

  const COMPASS = ['NW', 'N', 'NE', 'W', null, 'E', 'SW', 'S', 'SE'];
  function buildCompass() {
    const cp = $('compass');
    for (const d of COMPASS) {
      const b = document.createElement('button');
      b.type = 'button';
      if (d) {
        b.textContent = d;
        b.dataset.dir = d;
        b.setAttribute('role', 'radio');
        b.addEventListener('click', () => { state.view.spin = false; setDir(d); });
      } else {
        b.textContent = '⟳';
        b.className = 'spin';
        b.title = 'Turn through all directions';
        b.setAttribute('aria-label', 'Turn through all directions');
        b.addEventListener('click', () => { state.view.spin = !state.view.spin; syncView(); });
      }
      cp.appendChild(b);
    }
  }

  function setDir(d) { state.view.dir = d; syncView(); }

  function syncView() {
    document.querySelectorAll('#anim-seg button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.anim === state.view.anim)));
    document.querySelectorAll('#compass button[data-dir]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.dir === state.view.dir)));
    const spin = document.querySelector('#compass .spin');
    if (spin) spin.setAttribute('aria-pressed', String(state.view.spin));
    $('play').textContent = state.view.playing ? 'Pause' : 'Play';
    $('play').setAttribute('aria-pressed', String(state.view.playing));
  }

  let clock = 0, last = performance.now(), spinClock = 0;
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function tick(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (state.view.playing) clock += dt * state.view.speed;
    if (state.view.spin) {
      spinClock += dt;
      if (spinClock > 0.9) {
        spinClock = 0;
        const order = ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'];
        state.view.dir = order[(order.indexOf(state.view.dir) + 1) % order.length];
        syncView();
      }
    }
    if (frames) {
      const a = state.view.anim, def = ANIMS[a];
      const i = Math.floor(clock * def.fps) % def.frames;
      draw(pctx, frames[a][state.view.dir][i]);
      SG.DIRS.forEach((d, k) => draw(stripCanvases[k].getContext('2d'), frames[a][d][i]));
      $('frame-readout').textContent = `${a} · ${state.view.dir} · frame ${i + 1}/${def.frames} · ${def.fps} fps`;
    }
    SG.iso && SG.iso.tick(dt, frames);
    requestAnimationFrame(tick);
  }
  function draw(ctx, img) {
    if (!img) return;
    ctx.putImageData(img, 0, 0);
  }

  // ---------------------------------------------------------------- top bar
  function buildPresets() {
    const sel = $('preset');
    sel.add(new Option('Custom', ''));
    for (const n of Object.keys(PRESETS)) sel.add(new Option(n, n));
    sel.addEventListener('change', () => {
      if (!sel.value) return;
      state.preset = sel.value;
      state.cfg = { ...BASE, ...PRESETS[sel.value] };
      syncControls();
      schedule();
      toast(`Loaded ${sel.value}`);
    });
  }

  function randomize() {
    for (const g of GROUPS) for (const item of g.items) {
      if (state.locks.has(item.key) || g.name === 'Style') continue;
      if (item.type === 'select') {
        let opts = item.options;
        // keep the extras occasional so random characters stay wearable
        if (['hat', 'held', 'back', 'glasses', 'facialHair'].includes(item.key) && Math.random() < 0.55) opts = ['none'];
        state.cfg[item.key] = opts[Math.floor(Math.random() * opts.length)];
      } else {
        const pal = PALETTES[item.palette];
        state.cfg[item.key] = pal[Math.floor(Math.random() * pal.length)];
      }
    }
    state.preset = '';
    syncControls();
    schedule();
  }

  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  const fileBase = () => (state.cfg.name || 'character').replace(/[^a-z0-9_-]+/gi, '-').toLowerCase();

  function wireTopBar() {
    $('randomize').addEventListener('click', randomize);
    $('save-preset').addEventListener('click', () => {
      download(new Blob([JSON.stringify(state.cfg, null, 2)], { type: 'application/json' }), `${fileBase()}.character.json`);
      toast('Saved character file');
    });
    $('load-preset').addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      f.text().then((txt) => {
        try {
          const data = JSON.parse(txt);
          const cfg = data.meta && data.meta.character ? data.meta.character : data; // accept atlas JSON too
          state.cfg = { ...BASE, ...cfg };
          state.preset = '';
          syncControls();
          schedule();
          toast(`Loaded ${f.name}`);
        } catch (err) {
          toast('That file is not a character or atlas JSON file');
        }
        e.target.value = '';
      });
    });
    $('char-name').addEventListener('input', (e) => { state.cfg.name = e.target.value; persist(); });
  }

  function wireExport() {
    const bind = (id, key, num) => {
      const el = $(id);
      el.value = String(state.exp[key]);
      el.addEventListener('change', () => {
        state.exp[key] = num ? Number(el.value) : el.value;
        if (key === 'frame') renderNow(); else rebuildSheet();
        persist();
      });
    };
    const order = $('opt-order');
    for (const k of Object.keys(DIR_ORDERS)) order.add(new Option(k, k));
    bind('opt-frame', 'frame');
    bind('opt-scale', 'scale', true);
    bind('opt-layout', 'layout');
    bind('opt-pad', 'pad', true);
    bind('opt-order', 'order');
    const box = $('anim-checks');
    for (const a of Object.keys(ANIMS)) {
      const l = document.createElement('label');
      l.innerHTML = `<input type="checkbox" id="anim-${a}"> ${a} <span class="readout">${ANIMS[a].frames}f</span>`;
      const cb = l.querySelector('input');
      cb.checked = !!state.exp.anims[a];
      cb.addEventListener('change', () => { state.exp.anims[a] = cb.checked; rebuildSheet(); persist(); });
      box.appendChild(l);
    }
    $('dl-png').addEventListener('click', () => {
      if (!sheet) return toast('Pick at least one animation first');
      sheet.canvas.toBlob((b) => { download(b, `${fileBase()}_sheet.png`); toast('Downloaded sprite sheet PNG'); }, 'image/png');
    });
    $('dl-json').addEventListener('click', () => {
      if (!sheet) return toast('Pick at least one animation first');
      sheet.meta.meta.image = `${fileBase()}_sheet.png`;
      download(new Blob([JSON.stringify(sheet.meta, null, 2)], { type: 'application/json' }), `${fileBase()}_sheet.json`);
      toast('Downloaded atlas JSON');
    });
    $('copy-json').addEventListener('click', () => {
      if (!sheet) return toast('Pick at least one animation first');
      const txt = JSON.stringify(sheet.meta, null, 2);
      const p = navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(txt) : Promise.reject();
      p.then(() => toast('Copied atlas JSON'), () => toast('Copy is blocked here. Use Download atlas JSON instead.'));
    });
  }

  function wirePlayback() {
    $('play').addEventListener('click', () => { state.view.playing = !state.view.playing; syncView(); });
    const sp = $('speed');
    sp.addEventListener('input', () => { state.view.speed = Number(sp.value); $('speed-out').textContent = `${sp.value}×`; });
    if (reduced) { state.view.playing = false; }
  }

  function wireTabs() {
    const tabs = [['tab-preview', 'view-preview'], ['tab-iso', 'view-iso']];
    for (const [t, v] of tabs) {
      $(t).addEventListener('click', () => {
        for (const [t2, v2] of tabs) {
          $(t2).setAttribute('aria-selected', String(t2 === t));
          $(v2).hidden = v2 !== v;
        }
        if (v === 'view-iso') $('iso').focus({ preventScroll: true });
      });
    }
  }

  // ---------------------------------------------------------------- boot
  buildControls();
  buildPresets();
  buildAnimSeg();
  buildCompass();
  buildStrip();
  wireTopBar();
  wireExport();
  wirePlayback();
  wireTabs();
  syncControls();
  syncView();
  SG.iso && SG.iso.init($('iso'));
  renderNow();
  requestAnimationFrame(tick);

  SG.ui = { state, renderNow };
})();
