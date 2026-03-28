const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StockAlert = sequelize.define(
    'StockAlert',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      stockCurrent: { type: DataTypes.INTEGER, allowNull: false },
      stockMin: { type: DataTypes.INTEGER, allowNull: false },
      status: { type: DataTypes.ENUM('open', 'closed'), allowNull: false, defaultValue: 'open' },
      closedAt: { type: DataTypes.DATE, allowNull: true }
    },
    {
      tableName: 'stock_alerts',
      underscored: true,
      indexes: [{ fields: ['product_id', 'status'] }]
    }
  );

  return StockAlert;
};
