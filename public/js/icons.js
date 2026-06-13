// Pixel art SVG icons for expense categories.
// Use getCategoryIcon(cat, size) to get a resized SVG for any category key.
const ICONS = {
  bebidas: `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
    <rect x="14" y="2" width="8" height="4" fill="#F9A825"/>
    <rect x="12" y="6" width="12" height="6" fill="#AED581"/>
    <rect x="10" y="12" width="16" height="2" fill="#8BC34A"/>
    <rect x="8" y="14" width="20" height="16" fill="#8BC34A"/>
    <rect x="10" y="16" width="16" height="12" fill="#C5E1A5"/>
    <rect x="10" y="18" width="16" height="6" fill="#FFFFFF" opacity="0.4"/>
    <rect x="8" y="30" width="20" height="4" fill="#558B2F"/>
  </svg>`,
  avion: `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
    <rect x="16" y="2" width="4" height="26" fill="#B0BEC5"/>
    <rect x="16" y="2" width="4" height="4" rx="1" fill="#CFD8DC"/>
    <rect x="4" y="14" width="28" height="6" fill="#90A4AE"/>
    <rect x="2" y="16" width="4" height="2" fill="#78909C"/>
    <rect x="30" y="16" width="4" height="2" fill="#78909C"/>
    <rect x="6" y="12" width="8" height="2" fill="#90A4AE"/>
    <rect x="22" y="12" width="8" height="2" fill="#90A4AE"/>
    <rect x="10" y="26" width="16" height="4" fill="#90A4AE"/>
    <rect x="16" y="22" width="4" height="6" fill="#CFD8DC"/>
    <rect x="16" y="10" width="4" height="2" fill="#B3E5FC"/>
    <rect x="16" y="14" width="4" height="2" fill="#B3E5FC"/>
  </svg>`,
  comida: `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
    <rect x="6" y="4" width="24" height="6" rx="2" fill="#FFCC80"/>
    <rect x="4" y="8" width="28" height="4" fill="#FFA726"/>
    <rect x="4" y="12" width="28" height="4" fill="#66BB6A"/>
    <rect x="4" y="14" width="28" height="2" fill="#FFCA28"/>
    <rect x="4" y="16" width="28" height="6" fill="#8D6E63"/>
    <rect x="6" y="22" width="24" height="2" fill="#EF5350"/>
    <rect x="4" y="24" width="28" height="6" fill="#FFA726"/>
    <rect x="6" y="28" width="24" height="2" fill="#FFCC80"/>
  </svg>`,
  farmacia: `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
    <rect x="14" y="4" width="8" height="28" fill="#EF5350"/>
    <rect x="4" y="14" width="28" height="8" fill="#EF5350"/>
    <rect x="14" y="4" width="4" height="4" fill="#EF9A9A"/>
  </svg>`,
  transporte: `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
    <rect x="2" y="16" width="32" height="12" fill="#42A5F5"/>
    <rect x="8" y="10" width="20" height="8" fill="#64B5F6"/>
    <rect x="10" y="12" width="6" height="4" fill="#B3E5FC"/>
    <rect x="18" y="12" width="6" height="4" fill="#B3E5FC"/>
    <rect x="4" y="26" width="8" height="6" rx="2" fill="#212121"/>
    <rect x="24" y="26" width="8" height="6" rx="2" fill="#212121"/>
    <rect x="6" y="28" width="4" height="2" fill="#424242"/>
    <rect x="26" y="28" width="4" height="2" fill="#424242"/>
    <rect x="2" y="18" width="4" height="4" fill="#FFF176"/>
    <rect x="30" y="18" width="4" height="4" fill="#FF7043"/>
  </svg>`,
  mascota: `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
    <rect x="8" y="6" width="20" height="18" rx="4" fill="#FFCC80"/>
    <rect x="4" y="8" width="6" height="8" rx="2" fill="#FFA726"/>
    <rect x="26" y="8" width="6" height="8" rx="2" fill="#FFA726"/>
    <rect x="12" y="12" width="4" height="4" fill="#212121"/>
    <rect x="20" y="12" width="4" height="4" fill="#212121"/>
    <rect x="14" y="18" width="8" height="4" rx="2" fill="#6D4C41"/>
    <rect x="12" y="22" width="4" height="2" fill="#6D4C41"/>
    <rect x="20" y="22" width="4" height="2" fill="#6D4C41"/>
    <rect x="12" y="28" width="12" height="4" fill="#EEEEEE"/>
    <rect x="10" y="26" width="4" height="8" rx="2" fill="#BDBDBD"/>
    <rect x="22" y="26" width="4" height="8" rx="2" fill="#BDBDBD"/>
  </svg>`,
  regalos: `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
    <rect x="4" y="18" width="28" height="16" fill="#F48FB1"/>
    <rect x="4" y="14" width="28" height="6" fill="#F06292"/>
    <rect x="16" y="14" width="4" height="20" fill="#FFEB3B"/>
    <rect x="4" y="20" width="28" height="4" fill="#FFEB3B"/>
    <rect x="8" y="8" width="8" height="6" rx="2" fill="#FFEB3B"/>
    <rect x="20" y="8" width="8" height="6" rx="2" fill="#FFEB3B"/>
    <rect x="16" y="10" width="4" height="4" fill="#F9A825"/>
  </svg>`,
  musica: `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
    <rect x="10" y="6" width="4" height="18" fill="#CE93D8"/>
    <rect x="10" y="6" width="10" height="4" fill="#CE93D8"/>
    <rect x="20" y="10" width="4" height="16" fill="#CE93D8"/>
    <rect x="20" y="10" width="10" height="4" fill="#CE93D8"/>
    <rect x="6" y="20" width="8" height="6" rx="2" fill="#AB47BC"/>
    <rect x="16" y="22" width="8" height="6" rx="2" fill="#AB47BC"/>
  </svg>`,
  alojamiento: `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
    <rect x="18" y="4" width="4" height="4" fill="#EF5350"/>
    <rect x="14" y="8" width="12" height="4" fill="#EF5350"/>
    <rect x="10" y="12" width="16" height="4" fill="#EF5350"/>
    <rect x="6" y="16" width="24" height="4" fill="#EF5350"/>
    <rect x="6" y="18" width="24" height="14" fill="#FFCC80"/>
    <rect x="14" y="24" width="8" height="8" fill="#795548"/>
    <rect x="8" y="20" width="6" height="6" fill="#B3E5FC"/>
    <rect x="22" y="20" width="6" height="6" fill="#B3E5FC"/>
  </svg>`,
  deportes: `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
    <rect x="6" y="2" width="24" height="4" fill="#FF7043"/>
    <rect x="2" y="6" width="32" height="24" fill="#FF7043"/>
    <rect x="6" y="30" width="24" height="4" fill="#FF7043"/>
    <rect x="2" y="16" width="32" height="2" fill="#212121"/>
    <rect x="18" y="2" width="2" height="32" fill="#212121"/>
    <rect x="10" y="6" width="2" height="22" fill="#212121"/>
    <rect x="8" y="8" width="2" height="18" fill="#212121"/>
    <rect x="26" y="6" width="2" height="22" fill="#212121"/>
    <rect x="28" y="8" width="2" height="18" fill="#212121"/>
    <rect x="8" y="6" width="6" height="4" fill="#FFAB91"/>
  </svg>`,
  juegos: `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
    <rect x="4" y="14" width="28" height="16" rx="4" fill="#7E57C2"/>
    <rect x="8" y="10" width="8" height="10" rx="2" fill="#5E35B1"/>
    <rect x="10" y="12" width="4" height="8" fill="#9575CD"/>
    <rect x="8" y="16" width="8" height="4" fill="#9575CD"/>
    <rect x="20" y="16" width="4" height="4" fill="#EF5350"/>
    <rect x="24" y="18" width="4" height="4" fill="#66BB6A"/>
    <rect x="20" y="22" width="4" height="4" fill="#42A5F5"/>
    <rect x="16" y="18" width="4" height="4" fill="#FFCA28"/>
    <rect x="14" y="18" width="2" height="2" fill="#B39DDB"/>
    <rect x="18" y="18" width="2" height="2" fill="#B39DDB"/>
  </svg>`,
  facturas: `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
    <rect x="6" y="2" width="22" height="30" rx="2" fill="#FFFDE7"/>
    <rect x="6" y="2" width="22" height="30" rx="2" fill="none" stroke="#FDD835" stroke-width="1"/>
    <rect x="22" y="2" width="6" height="6" fill="#F9A825"/>
    <rect x="10" y="10" width="14" height="2" fill="#FDD835"/>
    <rect x="10" y="14" width="12" height="2" fill="#FDD835"/>
    <rect x="10" y="18" width="14" height="2" fill="#FDD835"/>
    <rect x="10" y="22" width="8" height="2" fill="#FDD835"/>
    <rect x="22" y="24" width="2" height="2" fill="#F9A825"/>
    <rect x="20" y="26" width="6" height="2" fill="#F9A825"/>
    <rect x="22" y="28" width="2" height="2" fill="#F9A825"/>
  </svg>`,
  compras: `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
    <rect x="6" y="14" width="24" height="18" rx="2" fill="#26C6DA"/>
    <rect x="10" y="8" width="4" height="8" rx="2" fill="#00ACC1"/>
    <rect x="22" y="8" width="4" height="8" rx="2" fill="#00ACC1"/>
    <rect x="14" y="20" width="8" height="8" fill="#00838F"/>
    <rect x="16" y="18" width="4" height="2" fill="#00838F"/>
    <rect x="8" y="16" width="6" height="4" fill="#80DEEA"/>
  </svg>`,
  tecnologia: `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
    <rect x="10" y="2" width="16" height="30" rx="2" fill="#546E7A"/>
    <rect x="12" y="6" width="12" height="18" fill="#B3E5FC"/>
    <rect x="16" y="26" width="4" height="4" rx="2" fill="#78909C"/>
    <rect x="16" y="4" width="4" height="2" fill="#78909C"/>
    <rect x="14" y="8" width="4" height="4" fill="#42A5F5"/>
    <rect x="20" y="8" width="4" height="4" fill="#66BB6A"/>
    <rect x="14" y="14" width="4" height="4" fill="#EF5350"/>
    <rect x="20" y="14" width="4" height="4" fill="#FFCA28"/>
  </svg>`,
  cocteles: `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
    <rect x="6" y="4" width="24" height="4" fill="#CE93D8"/>
    <rect x="8" y="8" width="20" height="2" fill="#BA68C8"/>
    <rect x="10" y="10" width="16" height="2" fill="#BA68C8"/>
    <rect x="12" y="12" width="12" height="2" fill="#BA68C8"/>
    <rect x="14" y="14" width="8" height="2" fill="#BA68C8"/>
    <rect x="16" y="16" width="4" height="2" fill="#BA68C8"/>
    <rect x="16" y="18" width="4" height="8" fill="#9C27B0"/>
    <rect x="10" y="26" width="16" height="2" fill="#9C27B0"/>
    <rect x="8" y="28" width="20" height="2" fill="#9C27B0"/>
    <rect x="24" y="4" width="4" height="4" fill="#66BB6A"/>
    <rect x="26" y="2" width="2" height="2" fill="#2E7D32"/>
  </svg>`,
  cine: `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
    <rect x="4" y="12" width="28" height="20" rx="2" fill="#212121"/>
    <rect x="4" y="8" width="28" height="6" fill="#424242"/>
    <rect x="4" y="8" width="4" height="6" fill="#F5F5F5"/>
    <rect x="12" y="8" width="4" height="6" fill="#F5F5F5"/>
    <rect x="20" y="8" width="4" height="6" fill="#F5F5F5"/>
    <rect x="28" y="8" width="4" height="6" fill="#F5F5F5"/>
    <rect x="4" y="8" width="28" height="2" fill="#EF5350"/>
    <rect x="8" y="16" width="20" height="12" fill="#1A237E"/>
    <rect x="10" y="18" width="6" height="8" fill="#F9A825"/>
    <rect x="20" y="20" width="4" height="4" fill="#F9A825"/>
  </svg>`,
};

// Category key → ICONS key
const _CAT_ICON_MAP = {
  comida:          'comida',
  bebida:          'bebidas',
  transporte:      'transporte',
  alojamiento:     'alojamiento',
  entretenimiento: 'juegos',
  compras:         'compras',
  otro:            'facturas',
  farmacia:        'farmacia',
  mascota:         'mascota',
  regalos:         'regalos',
  musica:          'musica',
  deportes:        'deportes',
  juegos:          'juegos',
  tecnologia:      'tecnologia',
  cocteles:        'cocteles',
  cine:            'cine',
  avion:           'avion',
};

function getCategoryIcon(cat, size) {
  const key = _CAT_ICON_MAP[cat] || 'facturas';
  const svg = ICONS[key] || '';
  return svg
    .replace('width="36" height="36"', `width="${size}" height="${size}"`)
    .replace('<svg ', '<svg style="display:block;flex-shrink:0;" ');
}
