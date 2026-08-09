const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PaymentReceipt = sequelize.define('PaymentReceipt', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  payment_date: { type: DataTypes.DATEONLY, allowNull: false },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  room_id: { type: DataTypes.INTEGER, allowNull: false },
  rental_contract_id: { type: DataTypes.INTEGER },
  deposit_amount: { type: DataTypes.DECIMAL(10, 2) },
  total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  payment_method: { type: DataTypes.ENUM('transfer_bca', 'transfer_bni', 'transfer_bri', 'transfer_mandiri', 'gopay', 'ovo', 'dana', 'cash') },
  bank_account_id: { type: DataTypes.INTEGER },
  notes: { type: DataTypes.TEXT },
  created_by: { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: 'payment_receipts', timestamps: true, underscored: true, updatedAt: false });

module.exports = PaymentReceipt;