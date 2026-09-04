const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Booking = sequelize.define('Booking', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 1000000 },
  status: { type: DataTypes.ENUM('pending', 'received', 'converted', 'refunded'), defaultValue: 'pending' },
  non_monthly_income_id: { type: DataTypes.INTEGER },
  contract_id: { type: DataTypes.INTEGER },
  notes: { type: DataTypes.TEXT },
}, { tableName: 'bookings', timestamps: true, underscored: true });

module.exports = Booking;
