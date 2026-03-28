import { useEffect, useState } from 'react';
import api from '../lib/api';

export default function ReportsPage() {
  const [inventory, setInventory] = useState({ rows: [], totals: { totalCostValue: 0, totalSaleValue: 0 } });
  const [lowStock, setLowStock] = useState([]);
  const [movements, setMovements] = useState([]);
  const [topMoved, setTopMoved] = useState([]);
  const [filters, setFilters] = useState({ from: '', to: '' });
  const [error, setError] = useState('');

  const loadReports = async () => {
    setError('');
    try {
      const query = new URLSearchParams();
      if (filters.from) query.append('from', filters.from);
      if (filters.to) query.append('to', filters.to);
      const qs = query.toString() ? `?${query.toString()}` : '';

      const [invRes, lowRes, movRes, topRes] = await Promise.all([
        api.get('/reports/inventory-current'),
        api.get('/reports/low-stock'),
        api.get(`/reports/movements${qs}`),
        api.get(`/reports/top-moved${qs}`)
      ]);

      setInventory(invRes.data);
      setLowStock(lowRes.data);
      setMovements(movRes.data);
      setTopMoved(topRes.data);
    } catch {
      setError('No se pudieron cargar los reportes');
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const exportReport = async (path, fileName) => {
    const { data } = await api.get(path, { responseType: 'blob' });
    const blob = new Blob([data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const qs = (() => {
    const query = new URLSearchParams();
    if (filters.from) query.append('from', filters.from);
    if (filters.to) query.append('to', filters.to);
    return query.toString() ? `?${query.toString()}` : '';
  })();

  return (
    <section>
      <h1>Reportes</h1>
      <p>Inventario actual, bajo mínimo, movimientos por período y top movidos.</p>

      {error && <div className="error">{error}</div>}

      <div className="card row-actions">
        <input type="date" value={filters.from} onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))} />
        <input type="date" value={filters.to} onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))} />
        <button type="button" onClick={loadReports}>
          Aplicar período
        </button>
      </div>

      <div className="card">
        <div className="table-header">
          <h3>Inventario actual</h3>
          <button
            type="button"
            onClick={() => exportReport('/reports/inventory-current?format=excel', 'reporte_inventario_actual.xlsx')}
          >
            Exportar Excel
          </button>
        </div>
        <p>
          Valor costo total: <strong>{inventory.totals.totalCostValue.toFixed(2)}</strong> | Valor venta total:{' '}
          <strong>{inventory.totals.totalSaleValue.toFixed(2)}</strong>
        </p>
      </div>

      <div className="grid-two">
        <div className="card">
          <div className="table-header">
            <h3>Productos bajo mínimo</h3>
            <button
              type="button"
              onClick={() => exportReport('/reports/low-stock?format=excel', 'reporte_stock_bajo_minimo.xlsx')}
            >
              Exportar Excel
            </button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>SKU</th>
                <th>Actual</th>
                <th>Mínimo</th>
              </tr>
            </thead>
            <tbody>
              {lowStock.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.sku}</td>
                  <td>{p.stockCurrent}</td>
                  <td>{p.stockMin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="table-header">
            <h3>Top productos más movidos</h3>
            <button
              type="button"
              onClick={() =>
                exportReport(
                  `/reports/top-moved${qs ? `${qs}&` : '?'}format=excel`,
                  'reporte_top_productos_movidos.xlsx'
                )
              }
            >
              Exportar Excel
            </button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>SKU</th>
                <th>Cant. movida</th>
                <th>N mov.</th>
              </tr>
            </thead>
            <tbody>
              {topMoved.map((r) => (
                <tr key={r.productId}>
                  <td>{r.productName}</td>
                  <td>{r.sku}</td>
                  <td>{r.movedQty}</td>
                  <td>{r.movementsCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="table-header">
          <h3>Movimientos por período</h3>
          <button
            type="button"
            onClick={() =>
              exportReport(
                `/reports/movements${qs ? `${qs}&` : '?'}format=excel`,
                'reporte_movimientos_periodo.xlsx'
              )
            }
          >
            Exportar Excel
          </button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Producto</th>
              <th>Tipo</th>
              <th>Cantidad</th>
              <th>Usuario</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((m) => (
              <tr key={m.id}>
                <td>{new Date(m.createdAt).toLocaleString()}</td>
                <td>{m.Product?.name}</td>
                <td>{m.type}</td>
                <td>{m.quantity}</td>
                <td>{m.User?.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
