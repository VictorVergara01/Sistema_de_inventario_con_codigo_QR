const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Supplier = sequelize.define(
    'Supplier',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(140), allowNull: false },
      contact: { type: DataTypes.STRING(140), allowNull: true },
      phone: { type: DataTypes.STRING(40), allowNull: true },
      email: { type: DataTypes.STRING(140), allowNull: true }
    },
    {
      tableName: 'suppliers',
      underscored: true
    }
  );

  return Supplier;
};
