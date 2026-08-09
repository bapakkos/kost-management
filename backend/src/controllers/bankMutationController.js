const { Op } = require('sequelize');
const { BankMutation, Tenant, PaymentReceipt } = require('../models');
const fs = require('fs');
const path = require('path');

exports.getAll = async (req, res) => {
  try {
    const { is_reconciled, tenant_id } = req.query;
    const where = {};
    if (is_reconciled !== undefined) where.is_reconciled = is_reconciled === '1';
    if (tenant_id) where.tenant_id = tenant_id;

    const mutations = await BankMutation.findAll({
      where,
      include: [Tenant, PaymentReceipt],
      order: [['date', 'DESC']],
    });
    res.json(mutations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const mutation = await BankMutation.findByPk(req.params.id, { include: [Tenant, PaymentReceipt] });
    if (!mutation) return res.status(404).json({ error: 'Not found' });
    res.json(mutation);
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

exports.importCsv = async (req, res) => {
  try {
    // Manual import: expects JSON array
    const { mutations } = req.body;
    if (!mutations || !Array.isArray(mutations)) {
      return res.status(400).json({ error: 'mutations array required' });
    }

    const created = await BankMutation.bulkCreate(mutations);
    res.json({ imported: created.length });
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

exports.reconcile = async (req, res) => {
  try {
    const mutation = await BankMutation.findByPk(req.params.id);
    if (!mutation) return res.status(404).json({ error: 'Not found' });

    await mutation.update({
      is_reconciled: true,
      payment_receipt_id: req.body.payment_receipt_id,
      tenant_id: req.body.tenant_id || mutation.tenant_id,
    });
    res.json(mutation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getUnreconciled = async (req, res) => {
  try {
    const mutations = await BankMutation.findAll({
      where: { is_reconciled: false },
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
      include: [PaymentReceipt],
      order: [['date', 'DESC']],
    });
    res.json(mutations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};