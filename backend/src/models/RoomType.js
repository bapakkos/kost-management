const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RoomType = sequelize.define('RoomType', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  category: { type: DataTypes.ENUM('superior', 'suite'), allowNull: false },
  view_type: { type: DataTypes.ENUM('view', 'non_view'), allowNull: false },
  ac_type: { type: DataTypes.ENUM('ac', 'non_ac'), allowNull: false },
  name: { type: DataTypes.STRING(100) },
  description: { type: DataTypes.TEXT },
}, { tableName: 'room_types', timestamps: true, underscored: true, createdAt: 'created_at', updatedAt: false });

module.exports = RoomType;