const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PricingScheme = sequelize.define('PricingScheme', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
}, { tableName: 'pricing_schemes', timestamps: true, underscored: true, updatedAt: false });

module.exports = PricingScheme;