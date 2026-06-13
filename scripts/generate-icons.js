'use strict';
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ── Minimal PNG encoder (no deps, RFC 2083) ────────────────────────────────────

const _crc = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (const b of buf) c = _crc[(c ^ b) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const d = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const lenBuf = Buffer.alloc(4); lenBuf.writeUInt32BE(d.length);
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([t, d])));
  return Buffer.concat([lenBuf, t, d, crcBuf]);
}

function makePNG(size, painter) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2;

  const stride = 1 + size * 3;
  const raw = Buffer.alloc(size * stride, 0);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] = painter(x, y, size);
      const i = y * stride + 1 + x * 3;
      raw[i] = r; raw[i + 1] = g; raw[i + 2] = b;
    }
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 6 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── CP painter (geometry defined in 512×512 space) ────────────────────────────
//
// Layout: two 5×7 pixel-font letters centered in the icon.
// CELL=44px → each letter 220×308px, gap=48px, 12px side padding.
// Total: 12 + 220 + 48 + 220 + 12 = 512 ✓   Height: (512-308)/2 = 102 offset.

function cpPainter(x, y, size) {
  const S  = 512 / size;
  const px = x * S, py = y * S;

  const BG = [15,  17,  23 ]; // #0f1117
  const FG = [223, 244, 102]; // #dff466

  const CELL = 44;
  const cX = 12, pX = 280, letY = 102;

  const C = [
    [0,1,1,1,0],
    [1,0,0,0,1],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,0,0,0,1],
    [0,1,1,1,0],
  ];
  const P = [
    [1,1,1,1,0],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,1,1,1,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
  ];

  function hit(map, ox) {
    for (let r = 0; r < map.length; r++) {
      for (let c = 0; c < map[r].length; c++) {
        if (map[r][c] &&
            px >= ox + c * CELL && px < ox + (c + 1) * CELL &&
            py >= letY + r * CELL && py < letY + (r + 1) * CELL) {
          return true;
        }
      }
    }
    return false;
  }

  if (hit(C, cX) || hit(P, pX)) return FG;
  return BG;
}

// ── Main ───────────────────────────────────────────────────────────────────────

const publicDir = path.join(__dirname, '..', 'public');
for (const size of [192, 512]) {
  const buf = makePNG(size, cpPainter);
  const out = path.join(publicDir, `icon-${size}.png`);
  fs.writeFileSync(out, buf);
  console.log(`✓ public/icon-${size}.png  (${buf.length} bytes)`);
}
