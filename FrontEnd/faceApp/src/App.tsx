import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';
import { AddManually } from './components/AddManually';
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
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const clearSession = useCallback(() => {
    setUser(null);
    setShowLogin(true);
  }, []);

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
      setShowLogin(false);
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
      setShowLogin(false);
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
    window.history.pushState({}, '', '/welcome');
    setRoute('/welcome');
  }, []);

  const returnToCheckIn = useCallback(() => {
    sessionStorage.removeItem('lastCheckIn');
    setWelcomeRecognition(null);
    window.history.pushState({}, '', '/');
    setRoute('/');
  }, []);

  if (route === '/welcome' && welcomeRecognition?.matchedEmployee && welcomeRecognition.checkIn) {
    return (
      <>
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
        <Welcome recognition={welcomeRecognition} onFinish={returnToCheckIn} />
      </>
    );
  }

  return (
    <>
      <ParticlesBackground
        particleColors={['#ffffff', '#ffffff']}
        particleCount={200}
        particleSpread={10}
        speed={0.1}
        particleBaseSize={100}
        moveParticlesOnHover
        alphaParticles={false}
        disableRotation={false}
        className={undefined}
      />

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
                <button type="button" className="secondary-action" onClick={() => void logout()}>Cerrar sesión</button>
              </div>
            ) : (
              <button type="button" className="secondary-action" onClick={() => setShowLogin((visible) => !visible)}>
                Acceso administrador
              </button>
            )
          )}
        </header>

        {showLogin && !isAdmin && (
          <form className="login-panel" onSubmit={login}>
            <div>
              <p className="app-kicker">Área restringida</p>
              <h2>Iniciar sesión</h2>
              <p>Solo los administradores pueden registrar personas.</p>
            </div>
            <label>
              Usuario
              <input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required />
            </label>
            <label>
              Contraseña
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            {authError && <p className="login-error">{authError}</p>}
            <button className="primary-action" disabled={authLoading}>
              {authLoading ? 'Verificando…' : 'Ingresar'}
            </button>
          </form>
        )}

        <WebCaptureV2 canManagePeople={isAdmin} onUnauthorized={clearSession} onRecognized={showWelcome} />
        {isAdmin && <AddManually onUnauthorized={clearSession} />}
      </div>
    </>
  );
}

export default App;
