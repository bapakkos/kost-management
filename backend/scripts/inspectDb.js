const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const file = process.argv[2];
const db = new sqlite3.Database(file, sqlite3.OPEN_READONLY, (err) => {
  if (err) { console.error('OPEN FAIL:', err.message); process.exit(1); }
});

const tables = [
  'users', 'room_types', 'pricing_schemes', 'pricing_scheme_rates', 'rooms',
  'tenants', 'tenant_bank_accounts', 'rental_contracts', 'monthly_billings',
  'non_monthly_incomes', 'payment_receipts', 'bank_mutations',
];

db.serialize(() => {
  console.log(`=== ${path.basename(file)} ===`);
  for (const t of tables) {
    db.get(`SELECT COUNT(*) as c FROM "${t}"`, [], (err, row) => {
      if (err) {
        console.log(`${t}: (not exists)`);
      } else {
        console.log(`${t}: ${row.c} rows`);
      }
    });
  }
  // Sample critical data
  db.all('SELECT id, name, nama_panggilan FROM tenants LIMIT 10', [], (err, rows) => {
    if (!err && rows.length) console.log('\nSample tenants:', JSON.stringify(rows, null, 1));
  });
  db.all('SELECT id, room_id, tenant_id, status, start_date FROM rental_contracts LIMIT 10', [], (err, rows) => {
    if (!err && rows.length) console.log('\nSample contracts:', JSON.stringify(rows, null, 1));
  });
  db.all('SELECT id, period_month, period_year, COUNT(*) as cnt, SUM(total_amount) as total FROM monthly_billings GROUP BY period_year, period_month', [], (err, rows) => {
    if (!err && rows.length) console.log('\nBillings by period:', JSON.stringify(rows, null, 1));
  });
  db.close(() => process.exit(0));
});