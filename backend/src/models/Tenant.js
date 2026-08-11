const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Tenant = sequelize.define('Tenant', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(255) },
  nama_panggilan: { type: DataTypes.STRING(100), allowNull: false },
  phone: { type: DataTypes.STRING(20), allowNull: false },
  email: { type: DataTypes.STRING(255) },
  id_card_number: { type: DataTypes.STRING(50) },
  emergency_contact: { type: DataTypes.STRING(255) },
  address: { type: DataTypes.TEXT },
  notes: { type: DataTypes.TEXT },
}, { tableName: 'tenants', timestamps: true, underscored: true });

module.exports = Tenant;