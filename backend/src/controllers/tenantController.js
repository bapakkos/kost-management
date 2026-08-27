const { Tenant, TenantBankAccount, RentalContract, Room, RoomType } = require('../models');

exports.getAll = async (req, res) => {
  try {
    const tenants = await Tenant.findAll({
      include: [
        TenantBankAccount,
        { model: RentalContract, required: false, where: { status: 'sewa' }, include: [Room] },
      ],
    });
    res.json(tenants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const tenant = await Tenant.findByPk(req.params.id, { include: [TenantBankAccount] });
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    res.json(tenant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const tenant = await Tenant.create(req.body);
    res.status(201).json(tenant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const tenant = await Tenant.findByPk(req.params.id);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    await tenant.update(req.body);
    res.json(tenant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const tenant = await Tenant.findByPk(req.params.id);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    await tenant.destroy();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getContracts = async (req, res) => {
  try {
    const contracts = await RentalContract.findAll({
      where: { tenant_id: req.params.id },
      include: [Room, RoomType],
    });
    res.json(contracts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getBillings = async (req, res) => {
  try {
    const { MonthlyBilling } = require('../models');
    const billings = await MonthlyBilling.findAll({
      include: [{ model: require('../models').RentalContract, where: { tenant_id: req.params.id } }],
    });
    res.json(billings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPayments = async (req, res) => {
  try {
    const { PaymentReceipt } = require('../models');
    const payments = await PaymentReceipt.findAll({ where: { tenant_id: req.params.id } });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};