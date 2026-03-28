const sequelize = require('../config/database');
const UserModel = require('./User');
const CategoryModel = require('./Category');
const SupplierModel = require('./Supplier');
const LocationModel = require('./Location');
const ProductModel = require('./Product');
const InventoryMovementModel = require('./InventoryMovement');
const StockAlertModel = require('./StockAlert');

const User = UserModel(sequelize);
const Category = CategoryModel(sequelize);
const Supplier = SupplierModel(sequelize);
const Location = LocationModel(sequelize);
const Product = ProductModel(sequelize);
const InventoryMovement = InventoryMovementModel(sequelize);
const StockAlert = StockAlertModel(sequelize);

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

module.exports = {
  sequelize,
  User,
  Category,
  Supplier,
  Location,
  Product,
  InventoryMovement,
  StockAlert
};
