const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const InventoryMovement = sequelize.define(
    'InventoryMovement',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      type: {
        type: DataTypes.ENUM('entry', 'exit', 'transfer', 'adjustment'),
        allowNull: false
      },
      quantity: { type: DataTypes.INTEGER, allowNull: false },
      adjustmentSign: {
        type: DataTypes.ENUM('positive', 'negative'),
        allowNull: true
      },
      reason: { type: DataTypes.STRING(255), allowNull: true },
      fromLocationText: { type: DataTypes.STRING(160), allowNull: true },
      toLocationText: { type: DataTypes.STRING(160), allowNull: true },
      stockBefore: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      stockAfter: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
    },
    {
      tableName: 'inventory_movements',
      underscored: true,
      indexes: [{ fields: ['product_id', 'created_at'] }, { fields: ['type', 'created_at'] }]
    }
  );

  return InventoryMovement;
};
