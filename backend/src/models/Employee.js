const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Employee = sequelize.define(
    'Employee',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      firstName: { type: DataTypes.STRING(100), allowNull: false },
      lastName: { type: DataTypes.STRING(100), allowNull: false },
      dni: { type: DataTypes.STRING(30), allowNull: false, unique: true },
      email: { type: DataTypes.STRING(160), allowNull: true },
      phone: { type: DataTypes.STRING(30), allowNull: true },
      position: { type: DataTypes.STRING(120), allowNull: false },
      salaryType: {
        type: DataTypes.ENUM('monthly', 'hourly'),
        allowNull: false,
        defaultValue: 'monthly'
      },
      baseSalary: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      hireDate: { type: DataTypes.DATEONLY, allowNull: true },
      status: {
        type: DataTypes.ENUM('active', 'inactive', 'on_leave'),
        allowNull: false,
        defaultValue: 'active'
      },
      address: { type: DataTypes.TEXT, allowNull: true },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
    },
    {
      tableName: 'employees',
      underscored: true,
      indexes: [
        { unique: true, fields: ['dni'] },
        { fields: ['status'] },
        { fields: ['department_id'] }
      ]
    }
  );

  return Employee;
};
