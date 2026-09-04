const { Op } = require('sequelize');
const {
  MonthlyBilling, NonMonthlyIncome, PaymentReceipt, BankMutation, ReconciliationLink,
  RentalContract, Tenant, Room, RoomType, DepositReturn, Booking, BookingReturn,
} = require('../models');
const { generateInvoicePDF } = require('../utils/pdfGenerator');

exports.getMonthlyRevenue = async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) return res.status(400).json({ error: 'month and year are required' });

    const m = parseInt(month);
    const y = parseInt(year);

    const billings = await MonthlyBilling.findAll({
      where: { period_month: m, period_year: y, is_paid: true },
      include: [{ model: RentalContract, include: [Tenant, Room] }],
    });
    const billingTotal = billings.reduce((sum, b) => sum + parseFloat(b.total_amount), 0);

    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const endDate = `${y}-${String(m).padStart(2, '0')}-31`;
    const incomes = await NonMonthlyIncome.findAll({
      where: {
        is_paid: true,
        is_revenue: true,
        transaction_date: { [Op.between]: [startDate, endDate] },
      },
      include: [Tenant, Room],
    });
    const incomeTotal = incomes.reduce((sum, i) => sum + parseFloat(i.total_amount), 0);

    const receipts = await PaymentReceipt.findAll({
      where: { payment_date: { [Op.between]: [startDate, endDate] } },
    });
    const receiptTotal = receipts.reduce((sum, r) => sum + parseFloat(r.total_amount), 0);

    const reconciledMutations = await BankMutation.findAll({
      where: {
        is_reconciled: true,
        category: 'operational',
        type: 'credit',
        date: { [Op.between]: [startDate, endDate] },
      },
    });
    const reconciledAmount = reconciledMutations.reduce((sum, m) => sum + parseFloat(m.amount), 0);

    res.json({
      month: m,
      year: y,
      billing_total: billingTotal,
      billing_count: billings.length,
      income_total: incomeTotal,
      income_count: incomes.length,
      total_revenue: billingTotal + incomeTotal,
      payment_receipts_total: receiptTotal,
      payment_receipts_count: receipts.length,
      reconciled_amount: reconciledAmount,
      reconciliation_gap: receiptTotal - reconciledAmount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getYearlyRevenue = async (req, res) => {
  try {
    const { year } = req.query;
    if (!year) return res.status(400).json({ error: 'year is required' });
    const y = parseInt(year);

    const months = [];
    for (let m = 1; m <= 12; m++) {
      const billings = await MonthlyBilling.findAll({
        where: { period_month: m, period_year: y, is_paid: true },
      });
      const billingTotal = billings.reduce((sum, b) => sum + parseFloat(b.total_amount), 0);

      const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
      const endDate = `${y}-${String(m).padStart(2, '0')}-31`;
      const incomes = await NonMonthlyIncome.findAll({
        where: { is_paid: true, is_revenue: true, transaction_date: { [Op.between]: [startDate, endDate] } },
      });
      const incomeTotal = incomes.reduce((sum, i) => sum + parseFloat(i.total_amount), 0);

      months.push({
        month: m,
        billing_total: billingTotal,
        income_total: incomeTotal,
        total: billingTotal + incomeTotal,
      });
    }

    res.json({ year: y, months });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getDepositLiability = async (req, res) => {
  try {
    const collectedRows = await NonMonthlyIncome.findAll({
      where: { category: 'deposit', is_paid: true },
      include: [Tenant, Room],
    });
    const bookingRows = await NonMonthlyIncome.findAll({
      where: { category: 'booking', is_paid: true },
      include: [Tenant, Room],
    });
    const forfeitedRows = await NonMonthlyIncome.findAll({
      where: { category: 'deposit_hangus', is_paid: true },
      include: [Tenant, Room],
    });
    const returns = await DepositReturn.findAll({ include: [{ model: RentalContract, include: [Tenant, Room] }] });
    const bookingReturns = await BookingReturn.findAll({ include: [{ model: Booking, include: [Tenant] }] });

    const collected = collectedRows.reduce((s, r) => s + parseFloat(r.total_amount), 0);
    const bookingCollected = bookingRows.reduce((s, r) => s + parseFloat(r.total_amount), 0);
    const forfeited = forfeitedRows.reduce((s, r) => s + parseFloat(r.total_amount), 0);
    const returned = returns.reduce((s, r) => s + parseFloat(r.amount), 0);
    const bookingReturned = bookingReturns.reduce((s, r) => s + parseFloat(r.amount), 0);
    const active_liability = collected + bookingCollected - forfeited - returned;

    const byTenant = {};
    const addRow = (row, bucket) => {
      if (!row.Tenant) return;
      const tid = row.Tenant.id;
      if (!byTenant[tid]) {
        byTenant[tid] = { tenant_id: tid, tenant_name: row.Tenant.nama_panggilan || row.Tenant.name, room: row.Room?.room_number || null, collected: 0, forfeited: 0, returned: 0 };
      }
      byTenant[tid][bucket] += parseFloat(row.total_amount || row.amount || 0);
    };
    collectedRows.forEach((r) => addRow(r, 'collected'));
    bookingRows.forEach((r) => addRow(r, 'collected'));
    forfeitedRows.forEach((r) => addRow(r, 'forfeited'));
    returns.forEach((r) => {
      if (r.RentalContract && r.RentalContract.Tenant) addRow(r.RentalContract, 'returned');
    });

    const breakdown = Object.values(byTenant).map((b) => ({
      ...b,
      active: b.collected - b.forfeited - b.returned,
    }));

    res.json({
      total_collected: collected,
      total_booking_collected: bookingCollected,
      total_forfeited: forfeited,
      total_returned: returned,
      total_booking_returned: bookingReturned,
      active_liability,
      breakdown,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getInvoicePDF = async (req, res) => {
  try {
    const { type, id } = req.params;
    let items = [];
    let tenantName, roomNumber, period, date, invoiceNo;

    if (type === 'monthly') {
      const billing = await MonthlyBilling.findByPk(id, {
        include: [{ model: RentalContract, include: [Tenant, Room] }],
      });
      if (!billing) return res.status(404).json({ error: 'Billing not found' });
      tenantName = billing.RentalContract?.Tenant?.nama_panggilan || billing.RentalContract?.Tenant?.name || '-';
      roomNumber = billing.RentalContract?.Room?.room_number || '-';
      period = `${String(billing.period_month).padStart(2, '0')}/${billing.period_year}`;
      date = billing.due_date || billing.createdAt;
      invoiceNo = `INV-M${billing.id}`;
      const parts = [];
      if (parseFloat(billing.base_rent) > 0) {
        const prorateNote = billing.is_prorate && billing.notes ? ` (${billing.notes})` : '';
        parts.push({ description: `Sewa Bulanan ${period}${prorateNote}`, amount: `Rp ${Number(billing.base_rent).toLocaleString('id-ID')}` });
      }
      if (parseFloat(billing.addon_parkir) > 0) parts.push({ description: 'Addon Parkir', amount: `Rp ${Number(billing.addon_parkir).toLocaleString('id-ID')}` });
      if (parseFloat(billing.addon_tv) > 0) parts.push({ description: 'Addon TV', amount: `Rp ${Number(billing.addon_tv).toLocaleString('id-ID')}` });
      if (parseFloat(billing.addon_internet) > 0) parts.push({ description: 'Addon Internet', amount: `Rp ${Number(billing.addon_internet).toLocaleString('id-ID')}` });
      if (parseFloat(billing.discount) > 0) parts.push({ description: 'Diskon', amount: `- Rp ${Number(billing.discount).toLocaleString('id-ID')}` });
      items = parts;
    } else {
      const income = await NonMonthlyIncome.findByPk(id, { include: [Tenant, Room] });
      if (!income) return res.status(404).json({ error: 'Income not found' });
      tenantName = income.Tenant?.nama_panggilan || income.Tenant?.name || '-';
      roomNumber = income.Room?.room_number || '-';
      date = income.transaction_date;
      invoiceNo = `INV-I${income.id}`;
      items = [{ description: `${income.category} - ${income.description || ''} (${income.quantity} x Rp ${Number(income.unit_price).toLocaleString('id-ID')})`, amount: `Rp ${Number(income.total_amount).toLocaleString('id-ID')}` }];
    }

    const totalAmount = items.reduce((sum, it) => {
      const val = parseFloat(it.amount.replace(/[^0-9.-]/g, ''));
      return sum + val;
    }, 0);

    generateInvoicePDF(res, {
      invoiceNo,
      date,
      tenantName,
      roomNumber,
      period,
      items,
      total: `Rp ${totalAmount.toLocaleString('id-ID')}`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};