const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PaymentReceipt = sequelize.define('PaymentReceipt', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  receipt_no: { type: DataTypes.STRING(30), allowNull: false },
  payment_date: { type: DataTypes.DATEONLY, allowNull: false },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  room_id: { type: DataTypes.INTEGER },
  total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  discount_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  selisih_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  notes: { type: DataTypes.TEXT },
  created_by: { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: 'payment_receipts', timestamps: true, underscored: true, updatedAt: false });

module.exports = PaymentReceipt;