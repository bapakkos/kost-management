const { TenantBankAccount } = require('../models');

exports.getAll = async (req, res) => {
  try {
    const accounts = await TenantBankAccount.findAll({ where: { tenant_id: req.params.tenantId } });
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const account = await TenantBankAccount.create({ ...req.body, tenant_id: req.params.tenantId });
    res.status(201).json(account);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const account = await TenantBankAccount.findByPk(req.params.id);
    if (!account) return res.status(404).json({ error: 'Bank account not found' });
    await account.update(req.body);
    res.json(account);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const account = await TenantBankAccount.findByPk(req.params.id);
    if (!account) return res.status(404).json({ error: 'Bank account not found' });
    await account.destroy();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};