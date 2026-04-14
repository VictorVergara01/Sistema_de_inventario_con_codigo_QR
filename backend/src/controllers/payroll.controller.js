const { body, param } = require('express-validator');
const ExcelJS = require('exceljs');
const { PayrollRun, PayrollEntry, Employee, Department, User, sequelize } = require('../models');

const runInclude = [
  { model: User, as: 'ProcessedBy', attributes: ['id', 'name'] },
  {
    model: PayrollEntry,
    include: [{ model: Employee, include: [{ model: Department, attributes: ['id', 'name'] }] }]
  }
];

const createRunValidators = [
  body('period')
    .isString()
    .matches(/^\d{4}-\d{2}$/)
    .withMessage('El período debe tener formato YYYY-MM'),
  body('notes').optional().isString()
];

const updateEntryValidators = [
  param('runId').isInt({ min: 1 }),
  param('entryId').isInt({ min: 1 }),
  body('bonuses').optional().isFloat({ min: 0 }),
  body('deductions').optional().isFloat({ min: 0 }),
  body('notes').optional().isString()
];

const closeRunValidators = [
  param('id').isInt({ min: 1 }),
  body('status').isIn(['processed', 'paid'])
];

const recalcRunTotals = async (payrollRunId, tx) => {
  const entries = await PayrollEntry.findAll({ where: { payrollRunId }, transaction: tx });
  const totalGross = entries.reduce((s, e) => s + Number(e.grossSalary), 0);
  const totalDeductions = entries.reduce((s, e) => s + Number(e.deductions), 0);
  const totalNet = entries.reduce((s, e) => s + Number(e.netSalary), 0);
  await PayrollRun.update(
    { totalGross, totalDeductions, totalNet },
    { where: { id: payrollRunId }, transaction: tx }
  );
};

const listPayrollRuns = async (_req, res) => {
  const runs = await PayrollRun.findAll({
    include: [{ model: User, as: 'ProcessedBy', attributes: ['id', 'name'] }],
    order: [['period', 'DESC']]
  });
  return res.json(runs);
};

const getPayrollRun = async (req, res) => {
  const run = await PayrollRun.findByPk(req.params.id, { include: runInclude });
  if (!run) return res.status(404).json({ message: 'Nómina no encontrada.' });
  return res.json(run);
};

const createPayrollRun = async (req, res) => {
  const { period, notes } = req.body;

  const existing = await PayrollRun.findOne({ where: { period } });
  if (existing) {
    return res.status(409).json({ message: `Ya existe una nómina para el período ${period}.` });
  }

  const employees = await Employee.findAll({ where: { active: true, status: 'active' } });
  if (!employees.length) {
    return res.status(400).json({ message: 'No hay empleados activos para generar la nómina.' });
  }

  const tx = await sequelize.transaction();
  try {
    const run = await PayrollRun.create(
      { period, status: 'draft', notes: notes || null, processedById: req.user.id },
      { transaction: tx }
    );

    for (const emp of employees) {
      const gross = Number(emp.baseSalary);
      await PayrollEntry.create(
        {
          payrollRunId: run.id,
          employeeId: emp.id,
          baseSalary: gross,
          bonuses: 0,
          deductions: 0,
          grossSalary: gross,
          netSalary: gross
        },
        { transaction: tx }
      );
    }

    await recalcRunTotals(run.id, tx);
    await tx.commit();

    const full = await PayrollRun.findByPk(run.id, { include: runInclude });
    return res.status(201).json(full);
  } catch (error) {
    await tx.rollback();
    return res.status(400).json({ message: 'No se pudo crear la nómina.', detail: error.message });
  }
};

