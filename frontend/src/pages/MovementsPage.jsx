import { useEffect, useMemo, useState } from 'react';
import api from '../lib/api';

const MOVEMENT_TYPES = {
  entry: 'Entrada',
  exit: 'Salida',
  transfer: 'Traslado',
  adjustment: 'Ajuste'
};

const initialForm = {
  productId: '',
  type: 'entry',
  quantity: 1,
  adjustmentSign: 'positive',
  reason: '',
  fromLocationText: '',
  toLocationText: ''
};

const getRequestErrorMessage = (err, fallback) => {
  const data = err?.response?.data;

  if (!data) {
    return fallback;
  }

  if (Array.isArray(data.errors) && data.errors.length > 0) {
    return data.errors.map((item) => item.msg).join(' | ');
  }

  if (data.message && data.detail) {
    return `${data.message}: ${data.detail}`;
  }

  return data.message || fallback;
};

const formatMovementLabel = (movement) => {
  if (movement.type !== 'adjustment') {
    return MOVEMENT_TYPES[movement.type] || movement.type;
  }

  return movement.adjustmentSign === 'negative' ? 'Ajuste -' : 'Ajuste +';
};

const getProjectedStock = ({ stockCurrent, type, quantity, adjustmentSign }) => {
  const current = Number(stockCurrent || 0);
  const qty = Number(quantity || 0);

  if (type === 'entry') return current + qty;
  if (type === 'exit') return current - qty;
  if (type === 'transfer') return current;
  if (type === 'adjustment') {
    return adjustmentSign === 'negative' ? current - qty : current + qty;
  }

  return current;
};

