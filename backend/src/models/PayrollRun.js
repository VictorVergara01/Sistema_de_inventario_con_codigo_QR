const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PayrollRun = sequelize.define(
    'PayrollRun',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      period: { type: DataTypes.STRING(7), allowNull: false, comment: 'Formato YYYY-MM' },
      status: {
        type: DataTypes.ENUM('draft', 'processed', 'paid'),
        allowNull: false,
        defaultValue: 'draft'
      },
      totalGross: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      totalDeductions: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      totalNet: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      notes: { type: DataTypes.TEXT, allowNull: true },
      processedAt: { type: DataTypes.DATE, allowNull: true }
    },
    {
      tableName: 'payroll_runs',
      underscored: true,
      indexes: [{ fields: ['period'] }, { fields: ['status'] }]
    }
  );

  return PayrollRun;
};
