const sequelize = require('../config/database');
const {
  Booking, BookingReturn, NonMonthlyIncome, RentalContract, Room, RoomType, Tenant,
  BankMutation, ReconciliationLink,
} = require('../models');
const { buildBookingRefundKeterangan } = require('../utils/keteranganAuto');

exports.getAll = async (req, res) => {
  try {
    const bookings = await Booking.findAll({
      include: [
        { model: Tenant },
        { model: NonMonthlyIncome },
        { model: RentalContract, include: [{ model: Room }] },
      ],
      order: [['created_at', 'DESC']],
    });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id, {
      include: [
        { model: Tenant },
        { model: NonMonthlyIncome },
        { model: RentalContract, include: [{ model: Room }] },
      ],
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { tenant_id, amount, notes } = req.body;
    if (!tenant_id) {
      await t.rollback();
      return res.status(400).json({ error: 'tenant_id is required' });
    }
    const tenant = await Tenant.findByPk(tenant_id, { transaction: t });
    if (!tenant) {
      await t.rollback();
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const bookingAmount = parseFloat(amount) || 1000000;

    const booking = await Booking.create({
      tenant_id,
      amount: bookingAmount,
      status: 'pending',
      notes: notes || null,
    }, { transaction: t });

    const income = await NonMonthlyIncome.create({
      tenant_id,
      category: 'booking',
      description: `Booking kontrak (booking #${booking.id})`,
      unit_price: bookingAmount,
      quantity: 1,
      total_amount: bookingAmount,
      transaction_date: new Date().toISOString().slice(0, 10),
      is_paid: false,
      is_revenue: false,
      notes: notes || null,
    }, { transaction: t });

    await booking.update({ non_monthly_income_id: income.id }, { transaction: t });

    await t.commit();
    const full = await Booking.findByPk(booking.id, {
      include: [{ model: Tenant }, { model: NonMonthlyIncome }],
    });
    res.status(201).json(full);
  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: err.message });
  }
};

exports.convert = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const booking = await Booking.findByPk(req.params.id, { transaction: t });
    if (!booking) {
      await t.rollback();
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (booking.status !== 'pending' && booking.status !== 'received') {
      await t.rollback();
      return res.status(400).json({ error: `Booking dengan status ${booking.status} tidak bisa dikonversi` });
    }

    const { room_id, pricing_scheme_id, start_date, end_date } = req.body;
    if (!room_id || !pricing_scheme_id || !start_date) {
      await t.rollback();
      return res.status(400).json({ error: 'room_id, pricing_scheme_id, and start_date are required' });
    }

    const room = await Room.findByPk(room_id, { transaction: t });
    if (!room) {
      await t.rollback();
      return res.status(404).json({ error: 'Room not found' });
    }
    if (room.status === 'occupied') {
      await t.rollback();
      return res.status(400).json({ error: 'Room already occupied' });
    }

    const income = booking.non_monthly_income_id
      ? await NonMonthlyIncome.findByPk(booking.non_monthly_income_id, { transaction: t })
      : null;

    const contract = await RentalContract.create({
      room_id,
      tenant_id: booking.tenant_id,
      pricing_scheme_id,
      start_date,
      end_date: end_date || null,
      deposit_amount: parseFloat(booking.amount) || 0,
      deposit_status: income && income.is_paid ? 'paid' : 'unpaid',
      status: new Date(start_date) > new Date() ? 'booking' : 'sewa',
      prorate_pending: new Date(start_date).getDate() !== 1,
    }, { transaction: t });

    await room.update({ status: contract.status === 'booking' ? 'booking' : 'occupied' }, { transaction: t });

    if (income) {
      await income.update({
        category: 'deposit',
        rental_contract_id: contract.id,
        room_id: contract.room_id,
        description: `Deposit kontrak #${contract.id} (dari booking #${booking.id})`,
      }, { transaction: t });
    }

    await booking.update({ status: 'converted', contract_id: contract.id }, { transaction: t });

    await t.commit();
    const full = await RentalContract.findByPk(contract.id, {
      include: [{ model: Room, include: [{ model: RoomType }] }, { model: Tenant }],
    });
    res.status(201).json({ booking: await Booking.findByPk(booking.id), contract: full });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: err.message });
  }
};

exports.refund = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const booking = await Booking.findByPk(req.params.id, { transaction: t });
    if (!booking) {
      await t.rollback();
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (booking.status !== 'received') {
      await t.rollback();
      return res.status(400).json({ error: `Booking dengan status ${booking.status} tidak bisa di-refund` });
    }

    const { amount, return_date, mutation_ids, notes } = req.body;
    if (!return_date) {
      await t.rollback();
      return res.status(400).json({ error: 'return_date is required' });
    }

    const bookingReturn = await BookingReturn.create({
      booking_id: booking.id,
      amount: amount || booking.amount,
      return_date,
      notes: notes || null,
      created_by: req.user.id,
    }, { transaction: t });

    if (mutation_ids && mutation_ids.length > 0) {
      const tenant = await Tenant.findByPk(booking.tenant_id, { transaction: t });
      const keteranganAuto = buildBookingRefundKeterangan(tenant);
      for (const mid of mutation_ids) {
        const mutation = await BankMutation.findByPk(mid, { transaction: t });
        if (!mutation || mutation.is_reconciled) {
          await t.rollback();
          return res.status(400).json({ error: `Mutation #${mid} not found or already reconciled` });
        }
        await ReconciliationLink.create({
          bank_mutation_id: mid,
          target_type: 'booking_return',
          target_id: bookingReturn.id,
        }, { transaction: t });
        mutation.is_reconciled = true;
        mutation.keterangan_auto = keteranganAuto;
        await mutation.save({ transaction: t });
      }
    }

    if (booking.non_monthly_income_id) {
      const income = await NonMonthlyIncome.findByPk(booking.non_monthly_income_id, { transaction: t });
      if (income) {
        await income.update({ is_paid: false, paid_date: null }, { transaction: t });
      }
    }

    await booking.update({ status: 'refunded' }, { transaction: t });

    await t.commit();
    res.status(201).json({ bookingReturn, booking: await Booking.findByPk(booking.id) });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const booking = await Booking.findByPk(req.params.id, { transaction: t });
    if (!booking) {
      await t.rollback();
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (booking.status !== 'pending') {
      await t.rollback();
      return res.status(400).json({ error: 'Hanya booking pending yang bisa dihapus' });
    }
    if (booking.non_monthly_income_id) {
      await NonMonthlyIncome.destroy({ where: { id: booking.non_monthly_income_id }, transaction: t });
    }
    await booking.destroy({ transaction: t });
    await t.commit();
    res.json({ message: 'Deleted' });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: err.message });
  }
};
