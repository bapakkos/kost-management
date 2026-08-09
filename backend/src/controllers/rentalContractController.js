const { Op } = require('sequelize');
const {
  RentalContract, Room, Tenant, PricingScheme, RoomType,
  MonthlyBilling, PricingSchemeRate,
} = require('../models');
const { getRentalStatus } = require('../utils/rentalStatus');

exports.getAll = async (req, res) => {
  try {
    const { status, room_id, tenant_id } = req.query;
    const where = {};
    if (status) where.status = status;
    if (room_id) where.room_id = room_id;
    if (tenant_id) where.tenant_id = tenant_id;

    const contracts = await RentalContract.findAll({
      where,
      include: [
        { model: Room, include: [RoomType] },
        { model: Tenant },
        { model: PricingScheme },
      ],
      order: [['start_date', 'DESC']],
    });

    // Update status based on dates
    for (const c of contracts) {
      const computedStatus = getRentalStatus(c);
      if (c.status !== computedStatus) {
        c.status = computedStatus;
        await c.save();
      }
    }

    res.json(contracts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const contract = await RentalContract.findByPk(req.params.id, {
      include: [
        { model: Room, include: [RoomType] },
        { model: Tenant },
        { model: PricingScheme },
      ],
    });
    if (!contract) return res.status(404).json({ error: 'Contract not found' });
    res.json(contract);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { room_id, tenant_id, pricing_scheme_id, start_date, deposit_amount } = req.body;

    // Check room availability
    const room = await Room.findByPk(room_id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.status === 'occupied') return res.status(400).json({ error: 'Room already occupied' });

    const contract = await RentalContract.create({
      room_id,
      tenant_id,
      pricing_scheme_id,
      start_date,
      deposit_amount: deposit_amount || 1000000,
      status: new Date(start_date) > new Date() ? 'booking' : 'sewa',
    });

    // Update room status
    await room.update({ status: contract.status === 'booking' ? 'booking' : 'occupied' });

    const full = await RentalContract.findByPk(contract.id, {
      include: [Room, Tenant, PricingScheme],
    });
    res.status(201).json(full);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const contract = await RentalContract.findByPk(req.params.id);
    if (!contract) return res.status(404).json({ error: 'Contract not found' });
    await contract.update(req.body);

    // Update room status when end_date is set
    if (req.body.end_date) {
      const room = await Room.findByPk(contract.room_id);
      await room.update({ status: 'available' });
      contract.status = 'keluar';
      await contract.save();
    }

    res.json(contract);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const contract = await RentalContract.findByPk(req.params.id);
    if (!contract) return res.status(404).json({ error: 'Contract not found' });
    // Set end_date to today
    contract.end_date = new Date().toISOString().slice(0, 10);
    contract.status = 'keluar';
    await contract.save();

    const room = await Room.findByPk(contract.room_id);
    await room.update({ status: 'available' });

    res.json({ message: 'Contract ended', contract });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getByRoom = async (req, res) => {
  try {
    const contracts = await RentalContract.findAll({
      where: { room_id: req.params.roomId },
      include: [Tenant],
      order: [['start_date', 'DESC']],
    });
    res.json(contracts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getByTenant = async (req, res) => {
  try {
    const contracts = await RentalContract.findAll({
      where: { tenant_id: req.params.tenantId },
      include: [{ model: Room, include: [RoomType] }],
      order: [['start_date', 'DESC']],
    });
    res.json(contracts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getActive = async (req, res) => {
  try {
    const contracts = await RentalContract.findAll({
      where: {
        status: { [Op.in]: ['booking', 'sewa'] },
      },
      include: [
        { model: Room, include: [RoomType] },
        { model: Tenant },
      ],
    });
    res.json(contracts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getBookings = async (req, res) => {
  try {
    const contracts = await RentalContract.findAll({
      where: { status: 'booking' },
      include: [
        { model: Room, include: [RoomType] },
        { model: Tenant },
      ],
    });
    res.json(contracts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};