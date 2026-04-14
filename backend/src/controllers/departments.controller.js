const { body, param } = require('express-validator');
const { Department } = require('../models');

const departmentValidators = [
  body('name').isString().isLength({ min: 2, max: 120 }),
  body('description').optional().isString()
];

const idValidator = [param('id').isInt({ min: 1 })];

const listDepartments = async (_req, res) => {
  const departments = await Department.findAll({
    where: { active: true },
    order: [['name', 'ASC']]
  });
  return res.json(departments);
};

const createDepartment = async (req, res) => {
  try {
    const department = await Department.create({
      name: String(req.body.name).trim(),
      description: req.body.description || null
    });
    return res.status(201).json(department);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'Ya existe un departamento con ese nombre.' });
    }
    return res.status(400).json({ message: 'No se pudo crear el departamento.', detail: error.message });
  }
};

const updateDepartment = async (req, res) => {
  const department = await Department.findByPk(req.params.id);
  if (!department || !department.active) {
    return res.status(404).json({ message: 'Departamento no encontrado.' });
  }
  try {
    await department.update({
      name: req.body.name ? String(req.body.name).trim() : department.name,
      description: req.body.description !== undefined ? req.body.description : department.description
    });
    return res.json(department);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'Ya existe un departamento con ese nombre.' });
    }
    return res.status(400).json({ message: 'No se pudo actualizar el departamento.', detail: error.message });
  }
};

const deleteDepartment = async (req, res) => {
  const department = await Department.findByPk(req.params.id);
  if (!department || !department.active) {
    return res.status(404).json({ message: 'Departamento no encontrado.' });
  }
  department.active = false;
  await department.save();
  return res.status(204).send();
};

module.exports = {
  departmentValidators,
  idValidator,
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment
};
