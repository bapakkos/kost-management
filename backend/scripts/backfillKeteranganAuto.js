const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const sequelize = require('../src/config/database');
const {
  BankMutation, ReconciliationLink, PaymentReceipt, PaymentReceiptItem,
  MonthlyBilling, NonMonthlyIncome, RentalContract, Tenant, Room,
  DepositReturn, Booking, BookingReturn,
} = require('../src/models');
const {
  buildNotaKeterangan, buildDepositReturnKeterangan, buildBookingRefundKeterangan,
} = require('../src/utils/keteranganAuto');

async function ensureColumns() {
  const cols = await sequelize.queryInterface.describeTable('bank_mutations');
  if (!cols.keterangan) {
    await sequelize.query('ALTER TABLE bank_mutations ADD COLUMN keterangan TEXT');
    console.log('Kolom keterangan ditambahkan');
  }
  if (!cols.keterangan_auto) {
    await sequelize.query('ALTER TABLE bank_mutations ADD COLUMN keterangan_auto TEXT');
    console.log('Kolom keterangan_auto ditambahkan');
  }
}

async function buildKeteranganForLink(link) {
  if (link.target_type === 'nota') {
    const receipt = await PaymentReceipt.findByPk(link.target_id, { include: [Tenant, Room] });
    if (!receipt) return null;
    const items = await PaymentReceiptItem.findAll({
      where: { payment_receipt_id: receipt.id },
      include: [
        { model: MonthlyBilling, include: [RentalContract] },
        NonMonthlyIncome,
      ],
    });
    const billings = items
      .filter(i => i.item_type === 'monthly_billing' && i.MonthlyBilling)
      .map(i => i.MonthlyBilling);
    const incomes = items
      .filter(i => i.item_type === 'non_monthly_income' && i.NonMonthlyIncome)
      .map(i => i.NonMonthlyIncome);
    return buildNotaKeterangan({
      billings,
      incomes,
      tenant: receipt.Tenant,
      roomNumber: receipt.Room?.room_number,
    });
  }
  if (link.target_type === 'deposit_return') {
    const dr = await DepositReturn.findByPk(link.target_id, {
      include: [{ model: RentalContract, include: [Tenant, Room] }],
    });
    if (!dr || !dr.RentalContract) return null;
    return buildDepositReturnKeterangan(dr.RentalContract.Tenant, dr.RentalContract.Room?.room_number);
  }
  if (link.target_type === 'booking_return') {
    const br = await BookingReturn.findByPk(link.target_id, {
      include: [{ model: Booking, include: [Tenant] }],
    });
    if (!br || !br.Booking) return null;
    return buildBookingRefundKeterangan(br.Booking.Tenant);
  }
  return null;
}

async function main() {
  await ensureColumns();

  const mutations = await BankMutation.findAll({ where: { is_reconciled: true } });
  console.log(`Total mutasi ter-rekonsiliasi: ${mutations.length}`);

  let updated = 0;
  let skipped = 0;
  let noLink = 0;
  let failed = 0;

  for (const m of mutations) {
    if (m.keterangan_auto && m.keterangan_auto.trim()) {
      skipped++;
      continue;
    }
    const links = await ReconciliationLink.findAll({
      where: { bank_mutation_id: m.id },
      order: [['id', 'ASC']],
    });
    if (links.length === 0) {
      noLink++;
      continue;
    }
    try {
      const keterangan = await buildKeteranganForLink(links[0]);
      if (keterangan) {
        m.keterangan_auto = keterangan;
        await m.save();
        updated++;
      } else {
        failed++;
      }
    } catch (err) {
      console.error(`Gagal memproses mutasi #${m.id}: ${err.message}`);
      failed++;
    }
  }

  console.log('--- Hasil backfill keterangan_auto ---');
  console.log(`Updated: ${updated}`);
  console.log(`Skipped (sudah ada): ${skipped}`);
  console.log(`Tanpa link rekonsiliasi: ${noLink}`);
  console.log(`Gagal: ${failed}`);

  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
