// Cat sprite system — ToffeeCraft Cat Pack (Mochi)
// 13 color variants, 15 animations per variant, 32×32 GIF assets
// Accessory overlays use the same sprite sheet layout (transparent PNGs)

const CAT_VARIANTS = [
  { key: 'dark_gray',  index: 1,  hex: '#504758', name: 'Gris oscuro'   },
  { key: 'charcoal',   index: 2,  hex: '#504347', name: 'Carbón'        },
  { key: 'maroon',     index: 3,  hex: '#6d3232', name: 'Castaño'       },
  { key: 'chocolate',  index: 4,  hex: '#64422f', name: 'Chocolate'     },
  { key: 'orange',     index: 5,  hex: '#e1882f', name: 'Naranja'       },
  { key: 'ginger',     index: 6,  hex: '#ab572c', name: 'Jengibre'      },
  { key: 'tabby',      index: 7,  hex: '#867149', name: 'Atigrado'      },
  { key: 'cream',      index: 8,  hex: '#e2d3cf', name: 'Crema'         },
  { key: 'lavender',   index: 9,  hex: '#e1dee7', name: 'Lavanda'       },
  { key: 'lila',       index: 10, hex: '#bdb5c8', name: 'Lila'          },
  { key: 'caramel',    index: 11, hex: '#ae8659', name: 'Caramelo'      },
  { key: 'pink',       index: 12, hex: '#c9ada3', name: 'Rosado'        },
  { key: 'mauve',      index: 13, hex: '#845560', name: 'Malva'         },
];

// Legacy color key aliases from the old SVG system
const CAT_KEY_ALIASES = {
  black: 'dark_gray',
  white: 'cream',
  mint:  'lavender',
};

const CAT_ANIM_FILES = {
  meow_sit:      'meow_sit.gif',
  meow_sit2:     'meow_sit2.gif',
  meow_lie:      'meow_lie.gif',
  meow_stand:    'meow_stand.gif',
  yawn_sit:      'yawn_sit.gif',
  yawn_lie:      'yawn_lie.gif',
  wash_sit:      'wash_sit.gif',
  wash_lie:      'wash_lie.gif',
  on_hind_legs:  'on_hind_legs.gif',
  hiss_r:        'hiss_r.gif',
  hiss_l:        'hiss_l.gif',
  scratch_r:     'scratch_r.gif',
  scratch_l:     'scratch_l.gif',
  sleep1_l:      'sleep1_l.gif',
  sleep1_r:      'sleep1_r.gif',
  paw_att_right: 'paw_att_right.gif',
};

// Sprite sheet positions for accessory overlay compositing.
// Frames are 32×32 px (2 cell cols × 2 cell rows in the 16px grid).
// startY = pixel Y in the 352×1696 PNG; startX = always 0.
const ACC_SPRITE_CONFIG = {
  meow_sit:    { startY: 896,  frames: 3,  ms: 250 },
  meow_sit2:   { startY: 928,  frames: 3,  ms: 250 },
  meow_stand:  { startY: 960,  frames: 3,  ms: 250 },
  meow_lie:    { startY: 992,  frames: 3,  ms: 250 },
  yawn_sit:    { startY: 1024, frames: 8,  ms: 140 },
  yawn_lie:    { startY: 1120, frames: 8,  ms: 140 },
  wash_sit:    { startY: 1152, frames: 9,  ms: 170 },
  wash_lie:    { startY: 1216, frames: 7,  ms: 200 },
  scratch_l:   { startY: 1248, frames: 11, ms: 130 },
  scratch_r:   { startY: 1280, frames: 11, ms: 130 },
  hiss_l:      { startY: 1312, frames: 2,  ms: 330 },
  hiss_r:      { startY: 1344, frames: 2,  ms: 330 },
  on_hind_legs:{ startY: 1664, frames: 3,  ms: 250 },
  sleep1_l:    { startY: 384,  frames: 2,  ms: 500 },
};

const ACC_FILES = {
  // Accessories
  bow:          'bow_pink.png',
  collar:       'collar_blue.png',
  bow_gold:     'bow_gold.png',
  bow_red:      'bow_red.png',
  bow_blue:     'bow_blue.png',
  bow_green:    'bow_green.png',
  bow_pink2:    'bow_pink2.png',
  glasses_gold: 'glasses_gold.png',
  glasses_red:  'glasses_red.png',
  wings:        'wings.png',
  nimbus:       'nimbus.png',
  cupid:        'cupid.png',
  // Hats (keys match user.hat values)
  crown:        'hat_crown.png',
  chef:         'hat_chef.png',
  cap:          'hat_cap.png',
};

