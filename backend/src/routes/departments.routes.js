const express = require('express');
const {
  departmentValidators,
  idValidator,
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment
} = require('../controllers/departments.controller');
const { validateRequest } = require('../middlewares/validation.middleware');
const { authRequired, authorizeRoles } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/', authRequired, listDepartments);
router.post('/', authRequired, authorizeRoles('admin', 'hr_admin'), departmentValidators, validateRequest, createDepartment);
router.put('/:id', authRequired, authorizeRoles('admin', 'hr_admin'), [...idValidator, ...departmentValidators], validateRequest, updateDepartment);
router.delete('/:id', authRequired, authorizeRoles('admin'), idValidator, validateRequest, deleteDepartment);

module.exports = router;
