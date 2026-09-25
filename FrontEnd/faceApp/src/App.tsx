import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';
import { AdminDashboard } from './components/AdminDashboard';
import { WebCaptureV2 } from './components/WebCaptureV2';
import { Welcome } from './components/Welcome';
import ParticlesBackground from './components/ParticlesBackground';
import type { AuthUser, RecognitionResponse } from './types';

const API_URL = import.meta.env.VITE_API_URL || 'https://comprefaceapp-production-a8a0.up.railway.app';

function App() {
  const [route, setRoute] = useState(window.location.pathname);
  const [welcomeRecognition, setWelcomeRecognition] = useState<RecognitionResponse | null>(() => {
    try {
      const stored = sessionStorage.getItem('lastCheckIn');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const navigate = useCallback((path: string) => {
    window.history.pushState({}, '', path);
    setRoute(path);
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    navigate('/admin');
  }, [navigate]);

  useEffect(() => {
    axios.get<{ user: AuthUser }>(`${API_URL}/api/auth/me`, { withCredentials: true })
      .then((response) => setUser(response.data.user))
      .catch(() => setUser(null))
      .finally(() => setCheckingSession(false));
  }, []);

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      const response = await axios.post<{ user: AuthUser }>(`${API_URL}/api/auth/login`, {
        username,
        password
      }, { withCredentials: true });
      setUser(response.data.user);
      setPassword('');
    } catch (unknownError) {
      const message = axios.isAxiosError(unknownError)
        ? unknownError.response?.data?.error || unknownError.message
        : 'No se pudo iniciar sesión';
      setAuthError(message);
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${API_URL}/api/auth/logout`, {}, { withCredentials: true });
    } finally {
      setUser(null);
      navigate('/');
    }
  };

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const onPopState = () => setRoute(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const showWelcome = useCallback((recognition: RecognitionResponse) => {
    sessionStorage.setItem('lastCheckIn', JSON.stringify(recognition));
    setWelcomeRecognition(recognition);
    navigate('/welcome');
  }, [navigate]);

  const returnToCheckIn = useCallback(() => {
    sessionStorage.removeItem('lastCheckIn');
    setWelcomeRecognition(null);
    navigate('/');
  }, [navigate]);

  const particles = (
    <ParticlesBackground
      particleColors={['#ffffff', '#ffffff']}
      particleCount={200}
      particleSpread={10}
      speed={0.1}
      particleBaseSize={100}
      moveParticlesOnHover
      alphaParticles={false}
      disableRotation={false}
    />
  );

  if (route === '/welcome' && welcomeRecognition?.matchedEmployee && welcomeRecognition.checkIn) {
    return (
      <>
        {particles}
        <Welcome recognition={welcomeRecognition} onFinish={returnToCheckIn} />
      </>
    );
  }

  if (route.startsWith('/admin')) {
    if (checkingSession) {
      return <>{particles}<div className="admin-login-page"><p>Verificando sesión…</p></div></>;
    }

    if (isAdmin) {
      const section = route === '/admin/employees' ? 'employees' : 'charts';
      return (
        <>
          {particles}
          <AdminDashboard
            user={user}
            section={section}
            onNavigate={navigate}
            onLogout={() => void logout()}
            onUnauthorized={clearSession}
          />
        </>
      );
    }

    return (
      <>
        {particles}
        <main className="admin-login-page">
          <button className="admin-login-back" type="button" onClick={() => navigate('/')}>← Volver al check-in</button>
          <form className="login-panel admin-login-panel" onSubmit={login}>
            <div>
              <p className="app-kicker">Área restringida</p>
              <h2>Administración</h2>
              <p>Inicia sesión para gestionar empleados y consultar sus registros.</p>
            </div>
            <label>
              Usuario
              <input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required autoFocus />
            </label>
            <label>
              Contraseña
              <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </label>
            {authError && <p className="login-error">{authError}</p>}
            <button className="primary-action" disabled={authLoading}>{authLoading ? 'Verificando…' : 'Ingresar'}</button>
          </form>
        </main>
      </>
    );
  }

  return (
    <>
      {particles}

      <div className="app-container">
        <header className="app-header">
          <div>
            <p className="app-kicker">Control de acceso</p>
            <h1 className="app-title">Face Recognition</h1>
          </div>

          {!checkingSession && (
            isAdmin ? (
              <div className="session-control">
                <span>
                  <small>Administrador</small>
                  {user.displayName}
                </span>
                <button type="button" className="secondary-action" onClick={() => navigate('/admin/charts')}>Dashboard</button>
                <button type="button" className="secondary-action" onClick={() => void logout()}>Cerrar sesión</button>
              </div>
            ) : (
              <button type="button" className="secondary-action" onClick={() => navigate('/admin')}>
                Acceso administrador
              </button>
            )
          )}
        </header>

        <WebCaptureV2 canManagePeople={isAdmin} onUnauthorized={clearSession} onRecognized={showWelcome} />
      </div>
    </>
  );
}

export default App;
