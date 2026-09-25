import type { RecognitionResponse } from '../types';
import './Welcome.css';

interface WelcomeProps {
  recognition: RecognitionResponse;
  onFinish: () => void;
}

export function Welcome({ recognition, onFinish }: WelcomeProps) {
  const employee = recognition.matchedEmployee;
  const checkIn = recognition.checkIn;

  if (!employee || !checkIn) return null;

  const similarity = checkIn.similarity == null ? null : Math.round(checkIn.similarity * 100);
  const detection = checkIn.detectionProbability == null
    ? null
    : Math.round(checkIn.detectionProbability * 100);
  const checkedInAt = new Date(checkIn.checkedInAt.endsWith('Z')
    ? checkIn.checkedInAt
    : `${checkIn.checkedInAt.replace(' ', 'T')}Z`);

  return (
    <main className="welcome-page">
      <section className="welcome-card">
        <div className="welcome-check">✓</div>
        <p className="app-kicker">Check-in confirmado</p>
        <h1>¡Bienvenido, {employee.displayName}!</h1>
        <p className="welcome-time">
          {checkedInAt.toLocaleDateString(undefined, { dateStyle: 'long' })} ·{' '}
          {checkedInAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>

        <dl className="employee-details">
          <div><dt>Nombre completo</dt><dd>{employee.displayName}</dd></div>
          <div><dt>Legajo</dt><dd>{employee.employeeCode}</dd></div>
          <div><dt>Empleado desde</dt><dd>{new Date(employee.createdAt).toLocaleDateString()}</dd></div>
          <div><dt>Check-in Nº</dt><dd>{checkIn.id}</dd></div>
          {similarity != null && <div><dt>Coincidencia facial</dt><dd>{similarity}%</dd></div>}
          {detection != null && <div><dt>Detección</dt><dd>{detection}%</dd></div>}
        </dl>

        <button type="button" className="primary-action welcome-button" onClick={onFinish}>
          Registrar otro ingreso
        </button>
      </section>
    </main>
  );
}
