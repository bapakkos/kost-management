const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const NonMonthlyIncome = sequelize.define('NonMonthlyIncome', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  room_id: { type: DataTypes.INTEGER },
  category: { type: DataTypes.ENUM('listrik', 'air', 'parkir', 'tv', 'internet', 'lainnya'), allowNull: false },
  description: { type: DataTypes.STRING(255) },
  unit_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  quantity: { type: DataTypes.INTEGER, allowNull: false },
  total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  transaction_date: { type: DataTypes.DATEONLY, allowNull: false },
  notes: { type: DataTypes.TEXT },
}, { tableName: 'non_monthly_incomes', timestamps: true, underscored: true, updatedAt: false });

module.exports = NonMonthlyIncome;