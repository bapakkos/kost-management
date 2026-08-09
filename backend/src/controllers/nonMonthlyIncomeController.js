const { Op } = require('sequelize');
const { NonMonthlyIncome, Tenant, Room } = require('../models');

exports.getAll = async (req, res) => {
  try {
    const incomes = await NonMonthlyIncome.findAll({
      include: [Tenant, Room],
      order: [['transaction_date', 'DESC']],
    });
    res.json(incomes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const income = await NonMonthlyIncome.findByPk(req.params.id, { include: [Tenant, Room] });
    if (!income) return res.status(404).json({ error: 'Not found' });
    res.json(income);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { unit_price, quantity } = req.body;
    const total_amount = (parseFloat(unit_price) || 0) * (parseInt(quantity) || 0);
    const income = await NonMonthlyIncome.create({ ...req.body, total_amount });
    res.status(201).json(income);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const income = await NonMonthlyIncome.findByPk(req.params.id);
    if (!income) return res.status(404).json({ error: 'Not found' });
    const updated = { ...req.body };
    if (req.body.unit_price && req.body.quantity) {
      updated.total_amount = parseFloat(req.body.unit_price) * parseInt(req.body.quantity);
    }
    await income.update(updated);
    res.json(income);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const income = await NonMonthlyIncome.findByPk(req.params.id);
    if (!income) return res.status(404).json({ error: 'Not found' });
    await income.destroy();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSummary = async (req, res) => {
  try {
    const { month, year } = req.query;
    const where = {};
    if (month && year) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
      where.transaction_date = { [Op.between]: [startDate, endDate] };
    }
    const incomes = await NonMonthlyIncome.findAll({ where });
    const total = incomes.reduce((sum, i) => sum + parseFloat(i.total_amount), 0);
    res.json({ total, count: incomes.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};