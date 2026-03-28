const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Location = sequelize.define(
    'Location',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      code: { type: DataTypes.STRING(60), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(140), allowNull: false },
      description: { type: DataTypes.STRING(255), allowNull: true }
    },
    {
      tableName: 'locations',
      underscored: true
    }
  );

  return Location;
};
