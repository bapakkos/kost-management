const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PaymentReceiptBilling = sequelize.define('PaymentReceiptBilling', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  payment_receipt_id: { type: DataTypes.INTEGER, allowNull: false },
  monthly_billing_id: { type: DataTypes.INTEGER, allowNull: false },
  amount_paid: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  discount_applied: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
}, { tableName: 'payment_receipt_billings', timestamps: false });

module.exports = PaymentReceiptBilling;