const { SenderRegistry, Tenant } = require('../models');

exports.getAll = async (req, res) => {
  try {
    const records = await SenderRegistry.findAll({
      include: [Tenant],
      order: [['sender_name', 'ASC']],
    });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const record = await SenderRegistry.findByPk(req.params.id);
    if (!record) return res.status(404).json({ error: 'Not found' });
    await record.update(req.body);
    const updated = await SenderRegistry.findByPk(req.params.id, { include: [Tenant] });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.bulkMap = async (req, res) => {
  try {
    const { mappings } = req.body;
    const updated = [];
    for (const m of mappings) {
      const record = await SenderRegistry.findOne({ where: { sender_name: m.sender_name } });
      if (record) {
        await record.update({ tenant_id: m.tenant_id, label: m.label });
        updated.push(record);
      }
    }
    res.json({ updated: updated.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};