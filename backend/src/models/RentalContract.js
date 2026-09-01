const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RentalContract = sequelize.define('RentalContract', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  room_id: { type: DataTypes.INTEGER, allowNull: false },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  pricing_scheme_id: { type: DataTypes.INTEGER, allowNull: false },
  start_date: { type: DataTypes.DATEONLY, allowNull: false },
  end_date: { type: DataTypes.DATEONLY },
  deposit_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 1000000 },
  deposit_status: { type: DataTypes.ENUM('active', 'forfeited', 'returned'), defaultValue: 'active' },
  status: { type: DataTypes.ENUM('booking', 'sewa', 'keluar') },
  prorate_pending: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'rental_contracts', timestamps: true, underscored: true });

module.exports = RentalContract;