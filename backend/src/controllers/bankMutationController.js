const { Op } = require('sequelize');
const { parseCSV } = require('../utils/csvParser');
const { BankMutation, Tenant, TenantBankAccount, SenderRegistry } = require('../models');

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
    const { csvText } = req.body;
    if (!csvText) return res.status(400).json({ error: 'csvText is required' });

    const parsed = parseCSV(csvText);
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

    res.json({ inserted, skipped, totalParsed: parsed.length, newSenderCount: newSenders.length });
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