const updatePayrollEntry = async (req, res) => {
  const entry = await PayrollEntry.findOne({
    where: { id: req.params.entryId, payrollRunId: req.params.runId }
  });
  if (!entry) return res.status(404).json({ message: 'Entrada de nómina no encontrada.' });

  const run = await PayrollRun.findByPk(req.params.runId);
  if (run.status === 'paid') {
    return res.status(400).json({ message: 'No se puede modificar una nómina ya pagada.' });
  }

  const tx = await sequelize.transaction();
  try {
    const bonuses = req.body.bonuses !== undefined ? Number(req.body.bonuses) : Number(entry.bonuses);
    const deductions = req.body.deductions !== undefined ? Number(req.body.deductions) : Number(entry.deductions);
    const grossSalary = Number(entry.baseSalary) + bonuses;
    const netSalary = grossSalary - deductions;

    await entry.update(
      {
        bonuses,
        deductions,
        grossSalary,
        netSalary,
        notes: req.body.notes !== undefined ? req.body.notes : entry.notes
      },
      { transaction: tx }
    );

    await recalcRunTotals(run.id, tx);
    await tx.commit();

    const updated = await PayrollEntry.findByPk(entry.id, {
      include: [{ model: Employee, include: [{ model: Department, attributes: ['id', 'name'] }] }]
    });
    return res.json(updated);
  } catch (error) {
    await tx.rollback();
    return res.status(400).json({ message: 'No se pudo actualizar la entrada.', detail: error.message });
  }
};

const closePayrollRun = async (req, res) => {
  const run = await PayrollRun.findByPk(req.params.id);
  if (!run) return res.status(404).json({ message: 'Nómina no encontrada.' });
  if (run.status === 'paid') {
    return res.status(400).json({ message: 'La nómina ya está marcada como pagada.' });
  }

  run.status = req.body.status;
  if (req.body.status === 'processed' || req.body.status === 'paid') {
    run.processedAt = new Date();
    run.processedById = req.user.id;
  }
  await run.save();
  return res.json(run);
};

const exportPayroll = async (req, res) => {
  const run = await PayrollRun.findByPk(req.params.id, { include: runInclude });
  if (!run) return res.status(404).json({ message: 'Nómina no encontrada.' });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(`Nómina ${run.period}`);

  sheet.columns = [
    { header: 'Empleado', key: 'name', width: 30 },
    { header: 'DNI', key: 'dni', width: 15 },
    { header: 'Cargo', key: 'position', width: 25 },
    { header: 'Departamento', key: 'department', width: 20 },
    { header: 'Salario Base', key: 'baseSalary', width: 15 },
    { header: 'Bonos', key: 'bonuses', width: 12 },
    { header: 'Descuentos', key: 'deductions', width: 12 },
    { header: 'Salario Bruto', key: 'grossSalary', width: 15 },
    { header: 'Salario Neto', key: 'netSalary', width: 15 },
    { header: 'Notas', key: 'notes', width: 30 }
  ];

  sheet.getRow(1).font = { bold: true };

  for (const entry of run.PayrollEntries || []) {
    sheet.addRow({
      name: `${entry.Employee?.lastName || ''}, ${entry.Employee?.firstName || ''}`,
      dni: entry.Employee?.dni || '',
      position: entry.Employee?.position || '',
      department: entry.Employee?.Department?.name || '',
      baseSalary: Number(entry.baseSalary),
      bonuses: Number(entry.bonuses),
      deductions: Number(entry.deductions),
      grossSalary: Number(entry.grossSalary),
      netSalary: Number(entry.netSalary),
      notes: entry.notes || ''
    });
  }

  sheet.addRow([]);
  sheet.addRow({
    name: 'TOTALES',
    baseSalary: Number(run.totalGross) + Number(run.totalDeductions) - /* bonuses already in gross */ 0,
    grossSalary: Number(run.totalGross),
    deductions: Number(run.totalDeductions),
    netSalary: Number(run.totalNet)
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=nomina-${run.period}.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
};

module.exports = {
  createRunValidators,
  updateEntryValidators,
  closeRunValidators,
  listPayrollRuns,
  getPayrollRun,
  createPayrollRun,
  updatePayrollEntry,
  closePayrollRun,
  exportPayroll
};
