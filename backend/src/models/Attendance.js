const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Attendance = sequelize.define(
    'Attendance',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      date: { type: DataTypes.DATEONLY, allowNull: false },
      checkIn: { type: DataTypes.TIME, allowNull: true },
      checkOut: { type: DataTypes.TIME, allowNull: true },
      hoursWorked: { type: DataTypes.DECIMAL(4, 2), allowNull: true },
      status: {
        type: DataTypes.ENUM('present', 'absent', 'late', 'leave', 'holiday'),
        allowNull: false,
        defaultValue: 'present'
      },
      notes: { type: DataTypes.STRING(255), allowNull: true }
    },
    {
      tableName: 'attendance',
      underscored: true,
      indexes: [
        { unique: true, fields: ['employee_id', 'date'] },
        { fields: ['date'] },
        { fields: ['status'] }
      ]
    }
  );

  return Attendance;
};
