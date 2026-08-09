const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BankMutation = sequelize.define('BankMutation', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  description: { type: DataTypes.TEXT },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  type: { type: DataTypes.ENUM('debit', 'credit'), allowNull: false, defaultValue: 'credit' },
  balance: { type: DataTypes.DECIMAL(10, 2) },
  source_account: { type: DataTypes.STRING(100) },
  tenant_id: { type: DataTypes.INTEGER },
  payment_receipt_id: { type: DataTypes.INTEGER },
  is_reconciled: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'bank_mutations', timestamps: true, underscored: true, updatedAt: false });

module.exports = BankMutation;