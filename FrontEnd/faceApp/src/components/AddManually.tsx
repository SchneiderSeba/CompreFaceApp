import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import './AddManually.css';
import type { CaptureResponse, Employee } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'https://comprefaceapp-production-a8a0.up.railway.app';

interface AddManuallyProps {
  onUnauthorized: () => void;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
    reader.readAsDataURL(file);
  });
}

export const AddManually: React.FC<AddManuallyProps> = ({ onUnauthorized }) => {
  const [name, setName] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [image, setImage] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [result, setResult] = useState<CaptureResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleApiError = useCallback((unknownError: unknown) => {
    if (axios.isAxiosError(unknownError)) {
      if (unknownError.response?.status === 401) onUnauthorized();
      return unknownError.response?.data?.error || unknownError.message;
    }
    return unknownError instanceof Error ? unknownError.message : 'Ocurrió un error inesperado';
  }, [onUnauthorized]);

  const loadEmployees = useCallback(async () => {
    try {
      const response = await axios.get<{ employees: Employee[] }>(`${API_URL}/api/employees`, {
        withCredentials: true
      });
      setEmployees(response.data.employees);
    } catch (unknownError) {
      setError(handleApiError(unknownError));
    }
  }, [handleApiError]);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  const handleFile = async (file?: File) => {
    setResult(null);
    setError(null);
    if (!file) return setImage('');
    if (!file.type.startsWith('image/')) return setError('Selecciona un archivo de imagen');
    if (file.size > 10 * 1024 * 1024) return setError('La imagen no puede superar los 10 MB');

    try {
      setImage(await readFileAsDataUrl(file));
    } catch (unknownError) {
      setError(handleApiError(unknownError));
    }
  };

  const submitEmployee = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await axios.post<CaptureResponse>(`${API_URL}/api/employees`, {
        name,
        employeeCode,
        image
      }, { withCredentials: true });
      setResult(response.data);
      setName('');
      setEmployeeCode('');
      setImage('');
      await loadEmployees();
    } catch (unknownError) {
      setError(handleApiError(unknownError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="manual-section" aria-labelledby="manual-title">
      <div className="manual-heading">
        <div>
          <p className="eyebrow">Administración</p>
          <h2 id="manual-title">Agregar persona manualmente</h2>
        </div>
        <span className="admin-badge">Solo admin</span>
      </div>

      <div className="manual-grid">
        <form className="employee-form" onSubmit={submitEmployee}>
          <label>
            Nombre completo
            <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} />
          </label>
          <label>
            Legajo
            <input
              value={employeeCode}
              onChange={(event) => setEmployeeCode(event.target.value.toUpperCase())}
              placeholder="EMP-001"
              pattern="[A-Za-z0-9_-]{2,32}"
              required
            />
          </label>
          <label className="file-field">
            Foto de referencia
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => void handleFile(event.target.files?.[0])}
              required={!image}
            />
          </label>

          {image && <img className="manual-preview" src={image} alt="Vista previa de la persona" />}
          {error && <p className="form-message form-message--error">{error}</p>}
          {result && (
            <p className="form-message form-message--success">
              {result.name} ({result.employeeCode}) fue agregado correctamente.
            </p>
          )}

          <button className="primary-action" disabled={loading || !name.trim() || !employeeCode.trim() || !image}>
            {loading ? 'Guardando…' : 'Agregar empleado'}
          </button>
        </form>

        <div className="employee-list-panel">
          <div className="employee-list-heading">
            <h3>Empleados registrados</h3>
            <span>{employees.length}</span>
          </div>
          {employees.length === 0 ? (
            <p className="empty-employees">Todavía no hay empleados registrados en esta base.</p>
          ) : (
            <ul className="employee-list">
              {employees.map((employee) => (
                <li key={employee.id}>
                  <span className="employee-avatar">{employee.displayName.charAt(0).toUpperCase()}</span>
                  <span>
                    <strong>{employee.displayName}</strong>
                    <small>{employee.employeeCode}</small>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
};
