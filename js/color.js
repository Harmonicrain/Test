// Colour maths and ramp generation.
(function () {
  const SG = (window.SG = window.SG || {});

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function hexToRgb(hex) {
    let h = String(hex).replace('#', '').trim();
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0, s = 0;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return [h, s, l];
  }

  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r, g, b;
    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
  }

  // Move hue h toward target by at most amt degrees, taking the short way round.
  function hueToward(h, target, amt) {
    const d = ((target - h + 540) % 360) - 180;
    return h + Math.sign(d) * Math.min(Math.abs(d), amt);
  }

  // Packed for a Uint32Array view over ImageData (little-endian ABGR).
  function pack(r, g, b, a = 255) {
    return ((a << 24) | (clamp(Math.round(b), 0, 255) << 16) | (clamp(Math.round(g), 0, 255) << 8) | clamp(Math.round(r), 0, 255)) >>> 0;
  }

  function unpack(c) {
    return [c & 255, (c >>> 8) & 255, (c >>> 16) & 255, (c >>> 24) & 255];
  }

  function mix(c1, c2, t) {
    const a = unpack(c1), b = unpack(c2);
    return pack(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, 255);
  }

  const rampCache = new Map();

  // Four tones from one base colour: [highlight, base, shadow, deep].
  // Shadows shift toward blue-violet, highlights toward yellow, the classic pixel-art hue shift.
  function ramp(hex) {
    const key = String(hex).toLowerCase();
    if (rampCache.has(key)) return rampCache.get(key);
    const [r, g, b] = hexToRgb(hex);
    const [h, s, l] = rgbToHsl(r, g, b);
    const k = s < 0.08 ? 0.2 : 1; // greys barely shift
    const mk = (hh, ss, ll) => pack(...hslToRgb(hh, clamp(ss, 0, 1), clamp(ll, 0.03, 0.97)));
    const out = [
      mk(hueToward(h, 55, 9 * k), s + 0.03 * k, l + 0.11),
      pack(r, g, b),
      mk(hueToward(h, 250, 10 * k), s + 0.06 * k, l - Math.max(0.07, 0.2 * l)),
      mk(hueToward(h, 255, 20 * k), s + 0.04 * k, l - Math.max(0.12, 0.42 * l)),
    ];
    rampCache.set(key, out);
    return out;
  }

  SG.color = { clamp, hexToRgb, rgbToHex, rgbToHsl, hslToRgb, pack, unpack, mix, ramp, hueToward };
})();
