const { RoomType } = require('../models');

exports.getAll = async (req, res) => {
  try {
    const types = await RoomType.findAll();
    res.json(types);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const type = await RoomType.findByPk(req.params.id);
    if (!type) return res.status(404).json({ error: 'Room type not found' });
    res.json(type);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { category, view_type, ac_type, name, description } = req.body;
    const type = await RoomType.create({ category, view_type, ac_type, name, description });
    res.status(201).json(type);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const type = await RoomType.findByPk(req.params.id);
    if (!type) return res.status(404).json({ error: 'Room type not found' });
    await type.update(req.body);
    res.json(type);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const type = await RoomType.findByPk(req.params.id);
    if (!type) return res.status(404).json({ error: 'Room type not found' });
    await type.destroy();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};