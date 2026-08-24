const fs = require('fs');

const FILE = process.argv[2];
const buf = fs.readFileSync(FILE);
const PAGE_SIZE = buf.readUInt32BE(16);
const PAGE_COUNT = buf.readUInt32BE(28);
console.error(`page_size=${PAGE_SIZE} pages=${PAGE_COUNT}`);

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
  if (size < 0 || off + size > end) return undefined; // out of bounds marker
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
  if (b[off] & 0xfe && b[off] > 0x7f) {
    // quick reject: first varint byte of payloadLen (<=2000) must be <= 0x0f or <=0x7f single byte
  }
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

function classify(vals) {
  if (!vals || vals.length < 5 || vals.length > 20) return null;
  let strs = 0, dates = [];
  for (let i = 0; i < vals.length; i++) {
    const v = vals[i];
    if (typeof v === 'string') {
      strs++;
      if (/^\d{4}-\d{2}-\d{2}/.test(v)) dates.push(i);
    }
  }
  // tenants: no leading dates, >=3 strings, has phone-like string
  if (strs >= 2) {
    const phoneIdx = vals.findIndex(v => typeof v === 'string' && /^(\+?62|0)8\d{7,13}$/.test(v));
    if (phoneIdx >= 2 && !dates.some(d => d < phoneIdx)) return 'tenant?';
  }
  // rental_contracts: [id, room_id, tenant_id, scheme_id, start_date,...status enum...]
  if (vals.length >= 8 && dates.length >= 1 && dates[0] >= 3 && dates[0] <= 5) {
    if (vals.some(v => v === 'sewa' || v === 'booking' || v === 'keluar')) return 'rental_contract?';
  }
  // monthly_billings: month 1-12 at idx 2, year 2024-2027 at idx 3, money later, due_date
  if (vals.length >= 10) {
    if (Number.isInteger(vals[2]) && vals[2] >= 1 && vals[2] <= 12 &&
        Number.isInteger(vals[3]) && vals[3] >= 2024 && vals[3] <= 2027) {
      const money = vals.slice(4, 10).some(v => typeof v === 'number' && v > 500000 && v < 50000000);
      if (money || typeof vals[7] === 'string' || vals[7] === null) return 'monthly_billing?';
    }
    const catIdx = vals.findIndex(v => typeof v === 'string' && ['listrik','air','parkir','tv','internet','lainnya','denda','sewa_harian','deposit'].includes(v));
    if (catIdx >= 0 && dates.some(d => d > catIdx)) return 'non_monthly_income?';
  }
  return null;
}

const rowSeen = new Set();
const unique = [];
for (let p = 0; p < PAGE_COUNT; p++) {
  const page = buf.subarray(p * PAGE_SIZE, (p + 1) * PAGE_SIZE);
  const candidates = new Map();
  const collect = (cell) => {
    if (!cell) return;
    const prev = candidates.get(cell.off);
    if (!prev) candidates.set(cell.off, cell);
  };
  if (page[0] === 0x0d) {
    const nCells = page.readUInt16BE(3);
    for (let i = 0; i < nCells && i < 500; i++) {
      collect(tryDecodeCell(page, page.readUInt16BE(8 + i * 2), PAGE_SIZE));
    }
  }
  for (let off = 1; off < PAGE_SIZE - 12; off++) {
    collect(tryDecodeCell(page, off, PAGE_SIZE));
  }
  for (const cell of candidates.values()) {
    const t = classify(cell.values);
    if (t) {
      const key = t + '|' + JSON.stringify(cell.values);
      if (!rowSeen.has(key)) { rowSeen.add(key); unique.push({ page: p + 1, table: t, rowid: cell.rowid, vals: cell.values }); }
    }
  }
}

const byTable = {};
for (const r of unique) (byTable[r.table] = byTable[r.table] || []).push(r);
for (const [t, rows] of Object.entries(byTable)) {
  console.log(`\n### ${t} (${rows.length} unique)`);
  for (const r of rows) console.log(`  p${r.page} rowid=${r.rowid}: ${JSON.stringify(r.vals.map(v => typeof v === 'string' ? v.slice(0, 70) : v))}`);
}
console.log(`\nTOTAL: ${unique.length}`);