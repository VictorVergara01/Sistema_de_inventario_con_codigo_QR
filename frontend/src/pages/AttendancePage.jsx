import { useEffect, useMemo, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../state/AuthContext';

const STATUS_LABELS = {
  present: 'Presente',
  absent: 'Ausente',
  late: 'Tardanza',
  leave: 'Licencia',
  holiday: 'Festivo'
};

const STATUS_COLORS = {
  present: { bg: '#d1fae5', color: '#065f46' },
  absent: { bg: '#fee2e2', color: '#991b1b' },
  late: { bg: '#fef3c7', color: '#92400e' },
  leave: { bg: '#dbeafe', color: '#1e40af' },
  holiday: { bg: '#f3f4f6', color: '#374151' }
};

const getToday = () => new Date().toISOString().split('T')[0];
const getMonthStart = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

const initialForm = {
  employeeId: '',
  date: getToday(),
  status: 'present',
  checkIn: '',
  checkOut: '',
  hoursWorked: '',
  notes: ''
};

export default function AttendancePage() {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'hr_admin';

  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [filterEmployee, setFilterEmployee] = useState('');
  const [dateFrom, setDateFrom] = useState(getMonthStart());
  const [dateTo, setDateTo] = useState(getToday());

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadRecords = async () => {
    const { data } = await api.get('/attendance', {
      params: {
        ...(filterEmployee ? { employeeId: filterEmployee } : {}),
        ...(dateFrom ? { dateFrom } : {}),
        ...(dateTo ? { dateTo } : {})
      }
    });
    setRecords(data);
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [, empRes] = await Promise.all([loadRecords(), api.get('/employees', { params: { status: 'active' } })]);
        setEmployees(empRes.data);
      } catch {
        setError('No se pudieron cargar los datos.');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!loading) {
      loadRecords().catch(() => setError('Error al cargar asistencias.'));
    }
  }, [filterEmployee, dateFrom, dateTo]);

  const summary = useMemo(() => {
    const counts = { present: 0, absent: 0, late: 0, leave: 0, holiday: 0 };
    for (const r of records) counts[r.status] = (counts[r.status] || 0) + 1;
    return counts;
  }, [records]);

  const setField = (f, v) => setForm((p) => ({ ...p, [f]: v }));

  const openCreate = () => {
    setForm(initialForm);
    setEditingId(null);
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const openEdit = (rec) => {
    setForm({
      employeeId: String(rec.employeeId),
      date: rec.date,
      status: rec.status,
      checkIn: rec.checkIn || '',
      checkOut: rec.checkOut || '',
      hoursWorked: rec.hoursWorked !== null ? String(rec.hoursWorked) : '',
      notes: rec.notes || ''
    });
    setEditingId(rec.id);
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(initialForm);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.employeeId || !form.date || !form.status) {
      setError('Empleado, fecha y estado son obligatorios.');
      return;
    }

    const payload = {
      employeeId: Number(form.employeeId),
      date: form.date,
      status: form.status,
      checkIn: form.checkIn || null,
      checkOut: form.checkOut || null,
      hoursWorked: form.hoursWorked ? Number(form.hoursWorked) : null,
      notes: form.notes || null
    };

    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/attendance/${editingId}`, payload);
        setSuccess('Registro actualizado.');
      } else {
        await api.post('/attendance', payload);
        setSuccess('Asistencia registrada.');
      }
      await loadRecords();
      cancelForm();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo guardar el registro.');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteRecord = async (id) => {
    if (!window.confirm('¿Eliminar este registro de asistencia?')) return;
    try {
      await api.delete(`/attendance/${id}`);
      setSuccess('Registro eliminado.');
      await loadRecords();
    } catch {
      setError('No se pudo eliminar el registro.');
    }
  };

  if (loading) {
    return (
      <section>
        <h1>Asistencia</h1>
        <p>Cargando...</p>
      </section>
    );
  }

  return (
    <section className="movements-page">
      <header className="card movement-hero">
        <span className="kicker">Recursos Humanos</span>
        <h1>Control de Asistencia</h1>
        <p>Registra y consulta la asistencia diaria del personal por empleado y período.</p>
      </header>

      {/* Resumen del período filtrado */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {Object.entries(summary).map(([status, count]) => (
          <article
            key={status}
            className="card"
            style={{ flex: '1 1 100px', textAlign: 'center', padding: '0.75rem', minWidth: '90px' }}
          >
            <small>{STATUS_LABELS[status]}</small>
            <strong style={{ display: 'block', fontSize: '1.6rem', color: STATUS_COLORS[status].color }}>
              {count}
            </strong>
          </article>
        ))}
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success-banner">{success}</div>}

      {/* Filtros */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="table-toolbar">
          <div className="row-actions" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
            <select value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)}>
              <option value="">Todos los empleados</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.lastName}, {e.firstName}
                </option>
              ))}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
              Desde
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
              Hasta
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </label>
          </div>
          {canEdit && (
            <button type="button" onClick={openCreate}>+ Registrar asistencia</button>
          )}
        </div>
      </div>

      {/* Formulario */}
      {showForm && canEdit && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3>{editingId ? 'Editar registro' : 'Registrar asistencia'}</h3>
          <form onSubmit={submit}>
            <div className="inline-grid two">
              <label>
                Empleado *
                <select value={form.employeeId} onChange={(e) => setField('employeeId', e.target.value)} required>
                  <option value="">Selecciona empleado</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.lastName}, {e.firstName} — {e.position}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Fecha *
                <input type="date" value={form.date} onChange={(e) => setField('date', e.target.value)} required />
              </label>
            </div>
            <div className="inline-grid two">
              <label>
                Estado *
                <select value={form.status} onChange={(e) => setField('status', e.target.value)}>
                  <option value="present">Presente</option>
                  <option value="absent">Ausente</option>
                  <option value="late">Tardanza</option>
                  <option value="leave">Licencia</option>
                  <option value="holiday">Festivo</option>
                </select>
              </label>
              <label>
                Horas trabajadas
                <input
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  value={form.hoursWorked}
                  onChange={(e) => setField('hoursWorked', e.target.value)}
                />
              </label>
            </div>
            <div className="inline-grid two">
              <label>
                Check-in
                <input type="time" value={form.checkIn} onChange={(e) => setField('checkIn', e.target.value)} />
              </label>
              <label>
                Check-out
                <input type="time" value={form.checkOut} onChange={(e) => setField('checkOut', e.target.value)} />
              </label>
            </div>
            <label>
              Notas
              <input value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
            </label>
            <div className="row-actions" style={{ marginTop: '1rem' }}>
              <button type="submit" disabled={submitting}>
                {submitting ? 'Guardando...' : editingId ? 'Actualizar' : 'Registrar'}
              </button>
              <button type="button" className="ghost" onClick={cancelForm}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Tabla */}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Empleado</th>
                <th>Cargo</th>
                <th>Estado</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Horas</th>
                <th>Notas</th>
                {canEdit && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {records.map((rec) => (
                <tr key={rec.id}>
                  <td>{rec.date}</td>
                  <td>
                    <strong>
                      {rec.Employee?.lastName}, {rec.Employee?.firstName}
                    </strong>
                    <small className="cell-note">{rec.Employee?.Department?.name}</small>
                  </td>
                  <td>{rec.Employee?.position || '-'}</td>
                  <td>
                    <span className="pill" style={STATUS_COLORS[rec.status]}>
                      {STATUS_LABELS[rec.status]}
                    </span>
                  </td>
                  <td>{rec.checkIn || '-'}</td>
                  <td>{rec.checkOut || '-'}</td>
                  <td>{rec.hoursWorked !== null ? `${rec.hoursWorked}h` : '-'}</td>
                  <td>{rec.notes || '-'}</td>
                  {canEdit && (
                    <td>
                      <div className="row-actions">
                        <button type="button" className="ghost" onClick={() => openEdit(rec)}>Editar</button>
                        {user?.role === 'admin' && (
                          <button
                            type="button"
                            className="ghost"
                            style={{ color: '#dc2626' }}
                            onClick={() => deleteRecord(rec.id)}
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {!records.length && (
                <tr>
                  <td colSpan={canEdit ? 9 : 8}>
                    <div className="empty-table">No hay registros para los filtros seleccionados.</div>
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
