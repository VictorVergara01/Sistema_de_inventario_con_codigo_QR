const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Department = sequelize.define(
    'Department',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(120), allowNull: false, unique: true },
      description: { type: DataTypes.TEXT, allowNull: true },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
    },
    {
      tableName: 'departments',
      underscored: true,
      indexes: [{ unique: true, fields: ['name'] }]
    }
  );

  return Department;
};
