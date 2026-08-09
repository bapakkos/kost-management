const { Op } = require('sequelize');
const {
  Room, RoomType, Tenant, RentalContract, PricingScheme, PricingSchemeRate,
  MonthlyBilling,
} = require('../models');
const { calculateBillingTotal } = require('../utils/priceCalculator');
const { calculateDueDate } = require('../utils/dueDateCalculator');

// GET /api/main-page/:month/:year
// Returns full room list with tenant, billing, and check-out info for the month
exports.getMonthView = async (req, res) => {
  try {
    const month = parseInt(req.params.month);
    const year = parseInt(req.params.year);

    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const firstDayStr = firstDay.toISOString().slice(0, 10);
    const lastDayStr = lastDay.toISOString().slice(0, 10);

    // Get all rooms
    const rooms = await Room.findAll({ include: [RoomType], order: [['room_number', 'ASC']] });

    // Get active contracts that overlap with this month
    const contracts = await RentalContract.findAll({
      where: {
        status: { [Op.ne]: 'keluar' },
        start_date: { [Op.lte]: lastDayStr },
        [Op.or]: [
          { end_date: null },
          { end_date: { [Op.gte]: firstDayStr } },
        ],
      },
      include: [
        { model: Tenant },
        { model: Room },
        { model: PricingScheme },
      ],
    });

    // Build contract lookup by room_id
    const contractByRoom = {};
    for (const c of contracts) {
      contractByRoom[c.room_id] = c;
    }

    // Get billings for this month
    const billings = await MonthlyBilling.findAll({
      where: { period_month: month, period_year: year },
      include: [{ model: RentalContract, include: [Tenant, Room] }],
    });

    const billingByContract = {};
    for (const b of billings) {
      billingByContract[b.rental_contract_id] = b;
    }

    // Build response
    const result = rooms.map(room => {
      const contract = contractByRoom[room.id] || null;
      const billing = contract ? (billingByContract[contract.id] || null) : null;

      const checkOutThisMonth = contract && contract.end_date &&
        new Date(contract.end_date).getFullYear() === year &&
        (new Date(contract.end_date).getMonth() + 1) === month;

      return {
        room_id: room.id,
        room_number: room.room_number,
        floor: room.floor,
        room_type: room.RoomType ? room.RoomType.name : null,
        room_type_id: room.room_type_id,
        status: room.status,
        tenant: contract ? (contract.Tenant ? contract.Tenant.name : null) : null,
        tenant_id: contract ? contract.tenant_id : null,
        check_in: contract ? contract.start_date : null,
        check_out: contract ? contract.end_date : null,
        check_out_this_month: checkOutThisMonth,
        contract_id: contract ? contract.id : null,
        pricing_scheme: contract ? (contract.PricingScheme ? contract.PricingScheme.name : null) : null,
        billing: billing ? {
          id: billing.id,
          base_rent: billing.base_rent,
          addon_parkir: billing.addon_parkir,
          addon_tv: billing.addon_tv,
          addon_internet: billing.addon_internet,
          discount: billing.discount,
          total_amount: billing.total_amount,
          is_paid: billing.is_paid,
          paid_date: billing.paid_date,
          is_prorate: billing.is_prorate,
        } : null,
      };
    });

    res.json({ month, year, rooms: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/main-page/bookings
exports.getBookings = async (req, res) => {
  try {
    const bookings = await RentalContract.findAll({
      where: { status: 'booking' },
      include: [
        { model: Tenant },
        { model: Room, include: [RoomType] },
      ],
      order: [['start_date', 'ASC']],
    });

    const result = bookings.map(b => ({
      contract_id: b.id,
      tenant_name: b.Tenant ? b.Tenant.name : null,
      tenant_id: b.tenant_id,
      room_type: b.Room && b.Room.RoomType ? b.Room.RoomType.name : null,
      room_number: b.Room ? b.Room.room_number : null,
      start_date: b.start_date,
      deposit_amount: b.deposit_amount,
      deposit_status: b.deposit_status,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/main-page/:month/:year/generate-billings
exports.generateBillings = async (req, res) => {
  try {
    const month = parseInt(req.params.month);
    const year = parseInt(req.params.year);

    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const firstDayStr = firstDay.toISOString().slice(0, 10);
    const lastDayStr = lastDay.toISOString().slice(0, 10);

    // Find active contracts (end_date IS NULL, or end_date >= first day of month)
    const contracts = await RentalContract.findAll({
      where: {
        status: { [Op.ne]: 'keluar' },
        start_date: { [Op.lte]: lastDayStr },
        [Op.or]: [
          { end_date: null },
          { end_date: { [Op.gte]: firstDayStr } },
        ],
      },
      include: [PricingScheme],
    });

    const created = [];
    const skipped = [];

    for (const contract of contracts) {
      // Check if billing already exists
      const existing = await MonthlyBilling.findOne({
        where: { rental_contract_id: contract.id, period_month: month, period_year: year },
      });
      if (existing) {
        skipped.push({ contract_id: contract.id, reason: 'already exists' });
        continue;
      }

      // Get monthly price from pricing scheme
      const rate = await PricingSchemeRate.findOne({
        where: {
          pricing_scheme_id: contract.pricing_scheme_id,
          room_type_id: (await Room.findByPk(contract.room_id)).room_type_id,
        },
      });

      const baseRent = rate ? parseFloat(rate.monthly_price) : 0;
      const addonParkir = 300000;
      const addonTv = 200000;
      const addonInternet = 50000;
      const discount = 0;
      const total = baseRent + addonParkir + addonTv + addonInternet - discount;

      const dueDate = calculateDueDate(contract.start_date);
      const dueDateStr = new Date(year, month - 1, dueDate.getDate()).toISOString().slice(0, 10);

      const billing = await MonthlyBilling.create({
        rental_contract_id: contract.id,
        period_month: month,
        period_year: year,
        base_rent: baseRent,
        addon_parkir: addonParkir,
        addon_tv: addonTv,
        addon_internet: addonInternet,
        discount,
        due_date: dueDateStr,
        total_amount: total,
        is_prorate: false,
        is_paid: false,
      });

      created.push(billing);
    }

    res.json({
      month,
      year,
      created: created.length,
      skipped: skipped.length,
      details: { created: created.map(b => b.id), skipped },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};