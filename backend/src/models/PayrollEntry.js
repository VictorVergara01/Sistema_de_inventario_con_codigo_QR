const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PayrollEntry = sequelize.define(
    'PayrollEntry',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      baseSalary: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      bonuses: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      deductions: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      grossSalary: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      netSalary: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      notes: { type: DataTypes.TEXT, allowNull: true }
    },
    {
      tableName: 'payroll_entries',
      underscored: true,
      indexes: [{ fields: ['payroll_run_id'] }, { fields: ['employee_id'] }]
    }
  );

  return PayrollEntry;
};
