const express = require('express');
const {
  employeeValidators,
  listValidators,
  idValidator,
  listEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee
} = require('../controllers/employees.controller');
const { validateRequest } = require('../middlewares/validation.middleware');
const { authRequired, authorizeRoles } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/', authRequired, authorizeRoles('admin', 'hr_admin'), listValidators, validateRequest, listEmployees);
router.get('/:id', authRequired, authorizeRoles('admin', 'hr_admin'), idValidator, validateRequest, getEmployeeById);
router.post('/', authRequired, authorizeRoles('admin', 'hr_admin'), employeeValidators, validateRequest, createEmployee);
router.put('/:id', authRequired, authorizeRoles('admin', 'hr_admin'), [...idValidator, ...employeeValidators], validateRequest, updateEmployee);
router.delete('/:id', authRequired, authorizeRoles('admin'), idValidator, validateRequest, deleteEmployee);

module.exports = router;
