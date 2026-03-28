const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Product = sequelize.define(
    'Product',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(160), allowNull: false },
      sku: { type: DataTypes.STRING(120), allowNull: false, unique: true },
      costPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      salePrice: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      stockCurrent: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      stockMin: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      warehouseLocation: { type: DataTypes.STRING(160), allowNull: true },
      qrCodeValue: { type: DataTypes.STRING(255), allowNull: false, unique: true },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
    },
    {
      tableName: 'products',
      underscored: true,
      indexes: [
        { unique: true, fields: ['sku'] },
        { unique: true, fields: ['qr_code_value'] },
        { fields: ['stock_current', 'stock_min'] }
      ]
    }
  );

  return Product;
};
