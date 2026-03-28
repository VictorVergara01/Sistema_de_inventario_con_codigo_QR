const { StockAlert } = require('../models');

const refreshStockAlertForProduct = async (product, transaction) => {
  const openAlert = await StockAlert.findOne({
    where: { productId: product.id, status: 'open' },
    transaction
  });

  if (product.stockCurrent <= product.stockMin) {
    if (!openAlert) {
      await StockAlert.create(
        {
          productId: product.id,
          stockCurrent: product.stockCurrent,
          stockMin: product.stockMin,
          status: 'open'
        },
        { transaction }
      );
      return;
    }

    openAlert.stockCurrent = product.stockCurrent;
    openAlert.stockMin = product.stockMin;
    await openAlert.save({ transaction });
    return;
  }

  if (openAlert) {
    openAlert.status = 'closed';
    openAlert.closedAt = new Date();
    await openAlert.save({ transaction });
  }
};

module.exports = {
  refreshStockAlertForProduct
};
