// Option lists, colour palettes and presets. Draw code lives in head.js and body.js;
// this file is the menu.
(function () {
  const SG = (window.SG = window.SG || {});

  const PALETTES = {
    skin: ['#ffe2cc', '#f6cfae', '#eab48c', '#d99a70', '#bd7c52', '#9a5c3a', '#7a4428', '#5a301c', '#3e2214'],
    hair: ['#1c1418', '#2e2026', '#4a2c1e', '#6a341e', '#7a4224', '#9a5428', '#c07038', '#d8a050', '#ecd29a', '#c8c4c8', '#f0eeec', '#b02a3a', '#e04a8a', '#7a3fc0', '#3a5ac8', '#2a8a78'],
    eyes: ['#2a1a14', '#5a3018', '#6a3c1e', '#8a5a2a', '#3a6a9a', '#3d7a4a', '#6a7a8a', '#7a3a8a'],
    cloth: ['#5d6a33', '#3e5a2a', '#2f7a4a', '#2a4a6e', '#3a6aa8', '#7aa0d0', '#8a2e2e', '#c8383c', '#d8a440', '#efe4cf', '#f4f2ee', '#a8a8b2', '#4a4a56', '#2a2a34', '#3a3238', '#5a3a6e', '#2a7068', '#6b4a32', '#e07a9a', '#e8c8a0'],
    leather: ['#5a3424', '#7a4a2a', '#9a6a3e', '#2a2026', '#1e1e24', '#efede8', '#c8383c', '#3a5aa8'],
    metal: ['#e0aa38', '#c8ccd4', '#b06a3a', '#2a1e20', '#4a3a6a'],
    outline: ['#1d1424', '#000000', '#2a1810', '#141c2a'],
  };

  // Each control: key, label, type ('select' | 'color'), and its options or palette.
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
        { key: 'eyes', label: 'Eyes', type: 'select', options: ['default', 'round', 'happy', 'sleepy', 'closed', 'stern', 'beady'] },
        { key: 'eyeColor', label: 'Eye colour', type: 'color', palette: 'eyes' },
        { key: 'brows', label: 'Brows', type: 'select', options: ['normal', 'soft', 'thick', 'angry', 'worried', 'none'] },
        { key: 'nose', label: 'Nose', type: 'select', options: ['dot', 'none'] },
        { key: 'mouth', label: 'Mouth', type: 'select', options: ['smile', 'neutral', 'open', 'grin', 'smirk', 'frown', 'none'] },
        { key: 'lips', label: 'Lips', type: 'select', options: ['natural', 'red', 'pink', 'plum'] },
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
        { key: 'top', label: 'Top', type: 'select', options: ['jacket', 'tshirt', 'longsleeve', 'buttonup', 'sweater', 'hoodie', 'apron', 'tank', 'coat', 'tunic', 'dress', 'robe', 'none'] },
        { key: 'topColor', label: 'Top colour', type: 'color', palette: 'cloth' },
        { key: 'top2Color', label: 'Inner / trim', type: 'color', palette: 'cloth' },
        { key: 'bottom', label: 'Bottoms', type: 'select', options: ['trousers', 'jeans', 'shorts', 'skirt', 'longskirt'] },
        { key: 'bottomColor', label: 'Bottoms colour', type: 'color', palette: 'cloth' },
        { key: 'shoes', label: 'Footwear', type: 'select', options: ['shoes', 'sneakers', 'boots', 'sandals', 'barefoot'] },
        { key: 'shoeColor', label: 'Footwear colour', type: 'color', palette: 'leather' },
      ],
    },
    {
      name: 'Accessories',
      items: [
        { key: 'glasses', label: 'Glasses', type: 'select', options: ['none', 'round', 'square', 'shades'] },
        { key: 'glassesColor', label: 'Frame colour', type: 'color', palette: 'metal' },
        { key: 'earrings', label: 'Earrings', type: 'select', options: ['none', 'drops', 'hoops', 'studs'] },
        { key: 'earringColor', label: 'Earring metal', type: 'color', palette: 'metal' },
        { key: 'hat', label: 'Hat', type: 'select', options: ['none', 'cap', 'beanie', 'sunhat', 'headband', 'wizard'] },
        { key: 'hatColor', label: 'Hat colour', type: 'color', palette: 'cloth' },
        { key: 'badge', label: 'Lapel pin', type: 'select', options: ['none', 'badge'] },
        { key: 'held', label: 'Holding', type: 'select', options: ['none', 'clipboard', 'coffee', 'phone', 'book'] },
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
    messybun: 'Messy curly bun', topbun: 'Top bun', short: 'Short', swept: 'Side swept', buzz: 'Buzz cut', ponytail: 'Ponytail',
    pigtails: 'Pigtails', bob: 'Bob', long: 'Long', afro: 'Afro', spiky: 'Spiky', mohawk: 'Mohawk', bald: 'Bald',
    tshirt: 'T-shirt', longsleeve: 'Long sleeve', buttonup: 'Button-up', sweater: 'Sweater', hoodie: 'Hoodie', tank: 'Tank top',
    jacket: 'Blazer', coat: 'Long coat', apron: 'Apron over tee', tunic: 'Belted tunic', dress: 'Dress', robe: 'Robe', none: 'None',
    trousers: 'Trousers', jeans: 'Cuffed jeans', shorts: 'Shorts', skirt: 'Skirt', longskirt: 'Long skirt',
    shoes: 'Shoes', boots: 'Boots', sneakers: 'Sneakers', sandals: 'Sandals', barefoot: 'Barefoot',
    cap: 'Cap', beanie: 'Beanie', sunhat: 'Sun hat', headband: 'Headband', wizard: 'Wizard hat',
    square: 'Square', round: 'Round', shades: 'Sunglasses', drops: 'Drops', hoops: 'Hoops', studs: 'Studs',
    badge: 'Gold name badge', clipboard: 'Clipboard', coffee: 'Coffee cup', phone: 'Phone', book: 'Book',
    backpack: 'Backpack', cape: 'Cape', selout: 'Selective', black: 'Black', colored: 'Coloured',
    slim: 'Slim', average: 'Average', broad: 'Broad', heavy: 'Heavy', straight: 'Straight', curvy: 'Curvy', tall: 'Tall',
    default: 'Default', happy: 'Happy (closed)', sleepy: 'Sleepy', closed: 'Closed', stern: 'Stern', beady: 'Beady',
    normal: 'Normal', soft: 'Soft', thick: 'Thick', angry: 'Angry', worried: 'Worried', dot: 'Dot', neutral: 'Neutral', smile: 'Smile',
    open: 'Open smile', grin: 'Grin', frown: 'Frown', smirk: 'Smirk', natural: 'Natural', red: 'Red', pink: 'Pink', plum: 'Plum',
    blush: 'Blush', freckles: 'Freckles', stubble: 'Stubble', mustache: 'Mustache', goatee: 'Goatee', beard: 'Full beard',
  };
  const label = (v) => LABELS[v] || v.charAt(0).toUpperCase() + v.slice(1);

  const BASE = {
    name: 'character',
    build: 'average', figure: 'straight', height: 'average', skin: '#eab48c',
    eyes: 'default', eyeColor: '#5a3018', brows: 'normal', nose: 'dot', mouth: 'smile', lips: 'natural', cheeks: 'none', facialHair: 'none',
    hair: 'short', hairColor: '#6e3a20',
    top: 'tshirt', topColor: '#c8383c', top2Color: '#f4f2ee',
    bottom: 'jeans', bottomColor: '#3a6aa8', shoes: 'sneakers', shoeColor: '#efede8',
    glasses: 'none', glassesColor: '#2a1e20', earrings: 'none', earringColor: '#e0aa38',
    hat: 'none', hatColor: '#8a2e2e', badge: 'none', held: 'none', back: 'none', backColor: '#6b4a32',
    outline: 'selout', outlineColor: '#1d1424',
  };

  // Presets modelled on the game's cast portraits.
  const PRESETS = {
    'Mara Finch': {
      ...BASE, name: 'mara-finch', build: 'slim', figure: 'curvy', skin: '#eab48c', eyes: 'default', eyeColor: '#6a3c1e',
      mouth: 'smile', lips: 'red', cheeks: 'blush', hair: 'messybun', hairColor: '#6a341e',
      top: 'jacket', topColor: '#5d6a33', top2Color: '#efe4cf', bottom: 'trousers', bottomColor: '#3a3238',
      shoes: 'shoes', shoeColor: '#5a3424', glasses: 'round', glassesColor: '#1d1424', earrings: 'drops', badge: 'badge', held: 'clipboard',
    },
    'Maya (barista)': {
      ...BASE, name: 'maya', build: 'slim', figure: 'curvy', skin: '#f6cfae', eyes: 'happy', mouth: 'open', cheeks: 'blush',
      hair: 'long', hairColor: '#7a4224', top: 'apron', topColor: '#2f7a4a', top2Color: '#f4f2ee', bottom: 'jeans',
      bottomColor: '#3a6aa8', shoes: 'sneakers', shoeColor: '#efede8', hat: 'sunhat', hatColor: '#e8c060',
    },
    'Jules Park': {
      ...BASE, name: 'jules-park', skin: '#eab48c', eyes: 'default', eyeColor: '#2a1a14', mouth: 'grin', hair: 'spiky',
      hairColor: '#1c1418', top: 'hoodie', topColor: '#a8a8b2', top2Color: '#f4f2ee', bottom: 'jeans', bottomColor: '#2a2a34',
      shoes: 'sneakers', shoeColor: '#efede8', hat: 'cap', hatColor: '#c8383c', back: 'backpack', backColor: '#2a2a34', earrings: 'studs', earringColor: '#c8ccd4',
    },
    'Bo Ellis': {
      ...BASE, name: 'bo-ellis', build: 'heavy', skin: '#eab48c', eyes: 'happy', mouth: 'open', hair: 'short', hairColor: '#f0eeec',
      facialHair: 'beard', brows: 'thick', top: 'buttonup', topColor: '#e8c8a0', top2Color: '#6b4a32', bottom: 'trousers',
      bottomColor: '#6b4a32', shoes: 'boots', shoeColor: '#5a3424', hat: 'cap', hatColor: '#3e5a2a',
    },
    'Nia Okafor': {
      ...BASE, name: 'nia-okafor', figure: 'curvy', skin: '#7a4428', eyes: 'happy', mouth: 'smile', lips: 'plum', hair: 'afro',
      hairColor: '#c8c4c8', glasses: 'round', glassesColor: '#2a1e20', earrings: 'drops', top: 'sweater', topColor: '#efe4cf',
      bottom: 'longskirt', bottomColor: '#5a3a6e', shoes: 'shoes', shoeColor: '#5a3424', hat: 'headband', hatColor: '#d8a440',
    },
    'Kit Voss': {
      ...BASE, name: 'kit-voss', build: 'slim', figure: 'curvy', skin: '#f6cfae', eyes: 'round', eyeColor: '#7a3a8a', mouth: 'open',
      lips: 'pink', hair: 'pigtails', hairColor: '#e04a8a', top: 'jacket', topColor: '#2a2a34', top2Color: '#e07a9a',
      bottom: 'skirt', bottomColor: '#2a2a34', shoes: 'boots', shoeColor: '#1e1e24', earrings: 'hoops', earringColor: '#c8ccd4',
    },
  };

  const DEFAULT = PRESETS['Mara Finch'];

  const BUILDS = {
    slim: { bw: 5, lw: 5, aw: 3.6 },
    average: { bw: 6, lw: 5, aw: 3.8 },
    broad: { bw: 7, lw: 6, aw: 4.2 },
    heavy: { bw: 7, lw: 6, aw: 4.2, belly: 1.5 },
  };
  const HEIGHTS = { short: -3, average: 0, tall: 3 };

  SG.catalog = { PALETTES, GROUPS, BASE, DEFAULT, PRESETS, BUILDS, HEIGHTS, label };
})();
