const ExcelJS = require('exceljs');

const buildWorkbook = async ({ sheetName, columns, rows }) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  worksheet.columns = columns;
  worksheet.addRows(rows);
  worksheet.getRow(1).font = { bold: true };
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];

  columns.forEach((_, index) => {
    worksheet.getColumn(index + 1).width = Math.max(14, Number(columns[index].width || 14));
  });

  return workbook;
};

const sendWorkbook = async (res, workbook, fileName) => {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  await workbook.xlsx.write(res);
  res.end();
};

module.exports = {
  buildWorkbook,
  sendWorkbook
};
