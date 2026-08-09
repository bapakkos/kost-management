const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TenantBankAccount = sequelize.define('TenantBankAccount', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  account_holder_name: { type: DataTypes.STRING(255), allowNull: false },
  bank_name: { type: DataTypes.STRING(100) },
}, { tableName: 'tenant_bank_accounts', timestamps: true, underscored: true, updatedAt: false });

module.exports = TenantBankAccount;