// Inject keyframe animations once on load
(function injectAccKeyframes() {
  const keyframes = [];
  for (const [anim, cfg] of Object.entries(ACC_SPRITE_CONFIG)) {
    const safeName = anim.replace(/[^a-z0-9]/gi, '_');
    // One keyframe per frame count (reuse across sizes via CSS custom prop trick)
    keyframes.push(`@keyframes acc_${safeName} { to { background-position-x: calc(var(--acc-fw) * -${cfg.frames}); } }`);
  }
  const style = document.createElement('style');
  style.textContent = keyframes.join('\n');
  document.head.appendChild(style);
})();

function resolveVariant(colorKey) {
  const key = CAT_KEY_ALIASES[colorKey] || colorKey;
  return CAT_VARIANTS.find(v => v.key === key) || CAT_VARIANTS[4];
}

function getVariantHex(colorKey) {
  return resolveVariant(colorKey).hex;
}

// Render a cat sprite with optional accessory overlay
function renderCatSprite({ color = 'orange', animation = 'meow_sit', size = 32, accessory = null } = {}) {
  const variant = resolveVariant(color);
  const file = CAT_ANIM_FILES[animation] || 'meow_sit.gif';
  const src = `/sprites/cats/cat-${variant.index}/${file}`;
  const px = Math.round(size);

  if (!accessory || !ACC_FILES[accessory] || !ACC_SPRITE_CONFIG[animation]) {
    return `<img src="${src}" width="${px}" height="${px}" style="image-rendering:pixelated;display:block;" draggable="false">`;
  }

  const cfg = ACC_SPRITE_CONFIG[animation];
  const accFile = ACC_FILES[accessory];
  const safeName = animation.replace(/[^a-z0-9]/gi, '_');

  // Scale so native 32×32 frame → px×px display
  const scale = px / 32;
  const bgW = Math.round(352 * scale);
  const bgH = Math.round(1696 * scale);
  const bgY = Math.round(cfg.startY * scale);
  const fw   = Math.round(32 * scale);  // frame width in display pixels
  const dur  = cfg.frames * cfg.ms;

  return `<div style="position:relative;width:${px}px;height:${px}px;display:inline-block;line-height:0;flex-shrink:0;">
    <img src="${src}" width="${px}" height="${px}" style="image-rendering:pixelated;display:block;position:absolute;top:0;left:0;" draggable="false">
    <div style="position:absolute;top:0;left:0;width:${px}px;height:${px}px;--acc-fw:${fw}px;background-image:url('/sprites/accessories/${accFile}');background-size:${bgW}px ${bgH}px;background-position:0px -${bgY}px;image-rendering:pixelated;animation:acc_${safeName} ${dur}ms steps(${cfg.frames}) infinite;pointer-events:none;"></div>
  </div>`;
}

// Render a cat with multiple overlay layers stacked (e.g. hat + accessory simultaneously)
function renderCatSpriteMulti({ color = 'orange', animation = 'meow_sit', size = 32, accessories = [] } = {}) {
  const variant = resolveVariant(color);
  const file = CAT_ANIM_FILES[animation] || 'meow_sit.gif';
  const src = `/sprites/cats/cat-${variant.index}/${file}`;
  const px = Math.round(size);
  const cfg = ACC_SPRITE_CONFIG[animation];

  const valid = accessories.filter(a => a && ACC_FILES[a] && cfg);
  if (!valid.length) {
    return `<img src="${src}" width="${px}" height="${px}" style="image-rendering:pixelated;display:block;" draggable="false">`;
  }

  const scale = px / 32;
  const bgW = Math.round(352 * scale);
  const bgH = Math.round(1696 * scale);
  const bgY = Math.round(cfg.startY * scale);
  const fw   = Math.round(32 * scale);
  const dur  = cfg.frames * cfg.ms;
  const safeName = animation.replace(/[^a-z0-9]/gi, '_');

  let html = `<div style="position:relative;width:${px}px;height:${px}px;display:inline-block;line-height:0;flex-shrink:0;">
    <img src="${src}" width="${px}" height="${px}" style="image-rendering:pixelated;display:block;position:absolute;top:0;left:0;" draggable="false">`;
  for (const key of valid) {
    html += `<div style="position:absolute;top:0;left:0;width:${px}px;height:${px}px;--acc-fw:${fw}px;background-image:url('/sprites/accessories/${ACC_FILES[key]}');background-size:${bgW}px ${bgH}px;background-position:0px -${bgY}px;image-rendering:pixelated;animation:acc_${safeName} ${dur}ms steps(${cfg.frames}) infinite;pointer-events:none;"></div>`;
  }
  html += `</div>`;
  return html;
}

function getCatSpriteVariants() {
  return CAT_VARIANTS.map(v => ({ key: v.key, hex: v.hex, name: v.name }));
}
