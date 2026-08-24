const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MonthlyBilling = sequelize.define('MonthlyBilling', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  rental_contract_id: { type: DataTypes.INTEGER, allowNull: false },
  period_month: { type: DataTypes.INTEGER, allowNull: false },
  period_year: { type: DataTypes.INTEGER, allowNull: false },
  base_rent: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  addon_parkir: { type: DataTypes.DECIMAL(10, 2), defaultValue: 300000 },
  addon_tv: { type: DataTypes.DECIMAL(10, 2), defaultValue: 200000 },
  addon_internet: { type: DataTypes.DECIMAL(10, 2), defaultValue: 50000 },
  discount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  due_date: { type: DataTypes.DATEONLY, allowNull: false },
  total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  is_prorate: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_paid: { type: DataTypes.BOOLEAN, defaultValue: false },
  paid_date: { type: DataTypes.DATEONLY },
  paid_amount: { type: DataTypes.DECIMAL(10, 2) },
  notes: { type: DataTypes.TEXT },
}, { tableName: 'monthly_billings', timestamps: true, underscored: true });

module.exports = MonthlyBilling;