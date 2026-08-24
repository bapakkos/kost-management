const sequelize = require('../config/database');
const { Op } = require('sequelize');
const {
  PaymentReceipt, PaymentReceiptItem, BankMutation, ReconciliationLink,
  MonthlyBilling, NonMonthlyIncome, RentalContract, Tenant, Room,
} = require('../models');
const { calculateDiscount } = require('../utils/discountCalculator');

exports.reconcile = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { mutation_ids, billing_ids, income_ids, apply_promo, force, notes } = req.body;

    if (!mutation_ids || mutation_ids.length === 0) {
      await t.rollback();
      return res.status(400).json({ error: 'At least one mutation is required' });
    }
    if ((!billing_ids || billing_ids.length === 0) && (!income_ids || income_ids.length === 0)) {
      await t.rollback();
      return res.status(400).json({ error: 'At least one billing or income is required' });
    }

    const mutations = await BankMutation.findAll({ where: { id: { [Op.in]: mutation_ids }, is_reconciled: false }, transaction: t });
    if (mutations.length !== mutation_ids.length) {
      await t.rollback();
      return res.status(400).json({ error: 'Some mutations not found or already reconciled' });
    }

    const mutationTotal = mutations.reduce((sum, m) => sum + parseFloat(m.amount), 0);
    const paymentDate = mutations[0].date;

    let billings = [];
    if (billing_ids && billing_ids.length > 0) {
      billings = await MonthlyBilling.findAll({
        where: { id: { [Op.in]: billing_ids }, is_paid: false },
        include: [{ model: RentalContract, include: [Tenant, Room] }],
        transaction: t,
      });
    }

    let incomes = [];
    if (income_ids && income_ids.length > 0) {
      incomes = await NonMonthlyIncome.findAll({
        where: { id: { [Op.in]: income_ids }, is_paid: false },
        include: [Tenant, Room],
        transaction: t,
      });
    }

    let discountAmount = 0;
    let promoApplied = false;

    if (apply_promo && billings.length >= 6 && billings.length <= 12) {
      const contractIds = [...new Set(billings.map(b => b.rental_contract_id))];
      const consecutive = billings.every((b, i) => {
        if (i === 0) return true;
        const prev = billings[i - 1];
        const prevMonth = prev.period_month, prevYear = prev.period_year;
        const expectedMonth = prevMonth === 12 ? 1 : prevMonth + 1;
        const expectedYear = prevMonth === 12 ? prevYear + 1 : prevYear;
        return b.period_month === expectedMonth && b.period_year === expectedYear;
      });

      const months = billings.length;
      discountAmount = calculateDiscount(months);

      if (discountAmount > 0 && consecutive && contractIds.length === 1) {
        const firstBilling = billings.sort((a, b) => {
          if (a.period_year !== b.period_year) return a.period_year - b.period_year;
          return a.period_month - b.period_month;
        })[0];

        const firstDisc = parseFloat(firstBilling.discount) || 0;
        firstBilling.discount = firstDisc + discountAmount;
        firstBilling.total_amount = parseFloat(firstBilling.total_amount) - discountAmount;
        await firstBilling.save({ transaction: t });
        promoApplied = true;
      } else {
        discountAmount = 0;
      }
    }

    const billingTotal = billings.reduce((sum, b) => sum + parseFloat(b.total_amount), 0);
    const incomeTotal = incomes.reduce((sum, i) => sum + parseFloat(i.total_amount), 0);
    const billsTotal = billingTotal + incomeTotal;
    const selisih = mutationTotal - billsTotal;

    if (!force && Math.abs(selisih) > 100) {
      await t.rollback();
      return res.status(400).json({
        error: `Amount mismatch: mutation ${mutationTotal} vs bills ${billsTotal} (selisih ${selisih})`,
        mutationTotal,
        billsTotal,
        selisih,
      });
    }

    const tenantId = billings[0]?.RentalContract?.tenant_id || incomes[0]?.tenant_id;
    const roomId = billings[0]?.RentalContract?.room_id || incomes[0]?.room_id;

    const lastReceipt = await PaymentReceipt.findOne({
      order: [['id', 'DESC']],
      transaction: t,
    });
    const lastNum = lastReceipt ? parseInt((lastReceipt.receipt_no || '').replace(/\D/g, '')) || 0 : 0;
    const receiptNo = `NOTA-${new Date(paymentDate).toISOString().slice(0, 7).replace('-', '')}-${String(lastNum + 1).padStart(4, '0')}`;

    const receipt = await PaymentReceipt.create({
      receipt_no: receiptNo,
      payment_date: paymentDate,
      tenant_id: tenantId,
      room_id: roomId,
      total_amount: mutationTotal,
      discount_amount: discountAmount,
      selisih_amount: Math.abs(selisih) > 1 ? selisih : 0,
      notes: notes || null,
      created_by: req.user.id,
    }, { transaction: t });

    for (const b of billings) {
      await PaymentReceiptItem.create({
        payment_receipt_id: receipt.id,
        item_type: 'monthly_billing',
        monthly_billing_id: b.id,
        amount: parseFloat(b.total_amount),
      }, { transaction: t });
      b.is_paid = true;
      b.paid_date = paymentDate;
      b.paid_amount = parseFloat(b.total_amount);
      await b.save({ transaction: t });
    }

    for (const inc of incomes) {
      await PaymentReceiptItem.create({
        payment_receipt_id: receipt.id,
        item_type: 'non_monthly_income',
        non_monthly_income_id: inc.id,
        amount: parseFloat(inc.total_amount),
      }, { transaction: t });
      inc.is_paid = true;
      inc.paid_date = paymentDate;
      await inc.save({ transaction: t });
    }

    for (const m of mutations) {
      await ReconciliationLink.create({
        bank_mutation_id: m.id,
        target_type: 'nota',
        target_id: receipt.id,
      }, { transaction: t });
      m.is_reconciled = true;
      await m.save({ transaction: t });
    }

    await t.commit();
    res.status(201).json({
      receipt,
      billings_paid: billings.length,
      incomes_paid: incomes.length,
      mutations_linked: mutations.length,
      promo_applied: promoApplied,
      discount_amount: discountAmount,
    });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: err.message });
  }
};