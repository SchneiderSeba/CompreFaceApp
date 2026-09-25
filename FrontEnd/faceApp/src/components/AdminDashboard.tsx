import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { AddManually } from './AddManually';
import type { AuthUser, DashboardStats, Employee } from '../types';
import './AdminDashboard.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://comprefaceapp-production-a8a0.up.railway.app';

interface AdminDashboardProps {
  user: AuthUser;
  section: 'charts' | 'employees';
  onNavigate: (path: string) => void;
  onLogout: () => void;
  onUnauthorized: () => void;
}

const parseDatabaseDate = (value: string) => new Date(
  value.endsWith('Z') ? value : `${value.replace(' ', 'T')}Z`
);

const formatDateTime = (value: string | null) => value
  ? parseDatabaseDate(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  : 'Sin registros';

export function AdminDashboard({
  user,
  section,
  onNavigate,
  onLogout,
  onUnauthorized
}: AdminDashboardProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const handleError = useCallback((unknownError: unknown) => {
    if (axios.isAxiosError(unknownError)) {
      if (unknownError.response?.status === 401 || unknownError.response?.status === 403) {
        onUnauthorized();
      }
      return unknownError.response?.data?.error || unknownError.message;
    }
    return unknownError instanceof Error ? unknownError.message : 'No se pudieron cargar los datos';
  }, [onUnauthorized]);

  const loadDashboard = useCallback(async () => {
    setError(null);
    try {
      const [employeeResponse, statsResponse] = await Promise.all([
        axios.get<{ employees: Employee[] }>(`${API_URL}/api/employees`, { withCredentials: true }),
        axios.get<DashboardStats>(`${API_URL}/api/admin/dashboard`, { withCredentials: true })
      ]);
      setEmployees(employeeResponse.data.employees);
      setStats(statsResponse.data);
    } catch (unknownError) {
      setError(handleError(unknownError));
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!selectedEmployee) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedEmployee(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [selectedEmployee]);

  const openEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setEditName(employee.displayName);
    setEditCode(employee.employeeCode);
    setEditError(null);
  };

  const employeeCreated = (employee: Employee) => {
    setEmployees((current) => [employee, ...current.filter((item) => item.id !== employee.id)]);
    void loadDashboard();
  };

  const saveEmployee = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedEmployee) return;
    setSaving(true);
    setEditError(null);
    try {
      const response = await axios.patch<{ employee: Employee }>(
        `${API_URL}/api/employees/${selectedEmployee.id}`,
        { displayName: editName, employeeCode: editCode },
        { withCredentials: true }
      );
      setEmployees((current) => current.map((employee) => (
        employee.id === response.data.employee.id ? response.data.employee : employee
      )));
      setSelectedEmployee(response.data.employee);
      await loadDashboard();
      setSelectedEmployee(null);
    } catch (unknownError) {
      setEditError(handleError(unknownError));
    } finally {
      setSaving(false);
    }
  };

  const maxDaily = useMemo(
    () => Math.max(1, ...(stats?.dailyCheckIns.map((item) => item.count) || [1])),
    [stats]
  );
  const maxEmployee = useMemo(
    () => Math.max(1, ...(stats?.employeeActivity.map((item) => item.count) || [1])),
    [stats]
  );

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div>
          <p className="app-kicker">Face Recognition</p>
          <h1>Administración</h1>
        </div>
        <nav aria-label="Administración">
          <button
            className={section === 'charts' ? 'active' : ''}
            onClick={() => onNavigate('/admin/charts')}
          >
            <span>▥</span> Charts
          </button>
          <button
            className={section === 'employees' ? 'active' : ''}
            onClick={() => onNavigate('/admin/employees')}
          >
            <span>♙</span> Empleados
          </button>
        </nav>
        <div className="admin-sidebar-footer">
          <button onClick={() => onNavigate('/')}><span>←</span> Volver al check-in</button>
          <button onClick={onLogout}><span>↪</span> Cerrar sesión</button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="app-kicker">Panel protegido</p>
            <h2>{section === 'charts' ? 'Resumen de actividad' : 'Gestión de empleados'}</h2>
          </div>
          <div className="admin-identity">
            <span>{user.displayName.charAt(0).toUpperCase()}</span>
            <div><small>Administrador</small><strong>{user.displayName}</strong></div>
          </div>
        </header>

        {loading && <div className="admin-state">Cargando información…</div>}
        {error && <div className="admin-state admin-state--error">{error}</div>}

        {!loading && !error && section === 'charts' && stats && (
          <div className="admin-content">
            <section className="stat-grid" aria-label="Resumen">
              <article><span>Empleados</span><strong>{stats.totals.employees}</strong><small>registrados</small></article>
              <article><span>Check-ins hoy</span><strong>{stats.totals.todayCheckIns}</strong><small>{stats.totals.todayEmployees} empleados</small></article>
              <article><span>Check-ins totales</span><strong>{stats.totals.checkIns}</strong><small>histórico</small></article>
            </section>

            <section className="dashboard-grid">
              <article className="dashboard-panel">
                <div className="panel-heading"><div><p className="app-kicker">Últimos 7 días</p><h3>Ingresos por día</h3></div></div>
                <div className="daily-chart" aria-label="Gráfico de ingresos diarios">
                  {stats.dailyCheckIns.map((item) => (
                    <div className="daily-column" key={item.day}>
                      <span className="daily-value">{item.count}</span>
                      <div><i style={{ height: `${Math.max(4, (item.count / maxDaily) * 100)}%` }} /></div>
                      <small>{new Date(`${item.day}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' })}</small>
                    </div>
                  ))}
                </div>
              </article>

              <article className="dashboard-panel">
                <div className="panel-heading"><div><p className="app-kicker">Comparativa</p><h3>Actividad por empleado</h3></div></div>
                <div className="activity-chart">
                  {stats.employeeActivity.length === 0 && <p className="admin-empty">No hay empleados registrados.</p>}
                  {stats.employeeActivity.map((item) => (
                    <button key={item.employeeId} onClick={() => {
                      const employee = employees.find((entry) => entry.id === item.employeeId);
                      if (employee) openEmployee(employee);
                    }}>
                      <span><strong>{item.displayName}</strong><small>{item.employeeCode}</small></span>
                      <i><b style={{ width: `${(item.count / maxEmployee) * 100}%` }} /></i>
                      <em>{item.count}</em>
                    </button>
                  ))}
                </div>
              </article>
            </section>

            <section className="dashboard-panel recent-panel">
              <div className="panel-heading"><div><p className="app-kicker">En tiempo real</p><h3>Últimos check-ins</h3></div></div>
              {stats.recentCheckIns.length === 0 ? <p className="admin-empty">Todavía no hay check-ins.</p> : (
                <div className="recent-list">
                  {stats.recentCheckIns.map((item) => (
                    <div key={item.id}>
                      <span className="employee-avatar">{item.displayName.charAt(0).toUpperCase()}</span>
                      <span><strong>{item.displayName}</strong><small>{item.employeeCode}</small></span>
                      <time>{formatDateTime(item.checkedInAt)}</time>
                      <b>{item.similarity == null ? '—' : `${(item.similarity * 100).toFixed(1)}%`}</b>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {!loading && !error && section === 'employees' && (
          <div className="admin-content">
            <AddManually
              onUnauthorized={onUnauthorized}
              onEmployeeCreated={employeeCreated}
              showEmployeeList={false}
            />

            <section className="dashboard-panel employee-table-panel">
              <div className="panel-heading">
                <div><p className="app-kicker">Base de datos</p><h3>Empleados registrados</h3></div>
                <span className="table-count">{employees.length}</span>
              </div>
              <div className="employee-table-wrap">
                <table className="employee-table">
                  <thead><tr><th>Empleado</th><th>Legajo</th><th>Check-ins</th><th>Último ingreso</th><th>Alta</th></tr></thead>
                  <tbody>
                    {employees.map((employee) => (
                      <tr key={employee.id}>
                        <td>
                          <button className="employee-name-button" onClick={() => openEmployee(employee)}>
                            <span className="employee-avatar">{employee.displayName.charAt(0).toUpperCase()}</span>
                            <strong>{employee.displayName}</strong>
                          </button>
                        </td>
                        <td>{employee.employeeCode}</td>
                        <td>{employee.checkInCount}</td>
                        <td>{formatDateTime(employee.lastCheckInAt)}</td>
                        <td>{formatDateTime(employee.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {employees.length === 0 && <p className="admin-empty">No hay empleados registrados.</p>}
              </div>
            </section>
          </div>
        )}
      </main>

      {selectedEmployee && (
        <div className="employee-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedEmployee(null);
        }}>
          <section className="employee-modal" role="dialog" aria-modal="true" aria-labelledby="employee-modal-title">
            <header>
              <div><p className="app-kicker">Ficha del empleado</p><h2 id="employee-modal-title">{selectedEmployee.displayName}</h2></div>
              <button aria-label="Cerrar" onClick={() => setSelectedEmployee(null)}>×</button>
            </header>
            <form onSubmit={saveEmployee}>
              <label>Nombre completo<input value={editName} maxLength={120} required onChange={(event) => setEditName(event.target.value)} /></label>
              <label>Legajo<input value={editCode} pattern="[A-Za-z0-9_-]{2,32}" required onChange={(event) => setEditCode(event.target.value.toUpperCase())} /></label>
              <div className="employee-readonly-grid">
                <div><span>Referencia facial</span><strong>{selectedEmployee.comprefaceSubject}</strong></div>
                <div><span>Check-ins</span><strong>{selectedEmployee.checkInCount}</strong></div>
                <div><span>Último ingreso</span><strong>{formatDateTime(selectedEmployee.lastCheckInAt)}</strong></div>
                <div><span>Registrado</span><strong>{formatDateTime(selectedEmployee.createdAt)}</strong></div>
                <div><span>Última edición</span><strong>{formatDateTime(selectedEmployee.updatedAt)}</strong></div>
              </div>
              {editError && <p className="form-message form-message--error">{editError}</p>}
              <div className="modal-actions">
                <button type="button" className="secondary-action" onClick={() => setSelectedEmployee(null)}>Cancelar</button>
                <button className="primary-action" disabled={saving || !editName.trim() || !editCode.trim()}>{saving ? 'Guardando…' : 'Guardar cambios'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
