// Icône « pont » : arche ajonc + tablier sable sur fond Iroise. Encodeur PNG maison (zlib).
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, pixel) {
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel(x, y);
      raw.set([r, g, b, 255], y * stride + 1 + x * 4);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const BG = [29, 92, 107];
const ARCH = [227, 167, 47];
const DECK = [247, 243, 236];

function shape(u, v) {
  // u, v dans [0,1], centrés. Arche = demi-anneau supérieur, tablier = barre horizontale.
  const cx = 0.5, cy = 0.6, r = 0.27, t = 0.075;
  const d = Math.hypot(u - cx, v - cy);
  if (v >= cy - 0.005 && v <= cy + 0.06 && u >= 0.17 && u <= 0.83) return DECK;
  if (v <= cy && Math.abs(d - r) <= t / 2) return ARCH;
  return BG;
}

function icon(size, scale) {
  const SS = 4;
  return png(size, (x, y) => {
    const acc = [0, 0, 0];
    for (let i = 0; i < SS; i++) for (let j = 0; j < SS; j++) {
      const u = ((x + (i + 0.5) / SS) / size - 0.5) / scale + 0.5;
      const v = ((y + (j + 0.5) / SS) / size - 0.5) / scale + 0.5;
      const c = shape(u, v);
      acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2];
    }
    return acc.map((a) => Math.round(a / (SS * SS)));
  });
}

mkdirSync('icons', { recursive: true });
writeFileSync('icons/icon-192.png', icon(192, 1));
writeFileSync('icons/icon-512.png', icon(512, 1));
writeFileSync('icons/maskable-512.png', icon(512, 0.8));
console.log('Icônes écrites dans icons/');
