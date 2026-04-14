const { body, param, query } = require('express-validator');
const { Op } = require('sequelize');
const { Employee, Department, User } = require('../models');

const includeRelations = [
  { model: Department, attributes: ['id', 'name'] },
  { model: User, as: 'SystemUser', attributes: ['id', 'name', 'email', 'role'], required: false }
];

const employeeValidators = [
  body('firstName').isString().isLength({ min: 2, max: 100 }),
  body('lastName').isString().isLength({ min: 2, max: 100 }),
  body('dni').isString().isLength({ min: 3, max: 30 }),
  body('position').isString().isLength({ min: 2, max: 120 }),
  body('departmentId').isInt({ min: 1 }),
  body('salaryType').isIn(['monthly', 'hourly']),
  body('baseSalary').isFloat({ min: 0 }),
  body('hireDate').optional({ nullable: true }).isDate(),
  body('status').optional().isIn(['active', 'inactive', 'on_leave']),
  body('email').optional({ nullable: true }).isEmail(),
  body('phone').optional({ nullable: true }).isString(),
  body('address').optional({ nullable: true }).isString(),
  body('userId').optional({ nullable: true }).isInt({ min: 1 })
];

const listValidators = [
  query('departmentId').optional().isInt({ min: 1 }),
  query('status').optional().isIn(['active', 'inactive', 'on_leave']),
  query('search').optional().isString()
];

const idValidator = [param('id').isInt({ min: 1 })];

const listEmployees = async (req, res) => {
  const { departmentId, status, search } = req.query;
  const where = { active: true };

  if (departmentId) where.departmentId = Number(departmentId);
  if (status) where.status = status;
  if (search) {
    where[Op.or] = [
      { firstName: { [Op.like]: `%${search}%` } },
      { lastName: { [Op.like]: `%${search}%` } },
      { dni: { [Op.like]: `%${search}%` } },
      { position: { [Op.like]: `%${search}%` } }
    ];
  }

  const employees = await Employee.findAll({
    where,
    include: includeRelations,
    order: [['lastName', 'ASC'], ['firstName', 'ASC']]
  });
  return res.json(employees);
};

const getEmployeeById = async (req, res) => {
  const employee = await Employee.findByPk(req.params.id, { include: includeRelations });
  if (!employee || !employee.active) {
    return res.status(404).json({ message: 'Empleado no encontrado.' });
  }
  return res.json(employee);
};

const createEmployee = async (req, res) => {
  try {
    const employee = await Employee.create({
      firstName: String(req.body.firstName).trim(),
      lastName: String(req.body.lastName).trim(),
      dni: String(req.body.dni).trim(),
      email: req.body.email || null,
      phone: req.body.phone || null,
      position: String(req.body.position).trim(),
      departmentId: Number(req.body.departmentId),
      salaryType: req.body.salaryType || 'monthly',
      baseSalary: Number(req.body.baseSalary),
      hireDate: req.body.hireDate || null,
      status: req.body.status || 'active',
      address: req.body.address || null,
      userId: req.body.userId ? Number(req.body.userId) : null
    });
    const full = await Employee.findByPk(employee.id, { include: includeRelations });
    return res.status(201).json(full);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'Ya existe un empleado con ese DNI.' });
    }
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({ message: 'Departamento o usuario inválido.' });
    }
    return res.status(400).json({ message: 'No se pudo crear el empleado.', detail: error.message });
  }
};

const updateEmployee = async (req, res) => {
  const employee = await Employee.findByPk(req.params.id);
  if (!employee || !employee.active) {
    return res.status(404).json({ message: 'Empleado no encontrado.' });
  }
  try {
    await employee.update({
      firstName: req.body.firstName ? String(req.body.firstName).trim() : employee.firstName,
      lastName: req.body.lastName ? String(req.body.lastName).trim() : employee.lastName,
      dni: req.body.dni ? String(req.body.dni).trim() : employee.dni,
      email: req.body.email !== undefined ? req.body.email : employee.email,
      phone: req.body.phone !== undefined ? req.body.phone : employee.phone,
      position: req.body.position ? String(req.body.position).trim() : employee.position,
      departmentId: req.body.departmentId ? Number(req.body.departmentId) : employee.departmentId,
      salaryType: req.body.salaryType || employee.salaryType,
      baseSalary: req.body.baseSalary !== undefined ? Number(req.body.baseSalary) : employee.baseSalary,
      hireDate: req.body.hireDate !== undefined ? req.body.hireDate : employee.hireDate,
      status: req.body.status || employee.status,
      address: req.body.address !== undefined ? req.body.address : employee.address,
      userId: req.body.userId !== undefined ? (req.body.userId ? Number(req.body.userId) : null) : employee.userId
    });
    const full = await Employee.findByPk(employee.id, { include: includeRelations });
    return res.json(full);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'Ya existe un empleado con ese DNI.' });
    }
    return res.status(400).json({ message: 'No se pudo actualizar el empleado.', detail: error.message });
  }
};

const deleteEmployee = async (req, res) => {
  const employee = await Employee.findByPk(req.params.id);
  if (!employee || !employee.active) {
    return res.status(404).json({ message: 'Empleado no encontrado.' });
  }
  employee.active = false;
  await employee.save();
  return res.status(204).send();
};

module.exports = {
  employeeValidators,
  listValidators,
  idValidator,
  listEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee
};
