import { useEffect, useMemo, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../state/AuthContext';

const STATUS_LABELS = { active: 'Activo', inactive: 'Inactivo', on_leave: 'Licencia' };
const SALARY_TYPE_LABELS = { monthly: 'Mensual', hourly: 'Por hora' };

const initialForm = {
  firstName: '',
  lastName: '',
  dni: '',
  email: '',
  phone: '',
  position: '',
  departmentId: '',
  salaryType: 'monthly',
  baseSalary: '',
  hireDate: '',
  status: 'active',
  address: ''
};

const fmt = (n) =>
  Number(n).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export default function EmployeesPage() {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'hr_admin';

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ── Nuevo departamento inline ─────────────────────────────────────────────
  const [newDeptName, setNewDeptName] = useState('');
  const [addingDept, setAddingDept] = useState(false);

  const loadData = async () => {
    const [empRes, deptRes] = await Promise.all([
      api.get('/employees', {
        params: {
          ...(filterDept ? { departmentId: filterDept } : {}),
          ...(filterStatus ? { status: filterStatus } : {}),
          ...(search ? { search } : {})
        }
      }),
      api.get('/departments')
    ]);
    setEmployees(empRes.data);
    setDepartments(deptRes.data);
  };

  useEffect(() => {
    setLoading(true);
    loadData()
      .catch(() => setError('No se pudieron cargar los datos.'))
      .finally(() => setLoading(false));
  }, [filterDept, filterStatus, search]);

  const kpis = useMemo(() => {
    const total = employees.length;
    const salaries = employees
      .filter((e) => e.salaryType === 'monthly')
      .map((e) => Number(e.baseSalary));
    const massaSalarial = salaries.reduce((s, v) => s + v, 0);
    const avg = salaries.length ? massaSalarial / salaries.length : 0;
    return { total, massaSalarial, avg };
  }, [employees]);

  const setField = (f, v) => setForm((p) => ({ ...p, [f]: v }));

  const openCreate = () => {
    setForm(initialForm);
    setEditingId(null);
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const openEdit = (emp) => {
    setForm({
      firstName: emp.firstName,
      lastName: emp.lastName,
      dni: emp.dni,
      email: emp.email || '',
      phone: emp.phone || '',
      position: emp.position,
      departmentId: String(emp.departmentId),
      salaryType: emp.salaryType,
      baseSalary: String(emp.baseSalary),
      hireDate: emp.hireDate || '',
      status: emp.status,
      address: emp.address || ''
    });
    setEditingId(emp.id);
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
    if (!form.firstName || !form.lastName || !form.dni || !form.position || !form.departmentId || !form.baseSalary) {
      setError('Completa todos los campos obligatorios.');
      return;
    }

    const payload = {
      ...form,
      departmentId: Number(form.departmentId),
      baseSalary: Number(form.baseSalary),
      hireDate: form.hireDate || null,
      email: form.email || null,
      phone: form.phone || null,
      address: form.address || null
    };

    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/employees/${editingId}`, payload);
        setSuccess('Empleado actualizado correctamente.');
      } else {
        await api.post('/employees', payload);
        setSuccess('Empleado creado correctamente.');
      }
      await loadData();
      cancelForm();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo guardar el empleado.');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteEmployee = async (id, name) => {
    if (!window.confirm(`¿Eliminar a ${name}? Esta acción no se puede deshacer.`)) return;
    try {
      await api.delete(`/employees/${id}`);
      setSuccess('Empleado eliminado.');
      await loadData();
    } catch {
      setError('No se pudo eliminar el empleado.');
    }
  };

  const addDepartment = async () => {
    if (!newDeptName.trim()) return;
    setAddingDept(true);
    try {
      const { data } = await api.post('/departments', { name: newDeptName.trim() });
      setDepartments((prev) => [...prev, data]);
      setField('departmentId', String(data.id));
      setNewDeptName('');
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo crear el departamento.');
    } finally {
      setAddingDept(false);
    }
  };

  if (loading) {
    return (
      <section>
        <h1>Gestión de Empleados</h1>
        <p>Cargando...</p>
      </section>
    );
  }

  return (
    <section className="movements-page">
      <header className="card movement-hero">
        <span className="kicker">Recursos Humanos</span>
        <h1>Gestión de Empleados</h1>
        <p>Administra el personal por departamento, cargo y salario.</p>
      </header>

      {/* KPIs */}
      <div className="movement-kpis" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <article className="card" style={{ flex: 1, textAlign: 'center', padding: '1rem' }}>
          <small>Empleados mostrados</small>
          <strong style={{ display: 'block', fontSize: '1.8rem' }}>{kpis.total}</strong>
        </article>
        <article className="card" style={{ flex: 1, textAlign: 'center', padding: '1rem' }}>
          <small>Masa salarial (mensual)</small>
          <strong style={{ display: 'block', fontSize: '1.4rem' }}>{fmt(kpis.massaSalarial)}</strong>
        </article>
        <article className="card" style={{ flex: 1, textAlign: 'center', padding: '1rem' }}>
          <small>Salario promedio</small>
          <strong style={{ display: 'block', fontSize: '1.4rem' }}>{fmt(kpis.avg)}</strong>
        </article>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success-banner">{success}</div>}

      {/* Filtros + botón nuevo */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="table-toolbar">
          <div className="row-actions" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
            <input
              placeholder="Buscar nombre, DNI o cargo…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ minWidth: '200px' }}
            />
            <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
              <option value="">Todos los departamentos</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
              <option value="on_leave">En licencia</option>
            </select>
          </div>
          {canEdit && (
            <button type="button" onClick={openCreate}>+ Nuevo empleado</button>
          )}
        </div>
      </div>

      {/* Formulario */}
      {showForm && canEdit && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3>{editingId ? 'Editar empleado' : 'Nuevo empleado'}</h3>
          <form onSubmit={submit}>
            <div className="inline-grid two">
              <label>
                Nombre *
                <input value={form.firstName} onChange={(e) => setField('firstName', e.target.value)} required />
              </label>
              <label>
                Apellido *
                <input value={form.lastName} onChange={(e) => setField('lastName', e.target.value)} required />
              </label>
            </div>
            <div className="inline-grid two">
              <label>
                DNI / Cédula *
                <input value={form.dni} onChange={(e) => setField('dni', e.target.value)} required />
              </label>
              <label>
                Cargo / Posición *
                <input value={form.position} onChange={(e) => setField('position', e.target.value)} required />
              </label>
            </div>
            <div className="inline-grid two">
              <label>
                Departamento *
                <select value={form.departmentId} onChange={(e) => setField('departmentId', e.target.value)} required>
                  <option value="">Selecciona departamento</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </label>
              <div>
                <small>Crear departamento rápido</small>
                <div className="row-actions" style={{ marginTop: '0.3rem' }}>
                  <input
                    placeholder="Nombre del departamento"
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                  />
                  <button type="button" className="ghost" onClick={addDepartment} disabled={addingDept}>
                    {addingDept ? '...' : 'Crear'}
                  </button>
                </div>
              </div>
            </div>
            <div className="inline-grid two">
              <label>
                Tipo de salario
                <select value={form.salaryType} onChange={(e) => setField('salaryType', e.target.value)}>
                  <option value="monthly">Mensual</option>
                  <option value="hourly">Por hora</option>
                </select>
              </label>
              <label>
                Salario base *
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.baseSalary}
                  onChange={(e) => setField('baseSalary', e.target.value)}
                  required
                />
              </label>
            </div>
            <div className="inline-grid two">
              <label>
                Email
                <input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} />
              </label>
              <label>
                Teléfono
                <input value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
              </label>
            </div>
            <div className="inline-grid two">
              <label>
                Fecha de ingreso
                <input type="date" value={form.hireDate} onChange={(e) => setField('hireDate', e.target.value)} />
              </label>
              <label>
                Estado
                <select value={form.status} onChange={(e) => setField('status', e.target.value)}>
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                  <option value="on_leave">En licencia</option>
                </select>
              </label>
            </div>
            <label>
              Dirección
              <input value={form.address} onChange={(e) => setField('address', e.target.value)} />
            </label>
            <div className="row-actions" style={{ marginTop: '1rem' }}>
              <button type="submit" disabled={submitting}>
                {submitting ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear empleado'}
              </button>
              <button type="button" className="ghost" onClick={cancelForm}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Tabla de empleados */}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>DNI</th>
                <th>Cargo</th>
                <th>Departamento</th>
                <th>Salario</th>
                <th>Tipo</th>
                <th>Ingreso</th>
                <th>Estado</th>
                {canEdit && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id}>
                  <td>
                    <strong>{emp.lastName}, {emp.firstName}</strong>
                    {emp.email && <small className="cell-note">{emp.email}</small>}
                  </td>
                  <td>{emp.dni}</td>
                  <td>{emp.position}</td>
                  <td>{emp.Department?.name || '-'}</td>
                  <td>{fmt(emp.baseSalary)}</td>
                  <td>{SALARY_TYPE_LABELS[emp.salaryType]}</td>
                  <td>{emp.hireDate || '-'}</td>
                  <td>
                    <span
                      className="pill"
                      style={{
                        background: emp.status === 'active' ? '#d1fae5' : emp.status === 'on_leave' ? '#fef3c7' : '#fee2e2',
                        color: emp.status === 'active' ? '#065f46' : emp.status === 'on_leave' ? '#92400e' : '#991b1b'
                      }}
                    >
                      {STATUS_LABELS[emp.status]}
                    </span>
                  </td>
                  {canEdit && (
                    <td>
                      <div className="row-actions">
                        <button type="button" className="ghost" onClick={() => openEdit(emp)}>Editar</button>
                        {user?.role === 'admin' && (
                          <button
                            type="button"
                            className="ghost"
                            style={{ color: '#dc2626' }}
                            onClick={() => deleteEmployee(emp.id, `${emp.firstName} ${emp.lastName}`)}
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {!employees.length && (
                <tr>
                  <td colSpan={canEdit ? 9 : 8}>
                    <div className="empty-table">No hay empleados para los filtros actuales.</div>
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
