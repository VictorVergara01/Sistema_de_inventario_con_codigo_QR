const { body, param, query } = require('express-validator');
const { Op } = require('sequelize');
const { Attendance, Employee, Department } = require('../models');

const employeeInclude = [
  {
    model: Employee,
    attributes: ['id', 'firstName', 'lastName', 'dni', 'position'],
    include: [{ model: Department, attributes: ['id', 'name'] }]
  }
];

const attendanceValidators = [
  body('employeeId').isInt({ min: 1 }),
  body('date').isDate(),
  body('status').isIn(['present', 'absent', 'late', 'leave', 'holiday']),
  body('checkIn').optional({ nullable: true }).matches(/^\d{2}:\d{2}(:\d{2})?$/),
  body('checkOut').optional({ nullable: true }).matches(/^\d{2}:\d{2}(:\d{2})?$/),
  body('hoursWorked').optional({ nullable: true }).isFloat({ min: 0, max: 24 }),
  body('notes').optional({ nullable: true }).isString()
];

const listValidators = [
  query('employeeId').optional().isInt({ min: 1 }),
  query('dateFrom').optional().isDate(),
  query('dateTo').optional().isDate()
];

const idValidator = [param('id').isInt({ min: 1 })];

const listAttendance = async (req, res) => {
  const { employeeId, dateFrom, dateTo } = req.query;
  const where = {};

  if (employeeId) where.employeeId = Number(employeeId);
  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) where.date[Op.gte] = dateFrom;
    if (dateTo) where.date[Op.lte] = dateTo;
  }

  const records = await Attendance.findAll({
    where,
    include: employeeInclude,
    order: [['date', 'DESC'], ['employeeId', 'ASC']]
  });
  return res.json(records);
};

const registerAttendance = async (req, res) => {
  const { employeeId, date, status, checkIn, checkOut, hoursWorked, notes } = req.body;

  const employee = await Employee.findByPk(Number(employeeId));
  if (!employee || !employee.active) {
    return res.status(404).json({ message: 'Empleado no encontrado.' });
  }

  const existing = await Attendance.findOne({ where: { employeeId: Number(employeeId), date } });
  if (existing) {
    return res.status(409).json({ message: 'Ya existe un registro de asistencia para ese empleado en esa fecha.' });
  }

  const record = await Attendance.create({
    employeeId: Number(employeeId),
    date,
    status,
    checkIn: checkIn || null,
    checkOut: checkOut || null,
    hoursWorked: hoursWorked !== undefined ? Number(hoursWorked) : null,
    notes: notes || null
  });

  const full = await Attendance.findByPk(record.id, { include: employeeInclude });
  return res.status(201).json(full);
};

const updateAttendance = async (req, res) => {
  const record = await Attendance.findByPk(req.params.id);
  if (!record) return res.status(404).json({ message: 'Registro de asistencia no encontrado.' });

  await record.update({
    status: req.body.status || record.status,
    checkIn: req.body.checkIn !== undefined ? req.body.checkIn : record.checkIn,
    checkOut: req.body.checkOut !== undefined ? req.body.checkOut : record.checkOut,
    hoursWorked: req.body.hoursWorked !== undefined ? Number(req.body.hoursWorked) : record.hoursWorked,
    notes: req.body.notes !== undefined ? req.body.notes : record.notes
  });

  const full = await Attendance.findByPk(record.id, { include: employeeInclude });
  return res.json(full);
};

const deleteAttendance = async (req, res) => {
  const record = await Attendance.findByPk(req.params.id);
  if (!record) return res.status(404).json({ message: 'Registro de asistencia no encontrado.' });
  await record.destroy();
  return res.status(204).send();
};

module.exports = {
  attendanceValidators,
  listValidators,
  idValidator,
  listAttendance,
  registerAttendance,
  updateAttendance,
  deleteAttendance
};
