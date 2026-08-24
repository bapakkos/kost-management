const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SenderRegistry = sequelize.define('SenderRegistry', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  sender_name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  tenant_id: { type: DataTypes.INTEGER },
  label: { type: DataTypes.STRING(100) },
}, { tableName: 'sender_registry', timestamps: true, underscored: true });

module.exports = SenderRegistry;