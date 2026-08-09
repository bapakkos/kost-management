const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Room = sequelize.define('Room', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  room_number: { type: DataTypes.STRING(10), allowNull: false, unique: true },
  room_type_id: { type: DataTypes.INTEGER, allowNull: false },
  floor: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.ENUM('available', 'occupied', 'booking', 'maintenance'), defaultValue: 'available' },
}, { tableName: 'rooms', timestamps: true, underscored: true });

module.exports = Room;