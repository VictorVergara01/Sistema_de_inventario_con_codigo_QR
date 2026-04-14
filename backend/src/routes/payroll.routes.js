const express = require('express');
const {
  createRunValidators,
  updateEntryValidators,
  closeRunValidators,
  listPayrollRuns,
  getPayrollRun,
  createPayrollRun,
  updatePayrollEntry,
  closePayrollRun,
  exportPayroll
} = require('../controllers/payroll.controller');
const { validateRequest } = require('../middlewares/validation.middleware');
const { authRequired, authorizeRoles } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/', authRequired, authorizeRoles('admin', 'hr_admin'), listPayrollRuns);
router.get('/:id', authRequired, authorizeRoles('admin', 'hr_admin'), validateRequest, getPayrollRun);
router.get('/:id/export', authRequired, authorizeRoles('admin', 'hr_admin'), exportPayroll);
router.post('/', authRequired, authorizeRoles('admin', 'hr_admin'), createRunValidators, validateRequest, createPayrollRun);
router.put('/:runId/entries/:entryId', authRequired, authorizeRoles('admin', 'hr_admin'), updateEntryValidators, validateRequest, updatePayrollEntry);
router.patch('/:id/status', authRequired, authorizeRoles('admin', 'hr_admin'), closeRunValidators, validateRequest, closePayrollRun);

module.exports = router;
