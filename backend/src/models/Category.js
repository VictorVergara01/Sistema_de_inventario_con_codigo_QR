const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Category = sequelize.define(
    'Category',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(120), allowNull: false, unique: true },
      description: { type: DataTypes.STRING(255), allowNull: true }
    },
    {
      tableName: 'categories',
      underscored: true
    }
  );

  return Category;
};
