const { PricingScheme, PricingSchemeRate, RoomType } = require('../models');

exports.getAll = async (req, res) => {
  try {
    const schemes = await PricingScheme.findAll({ include: [{ model: PricingSchemeRate, include: [RoomType] }] });
    res.json(schemes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const scheme = await PricingScheme.findByPk(req.params.id, { include: [{ model: PricingSchemeRate, include: [RoomType] }] });
    if (!scheme) return res.status(404).json({ error: 'Pricing scheme not found' });
    res.json(scheme);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const scheme = await PricingScheme.create({ name: req.body.name });
    res.status(201).json(scheme);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const scheme = await PricingScheme.findByPk(req.params.id);
    if (!scheme) return res.status(404).json({ error: 'Pricing scheme not found' });
    await scheme.update(req.body);
    res.json(scheme);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const scheme = await PricingScheme.findByPk(req.params.id);
    if (!scheme) return res.status(404).json({ error: 'Pricing scheme not found' });
    await scheme.destroy();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getRates = async (req, res) => {
  try {
    const rates = await PricingSchemeRate.findAll({ where: { pricing_scheme_id: req.params.id }, include: [RoomType] });
    res.json(rates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addRate = async (req, res) => {
  try {
    const { room_type_id, monthly_price } = req.body;
    let rate = await PricingSchemeRate.findOne({
      where: { pricing_scheme_id: req.params.id, room_type_id },
    });
    if (rate) {
      await rate.update({ monthly_price });
    } else {
      rate = await PricingSchemeRate.create({
        pricing_scheme_id: req.params.id,
        room_type_id,
        monthly_price,
      });
    }
    res.status(201).json(rate);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};