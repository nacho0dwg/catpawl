// CAT_PALETTES: used for payer border-left color in feed and any place
// that needs a CSS hex without rendering a full sprite.
// Entries match the sprite variant hex values from sprite.js.
const CAT_PALETTES = {
  dark_gray:  { body: '#504758' },
  charcoal:   { body: '#504347' },
  maroon:     { body: '#6d3232' },
  chocolate:  { body: '#64422f' },
  orange:     { body: '#e1882f' },
  ginger:     { body: '#ab572c' },
  tabby:      { body: '#867149' },
  cream:      { body: '#e2d3cf' },
  lavender:   { body: '#e1dee7' },
  lila:       { body: '#bdb5c8' },
  caramel:    { body: '#ae8659' },
  pink:       { body: '#c9ada3' },
  mauve:      { body: '#845560' },
  // legacy aliases
  black:      { body: '#504758' },
  white:      { body: '#e2d3cf' },
  mint:       { body: '#e1dee7' },
};

// Public rendering API — delegates to sprite.js
function renderCat({ color = 'orange', size = 32, animation = 'meow_sit' } = {}) {
  return renderCatSprite({ color, size, animation });
}

// Nav cat: small pixelated sitting cat, optional active highlight via CSS
function renderNavCat(color = 'orange', isActive = false) {
  const variant = resolveVariant(color);
  const file = 'meow_sit.gif';
  const src = `/sprites/cats/cat-${variant.index}/${file}`;
  const outline = isActive ? '2px solid var(--accent)' : 'none';
  return `<img src="${src}" width="32" height="32" style="image-rendering:pixelated;display:block;outline:${outline};border-radius:2px;" draggable="false">`;
}

function renderThiefCat(daysUnpaid = 0) {
  const baseSize = 48;
  const maxSize = 120;
  const size = Math.min(baseSize + daysUnpaid * 8, maxSize);
  const anim = daysUnpaid >= 5 ? 'scratch_r' : daysUnpaid >= 2 ? 'hiss_r' : 'meow_sit';
  const variant = resolveVariant('dark_gray');
  const file = CAT_ANIM_FILES[anim] || 'meow_sit.gif';
  const src = `/sprites/cats/cat-${variant.index}/${file}`;
  return `<div class="thief-cat-wrap" style="display:inline-flex;flex-direction:column;align-items:center;gap:2px;">
    <img src="${src}" width="${size}" height="${size}" style="image-rendering:pixelated;display:block;" draggable="false">
    ${daysUnpaid >= 3 ? `<span style="font-size:9px;color:#5a6a80;">${daysUnpaid}d</span>` : ''}
  </div>`;
}

function getCatColors() {
  return getCatSpriteVariants();
}
