const { Op } = require('sequelize');
const { PaymentReceipt, PaymentReceiptItem, MonthlyBilling, NonMonthlyIncome, BankMutation, ReconciliationLink, Tenant, Room } = require('../models');
const { generateReceiptPDF } = require('../utils/pdfGenerator');

exports.getAll = async (req, res) => {
  try {
    const receipts = await PaymentReceipt.findAll({
      include: [Tenant, Room],
      order: [['payment_date', 'DESC'], ['id', 'DESC']],
    });
    res.json(receipts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const receipt = await PaymentReceipt.findByPk(req.params.id, {
      include: [
        Tenant, Room,
        {
          model: PaymentReceiptItem,
          include: [
            { model: MonthlyBilling },
            { model: NonMonthlyIncome },
          ],
        },
      ],
    });
    if (!receipt) return res.status(404).json({ error: 'Not found' });
    res.json(receipt);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getReceiptPDF = async (req, res) => {
  try {
    const receipt = await PaymentReceipt.findByPk(req.params.id, {
      include: [
        Tenant, Room,
        {
          model: PaymentReceiptItem,
          include: [
            { model: MonthlyBilling, include: [{ model: require('../models').RentalContract }] },
            { model: NonMonthlyIncome },
          ],
        },
      ],
    });
    if (!receipt) return res.status(404).json({ error: 'Not found' });

    const items = [];
    for (const item of receipt.PaymentReceiptItems || []) {
      if (item.item_type === 'monthly_billing' && item.MonthlyBilling) {
        const b = item.MonthlyBilling;
        const period = `${String(b.period_month).padStart(2, '0')}/${b.period_year}`;
        items.push({
          description: `Sewa Kamar ${period} (Rp ${Number(b.base_rent).toLocaleString('id-ID')})`,
          amount: `Rp ${Number(item.amount).toLocaleString('id-ID')}`,
        });
      } else if (item.item_type === 'non_monthly_income' && item.NonMonthlyIncome) {
        const inc = item.NonMonthlyIncome;
        items.push({
          description: `${inc.category} - ${inc.description || ''}`,
          amount: `Rp ${Number(item.amount).toLocaleString('id-ID')}`,
        });
      }
    }

    const links = await ReconciliationLink.findAll({
      where: { target_type: 'nota', target_id: receipt.id },
      include: [BankMutation],
    });
    const mutationRef = links.map(l => l.BankMutation?.description?.substring(0, 80)).filter(Boolean).join('; ');

    generateReceiptPDF(res, {
      receiptNo: receipt.receipt_no,
      date: receipt.payment_date,
      tenantName: receipt.Tenant?.nama_panggilan || receipt.Tenant?.name || '-',
      roomNumber: receipt.Room?.room_number || '-',
      items,
      discount: receipt.discount_amount > 0 ? `Rp ${Number(receipt.discount_amount).toLocaleString('id-ID')}` : null,
      total: `Rp ${Number(receipt.total_amount).toLocaleString('id-ID')}`,
      mutationRef,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getByMonth = async (req, res) => {
  try {
    const { month, year } = req.params;
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
    const receipts = await PaymentReceipt.findAll({
      where: { payment_date: { [Op.between]: [startDate, endDate] } },
      include: [Tenant, Room],
      order: [['payment_date', 'DESC']],
    });
    res.json(receipts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};