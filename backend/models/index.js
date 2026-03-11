const { DataTypes } = require('sequelize');
const sequelize     = require('../config/database');

const User = sequelize.define('User', {
  id:        { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  username:  { type: DataTypes.STRING(50),  unique: true, allowNull: false },
  email:     { type: DataTypes.STRING(100), unique: true, allowNull: false },
  password:  { type: DataTypes.STRING(255), allowNull: false },
  role:      { type: DataTypes.ENUM('admin','user'), defaultValue: 'user' },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'users', timestamps: true,
  createdAt: 'created_at', updatedAt: 'updated_at',
});

const ScanSession = sequelize.define('ScanSession', {
  id:           { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id:      { type: DataTypes.INTEGER, allowNull: false },
  started_at:   { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  ended_at:     { type: DataTypes.DATE, allowNull: true },
  duration_sec: { type: DataTypes.INTEGER, defaultValue: 0 },
  scan_type:    { type: DataTypes.ENUM('realtime','manual','usb','network'), defaultValue: 'realtime' },
  status:       { type: DataTypes.ENUM('running','completed','stopped'), defaultValue: 'running' },
}, { tableName: 'scan_sessions', timestamps: false });

const Threat = sequelize.define('Threat', {
  id:           { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id:      { type: DataTypes.INTEGER, allowNull: false },
  session_id:   { type: DataTypes.INTEGER, allowNull: true },
  filename:     { type: DataTypes.STRING(255) },
  filepath:     { type: DataTypes.STRING(500) },
  threat_name:  { type: DataTypes.STRING(200) },
  threat_type:  { type: DataTypes.ENUM('virus','malware','ransomware','trojan','spyware','adware','unknown'), defaultValue: 'unknown' },
  severity:     { type: DataTypes.ENUM('low','medium','high','critical'), defaultValue: 'medium' },
  ai_score:     { type: DataTypes.DECIMAL(5,4) },
  action_taken: { type: DataTypes.ENUM('quarantined','deleted','allowed','pending'), defaultValue: 'pending' },
  is_blocked:   { type: DataTypes.BOOLEAN, defaultValue: false },
  source:       { type: DataTypes.ENUM('network','disk','usb','email','download'), defaultValue: 'disk' },
  detected_at:  { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'threats', timestamps: false });

User.hasMany(ScanSession, { foreignKey: 'user_id', onDelete: 'CASCADE' });
User.hasMany(Threat,      { foreignKey: 'user_id', onDelete: 'CASCADE' });
ScanSession.belongsTo(User,   { foreignKey: 'user_id' });
Threat.belongsTo(User,        { foreignKey: 'user_id' });
Threat.belongsTo(ScanSession, { foreignKey: 'session_id' });

module.exports = { sequelize, User, ScanSession, Threat };