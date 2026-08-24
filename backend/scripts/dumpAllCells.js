const fs = require('fs');

const FILE = process.argv[2];
const buf = fs.readFileSync(FILE);
const PAGE_SIZE = buf.readUInt32BE(16);
const PAGE_COUNT = buf.readUInt32BE(28);

function readVarint(b, off) {
  let result = 0;
  for (let i = 0; i < 9; i++) {
    const byte = b[off + i];
    if (i === 8) return [(result << 8) | byte, off + 9];
    result = (result << 7) | (byte & 0x7f);
    if (!(byte & 0x80)) return [result, off + i + 1];
  }
  return [null, off + 9];
}
function serialTypeSize(st) {
  if (st === 0 || st === 8 || st === 9) return 0;
  if (st >= 1 && st <= 6) return st;
  if (st === 7) return 8;
  if (st >= 12) return (st - (st % 2 === 0 ? 12 : 13)) / 2;
  return -1;
}
function decodeValue(st, b, off, end) {
  const size = serialTypeSize(st);
  if (size < 0 || off + size > end) return undefined;
  if (st === 0) return null;
  if (st === 8) return 0;
  if (st === 9) return 1;
  if (st >= 1 && st <= 6) {
    let v = 0;
    for (let i = 0; i < size; i++) v = (v * 256) + b[off + i];
    if (st <= 4) { const bits = size * 8; if (v >= 2 ** (bits - 1)) v -= 2 ** bits; }
    return v;
  }
  if (st === 7) return b.readDoubleBE(off);
  return b.toString('utf8', off, off + size);
}
function tryDecodeCell(b, off, end) {
  if (off + 3 > end) return null;
  const [payloadLen, p1] = readVarint(b, off);
  if (payloadLen === null || payloadLen < 3 || payloadLen > 1500) return null;
  const [rowid, p2] = readVarint(b, p1);
  if (rowid === null || rowid < 0 || rowid > 5_000_000) return null;
  const recStart = p2;
  const recEnd = recStart + payloadLen;
  if (recEnd > end) return null;
  const [headerLen, h1] = readVarint(b, recStart);
  if (headerLen === null || headerLen < 2 || headerLen > 80 || recStart + headerLen > recEnd) return null;
  const serialTypes = [];
  let hp = h1;
  const hEnd = recStart + headerLen;
  while (hp < hEnd) {
    const [st, np] = readVarint(b, hp);
    if (st === null || np > hEnd) return null;
    serialTypes.push(st);
    hp = np;
    if (serialTypes.length > 25) return null;
  }
  if (hp !== hEnd) return null;
  const values = [];
  let vp = hEnd;
  for (const st of serialTypes) {
    const v = decodeValue(st, b, vp, recEnd);
    if (v === undefined) return null;
    values.push(v);
    vp += serialTypeSize(st);
  }
  if (vp > recEnd) return null;
  return { rowid, values, off };
}

// Dump every decodable cell with >= 5 values that isn't obviously current-seed data
const currentTables = new Set(); // rooms seed has room_number strings
for (let p = 0; p < PAGE_COUNT; p++) {
  const page = buf.subarray(p * PAGE_SIZE, (p + 1) * PAGE_SIZE);
  const seen = new Set();
  for (let off = 1; off < PAGE_SIZE - 12; off++) {
    const cell = tryDecodeCell(page, off, PAGE_SIZE);
    if (!cell || seen.has(cell.off)) continue;
    seen.add(cell.off);
    const v = cell.values;
    if (v.length < 5 || v.length > 22) continue;
    // skip obvious seed rows: room_types (4 vals category/view/ac/name+desc+dates)
    const json = JSON.stringify(v.map(x => typeof x === 'string' ? x.slice(0, 80) : x));
    // require at least 3 non-null values
    if (v.filter(x => x !== null).length < 4) continue;
    console.log(`p${p + 1} @${cell.off} rowid=${cell.rowid} n=${v.length}: ${json}`);
  }
}