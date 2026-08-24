const fs = require('fs');
const buf = fs.readFileSync(process.argv[2]);
const text = buf.toString('latin1');

// find printable ASCII runs >= 4 chars
const runs = [];
let cur = '';
for (let i = 0; i < text.length; i++) {
  const c = text.charCodeAt(i);
  if (c >= 32 && c < 127) cur += text[i];
  else { if (cur.length >= 4) runs.push({ pos: i - cur.length, s: cur }); cur = ''; }
}
if (cur.length >= 4) runs.push({ pos: text.length - cur.length, s: cur });

const keywords = ['sewa', 'booking', 'keluar', 'active', 'forfeited', 'returned',
  '2026-08-0', '2026-08-1', '2026-07', '2026-09', '@gmail', '@', '081', '085', '087', '089', '0812', '0813', '0821', '0822', '0852', '0853', '0857', '0877', '0878', '0895', '0896', '0897', '0898', '0899', '628'];

console.log('=== Keyword hits ===');
for (const r of runs) {
  const low = r.s.toLowerCase();
  if (keywords.some(k => low.includes(k.toLowerCase()))) {
    console.log(`@${r.pos}: ${r.s.slice(0, 120)}`);
  }
}

console.log('\n=== All strings >= 8 chars (deduped, excluding schema/seed) ===');
const seen = new Set();
for (const r of runs) {
  if (r.s.length < 8) continue;
  if (/CREATE TABLE|sqlite|autoindex|Superior|Suite|available|admin|\$2a\$/.test(r.s)) continue;
  if (/^[0-9\s\-:.+]+$/.test(r.s)) continue;
  const key = r.s.slice(0, 40);
  if (seen.has(key)) continue;
  seen.add(key);
  console.log(`@${r.pos}: ${r.s.slice(0, 100)}`);
}