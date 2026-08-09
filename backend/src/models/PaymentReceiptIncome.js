const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PaymentReceiptIncome = sequelize.define('PaymentReceiptIncome', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  payment_receipt_id: { type: DataTypes.INTEGER, allowNull: false },
  non_monthly_income_id: { type: DataTypes.INTEGER, allowNull: false },
  amount_paid: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
}, { tableName: 'payment_receipt_incomes', timestamps: false });

module.exports = PaymentReceiptIncome;