export default function MovementsPage() {
  const [products, setProducts] = useState([]);
  const [history, setHistory] = useState([]);
  const [recentMovements, setRecentMovements] = useState([]);

  const [form, setForm] = useState(initialForm);
  const [recentTypeFilter, setRecentTypeFilter] = useState('all');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const selectedProduct = useMemo(
    () => products.find((product) => String(product.id) === String(form.productId)),
    [products, form.productId]
  );

  const projectedStock = useMemo(() => {
    if (!selectedProduct) return null;

    return getProjectedStock({
      stockCurrent: selectedProduct.stockCurrent,
      type: form.type,
      quantity: form.quantity,
      adjustmentSign: form.adjustmentSign
    });
  }, [selectedProduct, form.type, form.quantity, form.adjustmentSign]);

  const isLowAfterMovement = useMemo(() => {
    if (!selectedProduct || projectedStock === null) return false;
    return projectedStock <= selectedProduct.stockMin;
  }, [selectedProduct, projectedStock]);

  const loadProducts = async () => {
    const { data } = await api.get('/products');
    setProducts(data);
  };

  const loadHistory = async (productId) => {
    if (!productId) {
      setHistory([]);
      return;
    }

    const { data } = await api.get(`/movements/product/${productId}`);
    setHistory(data);
  };

  const loadRecentMovements = async (typeFilter = recentTypeFilter) => {
    const params = { limit: 40 };
    if (typeFilter && typeFilter !== 'all') {
      params.type = typeFilter;
    }

    const { data } = await api.get('/movements', { params });
    setRecentMovements(data);
  };

  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true);
      setError('');
      try {
        await Promise.all([loadProducts(), loadRecentMovements('all')]);
      } catch {
        setError('No se pudieron cargar productos y movimientos.');
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  useEffect(() => {
    loadRecentMovements().catch(() => setError('No se pudo filtrar el listado de movimientos.'));
  }, [recentTypeFilter]);

  useEffect(() => {
    if (!form.productId) {
      setHistory([]);
      return;
    }

    loadHistory(form.productId).catch(() => setError('No se pudo cargar historial del producto.'));
  }, [form.productId]);

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validateMovement = () => {
    if (!form.productId) {
      return 'Selecciona un producto para registrar movimiento.';
    }

    if (!Number(form.quantity) || Number(form.quantity) < 1) {
      return 'La cantidad debe ser mayor a cero.';
    }

    if (form.type === 'adjustment' && !String(form.reason || '').trim()) {
      return 'El ajuste manual requiere un motivo.';
    }

    if (form.type === 'transfer') {
      const from = String(form.fromLocationText || '').trim();
      const to = String(form.toLocationText || '').trim();

      if (!from || !to) {
        return 'El traslado requiere ubicación origen y destino.';
      }

      if (from.toLowerCase() === to.toLowerCase()) {
        return 'El origen y destino del traslado no pueden ser iguales.';
      }
    }

    if (projectedStock !== null && projectedStock < 0) {
      return 'Este movimiento dejaría el stock en negativo.';
    }

    return null;
  };

  const applyQuickQuantity = (qty) => {
    setField('quantity', qty);
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validateMovement();
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      ...form,
      productId: Number(form.productId),
      quantity: Number(form.quantity),
      reason: String(form.reason || '').trim(),
      fromLocationText: String(form.fromLocationText || '').trim(),
      toLocationText: String(form.toLocationText || '').trim()
    };

    setSubmitting(true);
    try {
      const { data } = await api.post('/movements', payload);

      const resultMovement = data?.movement;
      const resultProduct = data?.product;

      await Promise.all([loadProducts(), loadHistory(payload.productId), loadRecentMovements()]);

      setForm((prev) => ({
        ...prev,
        quantity: 1,
        reason: '',
        fromLocationText: '',
        toLocationText: ''
      }));

      setSuccess(
        `Movimiento registrado. ${resultProduct?.name || selectedProduct?.name || 'Producto'} queda con stock ${
          resultMovement?.stockAfter ?? projectedStock
        }.`
      );
    } catch (err) {
      setError(getRequestErrorMessage(err, 'No se pudo registrar el movimiento.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section>
        <h1>Movimientos de Inventario</h1>
        <p>Cargando panel de movimientos...</p>
      </section>
    );
  }

  return (
    <section className="movements-page">
      <header className="card movement-hero">
        <span className="kicker">Operación diaria</span>
        <h1>Panel de movimientos mejorado</h1>
        <p>
          Registra entradas, salidas, traslados y ajustes con validaciones de stock en tiempo real, historial del
          producto y bitácora global.
        </p>
      </header>

      {error && <div className="error">{error}</div>}
      {success && <div className="success-banner">{success}</div>}

      <div className="movement-grid">
        <form className="card movement-form" onSubmit={submit}>
          <h3>Registrar movimiento</h3>

          <label>
            Producto
            <select
              value={form.productId}
              onChange={(e) => {
                setField('productId', e.target.value);
                setSuccess('');
              }}
              required
            >
              <option value="">Selecciona producto</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.sku})
                </option>
              ))}
            </select>
          </label>

          <div className="inline-grid two">
            <label>
              Tipo
              <select value={form.type} onChange={(e) => setField('type', e.target.value)}>
                <option value="entry">Entrada</option>
                <option value="exit">Salida</option>
                <option value="transfer">Traslado</option>
                <option value="adjustment">Ajuste manual</option>
              </select>
            </label>

            {form.type === 'adjustment' && (
              <label>
                Dirección del ajuste
                <select value={form.adjustmentSign} onChange={(e) => setField('adjustmentSign', e.target.value)}>
                  <option value="positive">Ajuste positivo (+)</option>
                  <option value="negative">Ajuste negativo (-)</option>
                </select>
              </label>
            )}
          </div>

          <div className="inline-grid two">
            <label>
              Cantidad
              <input
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) => setField('quantity', Number(e.target.value))}
                required
              />
            </label>

            <div className="quick-qty-block">
              <small>Ajuste rápido</small>
              <div className="row-actions">
                {[1, 5, 10, 20].map((qty) => (
                  <button key={qty} type="button" className="ghost" onClick={() => applyQuickQuantity(qty)}>
                    {qty}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <label>
            Motivo
            <input
              placeholder="Ej. Compra de proveedor, venta mostrador, ajuste por conteo"
              value={form.reason}
              onChange={(e) => setField('reason', e.target.value)}
              required={form.type === 'adjustment'}
            />
          </label>

          {form.type === 'transfer' && (
            <div className="inline-grid two">
              <label>
                Ubicación origen
                <input
                  placeholder="Ej. Pasillo A - Nivel 1"
                  value={form.fromLocationText}
                  onChange={(e) => setField('fromLocationText', e.target.value)}
                  required
                />
              </label>

              <label>
                Ubicación destino
                <input
                  placeholder="Ej. Pasillo B - Nivel 2"
                  value={form.toLocationText}
                  onChange={(e) => setField('toLocationText', e.target.value)}
                  required
                />
              </label>
            </div>
          )}

          <button type="submit" disabled={submitting}>
            {submitting ? 'Registrando...' : 'Registrar movimiento'}
          </button>
        </form>

        <div className="movement-side-column">
          <div className="card movement-summary">
            <h3>Resumen operativo</h3>

            {!selectedProduct ? (
              <p>Selecciona un producto para ver stock actual y proyección del movimiento.</p>
            ) : (
              <>
                <div className="summary-title">
                  <strong>{selectedProduct.name}</strong>
                  <small>
                    SKU: {selectedProduct.sku} | Ubicación: {selectedProduct.warehouseLocation || '-'}
                  </small>
                </div>

                <div className="movement-kpis">
                  <article>
                    <small>Stock actual</small>
                    <strong>{selectedProduct.stockCurrent}</strong>
                  </article>
                  <article>
                    <small>Stock proyectado</small>
                    <strong>{projectedStock}</strong>
                  </article>
                  <article>
                    <small>Stock mínimo</small>
                    <strong>{selectedProduct.stockMin}</strong>
                  </article>
                </div>

                {isLowAfterMovement && (
                  <div className="warning-banner">
                    Alerta: el producto queda en o bajo mínimo tras este movimiento.
                  </div>
                )}
              </>
            )}
          </div>

          <div className="card">
            <h3>Historial del producto</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Cant.</th>
                    <th>Antes</th>
                    <th>Después</th>
                    <th>Usuario</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((movement) => (
                    <tr key={movement.id}>
                      <td>{new Date(movement.createdAt).toLocaleString()}</td>
                      <td>{formatMovementLabel(movement)}</td>
                      <td>{movement.quantity}</td>
                      <td>{movement.stockBefore ?? '-'}</td>
                      <td>{movement.stockAfter ?? '-'}</td>
                      <td>{movement.User?.name || '-'}</td>
                    </tr>
                  ))}

                  {!history.length && (
                    <tr>
                      <td colSpan={6}>
                        <div className="empty-table">Sin movimientos para el producto seleccionado.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-toolbar">
          <h3>Bitácora global de movimientos</h3>
          <div className="row-actions">
            <select value={recentTypeFilter} onChange={(e) => setRecentTypeFilter(e.target.value)}>
              <option value="all">Todos</option>
              <option value="entry">Entradas</option>
              <option value="exit">Salidas</option>
              <option value="transfer">Traslados</option>
              <option value="adjustment">Ajustes</option>
            </select>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Producto</th>
                <th>Tipo</th>
                <th>Cantidad</th>
                <th>Antes</th>
                <th>Después</th>
                <th>Usuario</th>
                <th>Motivo</th>
              </tr>
            </thead>
            <tbody>
              {recentMovements.map((movement) => (
                <tr key={movement.id}>
                  <td>{new Date(movement.createdAt).toLocaleString()}</td>
                  <td>
                    {movement.Product?.name || '-'}
                    <small className="cell-note">{movement.Product?.sku || '-'}</small>
                  </td>
                  <td>{formatMovementLabel(movement)}</td>
                  <td>{movement.quantity}</td>
                  <td>{movement.stockBefore ?? '-'}</td>
                  <td>{movement.stockAfter ?? '-'}</td>
                  <td>{movement.User?.name || '-'}</td>
                  <td>{movement.reason || '-'}</td>
                </tr>
              ))}

              {!recentMovements.length && (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-table">No hay movimientos para el filtro actual.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
