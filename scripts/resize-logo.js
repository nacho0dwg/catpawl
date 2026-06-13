'use strict';
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ── CRC32 ──────────────────────────────────────────────────────────────────────

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
  const lb = Buffer.alloc(4); lb.writeUInt32BE(d.length);
  const cb = Buffer.alloc(4); cb.writeUInt32BE(crc32(Buffer.concat([t, d])));
  return Buffer.concat([lb, t, d, cb]);
}

// ── PNG Decoder (RGB + RGBA, 8-bit, all 5 filters) ───────────────────────────

function readU32(buf, off) {
  return ((buf[off] << 24) | (buf[off+1] << 16) | (buf[off+2] << 8) | buf[off+3]) >>> 0;
}

function decodePNG(buf) {
  const SIG = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== SIG[i]) throw new Error('Not a valid PNG');
  }

  let pos = 8, width, height, colorType;
  const idats = [];

  while (pos < buf.length) {
    const len  = readU32(buf, pos); pos += 4;
    const type = buf.slice(pos, pos + 4).toString('ascii'); pos += 4;
    const data = buf.slice(pos, pos + len); pos += len + 4;

    if (type === 'IHDR') {
      width     = readU32(data, 0);
      height    = readU32(data, 4);
      const bd  = data[8];
      colorType = data[9];
      if (bd !== 8) throw new Error('Only 8-bit PNG supported (depth=' + bd + ')');
      if (colorType !== 2 && colorType !== 6) {
        throw new Error('Only RGB/RGBA PNG supported (colorType=' + colorType + ')');
      }
    } else if (type === 'IDAT') {
      idats.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }

  const ch  = colorType === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idats));
  const stride = 1 + width * ch;
  const pixels = new Uint8Array(width * height * 4);
  const prev   = new Uint8Array(width * ch);

  for (let y = 0; y < height; y++) {
    const filter = raw[y * stride];
    const off    = y * stride + 1;
    const recon  = new Uint8Array(width * ch);

    for (let i = 0; i < width * ch; i++) {
      const fv = raw[off + i];
      const a  = i >= ch ? recon[i - ch] : 0;
      const b  = prev[i];
      const c  = i >= ch ? prev[i - ch] : 0;
      let val;
      if      (filter === 0) val = fv;
      else if (filter === 1) val = (fv + a) & 0xFF;
      else if (filter === 2) val = (fv + b) & 0xFF;
      else if (filter === 3) val = (fv + ((a + b) >> 1)) & 0xFF;
      else {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        val = (fv + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xFF;
      }
      recon[i] = val;
    }

    const row = y * width * 4;
    if (ch === 4) {
      pixels.set(recon, row);
    } else {
      for (let x = 0; x < width; x++) {
        pixels[row + x*4    ] = recon[x*3    ];
        pixels[row + x*4 + 1] = recon[x*3 + 1];
        pixels[row + x*4 + 2] = recon[x*3 + 2];
        pixels[row + x*4 + 3] = 255;
      }
    }
    prev.set(recon);
  }

  return { width, height, pixels };
}

// ── PNG Encoder (RGBA) ─────────────────────────────────────────────────────────

function encodePNG(width, height, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA

  const stride = 1 + width * 4;
  const raw = Buffer.alloc(height * stride, 0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const si = (y * width + x) * 4;
      const di = y * stride + 1 + x * 4;
      raw[di] = pixels[si]; raw[di+1] = pixels[si+1];
      raw[di+2] = pixels[si+2]; raw[di+3] = pixels[si+3];
    }
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 6 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Bilinear resize ───────────────────────────────────────────────────────────

function resizeBilinear(src, srcW, srcH, dstW, dstH) {
  const dst = new Uint8Array(dstW * dstH * 4);
  for (let dy = 0; dy < dstH; dy++) {
    for (let dx = 0; dx < dstW; dx++) {
      const sx = (dx + 0.5) * srcW / dstW - 0.5;
      const sy = (dy + 0.5) * srcH / dstH - 0.5;
      const x0 = Math.max(0, Math.floor(sx)), x1 = Math.min(srcW - 1, x0 + 1);
      const y0 = Math.max(0, Math.floor(sy)), y1 = Math.min(srcH - 1, y0 + 1);
      const wx = sx - x0, wy = sy - y0;
      const di = (dy * dstW + dx) * 4;
      for (let c = 0; c < 4; c++) {
        const tl = src[(y0 * srcW + x0) * 4 + c];
        const tr = src[(y0 * srcW + x1) * 4 + c];
        const bl = src[(y1 * srcW + x0) * 4 + c];
        const br = src[(y1 * srcW + x1) * 4 + c];
        dst[di + c] = Math.round(tl*(1-wx)*(1-wy) + tr*wx*(1-wy) + bl*(1-wx)*wy + br*wx*wy);
      }
    }
  }
  return dst;
}

// ── Fit in square: letterbox + composite alpha over bg ────────────────────────

function fitSquare(pixels, srcW, srcH, size, bgR, bgG, bgB) {
  const scale = Math.min(size / srcW, size / srcH);
  const sw = Math.round(srcW * scale);
  const sh = Math.round(srcH * scale);
  const ox = Math.floor((size - sw) / 2);
  const oy = Math.floor((size - sh) / 2);

  const scaled = resizeBilinear(pixels, srcW, srcH, sw, sh);
  const out = new Uint8Array(size * size * 4);

  for (let i = 0; i < size * size; i++) {
    out[i*4] = bgR; out[i*4+1] = bgG; out[i*4+2] = bgB; out[i*4+3] = 255;
  }

  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const si = (y * sw + x) * 4;
      const di = ((y + oy) * size + (x + ox)) * 4;
      const a  = scaled[si + 3] / 255;
      out[di  ] = Math.round(scaled[si  ] * a + bgR * (1 - a));
      out[di+1] = Math.round(scaled[si+1] * a + bgG * (1 - a));
      out[di+2] = Math.round(scaled[si+2] * a + bgB * (1 - a));
      out[di+3] = 255;
    }
  }

  return out;
}

// ── Main ───────────────────────────────────────────────────────────────────────

const logoPath  = path.join(__dirname, '..', 'LOGO CATPAWL.png');
const publicDir = path.join(__dirname, '..', 'public');
const BG = [15, 17, 23]; // #0f1117

const { width, height, pixels } = decodePNG(fs.readFileSync(logoPath));
console.log('Source: ' + width + '×' + height);

for (const [name, size] of [['icon-512.png', 512], ['icon-192.png', 192], ['favicon.png', 32]]) {
  const out = fitSquare(pixels, width, height, size, ...BG);
  const buf = encodePNG(size, size, out);
  fs.writeFileSync(path.join(publicDir, name), buf);
  console.log('✓ public/' + name + '  (' + buf.length + ' bytes)');
}
