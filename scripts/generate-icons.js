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
  // IHDR: 8-bit RGB (color type 2)
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2;

  // Scanlines: filter byte (0 = None) + RGB pixels
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
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG magic
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 6 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Geometry ───────────────────────────────────────────────────────────────────

function inCircle(px, py, cx, cy, r) {
  return (px - cx) ** 2 + (py - cy) ** 2 <= r * r;
}

function inTriangle(px, py, x1, y1, x2, y2, x3, y3) {
  const d1 = (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
  const d2 = (px - x3) * (y2 - y3) - (x2 - x3) * (py - y3);
  const d3 = (px - x1) * (y3 - y1) - (x3 - x1) * (py - y1);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}

// ── Cat painter (geometry defined in 512×512 space) ────────────────────────────

function catPainter(x, y, size) {
  const S  = 512 / size;
  const px = x * S, py = y * S;

  const BG   = [22,  27,  36 ]; // #161b24 — dark surface
  const CAT  = [255, 182, 90 ]; // warm orange cat
  const EAR  = [255, 148, 120]; // pinkish inner ear
  const DARK = [15,  17,  23 ]; // near-black (eyes)
  const WHT  = [245, 248, 252]; // eye highlight
  const NOSE = [255, 87,  20 ]; // #ff5714 app orange

  let c = BG;

  // Outer ears (triangles; tips at top)
  if (inTriangle(px, py, 100, 272,  162, 110, 244, 272)) c = CAT;  // left
  if (inTriangle(px, py, 268, 272,  350, 110, 412, 272)) c = CAT;  // right

  // Inner ears (smaller, offset toward center)
  if (inTriangle(px, py, 120, 262,  162, 152, 224, 262)) c = EAR;  // left
  if (inTriangle(px, py, 288, 262,  350, 152, 392, 262)) c = EAR;  // right

  // Head (circle)
  if (inCircle(px, py, 256, 302, 152)) c = CAT;

  // Eyes (dark sclera)
  if (inCircle(px, py, 194, 278, 34)) c = DARK;   // left
  if (inCircle(px, py, 318, 278, 34)) c = DARK;   // right

  // Eye highlights
  if (inCircle(px, py, 204, 265, 12)) c = WHT;    // left
  if (inCircle(px, py, 328, 265, 12)) c = WHT;    // right

  // Nose (downward triangle)
  if (inTriangle(px, py, 240, 318, 272, 318, 256, 338)) c = NOSE;

  return c;
}

// ── Main ───────────────────────────────────────────────────────────────────────

const publicDir = path.join(__dirname, '..', 'public');
for (const size of [192, 512]) {
  const buf = makePNG(size, catPainter);
  const out = path.join(publicDir, `icon-${size}.png`);
  fs.writeFileSync(out, buf);
  console.log(`✓ public/icon-${size}.png  (${buf.length} bytes)`);
}
