const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define(
    'User',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(120), allowNull: false },
      email: { type: DataTypes.STRING(160), allowNull: false, unique: true },
      passwordHash: { type: DataTypes.STRING(255), allowNull: false },
      role: {
        type: DataTypes.ENUM('admin', 'bodeguero', 'auditor', 'hr_admin'),
        allowNull: false,
        defaultValue: 'bodeguero'
      },
      active: { type: DataTypes.BOOLEAN, defaultValue: true }
    },
    {
      tableName: 'users',
      underscored: true,
      indexes: [{ unique: true, fields: ['email'] }]
    }
  );

  return User;
};
