const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PaymentReceiptItem = sequelize.define('PaymentReceiptItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  payment_receipt_id: { type: DataTypes.INTEGER, allowNull: false },
  item_type: { type: DataTypes.ENUM('monthly_billing', 'non_monthly_income'), allowNull: false },
  monthly_billing_id: { type: DataTypes.INTEGER },
  non_monthly_income_id: { type: DataTypes.INTEGER },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
}, { tableName: 'payment_receipt_items', timestamps: false });

module.exports = PaymentReceiptItem;