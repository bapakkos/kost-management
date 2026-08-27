const { Op } = require('sequelize');
const {
  MonthlyBilling, RentalContract, Room, RoomType, Tenant,
  PricingScheme, PricingSchemeRate,
} = require('../models');
const { calculateBillingTotal } = require('../utils/priceCalculator');
const { calculateDueDate } = require('../utils/dueDateCalculator');

exports.getAll = async (req, res) => {
  try {
    const { is_paid, period_month, period_year, contract_id } = req.query;
    const where = {};
    if (is_paid !== undefined) where.is_paid = is_paid === '1';
    if (period_month) where.period_month = period_month;
    if (period_year) where.period_year = period_year;
    if (contract_id) where.rental_contract_id = contract_id;

    const billings = await MonthlyBilling.findAll({
      where,
      include: [{ model: RentalContract, include: [Room, Tenant] }],
      order: [['period_year', 'DESC'], ['period_month', 'DESC']],
    });
    res.json(billings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const billing = await MonthlyBilling.findByPk(req.params.id, {
      include: [{ model: RentalContract, include: [Room, Tenant] }],
    });
    if (!billing) return res.status(404).json({ error: 'Billing not found' });
    res.json(billing);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const contract = await RentalContract.findByPk(req.params.contractId, {
      include: [PricingScheme, { model: Room, include: [RoomType] }],
    });
    if (!contract) return res.status(404).json({ error: 'Contract not found' });

    const { period_month, period_year } = req.body;
    const rate = await PricingSchemeRate.findOne({
      where: { pricing_scheme_id: contract.pricing_scheme_id, room_type_id: contract.Room.room_type_id },
    });

    const baseRent = rate ? parseFloat(rate.monthly_price) : 0;
    const addonParkir = req.body.addon_parkir != null ? req.body.addon_parkir : 0;
    const addonTv = req.body.addon_tv != null ? req.body.addon_tv : 0;
    const addonInternet = req.body.addon_internet != null ? req.body.addon_internet : 0;
    const discount = req.body.discount != null ? req.body.discount : 0;
    const total = baseRent + addonParkir + addonTv + addonInternet - discount;

    const dueDate = calculateDueDate(contract.start_date);
    const dueDateStr = new Date(period_year, period_month - 1, dueDate.getDate()).toISOString().slice(0, 10);

    const billing = await MonthlyBilling.create({
      rental_contract_id: contract.id,
      period_month,
      period_year,
      base_rent: baseRent,
      addon_parkir: addonParkir,
      addon_tv: addonTv,
      addon_internet: addonInternet,
      discount,
      due_date: dueDateStr,
      total_amount: total,
      is_paid: false,
    });

    res.status(201).json(billing);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const billing = await MonthlyBilling.findByPk(req.params.id);
    if (!billing) return res.status(404).json({ error: 'Billing not found' });

    // Recalculate total if amounts changed
    const updated = { ...req.body };
    const amountFields = ['base_rent', 'addon_parkir', 'addon_tv', 'addon_internet', 'discount'];
    if (amountFields.some(f => req.body[f] != null)) {
      updated.total_amount = calculateBillingTotal({ ...billing.dataValues, ...req.body });
    }

    await billing.update(updated);
    res.json(billing);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getByContract = async (req, res) => {
  try {
    const billings = await MonthlyBilling.findAll({
      where: { rental_contract_id: req.params.contractId },
      order: [['period_year', 'ASC'], ['period_month', 'ASC']],
    });
    res.json(billings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getOutstanding = async (req, res) => {
  try {
    const billings = await MonthlyBilling.findAll({
      where: { is_paid: false },
      include: [{ model: RentalContract, include: [Room, Tenant] }],
      order: [['period_year', 'ASC'], ['period_month', 'ASC']],
    });
    res.json(billings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSummary = async (req, res) => {
  try {
    const { month, year } = req.query;
    const where = {};
    if (month) where.period_month = month;
    if (year) where.period_year = year;

    const billings = await MonthlyBilling.findAll({ where });
    const total = billings.reduce((sum, b) => sum + parseFloat(b.total_amount), 0);
    const paid = billings.filter(b => b.is_paid).reduce((sum, b) => sum + parseFloat(b.total_amount), 0);
    const unpaid = billings.filter(b => !b.is_paid).reduce((sum, b) => sum + parseFloat(b.total_amount), 0);

    res.json({ total, paid, unpaid, count: billings.length, paid_count: billings.filter(b => b.is_paid).length, unpaid_count: billings.filter(b => !b.is_paid).length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.generate = async (req, res) => {
  try {
    const { month, year, force } = req.body;
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const firstDayStr = firstDay.toISOString().slice(0, 10);
    const lastDayStr = lastDay.toISOString().slice(0, 10);

    const contracts = await RentalContract.findAll({
      where: {
        status: { [Op.ne]: 'keluar' },
        start_date: { [Op.lte]: lastDayStr },
        [Op.or]: [{ end_date: null }, { end_date: { [Op.gte]: firstDayStr } }],
      },
      include: [{ model: Room, include: [RoomType] }, PricingScheme],
    });

    const created = [];
    const updated = [];
    for (const contract of contracts) {
      const existing = await MonthlyBilling.findOne({
        where: { rental_contract_id: contract.id, period_month: month, period_year: year },
      });

      const rate = await PricingSchemeRate.findOne({
        where: { pricing_scheme_id: contract.pricing_scheme_id, room_type_id: contract.Room.room_type_id },
      });

      const baseRent = rate ? parseFloat(rate.monthly_price) : 0;

      if (existing) {
        if (!force) continue;
        // Recalculate from current price scheme, preserving addons/discount/paid status/notes
        const addonParkir = parseFloat(existing.addon_parkir) || 0;
        const addonTv = parseFloat(existing.addon_tv) || 0;
        const addonInternet = parseFloat(existing.addon_internet) || 0;
        const discount = parseFloat(existing.discount) || 0;
        const total = baseRent + addonParkir + addonTv + addonInternet - discount;
        await existing.update({ base_rent: baseRent, total_amount: total });
        updated.push(existing);
        continue;
      }

      // Copy addons from previous month's billing (if exists), otherwise default 0
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      const prevBilling = await MonthlyBilling.findOne({
        where: { rental_contract_id: contract.id, period_month: prevMonth, period_year: prevYear },
      });

      const addonParkir = prevBilling ? parseFloat(prevBilling.addon_parkir) : 0;
      const addonTv = prevBilling ? parseFloat(prevBilling.addon_tv) : 0;
      const addonInternet = prevBilling ? parseFloat(prevBilling.addon_internet) : 0;
      const discount = prevBilling ? parseFloat(prevBilling.discount) : 0;
      const total = baseRent + addonParkir + addonTv + addonInternet - discount;
      const dueDate = calculateDueDate(contract.start_date);
      const dueDateStr = new Date(year, month - 1, dueDate.getDate()).toISOString().slice(0, 10);

      const billing = await MonthlyBilling.create({
        rental_contract_id: contract.id,
        period_month: month,
        period_year: year,
        base_rent: baseRent,
        addon_parkir: addonParkir,
        addon_tv: addonTv,
        addon_internet: addonInternet,
        discount,
        due_date: dueDateStr,
        total_amount: total,
        is_paid: false,
      });
      created.push(billing);
    }

    res.json({ created: created.length, updated: updated.length, month, year });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.generateBulk = async (req, res) => {
  try {
    const { contract_id, start_month, start_year, months } = req.body;
    if (!contract_id || !start_month || !start_year || !months) {
      return res.status(400).json({ error: 'contract_id, start_month, start_year, months are required' });
    }

    const contract = await RentalContract.findByPk(contract_id, {
      include: [PricingScheme, { model: Room, include: [RoomType] }],
    });
    if (!contract) return res.status(404).json({ error: 'Contract not found' });

    const rate = await PricingSchemeRate.findOne({
      where: { pricing_scheme_id: contract.pricing_scheme_id, room_type_id: contract.Room.room_type_id },
    });
    const baseRent = rate ? parseFloat(rate.monthly_price) : 0;

    const prevMonth = parseInt(start_month) === 1 ? 12 : parseInt(start_month) - 1;
    const prevYear = parseInt(start_month) === 1 ? parseInt(start_year) - 1 : parseInt(start_year);
    const prevBilling = await MonthlyBilling.findOne({
      where: { rental_contract_id: contract.id, period_month: prevMonth, period_year: prevYear },
    });
    const addonParkir = prevBilling ? parseFloat(prevBilling.addon_parkir) : 0;
    const addonTv = prevBilling ? parseFloat(prevBilling.addon_tv) : 0;
    const addonInternet = prevBilling ? parseFloat(prevBilling.addon_internet) : 0;

    const created = [];
    const skipped = [];
    let cm = parseInt(start_month);
    let cy = parseInt(start_year);

    for (let i = 0; i < parseInt(months); i++) {
      const existing = await MonthlyBilling.findOne({
        where: { rental_contract_id: contract.id, period_month: cm, period_year: cy },
      });
      if (existing) {
        skipped.push({ period: `${cm}/${cy}` });
        cm = cm === 12 ? 1 : cm + 1;
        if (cm === 1) cy++;
        continue;
      }

      const total = baseRent + addonParkir + addonTv + addonInternet;
      const dueDate = calculateDueDate(contract.start_date);
      const dueDateStr = new Date(cy, cm - 1, dueDate.getDate()).toISOString().slice(0, 10);

      const billing = await MonthlyBilling.create({
        rental_contract_id: contract.id,
        period_month: cm,
        period_year: cy,
        base_rent: baseRent,
        addon_parkir: addonParkir,
        addon_tv: addonTv,
        addon_internet: addonInternet,
        discount: 0,
        due_date: dueDateStr,
        total_amount: total,
        is_paid: false,
      });
      created.push(billing);

      cm = cm === 12 ? 1 : cm + 1;
      if (cm === 1) cy++;
    }

    res.json({ created: created.length, skipped: skipped.length, months: parseInt(months) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.markPaid = async (req, res) => {
  try {
    const billing = await MonthlyBilling.findByPk(req.params.id);
    if (!billing) return res.status(404).json({ error: 'Billing not found' });

    await billing.update({
      is_paid: true,
      paid_date: req.body.paid_date || new Date().toISOString().slice(0, 10),
      paid_amount: req.body.paid_amount || billing.total_amount,
    });
    res.json(billing);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};