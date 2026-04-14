const express = require('express');
const {
  attendanceValidators,
  listValidators,
  idValidator,
  listAttendance,
  registerAttendance,
  updateAttendance,
  deleteAttendance
} = require('../controllers/attendance.controller');
const { validateRequest } = require('../middlewares/validation.middleware');
const { authRequired, authorizeRoles } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/', authRequired, authorizeRoles('admin', 'hr_admin'), listValidators, validateRequest, listAttendance);
router.post('/', authRequired, authorizeRoles('admin', 'hr_admin'), attendanceValidators, validateRequest, registerAttendance);
router.put('/:id', authRequired, authorizeRoles('admin', 'hr_admin'), idValidator, validateRequest, updateAttendance);
router.delete('/:id', authRequired, authorizeRoles('admin'), idValidator, validateRequest, deleteAttendance);

module.exports = router;
