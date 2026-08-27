const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PricingSchemeRate = sequelize.define('PricingSchemeRate', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  pricing_scheme_id: { type: DataTypes.INTEGER, allowNull: false },
  room_type_id: { type: DataTypes.INTEGER, allowNull: false },
  monthly_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
}, {
  tableName: 'pricing_scheme_rates',
  timestamps: false,
  indexes: [{ unique: true, fields: ['pricing_scheme_id', 'room_type_id'] }],
});

module.exports = PricingSchemeRate;