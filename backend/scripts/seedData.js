const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const fs = require('fs');

const sequelize = require('../src/config/database');
const {
  User,
  RoomType,
  PricingScheme,
  PricingSchemeRate,
  Room,
} = require('../src/models');
const bcrypt = require('bcryptjs');

const ROOM_NUMBERS = {
  1: [101, 102, 103, 105, 106, 107, 108, 109, 110, 111, 112, 114, 115, 116, 117],
  2: [201, 202, 203, 205, 206, 207, 208, 209, 210, 211, 212, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224],
  3: [301, 302, 303, 305, 306, 307, 308, 309, 310, 311, 312, 314, 315, 316, 317, 318, 319, 320, 321, 322],
};

async function confirmDestroy() {
  if (process.argv.includes('--force') && process.env.CONFIRM_DESTROY === 'yes') {
    console.log('Bypassing confirmation via --force + CONFIRM_DESTROY=yes');
    return;
  }
  const DB_PATH = path.join(__dirname, '..', '..', 'database', 'kost.db');
  console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
  console.log('!! PERINGATAN: script ini MENGHAPUS SELURUH DATA DATABASE !!');
  console.log(`!! Target: ${DB_PATH}`);
  if (fs.existsSync(DB_PATH)) {
    const stats = fs.statSync(DB_PATH);
    console.log(`!! File DB ada (${(stats.size / 1024).toFixed(1)} KB, modifikasi ${stats.mtime.toLocaleString()})`);
  }
  console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
  console.log('Ketik HAPUS (huruf besar) lalu Enter untuk melanjutkan:');
  const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise(resolve => rl.question('> ', resolve));
  rl.close();
  if (answer.trim() !== 'HAPUS') {
    console.log('Dibatalkan. Database TIDAK diubah.');
    process.exit(1);
  }
}

async function seed() {
  await confirmDestroy();
  await sequelize.query('PRAGMA foreign_keys = OFF');
  await sequelize.sync({ force: true });
  await sequelize.query('PRAGMA foreign_keys = ON');
  console.log('Database reset');

  // --- Users ---
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await User.create({ username: 'admin', password: hashedPassword, role: 'admin' });
  console.log('Admin user created (admin / admin123)');

  // --- Room Types (4) ---
  const roomTypes = await RoomType.bulkCreate([
    { category: 'superior', view_type: 'view', ac_type: 'non_ac', name: 'Superior View Non-AC' },
    { category: 'superior', view_type: 'view', ac_type: 'ac', name: 'Superior View AC' },
    { category: 'superior', view_type: 'non_view', ac_type: 'ac', name: 'Superior Non-View AC' },
    { category: 'suite', view_type: 'view', ac_type: 'ac', name: 'Suite View AC' },
  ]);
  console.log('4 room types created');

  // --- Pricing Schemes (3) ---
  const schemes = await PricingScheme.bulkCreate([
    { name: 'Skema Harga 2024' },
    { name: 'Skema Harga 2025' },
    { name: 'Skema Harga 2026' },
  ]);
  console.log('3 pricing schemes created');

  // --- Pricing Scheme Rates ---
  const rates = [
    // Scheme 2024
    { pricing_scheme_id: schemes[0].id, room_type_id: roomTypes[0].id, monthly_price: 1500000 },
    { pricing_scheme_id: schemes[0].id, room_type_id: roomTypes[1].id, monthly_price: 1800000 },
    { pricing_scheme_id: schemes[0].id, room_type_id: roomTypes[2].id, monthly_price: 1700000 },
    { pricing_scheme_id: schemes[0].id, room_type_id: roomTypes[3].id, monthly_price: 2500000 },
    // Scheme 2025
    { pricing_scheme_id: schemes[1].id, room_type_id: roomTypes[0].id, monthly_price: 1600000 },
    { pricing_scheme_id: schemes[1].id, room_type_id: roomTypes[1].id, monthly_price: 1900000 },
    { pricing_scheme_id: schemes[1].id, room_type_id: roomTypes[2].id, monthly_price: 1800000 },
    { pricing_scheme_id: schemes[1].id, room_type_id: roomTypes[3].id, monthly_price: 2600000 },
    // Scheme 2026
    { pricing_scheme_id: schemes[2].id, room_type_id: roomTypes[0].id, monthly_price: 1700000 },
    { pricing_scheme_id: schemes[2].id, room_type_id: roomTypes[1].id, monthly_price: 2000000 },
    { pricing_scheme_id: schemes[2].id, room_type_id: roomTypes[2].id, monthly_price: 1900000 },
    { pricing_scheme_id: schemes[2].id, room_type_id: roomTypes[3].id, monthly_price: 2700000 },
  ];
  await PricingSchemeRate.bulkCreate(rates);
  console.log('12 pricing scheme rates created');

  // --- Rooms (57) ---
  // Assign room types: roughly distribute across 4 types
  const roomData = [];
  for (const [floor, numbers] of Object.entries(ROOM_NUMBERS)) {
    numbers.forEach((num, idx) => {
      const typeIdx = idx % 4;
      roomData.push({
        room_number: String(num),
        room_type_id: roomTypes[typeIdx].id,
        floor: parseInt(floor),
        status: 'available',
      });
    });
  }
  await Room.bulkCreate(roomData);
  console.log(`57 rooms created`);

  console.log('\n--- Seed complete! ---');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});