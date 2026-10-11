// Option lists, colour palettes and presets. Draw code lives in head.js / body.js;
// this file is the menu.
(function () {
  const SG = (window.SG = window.SG || {});

  const PALETTES = {
    skin: ['#ffe0c4', '#f4c7a1', '#e8a878', '#d08a5c', '#b06c45', '#8a4f32', '#653722', '#4a2818', '#b8d48a', '#9ab0d8'],
    hair: ['#1e1612', '#3b2618', '#6b3a1e', '#9a4e24', '#c47a3a', '#e0b060', '#f2dca0', '#a8a8b0', '#e8e8ec', '#b03030', '#3070c0', '#d070b0', '#40a070'],
    eyes: ['#3a2418', '#6b4422', '#3a6a9a', '#3d7a4a', '#7a7a8a', '#8a3a7a', '#c08a20', '#b02020'],
    cloth: ['#596b34', '#3e5a2a', '#2f4a6e', '#3a7aa8', '#8a2e2e', '#c2553a', '#d8a440', '#e8dcc0', '#f2f0ea', '#9a9aa4', '#4a4a56', '#24232e', '#5a3a6e', '#2a7068', '#6b4a32', '#d07090'],
    leather: ['#4a3022', '#6b4428', '#8a5a34', '#2a2026', '#1e1e24', '#a87a4a', '#e8e4dc', '#8a2e2e'],
    metal: ['#2a2026', '#d8a838', '#c8c8d0', '#b06a3a', '#3a3a48'],
    outline: ['#1b1220', '#000000', '#2a1a14', '#1a2030'],
  };

  // Each control: key, label, type ('select' | 'color'), options or palette.
  const GROUPS = [
    {
      name: 'Body',
      items: [
        { key: 'build', label: 'Build', type: 'select', options: ['slim', 'average', 'broad', 'heavy'] },
        { key: 'figure', label: 'Figure', type: 'select', options: ['straight', 'curvy'] },
        { key: 'height', label: 'Height', type: 'select', options: ['short', 'average', 'tall'] },
        { key: 'skin', label: 'Skin', type: 'color', palette: 'skin' },
      ],
    },
    {
      name: 'Face',
      items: [
        { key: 'eyes', label: 'Eyes', type: 'select', options: ['default', 'beady', 'big', 'sleepy', 'closed', 'stern'] },
        { key: 'eyeColor', label: 'Eye colour', type: 'color', palette: 'eyes' },
        { key: 'brows', label: 'Brows', type: 'select', options: ['normal', 'thick', 'angry', 'worried', 'none'] },
        { key: 'nose', label: 'Nose', type: 'select', options: ['dot', 'none'] },
        { key: 'mouth', label: 'Mouth', type: 'select', options: ['neutral', 'smile', 'frown', 'open', 'smirk', 'none'] },
        { key: 'cheeks', label: 'Cheeks', type: 'select', options: ['none', 'blush', 'freckles'] },
        { key: 'facialHair', label: 'Facial hair', type: 'select', options: ['none', 'stubble', 'mustache', 'goatee', 'beard'] },
      ],
    },
    {
      name: 'Hair',
      items: [
        { key: 'hair', label: 'Style', type: 'select', options: ['messybun', 'topbun', 'short', 'swept', 'buzz', 'ponytail', 'pigtails', 'bob', 'long', 'afro', 'spiky', 'mohawk', 'bald'] },
        { key: 'hairColor', label: 'Colour', type: 'color', palette: 'hair' },
      ],
    },
    {
      name: 'Outfit',
      items: [
        { key: 'top', label: 'Top', type: 'select', options: ['jacket', 'tshirt', 'longsleeve', 'buttonup', 'sweater', 'hoodie', 'tank', 'coat', 'tunic', 'dress', 'robe', 'none'] },
        { key: 'topColor', label: 'Top colour', type: 'color', palette: 'cloth' },
        { key: 'top2Color', label: 'Inner / trim', type: 'color', palette: 'cloth' },
        { key: 'bottom', label: 'Bottoms', type: 'select', options: ['trousers', 'shorts', 'skirt', 'longskirt'] },
        { key: 'bottomColor', label: 'Bottoms colour', type: 'color', palette: 'cloth' },
        { key: 'shoes', label: 'Footwear', type: 'select', options: ['shoes', 'boots', 'sneakers', 'sandals', 'barefoot'] },
        { key: 'shoeColor', label: 'Footwear colour', type: 'color', palette: 'leather' },
      ],
    },
    {
      name: 'Accessories',
      items: [
        { key: 'hat', label: 'Hat', type: 'select', options: ['none', 'cap', 'beanie', 'headband', 'wizard'] },
        { key: 'hatColor', label: 'Hat colour', type: 'color', palette: 'cloth' },
        { key: 'glasses', label: 'Glasses', type: 'select', options: ['none', 'square', 'round', 'shades'] },
        { key: 'glassesColor', label: 'Frame colour', type: 'color', palette: 'metal' },
        { key: 'earrings', label: 'Earrings', type: 'select', options: ['none', 'gold', 'silver'] },
        { key: 'back', label: 'Back', type: 'select', options: ['none', 'backpack', 'cape'] },
        { key: 'backColor', label: 'Back colour', type: 'color', palette: 'cloth' },
      ],
    },
    {
      name: 'Style',
      items: [
        { key: 'outline', label: 'Outline', type: 'select', options: ['selout', 'black', 'colored', 'none'] },
        { key: 'outlineColor', label: 'Outline colour', type: 'color', palette: 'outline' },
      ],
    },
  ];

  const LABELS = {
    messybun: 'Messy bun', topbun: 'Top bun', short: 'Short', swept: 'Side swept', buzz: 'Buzz cut', ponytail: 'Ponytail',
    pigtails: 'Pigtails', bob: 'Bob', long: 'Long', afro: 'Afro', spiky: 'Spiky', mohawk: 'Mohawk', bald: 'Bald',
    tshirt: 'T-shirt', longsleeve: 'Long sleeve', buttonup: 'Button-up', sweater: 'Sweater', hoodie: 'Hoodie', tank: 'Tank top',
    jacket: 'Open jacket', coat: 'Long coat', tunic: 'Belted tunic', dress: 'Dress', robe: 'Robe', none: 'None',
    trousers: 'Trousers', shorts: 'Shorts', skirt: 'Skirt', longskirt: 'Long skirt',
    shoes: 'Shoes', boots: 'Boots', sneakers: 'Sneakers', sandals: 'Sandals', barefoot: 'Barefoot',
    cap: 'Cap', beanie: 'Beanie', headband: 'Headband', wizard: 'Wizard hat',
    square: 'Square', round: 'Round', shades: 'Sunglasses', gold: 'Gold', silver: 'Silver',
    backpack: 'Backpack', cape: 'Cape', selout: 'Selective', black: 'Black', colored: 'Coloured',
    slim: 'Slim', average: 'Average', broad: 'Broad', heavy: 'Heavy', straight: 'Straight', curvy: 'Curvy',
    short_h: 'Short', tall: 'Tall', default: 'Default', beady: 'Beady', big: 'Big', sleepy: 'Sleepy', closed: 'Closed', stern: 'Stern',
    normal: 'Normal', thick: 'Thick', angry: 'Angry', worried: 'Worried', dot: 'Dot', neutral: 'Neutral', smile: 'Smile',
    frown: 'Frown', open: 'Open', smirk: 'Smirk', blush: 'Blush', freckles: 'Freckles', stubble: 'Stubble', mustache: 'Mustache',
    goatee: 'Goatee', beard: 'Full beard',
  };
  const label = (v) => LABELS[v] || v.charAt(0).toUpperCase() + v.slice(1);

  const DEFAULT = {
    name: 'olive-jacket',
    build: 'average', figure: 'curvy', height: 'average', skin: '#e8a878',
    eyes: 'default', eyeColor: '#3a2418', brows: 'normal', nose: 'dot', mouth: 'neutral', cheeks: 'none', facialHair: 'none',
    hair: 'messybun', hairColor: '#8a4220',
    top: 'jacket', topColor: '#596b34', top2Color: '#e8dcc0',
    bottom: 'trousers', bottomColor: '#24232e', shoes: 'shoes', shoeColor: '#4a3022',
    hat: 'none', hatColor: '#8a2e2e', glasses: 'square', glassesColor: '#2a2026', earrings: 'gold',
    back: 'none', backColor: '#6b4a32',
    outline: 'selout', outlineColor: '#1b1220',
  };

  const PRESETS = {
    'Olive jacket (reference)': { ...DEFAULT },
    'Field medic': {
      ...DEFAULT, name: 'field-medic', figure: 'straight', build: 'broad', skin: '#8a4f32', hair: 'short', hairColor: '#1e1612',
      facialHair: 'beard', glasses: 'none', earrings: 'none', top: 'hoodie', topColor: '#3a7aa8', top2Color: '#f2f0ea',
      bottom: 'trousers', bottomColor: '#4a4a56', shoes: 'sneakers', shoeColor: '#e8e4dc', back: 'backpack', backColor: '#8a2e2e',
      mouth: 'smile',
    },
    'Hedge wizard': {
      ...DEFAULT, name: 'hedge-wizard', figure: 'straight', build: 'slim', skin: '#f4c7a1', hair: 'long', hairColor: '#e8e8ec',
      facialHair: 'beard', glasses: 'round', glassesColor: '#d8a838', earrings: 'none', top: 'robe', topColor: '#5a3a6e',
      top2Color: '#d8a440', hat: 'wizard', hatColor: '#5a3a6e', shoes: 'sandals', shoeColor: '#6b4428', eyes: 'sleepy',
    },
    'Courier': {
      ...DEFAULT, name: 'courier', skin: '#f4c7a1', hair: 'ponytail', hairColor: '#c47a3a', glasses: 'none', earrings: 'silver',
      top: 'tshirt', topColor: '#c2553a', bottom: 'shorts', bottomColor: '#2f4a6e', shoes: 'sneakers', shoeColor: '#e8e4dc',
      hat: 'cap', hatColor: '#2f4a6e', back: 'backpack', backColor: '#d8a440', cheeks: 'freckles', mouth: 'smile', eyes: 'big',
    },
    'Knight errant': {
      ...DEFAULT, name: 'knight-errant', figure: 'straight', build: 'broad', height: 'tall', skin: '#d08a5c', hair: 'swept',
      hairColor: '#1e1612', glasses: 'none', earrings: 'none', top: 'tunic', topColor: '#8a2e2e', top2Color: '#6b4428',
      bottom: 'trousers', bottomColor: '#4a4a56', shoes: 'boots', shoeColor: '#2a2026', back: 'cape', backColor: '#2f4a6e',
      brows: 'thick', eyes: 'stern', facialHair: 'stubble',
    },
  };

  const BUILDS = {
    slim: { bw: 5, lw: 3, aw: 2.6 },
    average: { bw: 6, lw: 4, aw: 3 },
    broad: { bw: 7, lw: 4, aw: 3.4 },
    heavy: { bw: 7, lw: 5, aw: 3.4, belly: 1 },
  };
  const HEIGHTS = { short: -2, average: 0, tall: 2 };

  SG.catalog = { PALETTES, GROUPS, DEFAULT, PRESETS, BUILDS, HEIGHTS, label };
})();
