const sequelize = require('../config/database');
const UserModel = require('./User');
const CategoryModel = require('./Category');
const SupplierModel = require('./Supplier');
const LocationModel = require('./Location');
const ProductModel = require('./Product');
const InventoryMovementModel = require('./InventoryMovement');
const StockAlertModel = require('./StockAlert');
const DepartmentModel = require('./Department');
const EmployeeModel = require('./Employee');
const PayrollRunModel = require('./PayrollRun');
const PayrollEntryModel = require('./PayrollEntry');
const AttendanceModel = require('./Attendance');

const User = UserModel(sequelize);
const Category = CategoryModel(sequelize);
const Supplier = SupplierModel(sequelize);
const Location = LocationModel(sequelize);
const Product = ProductModel(sequelize);
const InventoryMovement = InventoryMovementModel(sequelize);
const StockAlert = StockAlertModel(sequelize);
const Department = DepartmentModel(sequelize);
const Employee = EmployeeModel(sequelize);
const PayrollRun = PayrollRunModel(sequelize);
const PayrollEntry = PayrollEntryModel(sequelize);
const Attendance = AttendanceModel(sequelize);

// Inventario
Category.hasMany(Product, { foreignKey: 'categoryId' });
Product.belongsTo(Category, { foreignKey: 'categoryId' });

Supplier.hasMany(Product, { foreignKey: 'supplierId' });
Product.belongsTo(Supplier, { foreignKey: 'supplierId' });

Location.hasMany(Product, { foreignKey: 'locationId' });
Product.belongsTo(Location, { foreignKey: 'locationId' });

Product.hasMany(InventoryMovement, { foreignKey: 'productId' });
InventoryMovement.belongsTo(Product, { foreignKey: 'productId' });

User.hasMany(InventoryMovement, { foreignKey: 'userId' });
InventoryMovement.belongsTo(User, { foreignKey: 'userId' });

Product.hasMany(StockAlert, { foreignKey: 'productId' });
StockAlert.belongsTo(Product, { foreignKey: 'productId' });

// HR
Department.hasMany(Employee, { foreignKey: 'departmentId' });
Employee.belongsTo(Department, { foreignKey: 'departmentId' });

User.hasOne(Employee, { foreignKey: 'userId', as: 'EmployeeProfile' });
Employee.belongsTo(User, { foreignKey: 'userId', as: 'SystemUser' });

User.hasMany(PayrollRun, { foreignKey: 'processedById' });
PayrollRun.belongsTo(User, { foreignKey: 'processedById', as: 'ProcessedBy' });

PayrollRun.hasMany(PayrollEntry, { foreignKey: 'payrollRunId' });
PayrollEntry.belongsTo(PayrollRun, { foreignKey: 'payrollRunId' });

Employee.hasMany(PayrollEntry, { foreignKey: 'employeeId' });
PayrollEntry.belongsTo(Employee, { foreignKey: 'employeeId' });

Employee.hasMany(Attendance, { foreignKey: 'employeeId' });
Attendance.belongsTo(Employee, { foreignKey: 'employeeId' });

module.exports = {
  sequelize,
  User,
  Category,
  Supplier,
  Location,
  Product,
  InventoryMovement,
  StockAlert,
  Department,
  Employee,
  PayrollRun,
  PayrollEntry,
  Attendance
};
