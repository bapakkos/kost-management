const { Op } = require('sequelize');
const sequelize = require('../config/database');
const { parseCSV } = require('../utils/csvParser');
const { calculateDiscount } = require('../utils/discountCalculator');
const {
  BankMutation, Tenant, TenantBankAccount, SenderRegistry,
  RentalContract, MonthlyBilling, NonMonthlyIncome,
  PaymentReceipt, PaymentReceiptItem, ReconciliationLink,
} = require('../models');

exports.getAll = async (req, res) => {
  try {
    const { is_reconciled, category, type, start_date, end_date } = req.query;
    const where = {};
    if (is_reconciled !== undefined) where.is_reconciled = is_reconciled === '1';
    if (category) where.category = category;
    if (type) where.type = type;
    if (start_date && end_date) {
      where.date = { [Op.between]: [start_date, end_date] };
    } else if (start_date) {
      where.date = { [Op.gte]: start_date };
    } else if (end_date) {
      where.date = { [Op.lte]: end_date };
    }
    const mutations = await BankMutation.findAll({
      where,
      include: [Tenant],
      order: [['date', 'DESC'], ['id', 'DESC']],
    });
    res.json(mutations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const mutation = await BankMutation.findByPk(req.params.id, { include: [Tenant] });
    if (!mutation) return res.status(404).json({ error: 'Not found' });
    res.json(mutation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getUnreconciled = async (req, res) => {
  try {
    const mutations = await BankMutation.findAll({
      where: { is_reconciled: false, category: 'operational' },
      include: [Tenant],
      order: [['date', 'DESC']],
    });
    res.json(mutations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getReconciled = async (req, res) => {
  try {
    const mutations = await BankMutation.findAll({
      where: { is_reconciled: true },
      include: [Tenant],
      order: [['date', 'DESC']],
    });
    res.json(mutations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.importCsv = async (req, res) => {
  try {
    const csv = req.body?.csv ?? req.body?.csvText;
    if (!csv) return res.status(400).json({ error: 'csv is required' });

    const parsed = parseCSV(csv);
    if (parsed.length === 0) return res.status(400).json({ error: 'No valid mutations found' });

    const withSenderNames = new Set();
    for (const p of parsed) {
      if (p.sender_name) withSenderNames.add(p.sender_name);
    }

    const existingSenders = await SenderRegistry.findAll({
      attributes: ['sender_name'],
      where: { sender_name: { [Op.in]: [...withSenderNames] } },
    });
    const existingSet = new Set(existingSenders.map(s => s.sender_name));
    const newSenders = [...withSenderNames].filter(n => !existingSet.has(n));
    for (const name of newSenders) {
      await SenderRegistry.findOrCreate({ where: { sender_name: name }, defaults: { sender_name: name } });
    }

    let inserted = 0;
    let skipped = 0;
    for (const p of parsed) {
      const existing = await BankMutation.findOne({
        where: { date: p.date, amount: p.amount, description: p.description },
      });
      if (existing) {
        skipped++;
        continue;
      }
      await BankMutation.create(p);
      inserted++;
    }

    res.json({ created: inserted, inserted, skipped, totalParsed: parsed.length, newSenderCount: newSenders.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const mutation = await BankMutation.findByPk(req.params.id);
    if (!mutation) return res.status(404).json({ error: 'Not found' });
    await mutation.update({ category: req.body.category });
    res.json(mutation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.autoMatch = async (req, res) => {
  try {
    const mutations = await BankMutation.findAll({
      where: { is_reconciled: false, category: 'operational', type: 'credit' },
      order: [['date', 'DESC']],
    });
    const suggestions = [];
    for (const m of mutations) {
      if (!m.sender_name) continue;
      const registry = await SenderRegistry.findOne({ where: { sender_name: m.sender_name }, include: [Tenant] });
      if (registry && registry.tenant_id) {
        suggestions.push({ mutation_id: m.id, tenant_id: registry.tenant_id, tenant_name: registry.Tenant?.nama_panggilan || registry.Tenant?.name, sender_name: m.sender_name, amount: m.amount, date: m.date });
      }
    }
    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const AMOUNT_TOLERANCE = 100;

function findAmountMatch(amount, billings, incomes) {
  const amt = parseFloat(amount);

  for (const b of billings) {
    if (Math.abs(parseFloat(b.total_amount) - amt) <= AMOUNT_TOLERANCE) {
      return { billings: [b], incomes: [], discount: 0 };
    }
  }
  for (const inc of incomes) {
    if (Math.abs(parseFloat(inc.total_amount) - amt) <= AMOUNT_TOLERANCE) {
      return { billings: [], incomes: [inc], discount: 0 };
    }
  }

  const sorted = [...billings].sort((a, b) => {
    if (a.period_year !== b.period_year) return a.period_year - b.period_year;
    return a.period_month - b.period_month;
  });

  for (let i = 0; i < sorted.length; i++) {
    const run = [sorted[i]];
    for (let j = i + 1; j < sorted.length; j++) {
      const prev = run[run.length - 1];
      const curr = sorted[j];
      const expMonth = prev.period_month === 12 ? 1 : prev.period_month + 1;
      const expYear = prev.period_month === 12 ? prev.period_year + 1 : prev.period_year;
      if (curr.period_month !== expMonth || curr.period_year !== expYear) break;

      run.push(curr);
      const months = run.length;
      const sum = run.reduce((s, b) => s + parseFloat(b.total_amount), 0);

      const promo = calculateDiscount(months);
      if (promo > 0 && Math.abs((sum - promo) - amt) <= AMOUNT_TOLERANCE) {
        return { billings: [...run], incomes: [], discount: promo };
      }
      if (Math.abs(sum - amt) <= AMOUNT_TOLERANCE) {
        return { billings: [...run], incomes: [], discount: 0 };
      }
    }
  }

  return null;
}

async function reconcileOne(mutation, userId) {
  const t = await sequelize.transaction();
  try {
    if (!mutation.sender_name) {
      await t.rollback();
      return { status: 'no_sender' };
    }

    const registry = await SenderRegistry.findOne({
      where: { sender_name: mutation.sender_name },
      transaction: t,
    });
    if (!registry || !registry.tenant_id) {
      await t.rollback();
      return { status: 'no_tenant', sender_name: mutation.sender_name };
    }
    const tenantId = registry.tenant_id;

    const billings = await MonthlyBilling.findAll({
      where: { is_paid: false },
      include: [{ model: RentalContract, where: { tenant_id: tenantId } }],
      order: [['period_year', 'ASC'], ['period_month', 'ASC']],
      transaction: t,
    });
    const incomes = await NonMonthlyIncome.findAll({
      where: { tenant_id: tenantId, is_paid: false },
      transaction: t,
    });

    const match = findAmountMatch(parseFloat(mutation.amount), billings, incomes);
    if (!match) {
      await t.rollback();
      return { status: 'no_billing_match', tenant_id: tenantId, unpaid_billings: billings.length };
    }

    if (match.discount > 0 && match.billings.length > 0) {
      const first = match.billings[0];
      first.discount = (parseFloat(first.discount) || 0) + match.discount;
      first.total_amount = parseFloat(first.total_amount) - match.discount;
    }

    const billingTotal = match.billings.reduce((s, b) => s + parseFloat(b.total_amount), 0);
    const incomeTotal = match.incomes.reduce((s, i) => s + parseFloat(i.total_amount), 0);
    const billsTotal = billingTotal + incomeTotal;
    const selisih = parseFloat(mutation.amount) - billsTotal;

    const contract = match.billings[0]?.RentalContract;
    const roomId = contract?.room_id || match.incomes[0]?.room_id;

    const lastReceipt = await PaymentReceipt.findOne({ order: [['id', 'DESC']], transaction: t });
    const lastNum = lastReceipt ? parseInt((lastReceipt.receipt_no || '').replace(/\D/g, '')) || 0 : 0;
    const receiptNo = `NOTA-${new Date(mutation.date).toISOString().slice(0, 7).replace('-', '')}-${String(lastNum + 1).padStart(4, '0')}`;

    const receipt = await PaymentReceipt.create({
      receipt_no: receiptNo,
      payment_date: mutation.date,
      tenant_id: tenantId,
      room_id: roomId,
      total_amount: parseFloat(mutation.amount),
      discount_amount: match.discount,
      selisih_amount: Math.abs(selisih) > 1 ? selisih : 0,
      notes: 'Auto-reconciled (sender name match)',
      created_by: userId,
    }, { transaction: t });

    for (const b of match.billings) {
      await PaymentReceiptItem.create({
        payment_receipt_id: receipt.id,
        item_type: 'monthly_billing',
        monthly_billing_id: b.id,
        amount: parseFloat(b.total_amount),
      }, { transaction: t });
      b.is_paid = true;
      b.paid_date = mutation.date;
      b.paid_amount = parseFloat(b.total_amount);
      await b.save({ transaction: t });
    }
    for (const inc of match.incomes) {
      await PaymentReceiptItem.create({
        payment_receipt_id: receipt.id,
        item_type: 'non_monthly_income',
        non_monthly_income_id: inc.id,
        amount: parseFloat(inc.total_amount),
      }, { transaction: t });
      inc.is_paid = true;
      inc.paid_date = mutation.date;
      await inc.save({ transaction: t });
    }

    await ReconciliationLink.create({
      bank_mutation_id: mutation.id,
      target_type: 'nota',
      target_id: receipt.id,
    }, { transaction: t });
    mutation.is_reconciled = true;
    await mutation.save({ transaction: t });

    await t.commit();
    return {
      status: 'reconciled',
      tenant_id: tenantId,
      receipt_no: receiptNo,
      items: match.billings.length + match.incomes.length,
      discount: match.discount,
    };
  } catch (err) {
    try { await t.rollback(); } catch (_) {}
    throw err;
  }
}

exports.autoReconcile = async (req, res) => {
  try {
    const mutations = await BankMutation.findAll({
      where: { is_reconciled: false, category: 'operational', type: 'credit' },
      order: [['date', 'ASC'], ['id', 'ASC']],
    });

    const results = { auto_reconciled: 0, unmatched: 0, errors: 0, total: mutations.length, details: [] };

    for (const m of mutations) {
      try {
        const r = await reconcileOne(m, req.user.id);
        results.details.push({
          mutation_id: m.id,
          date: m.date,
          sender_name: m.sender_name,
          amount: parseFloat(m.amount),
          ...r,
        });
        if (r.status === 'reconciled') results.auto_reconciled++;
        else results.unmatched++;
      } catch (err) {
        results.errors++;
        results.details.push({ mutation_id: m.id, status: 'error', error: err.message });
      }
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const mutation = await BankMutation.create(req.body);
    res.status(201).json(mutation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const mutation = await BankMutation.findByPk(req.params.id);
    if (!mutation) return res.status(404).json({ error: 'Not found' });
    await mutation.update(req.body);
    res.json(mutation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const mutation = await BankMutation.findByPk(req.params.id);
    if (!mutation) return res.status(404).json({ error: 'Not found' });
    await mutation.destroy();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};