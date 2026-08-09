const { Room, RoomType, RentalContract, Tenant } = require('../models');
const { Op } = require('sequelize');

exports.getAll = async (req, res) => {
  try {
    const { floor, status, room_type_id } = req.query;
    const where = {};
    if (floor) where.floor = floor;
    if (status) where.status = status;
    if (room_type_id) where.room_type_id = room_type_id;

    const rooms = await Room.findAll({ where, include: [RoomType], order: [['room_number', 'ASC']] });
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const room = await Room.findByPk(req.params.id, { include: [RoomType] });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const room = await Room.create(req.body);
    res.status(201).json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const room = await Room.findByPk(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    await room.update(req.body);
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const room = await Room.findByPk(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    await room.destroy();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.stats = async (req, res) => {
  try {
    const total = await Room.count();
    const available = await Room.count({ where: { status: 'available' } });
    const occupied = await Room.count({ where: { status: 'occupied' } });
    const booking = await Room.count({ where: { status: 'booking' } });
    const maintenance = await Room.count({ where: { status: 'maintenance' } });
    res.json({ total, available, occupied, booking, maintenance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.occupancy = async (req, res) => {
  try {
    const month = parseInt(req.params.month);
    const year = parseInt(req.params.year);
    const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const lastDayStr = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

    const occupiedRooms = await RentalContract.findAll({
      where: {
        status: { [Op.ne]: 'keluar' },
        start_date: { [Op.lte]: lastDayStr },
        [Op.or]: [
          { end_date: null },
          { end_date: { [Op.gte]: firstDay } },
        ],
      },
      attributes: ['room_id'],
      group: ['room_id'],
    });

    const occupiedIds = occupiedRooms.map(r => r.room_id);
    const allRooms = await Room.count();
    const occupied = occupiedIds.length;
    res.json({ month, year, total: allRooms, occupied, available: allRooms - occupied });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};