import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import QRCodeCard from '../components/QRCodeCard';
import { useAuth } from '../state/AuthContext';
import { ROLE_LABELS } from '../lib/role-access';

const emptyForm = {
  name: '',
  sku: '',
  categoryId: '',
  supplierId: '',
  locationId: '',
  warehouseLocation: '',
  costPrice: 0,
  salePrice: 0,
  stockCurrent: 0,
  stockMin: 0,
  active: true
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

export default function ProductsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [locations, setLocations] = useState([]);

  const [search, setSearch] = useState('');
  const [showOnlyLowStock, setShowOnlyLowStock] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  const loadAll = async () => {
    const [productRes, catRes, supRes, locRes] = await Promise.all([
      api.get('/products'),
      api.get('/catalog/categories'),
      api.get('/catalog/suppliers'),
      api.get('/catalog/locations')
    ]);

    setProducts(productRes.data);
    setCategories(catRes.data);
    setSuppliers(supRes.data);
    setLocations(locRes.data);
  };

  useEffect(() => {
    loadAll().catch(() => setError('No se pudo cargar catálogo/productos'));
  }, []);

  useEffect(() => {
    if (editingId) return;

    setForm((prev) => ({
      ...prev,
      categoryId: prev.categoryId || String(categories[0]?.id || ''),
      supplierId: prev.supplierId || String(suppliers[0]?.id || ''),
      locationId: prev.locationId || String(locations[0]?.id || '')
    }));
  }, [categories, suppliers, locations, editingId]);

  const metrics = useMemo(() => {
    const lowStock = products.filter((p) => p.stockCurrent <= p.stockMin).length;
    const totalUnits = products.reduce((acc, p) => acc + Number(p.stockCurrent || 0), 0);
    const estimatedValue = products.reduce((acc, p) => acc + Number(p.stockCurrent || 0) * Number(p.costPrice || 0), 0);

    return {
      totalProducts: products.length,
      lowStock,
      totalUnits,
      estimatedValue
    };
  }, [products]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return products.filter((product) => {
      if (showOnlyLowStock && product.stockCurrent > product.stockMin) {
        return false;
      }

      if (!term) {
        return true;
      }

      const category = product.Category?.name || '';
      const supplier = product.Supplier?.name || '';

      return (
        product.name.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term) ||
        category.toLowerCase().includes(term) ||
        supplier.toLowerCase().includes(term)
      );
    });
  }, [products, search, showOnlyLowStock]);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const buildSmartSku = () => {
    const cleanName = (form.name || 'producto')
      .normalize('NFD')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim();
    const code = cleanName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 3)
      .map((part) => part.slice(0, 3).toUpperCase())
      .join('');
    const randomSuffix = String(Math.floor(1000 + Math.random() * 9000));
    setField('sku', `${code || 'SKU'}-${randomSuffix}`);
  };

  const applyDemoData = () => {
    const suffix = Date.now().toString().slice(-6);

    setForm((prev) => ({
      ...prev,
      name: 'Taladro Inalambrico 20V',
      sku: `TAL-INA-${suffix}`,
      categoryId: prev.categoryId || String(categories[0]?.id || ''),
      supplierId: prev.supplierId || String(suppliers[0]?.id || ''),
      locationId: prev.locationId || String(locations[0]?.id || ''),
      warehouseLocation: 'Pasillo A - Nivel 2',
      costPrice: 250,
      salePrice: 379,
      stockCurrent: 40,
      stockMin: 12,
      active: true
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.categoryId || !form.supplierId || !form.locationId) {
      setError('Debes seleccionar categoría, proveedor y ubicación antes de guardar.');
      return;
    }

    try {
      const payload = {
        ...form,
        categoryId: Number(form.categoryId),
        supplierId: Number(form.supplierId),
        locationId: Number(form.locationId),
        costPrice: Number(form.costPrice),
        salePrice: Number(form.salePrice),
        stockCurrent: Number(form.stockCurrent),
        stockMin: Number(form.stockMin)
      };

      let saved;
      if (editingId) {
        saved = await api.put(`/products/${editingId}`, payload);
      } else {
        saved = await api.post('/products', payload);
      }
      await loadAll();
      setSelected(saved.data);
      resetForm();
    } catch (err) {
      setError(getRequestErrorMessage(err, 'No se pudo guardar el producto'));
    }
  };

  const createCategoryQuick = async () => {
    const value = newCategoryName.trim();
    if (value.length < 2) {
      setError('La nueva categoría debe tener al menos 2 caracteres.');
      return;
    }

    setCreatingCategory(true);
    setError('');
    try {
      const { data } = await api.post('/catalog/categories', { name: value });
      setCategories((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setField('categoryId', String(data.id));
      setNewCategoryName('');
    } catch (err) {
      setError(getRequestErrorMessage(err, 'No se pudo crear la categoría.'));
    } finally {
      setCreatingCategory(false);
    }
  };

  const onEdit = (product) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      sku: product.sku,
      categoryId: String(product.categoryId),
      supplierId: String(product.supplierId),
      locationId: String(product.locationId),
      warehouseLocation: product.warehouseLocation || '',
      costPrice: Number(product.costPrice),
      salePrice: Number(product.salePrice),
      stockCurrent: product.stockCurrent,
      stockMin: product.stockMin,
      active: product.active
    });
  };

  const onDelete = async (id) => {
    if (!window.confirm('¿Eliminar producto?')) return;
    try {
      await api.delete(`/products/${id}`);
      if (selected?.id === id) {
        setSelected(null);
      }
      await loadAll();
    } catch {
      setError('No se pudo eliminar el producto');
    }
  };

  const marginPercent = useMemo(() => {
    const cost = Number(form.costPrice || 0);
    const sale = Number(form.salePrice || 0);

    if (cost <= 0 || sale <= 0 || sale <= cost) {
      return 0;
    }

    return Number((((sale - cost) / cost) * 100).toFixed(1));
  }, [form.costPrice, form.salePrice]);

  const preview = selected || {
    name: form.name || 'Producto sin nombre',
    sku: form.sku || 'SKU pendiente',
    stockCurrent: Number(form.stockCurrent || 0),
    stockMin: Number(form.stockMin || 0),
    warehouseLocation: form.warehouseLocation || 'Sin ubicación específica',
    qrCodeValue: selected?.qrCodeValue,
    Category: categories.find((c) => String(c.id) === String(form.categoryId)),
    Supplier: suppliers.find((s) => String(s.id) === String(form.supplierId)),
    Location: locations.find((l) => String(l.id) === String(form.locationId))
  };

  return (
    <section className="products-page">
      <header className="card hero-panel">
        <div>
          <span className="kicker">Inventario central</span>
          <h1>Gestión creativa de productos</h1>
          <p>
            Diseñado para capturar producto, inventario y pricing en un solo flujo. Sesión activa como{' '}
            <strong>{ROLE_LABELS[user?.role] || user?.role}</strong>.
          </p>
        </div>

        <div className="metric-strip">
          <article>
            <small>Total productos</small>
            <strong>{metrics.totalProducts}</strong>
          </article>
          <article>
            <small>Bajo mínimo</small>
            <strong>{metrics.lowStock}</strong>
          </article>
          <article>
            <small>Unidades totales</small>
            <strong>{metrics.totalUnits}</strong>
          </article>
          <article>
            <small>Valor estimado costo</small>
            <strong>${metrics.estimatedValue.toFixed(2)}</strong>
          </article>
        </div>
      </header>

      {error && <div className="error">{error}</div>}

      <div className="workspace-grid">
        <div className="card product-studio">
          <div className="panel-head">
            <h3>{editingId ? 'Editor de producto' : 'Creador de producto'}</h3>
            {isAdmin && (
              <div className="row-actions">
                <button type="button" className="ghost" onClick={buildSmartSku}>
                  Generar SKU inteligente
                </button>
                <button type="button" className="ghost" onClick={applyDemoData}>
                  Cargar ejemplo
                </button>
              </div>
            )}
          </div>

          {isAdmin ? (
            <form onSubmit={submit} className="form-grid product-form">
              <fieldset>
                <legend>Identidad comercial</legend>
                <div className="inline-grid two">
                  <label>
                    Nombre
                    <input
                      placeholder="Ej. Taladro Inalambrico 20V"
                      value={form.name}
                      onChange={(e) => setField('name', e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    SKU
                    <input
                      placeholder="SKU interno"
                      value={form.sku}
                      onChange={(e) => setField('sku', e.target.value.toUpperCase())}
                      required
                    />
                  </label>
                </div>

                <div className="inline-grid three">
                  <label>
                    Categoría
                    <select value={form.categoryId} onChange={(e) => setField('categoryId', e.target.value)} required>
                      <option value="">Selecciona categoría</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Proveedor
                    <select value={form.supplierId} onChange={(e) => setField('supplierId', e.target.value)} required>
                      <option value="">Selecciona proveedor</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Ubicación base
                    <select value={form.locationId} onChange={(e) => setField('locationId', e.target.value)} required>
                      <option value="">Selecciona ubicación</option>
                      {locations.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="quick-create-row">
                  <input
                    placeholder="Crear categoría rápida (ej. Repuestos)"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        createCategoryQuick();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="ghost"
                    onClick={createCategoryQuick}
                    disabled={creatingCategory}
                  >
                    {creatingCategory ? 'Creando...' : 'Agregar categoría'}
                  </button>
                </div>
              </fieldset>

              <fieldset>
                <legend>Precios y rentabilidad</legend>
                <div className="inline-grid three">
                  <label>
                    Precio costo
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.costPrice}
                      onChange={(e) => setField('costPrice', Number(e.target.value))}
                      required
                    />
                  </label>
                  <label>
                    Precio venta
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.salePrice}
                      onChange={(e) => setField('salePrice', Number(e.target.value))}
                      required
                    />
                  </label>
                  <div className="stat-chip">
                    <small>Margen estimado</small>
                    <strong>{marginPercent}%</strong>
                  </div>
                </div>
              </fieldset>

              <fieldset>
                <legend>Inventario operativo</legend>
                <div className="inline-grid three">
                  <label>
                    Stock actual
                    <input
                      type="number"
                      min="0"
                      value={form.stockCurrent}
                      onChange={(e) => setField('stockCurrent', Number(e.target.value))}
                      required
                    />
                  </label>
                  <label>
                    Stock mínimo
                    <input
                      type="number"
                      min="0"
                      value={form.stockMin}
                      onChange={(e) => setField('stockMin', Number(e.target.value))}
                      required
                    />
                  </label>
                  <label>
                    Detalle de ubicación
                    <input
                      placeholder="Ej. Pasillo A - Nivel 2"
                      value={form.warehouseLocation}
                      onChange={(e) => setField('warehouseLocation', e.target.value)}
                    />
                  </label>
                </div>
              </fieldset>

              <div className="row-actions product-actions">
                <button type="submit">{editingId ? 'Guardar cambios' : 'Crear producto con QR'}</button>
                {editingId && (
                  <button type="button" onClick={resetForm} className="ghost">
                    Cancelar edición
                  </button>
                )}
              </div>
            </form>
          ) : (
            <div className="read-only-state">
              <p>
                Tu rol actual es <strong>{ROLE_LABELS[user?.role] || user?.role}</strong>. Puedes consultar productos,
                escanear códigos y operar según tus permisos.
              </p>
              <div className="row-actions">
                <Link className="link-btn" to="/scanner">
                  Ir al escáner
                </Link>
                {user?.role === 'bodeguero' && (
                  <Link className="link-btn" to="/movements">
                    Registrar movimientos
                  </Link>
                )}
                {user?.role === 'auditor' && (
                  <Link className="link-btn" to="/reports">
                    Ver reportes
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="card preview-column">
          <h3>Vista previa y QR</h3>
          <div className="product-preview">
            <h4>{preview.name}</h4>
            <small>{preview.sku}</small>

            <dl>
              <div>
                <dt>Categoría</dt>
                <dd>{preview.Category?.name || '-'}</dd>
              </div>
              <div>
                <dt>Proveedor</dt>
                <dd>{preview.Supplier?.name || '-'}</dd>
              </div>
              <div>
                <dt>Ubicación</dt>
                <dd>{preview.warehouseLocation || preview.Location?.name || '-'}</dd>
              </div>
              <div>
                <dt>Salud de stock</dt>
                <dd>
                  {preview.stockCurrent <= preview.stockMin ? (
                    <span className="status-badge low">Bajo mínimo</span>
                  ) : (
                    <span className="status-badge">Normal</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          {selected?.qrCodeValue ? (
            <QRCodeCard value={selected.qrCodeValue} title={`QR listo: ${selected.name}`} />
          ) : (
            <p>
              Selecciona un producto del listado para generar su bloque QR descargable. Al crear uno nuevo se muestra
              aquí automáticamente.
            </p>
          )}
        </div>
      </div>

      <div className="card table-card">
        <div className="table-toolbar">
          <h3>Inventario de productos</h3>
          <div className="row-actions">
            <input
              placeholder="Buscar por nombre, SKU, categoría o proveedor"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              type="button"
              className={showOnlyLowStock ? '' : 'ghost'}
              onClick={() => setShowOnlyLowStock((prev) => !prev)}
            >
              {showOnlyLowStock ? 'Mostrando bajo mínimo' : 'Filtrar bajo mínimo'}
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>SKU</th>
                <th>Categoría</th>
                <th>Stock</th>
                <th>Ubicación</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className={p.stockCurrent <= p.stockMin ? 'low-stock' : ''}>
                  <td>
                    <strong>{p.name}</strong>
                    <small className="cell-note">Proveedor: {p.Supplier?.name || '-'}</small>
                  </td>
                  <td>{p.sku}</td>
                  <td>{p.Category?.name || '-'}</td>
                  <td>
                    {p.stockCurrent} / min {p.stockMin}
                  </td>
                  <td>{p.warehouseLocation || p.Location?.name || '-'}</td>
                  <td className="row-actions">
                    <button type="button" onClick={() => setSelected(p)}>
                      Ver QR
                    </button>
                    {isAdmin && (
                      <>
                        <button type="button" className="ghost" onClick={() => onEdit(p)}>
                          Editar
                        </button>
                        <button type="button" className="danger" onClick={() => onDelete(p.id)}>
                          Eliminar
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-table">No hay productos que coincidan con el filtro actual.</div>
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
