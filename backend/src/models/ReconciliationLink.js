const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ReconciliationLink = sequelize.define('ReconciliationLink', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  bank_mutation_id: { type: DataTypes.INTEGER, allowNull: false },
  target_type: { type: DataTypes.ENUM('nota', 'deposit_return'), allowNull: false },
  target_id: { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: 'reconciliation_links', timestamps: true, underscored: true, updatedAt: false });

module.exports = ReconciliationLink;