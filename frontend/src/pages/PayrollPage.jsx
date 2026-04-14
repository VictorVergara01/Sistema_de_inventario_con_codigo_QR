import { useEffect, useState } from 'react';
import api from '../lib/api';

const STATUS_LABELS = { draft: 'Borrador', processed: 'Procesada', paid: 'Pagada' };
const STATUS_COLORS = {
  draft: { bg: '#fef3c7', color: '#92400e' },
  processed: { bg: '#dbeafe', color: '#1e40af' },
  paid: { bg: '#d1fae5', color: '#065f46' }
};

const fmt = (n) =>
  Number(n).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const getCurrentPeriod = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export default function PayrollPage() {
  const [runs, setRuns] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);
  const [entryForm, setEntryForm] = useState({ bonuses: '', deductions: '', notes: '' });

  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadRuns = async () => {
    const { data } = await api.get('/payroll');
    setRuns(data);
  };

  const loadRun = async (id) => {
    setLoadingDetail(true);
    try {
      const { data } = await api.get(`/payroll/${id}`);
      setSelectedRun(data);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadRuns()
      .catch(() => setError('No se pudieron cargar las nóminas.'))
      .finally(() => setLoading(false));
  }, []);

  const createRun = async () => {
    const period = getCurrentPeriod();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      await api.post('/payroll', { period });
      setSuccess(`Nómina ${period} creada correctamente.`);
      await loadRuns();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo crear la nómina.');
    } finally {
      setSubmitting(false);
    }
  };

  const closeRun = async (id, status) => {
    const label = status === 'paid' ? 'marcar como pagada' : 'procesar';
    if (!window.confirm(`¿Deseas ${label} esta nómina?`)) return;
    setError('');
    setSuccess('');
    try {
      await api.patch(`/payroll/${id}/status`, { status });
      setSuccess('Estado de nómina actualizado.');
      await loadRuns();
      if (selectedRun?.id === id) await loadRun(id);
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo actualizar el estado.');
    }
  };

  const openEditEntry = (entry) => {
    setEditingEntry(entry.id);
    setEntryForm({
      bonuses: String(entry.bonuses),
      deductions: String(entry.deductions),
      notes: entry.notes || ''
    });
  };

  const cancelEditEntry = () => {
    setEditingEntry(null);
    setEntryForm({ bonuses: '', deductions: '', notes: '' });
  };

  const saveEntry = async (runId, entryId) => {
    setError('');
    setSubmitting(true);
    try {
      await api.put(`/payroll/${runId}/entries/${entryId}`, {
        bonuses: Number(entryForm.bonuses) || 0,
        deductions: Number(entryForm.deductions) || 0,
        notes: entryForm.notes || null
      });
      setSuccess('Entrada de nómina actualizada.');
      cancelEditEntry();
      await loadRun(runId);
      await loadRuns();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo actualizar la entrada.');
    } finally {
      setSubmitting(false);
    }
  };

  const exportRun = (id, period) => {
    window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/payroll/${id}/export`, '_blank');
  };

  if (loading) {
    return (
      <section>
        <h1>Nómina</h1>
        <p>Cargando...</p>
      </section>
    );
  }

  return (
    <section className="movements-page">
      <header className="card movement-hero">
        <span className="kicker">Recursos Humanos</span>
        <h1>Gestión de Nómina</h1>
        <p>Crea períodos de pago, ajusta bonos y descuentos, y exporta a Excel.</p>
      </header>

      {error && <div className="error">{error}</div>}
      {success && <div className="success-banner">{success}</div>}

      <div className="movement-grid">
        {/* Lista de períodos */}
        <div className="card">
          <div className="table-toolbar">
            <h3>Períodos de nómina</h3>
            <button type="button" onClick={createRun} disabled={submitting}>
              {submitting ? 'Creando...' : `+ Crear nómina ${getCurrentPeriod()}`}
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Período</th>
                  <th>Estado</th>
                  <th>Bruto</th>
                  <th>Desc.</th>
                  <th>Neto</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} style={{ cursor: 'pointer' }}>
                    <td>
                      <strong>{run.period}</strong>
                      {run.ProcessedBy && <small className="cell-note">por {run.ProcessedBy.name}</small>}
                    </td>
                    <td>
                      <span
                        className="pill"
                        style={STATUS_COLORS[run.status]}
                      >
                        {STATUS_LABELS[run.status]}
                      </span>
                    </td>
                    <td>{fmt(run.totalGross)}</td>
                    <td>{fmt(run.totalDeductions)}</td>
                    <td><strong>{fmt(run.totalNet)}</strong></td>
                    <td>
                      <div className="row-actions">
                        <button type="button" className="ghost" onClick={() => loadRun(run.id)}>
                          Ver detalle
                        </button>
                        {run.status === 'draft' && (
                          <button type="button" className="ghost" onClick={() => closeRun(run.id, 'processed')}>
                            Procesar
                          </button>
                        )}
                        {run.status === 'processed' && (
                          <button type="button" className="ghost" onClick={() => closeRun(run.id, 'paid')}>
                            Marcar pagada
                          </button>
                        )}
                        <button type="button" className="ghost" onClick={() => exportRun(run.id, run.period)}>
                          Excel
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!runs.length && (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-table">No hay nóminas registradas. Crea el primer período.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detalle del período seleccionado */}
      {selectedRun && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <div className="table-toolbar">
            <h3>
              Detalle: Nómina {selectedRun.period}{' '}
              <span className="pill" style={STATUS_COLORS[selectedRun.status]}>
                {STATUS_LABELS[selectedRun.status]}
              </span>
            </h3>
            <div className="row-actions">
              <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                Neto total: <strong>{fmt(selectedRun.totalNet)}</strong>
              </span>
              <button type="button" className="ghost" onClick={() => setSelectedRun(null)}>Cerrar</button>
            </div>
          </div>

          {loadingDetail ? (
            <p>Cargando detalle...</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Empleado</th>
                    <th>Cargo</th>
                    <th>Departamento</th>
                    <th>Salario base</th>
                    <th>Bonos</th>
                    <th>Descuentos</th>
                    <th>Bruto</th>
                    <th>Neto</th>
                    <th>Notas</th>
                    {selectedRun.status === 'draft' && <th>Editar</th>}
                  </tr>
                </thead>
                <tbody>
                  {(selectedRun.PayrollEntries || []).map((entry) => (
                    <tr key={entry.id}>
                      <td>
                        <strong>
                          {entry.Employee?.lastName}, {entry.Employee?.firstName}
                        </strong>
                        <small className="cell-note">{entry.Employee?.dni}</small>
                      </td>
                      <td>{entry.Employee?.position || '-'}</td>
                      <td>{entry.Employee?.Department?.name || '-'}</td>
                      <td>{fmt(entry.baseSalary)}</td>
                      <td>
                        {editingEntry === entry.id ? (
                          <input
                            type="number"
                            min="0"
                            style={{ width: '90px' }}
                            value={entryForm.bonuses}
                            onChange={(e) => setEntryForm((p) => ({ ...p, bonuses: e.target.value }))}
                          />
                        ) : (
                          fmt(entry.bonuses)
                        )}
                      </td>
                      <td>
                        {editingEntry === entry.id ? (
                          <input
                            type="number"
                            min="0"
                            style={{ width: '90px' }}
                            value={entryForm.deductions}
                            onChange={(e) => setEntryForm((p) => ({ ...p, deductions: e.target.value }))}
                          />
                        ) : (
                          fmt(entry.deductions)
                        )}
                      </td>
                      <td>{fmt(entry.grossSalary)}</td>
                      <td><strong>{fmt(entry.netSalary)}</strong></td>
                      <td>
                        {editingEntry === entry.id ? (
                          <input
                            style={{ width: '120px' }}
                            value={entryForm.notes}
                            onChange={(e) => setEntryForm((p) => ({ ...p, notes: e.target.value }))}
                          />
                        ) : (
                          entry.notes || '-'
                        )}
                      </td>
                      {selectedRun.status === 'draft' && (
                        <td>
                          {editingEntry === entry.id ? (
                            <div className="row-actions">
                              <button
                                type="button"
                                className="ghost"
                                disabled={submitting}
                                onClick={() => saveEntry(selectedRun.id, entry.id)}
                              >
                                Guardar
                              </button>
                              <button type="button" className="ghost" onClick={cancelEditEntry}>X</button>
                            </div>
                          ) : (
                            <button type="button" className="ghost" onClick={() => openEditEntry(entry)}>
                              Editar
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                  {!(selectedRun.PayrollEntries || []).length && (
                    <tr>
                      <td colSpan={10}>
                        <div className="empty-table">Sin entradas en esta nómina.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
