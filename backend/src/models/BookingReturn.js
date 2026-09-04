const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BookingReturn = sequelize.define('BookingReturn', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  booking_id: { type: DataTypes.INTEGER, allowNull: false },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  return_date: { type: DataTypes.DATEONLY, allowNull: false },
  notes: { type: DataTypes.TEXT },
  created_by: { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: 'booking_returns', timestamps: true, underscored: true, updatedAt: false });

module.exports = BookingReturn;
