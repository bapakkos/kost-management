const sequelize = require('../config/database');
const { Op } = require('sequelize');
const {
  PaymentReceipt, PaymentReceiptItem, BankMutation, ReconciliationLink,
  MonthlyBilling, NonMonthlyIncome, RentalContract, Tenant, Room, Booking,
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
        const additional = Math.max(0, discountAmount - firstDisc);
        if (additional > 0) {
          firstBilling.discount = firstDisc + additional;
          firstBilling.total_amount = parseFloat(firstBilling.total_amount) - additional;
          await firstBilling.save({ transaction: t });
          discountAmount = additional;
          promoApplied = true;
        } else {
          discountAmount = 0;
        }
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
    const lastNum = lastReceipt ? (parseInt((lastReceipt.receipt_no || '').split('-').pop(), 10) || 0) : 0;
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

      if (inc.category === 'deposit' && inc.rental_contract_id) {
        const dc = await RentalContract.findByPk(inc.rental_contract_id, { transaction: t });
        if (dc && dc.deposit_status === 'unpaid') {
          await dc.update({ deposit_status: 'paid' }, { transaction: t });
        }
      }
      if (inc.category === 'booking' && inc.id) {
        const booking = await Booking.findOne({ where: { non_monthly_income_id: inc.id }, transaction: t });
        if (booking && booking.status === 'pending') {
          await booking.update({ status: 'received' }, { transaction: t });
        }
      }
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

exports.undo = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { mutation_ids } = req.body;
    if (!Array.isArray(mutation_ids) || mutation_ids.length === 0) {
      await t.rollback();
      return res.status(400).json({ error: 'At least one mutation_id is required' });
    }

    const mutations = await BankMutation.findAll({
      where: { id: { [Op.in]: mutation_ids }, is_reconciled: true },
      transaction: t,
    });
    if (mutations.length !== mutation_ids.length) {
      await t.rollback();
      return res.status(400).json({ error: 'Some mutations not found or not reconciled' });
    }

    const allLinks = await ReconciliationLink.findAll({
      where: { bank_mutation_id: { [Op.in]: mutation_ids } },
      transaction: t,
    });
    if (allLinks.length === 0) {
      await t.rollback();
      return res.status(400).json({ error: 'No reconciliation links found for these mutations' });
    }

    const types = new Set(allLinks.map(l => l.target_type));

    if (types.has('deposit_return')) {
      await t.rollback();
      return res.status(400).json({ error: 'Mutasi ini ter-link ke deposit return; undo deposit tidak didukung di sini.' });
    }

    if (types.has('booking_return')) {
      await t.rollback();
      return res.status(400).json({ error: 'Mutasi ini ter-link ke booking return; undo tidak didukung di sini.' });
    }

    const links = allLinks.filter(l => l.target_type === 'nota');
    const receiptIds = [...new Set(links.map(l => l.target_id))];

    const allLinksForReceipts = await ReconciliationLink.findAll({
      where: { target_type: 'nota', target_id: { [Op.in]: receiptIds } },
      transaction: t,
    });

    const requestedSet = new Set(mutation_ids.map(Number));
    for (const receiptId of receiptIds) {
      const linkedMutations = allLinksForReceipts
        .filter(l => l.target_id === receiptId)
        .map(l => l.bank_mutation_id);
      const notIncluded = linkedMutations.filter(id => !requestedSet.has(Number(id)));
      if (notIncluded.length > 0) {
        await t.rollback();
        return res.status(400).json({
          error: `Nota #${receiptId} ter-link ke mutasi lain (id: ${notIncluded.join(', ')}). Undo harus mencakup semua mutasi yang ter-link ke nota ini.`,
        });
      }
    }

    let receiptsDeleted = 0;

    for (const receiptId of receiptIds) {
      const receipt = await PaymentReceipt.findByPk(receiptId, { transaction: t });
      if (!receipt) continue;

      const items = await PaymentReceiptItem.findAll({
        where: { payment_receipt_id: receiptId },
        order: [['id', 'ASC']],
        transaction: t,
      });

      const discountToRevert = parseFloat(receipt.discount_amount) || 0;
      let discountReverted = false;

      for (const item of items) {
        if (item.item_type === 'monthly_billing' && item.monthly_billing_id) {
          const billing = await MonthlyBilling.findByPk(item.monthly_billing_id, { transaction: t });
          if (billing) {
            billing.is_paid = false;
            billing.paid_date = null;
            billing.paid_amount = null;
            if (discountToRevert > 0 && !discountReverted) {
              const curDiscount = parseFloat(billing.discount) || 0;
              billing.discount = Math.max(0, curDiscount - discountToRevert);
              billing.total_amount = parseFloat(billing.total_amount) + discountToRevert;
              discountReverted = true;
            }
            await billing.save({ transaction: t });
          }
        } else if (item.item_type === 'non_monthly_income' && item.non_monthly_income_id) {
          const income = await NonMonthlyIncome.findByPk(item.non_monthly_income_id, { transaction: t });
          if (income) {
            income.is_paid = false;
            income.paid_date = null;
            await income.save({ transaction: t });
            if (income.category === 'deposit' && income.rental_contract_id) {
              const dc = await RentalContract.findByPk(income.rental_contract_id, { transaction: t });
              if (dc && dc.deposit_status === 'paid') {
                await dc.update({ deposit_status: 'unpaid' }, { transaction: t });
              }
            }
            if (income.category === 'booking') {
              const booking = await Booking.findOne({ where: { non_monthly_income_id: income.id }, transaction: t });
              if (booking && booking.status === 'received') {
                await booking.update({ status: 'pending' }, { transaction: t });
              }
            }
          }
        }
      }

      await PaymentReceiptItem.destroy({ where: { payment_receipt_id: receiptId }, transaction: t });
      await ReconciliationLink.destroy({ where: { target_type: 'nota', target_id: receiptId }, transaction: t });
      await receipt.destroy({ transaction: t });
      receiptsDeleted++;
    }

    for (const m of mutations) {
      m.is_reconciled = false;
      await m.save({ transaction: t });
    }

    await t.commit();
    res.json({ undone: mutations.length, receipts_deleted: receiptsDeleted });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: err.message });
  }
};