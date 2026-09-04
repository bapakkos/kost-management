// One-off migration: make payment_receipts.room_id nullable (booking payments have no room).
// SQLite cannot ALTER COLUMN, so rebuild the table safely.
const sequelize = require('../src/config/database');

(async () => {
  try {
    await sequelize.query('PRAGMA foreign_keys = OFF');
    await sequelize.transaction(async (t) => {
      await sequelize.query(`CREATE TABLE payment_receipts_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        receipt_no VARCHAR(30) NOT NULL,
        payment_date DATE NOT NULL,
        tenant_id INTEGER NOT NULL REFERENCES tenants (id) ON DELETE CASCADE ON UPDATE CASCADE,
        room_id INTEGER REFERENCES rooms (id) ON DELETE CASCADE ON UPDATE CASCADE,
        total_amount DECIMAL(10,2) NOT NULL,
        discount_amount DECIMAL(10,2) DEFAULT 0,
        selisih_amount DECIMAL(10,2) DEFAULT 0,
        notes TEXT,
        created_by INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
        created_at DATETIME NOT NULL
      )`, { transaction: t });
      await sequelize.query('INSERT INTO payment_receipts_new SELECT * FROM payment_receipts', { transaction: t });
      await sequelize.query('DROP TABLE payment_receipts', { transaction: t });
      await sequelize.query('ALTER TABLE payment_receipts_new RENAME TO payment_receipts', { transaction: t });
    });
    await sequelize.query('PRAGMA foreign_keys = ON');
    const [rows] = await sequelize.query("SELECT sql FROM sqlite_master WHERE name='payment_receipts'");
    console.log('Migration OK. New DDL:');
    console.log(rows[0].sql);
  } catch (err) {
    console.error('MIGRATION FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
})();
