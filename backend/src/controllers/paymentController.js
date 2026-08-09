const { PaymentReceipt, PaymentReceiptBilling, PaymentReceiptIncome, MonthlyBilling, NonMonthlyIncome, Tenant, Room } = require('../models');
const { calculateDiscount } = require('../utils/discountCalculator');

exports.getAll = async (req, res) => {
  try {
    const receipts = await PaymentReceipt.findAll({
      include: [Tenant, Room],
      order: [['payment_date', 'DESC']],
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
        { model: PaymentReceiptBilling, include: [MonthlyBilling] },
        { model: PaymentReceiptIncome, include: [NonMonthlyIncome] },
      ],
    });
    if (!receipt) return res.status(404).json({ error: 'Not found' });
    res.json(receipt);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const {
      payment_date, tenant_id, room_id, rental_contract_id,
      deposit_amount, payment_method, bank_account_id, notes,
      billings, incomes,
    } = req.body;

    let total = deposit_amount || 0;

    // Calculate billing total
    if (billings && billings.length > 0) {
      for (const b of billings) {
        total += parseFloat(b.amount_paid || 0);
      }
    }

    // Calculate income total
    if (incomes && incomes.length > 0) {
      for (const inc of incomes) {
        total += parseFloat(inc.amount_paid || 0);
      }
    }

    // Apply discount for 12-month payment
    if (billings && billings.length >= 12) {
      const discount = calculateDiscount(billings.length);
      total -= discount;
    }

    const receipt = await PaymentReceipt.create({
      payment_date,
      tenant_id,
      room_id,
      rental_contract_id,
      deposit_amount: deposit_amount || null,
      total_amount: total,
      payment_method,
      bank_account_id: bank_account_id || null,
      notes,
      created_by: req.user.id,
    });

    // Create junction records
    if (billings) {
      for (const b of billings) {
        const discountApplied = billings.length >= 12 ? 100000 : 0;
        await PaymentReceiptBilling.create({
          payment_receipt_id: receipt.id,
          monthly_billing_id: b.monthly_billing_id,
          amount_paid: b.amount_paid,
          discount_applied: discountApplied,
        });

        // Mark billing as paid if full amount paid
        if (b.mark_paid) {
          await MonthlyBilling.update(
            { is_paid: true, paid_date: payment_date, paid_amount: b.amount_paid },
            { where: { id: b.monthly_billing_id } }
          );
        }
      }
    }

    if (incomes) {
      for (const inc of incomes) {
        await PaymentReceiptIncome.create({
          payment_receipt_id: receipt.id,
          non_monthly_income_id: inc.non_monthly_income_id,
          amount_paid: inc.amount_paid,
        });
      }
    }

    res.status(201).json(receipt);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getByTenant = async (req, res) => {
  try {
    const receipts = await PaymentReceipt.findAll({
      where: { tenant_id: req.params.tenantId },
      include: [Room],
      order: [['payment_date', 'DESC']],
    });
    res.json(receipts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getByRoom = async (req, res) => {
  try {
    const receipts = await PaymentReceipt.findAll({
      where: { room_id: req.params.roomId },
      include: [Tenant],
      order: [['payment_date', 'DESC']],
    });
    res.json(receipts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSummary = async (req, res) => {
  try {
    const receipts = await PaymentReceipt.findAll();
    const total = receipts.reduce((sum, r) => sum + parseFloat(r.total_amount), 0);
    res.json({ total, count: receipts.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getByMonth = async (req, res) => {
  try {
    const { month, year } = req.params;
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
    const { Op } = require('sequelize');

    const receipts = await PaymentReceipt.findAll({
      where: { payment_date: { [Op.between]: [startDate, endDate] } },
      include: [Tenant, Room],
    });
    res.json(receipts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};