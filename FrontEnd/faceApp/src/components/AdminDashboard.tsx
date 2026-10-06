import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { AddManually } from './AddManually';
import type { AuthUser, DashboardStats, Employee, FaceDiagnostic, CheckInPage } from '../types';
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
  const [diagnostics, setDiagnostics] = useState<FaceDiagnostic[]>([]);
  const [diagnosticSubject, setDiagnosticSubject] = useState('');
  const [diagnosticEmployeeId, setDiagnosticEmployeeId] = useState<number | null>(null);
  const [diagnosticSaving, setDiagnosticSaving] = useState(false);
  const [checkIns, setCheckIns] = useState<CheckInPage>({ page: 1, pageSize: 20, total: 0, items: [] });
  const [reportFilters, setReportFilters] = useState({ from: '', to: '', employeeId: '', period: 'week', page: '1' });

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
      const params = Object.fromEntries(Object.entries(reportFilters).filter(([, value]) => value));
      const [employeeResponse, statsResponse, diagnosticsResponse, checkInResponse] = await Promise.all([
        axios.get<{ employees: Employee[] }>(`${API_URL}/api/employees`, { withCredentials: true }),
        axios.get<DashboardStats>(`${API_URL}/api/admin/reports`, { params, withCredentials: true }),
        axios.get<{ diagnostics: FaceDiagnostic[] }>(`${API_URL}/api/admin/face-diagnostics`, { withCredentials: true }),
        axios.get<CheckInPage>(`${API_URL}/api/admin/check-ins`, { params, withCredentials: true })
      ]);
      setEmployees(employeeResponse.data.employees);
      setStats(statsResponse.data);
      setDiagnostics(diagnosticsResponse.data.diagnostics);
      setCheckIns(checkInResponse.data);
    } catch (unknownError) {
      setError(handleError(unknownError));
    } finally {
      setLoading(false);
    }
  }, [handleError, reportFilters]);

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
    setDiagnosticSubject(employee.comprefaceSubject);
  };

  const saveDiagnosticSubject = async (diagnostic: FaceDiagnostic) => {
    setDiagnosticSaving(true);
    try {
      await axios.patch(`${API_URL}/api/admin/face-diagnostics/${diagnostic.employee.id}`, { subject: diagnosticSubject }, { withCredentials: true });
      await loadDashboard();
    } catch (unknownError) {
      setEditError(handleError(unknownError));
    } finally {
      setDiagnosticSaving(false);
    }
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
            <section className="dashboard-panel report-filters" aria-label="Filtros de reportes">
              <div className="panel-heading"><div><p className="app-kicker">Reportes</p><h3>Período y empleado</h3></div><button className="secondary-action" onClick={() => window.open(`${API_URL}/api/admin/reports/daily.csv?${new URLSearchParams(Object.fromEntries(Object.entries(reportFilters).filter(([, value]) => value)))}`, '_blank')}>Descargar CSV</button></div>
              <div className="filter-row">
                <label>Desde<input type="date" value={reportFilters.from} onChange={(event) => setReportFilters((current) => ({ ...current, from: event.target.value }))} /></label>
                <label>Hasta<input type="date" value={reportFilters.to} onChange={(event) => setReportFilters((current) => ({ ...current, to: event.target.value }))} /></label>
                <label>Empleado<select value={reportFilters.employeeId} onChange={(event) => setReportFilters((current) => ({ ...current, employeeId: event.target.value }))}><option value="">Todos</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.displayName}</option>)}</select></label>
                <label>Vista<select value={reportFilters.period} onChange={(event) => setReportFilters((current) => ({ ...current, period: event.target.value }))}><option value="day">Día</option><option value="week">Semana</option><option value="month">Mes</option><option value="range">Rango</option></select></label>
              </div>
            </section>
            <section className="stat-grid" aria-label="Resumen">
              <article><span>Empleados</span><strong>{stats.totals.employees}</strong><small>registrados</small></article>
              <article><span>Check-ins hoy</span><strong>{stats.totals.todayCheckIns}</strong><small>{stats.totals.todayEmployees} empleados</small></article>
              <article><span>Check-ins totales</span><strong>{stats.totals.checkIns}</strong><small>histórico</small></article>
              <article><span>Primeros ingresos</span><strong>{stats.report?.firstEntries ?? 0}</strong><small>en el período</small></article>
              <article><span>Ingresos tardíos</span><strong>{stats.report?.lateCheckIns ?? 0}</strong><small>después de las 09:00</small></article>
              <article><span>Activos / ausentes</span><strong>{stats.report?.activeEmployees ?? 0} / {stats.report?.absences ?? 0}</strong><small>en el período</small></article>
            </section>

            <section className="dashboard-grid">
              <article className="dashboard-panel">
                <div className="panel-heading"><div><p className="app-kicker">Últimos 7 días</p><h3>Ingresos por día</h3></div></div>
                <div className="daily-chart" aria-label="Gráfico de ingresos diarios">
                    {(stats.report?.chart ?? stats.dailyCheckIns).map((item) => (
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
            <section className="dashboard-panel recent-panel">
              <div className="panel-heading"><div><p className="app-kicker">Historial paginado</p><h3>Detalle de check-ins</h3></div><span>{checkIns.total} registros</span></div>
              {checkIns.items.length === 0 ? <p className="admin-empty">No hay registros para los filtros seleccionados.</p> : <div className="recent-list">{checkIns.items.map((item) => <div key={item.id}><span className="employee-avatar">{item.displayName.charAt(0).toUpperCase()}</span><span><strong>{item.displayName}</strong><small>{item.employeeCode} · {formatDateTime(item.checkedInAt)}</small></span><b>{item.similarity == null ? '—' : `${(item.similarity * 100).toFixed(1)}%`}</b><small>Detección: {item.detectionProbability == null ? '—' : `${(item.detectionProbability * 100).toFixed(1)}%`}</small></div>)}</div>}
              <div className="modal-actions"><button className="secondary-action" disabled={checkIns.page <= 1} onClick={() => setReportFilters((current) => ({ ...current, page: String(checkIns.page - 1) }))}>Anterior</button><span>Página {checkIns.page}</span><button className="secondary-action" disabled={checkIns.page * checkIns.pageSize >= checkIns.total} onClick={() => setReportFilters((current) => ({ ...current, page: String(checkIns.page + 1) }))}>Siguiente</button></div>
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
            <section className="dashboard-panel employee-table-panel">
              <div className="panel-heading"><div><p className="app-kicker">CompreFace</p><h3>Diagnóstico de sincronización</h3></div></div>
              <div className="employee-table-wrap">
                <table className="employee-table">
                  <thead><tr><th>Empleado</th><th>Subject</th><th>Image ID</th><th>Estado</th><th>Acción</th></tr></thead>
                  <tbody>{diagnostics.map((diagnostic) => (
                    <tr key={diagnostic.employee.id}>
                      <td>{diagnostic.employee.displayName}</td>
                      <td><input aria-label={`Subject de ${diagnostic.employee.displayName}`} value={diagnosticEmployeeId === diagnostic.employee.id ? diagnosticSubject : diagnostic.subject} onChange={(event) => { setDiagnosticEmployeeId(diagnostic.employee.id); setDiagnosticSubject(event.target.value); }} /></td>
                      <td>{diagnostic.imageId || '—'}</td>
                      <td>{diagnostic.synchronization === 'linked' ? 'Vinculado' : 'Incompleto'}</td>
                      <td><button className="secondary-action" disabled={diagnosticSaving || !diagnosticSubject || diagnosticEmployeeId !== diagnostic.employee.id} onClick={() => void saveDiagnosticSubject(diagnostic)}>Guardar</button></td>
                    </tr>
                  ))}</tbody>
                </table>
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
