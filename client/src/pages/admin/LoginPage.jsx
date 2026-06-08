import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import LoginAdmin from '../../components/admin/login/LoginAdmin';
import { api } from '../../utils/api';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [status, setStatus] = useState(() => {
    try {
      const raw = sessionStorage.getItem('login_schedule_alert');
      if (raw) {
        sessionStorage.removeItem('login_schedule_alert');
        const { access_start, access_end } = JSON.parse(raw);
        return {
          message: `Tu horario de acceso es de ${access_start} a ${access_end}. Podés volver a ingresar dentro de ese rango.`,
          type: 'schedule',
        };
      }
    } catch { /* ignore */ }
    try {
      const raw = sessionStorage.getItem('login_force_logout_alert');
      if (raw) {
        sessionStorage.removeItem('login_force_logout_alert');
        return {
          message: 'Tu sesión fue cerrada por un administrador. Iniciá sesión nuevamente para continuar.',
          type: 'warning',
        };
      }
    } catch { /* ignore */ }
    return { message: '', type: '' };
  });
  const [googleClientId, setGoogleClientId] = useState(null);

  useEffect(() => {
    api.get('/api/auth/google-config')
      .then((data) => setGoogleClientId(data.clientId || null))
      .catch(() => setGoogleClientId(null));
  }, []);

  const formatAuthError = (error) => {
    const code = String(error?.payload?.code || error?.code || '').toUpperCase();
    const message = String(error?.payload?.error || error?.message || 'No se pudo iniciar sesión.').trim();

    if (code === 'TOO_MANY_REQUESTS') {
      const retryAfterSeconds = Number(error?.retryAfter || error?.payload?.retryAfter || error?.payload?.retry_after || 0);
      const minutes = retryAfterSeconds > 0 ? Math.max(1, Math.ceil(retryAfterSeconds / 60)) : 15;
      return {
        type: 'warning',
        message: `Demasiados intentos de inicio de sesión. Por seguridad, el acceso quedó bloqueado temporalmente (${minutes} min).`,
      };
    }

    return {
      type: 'error',
      message,
    };
  };

  const handleSubmit = async ({ username, password, webauthnIntent, credential, googleCredential }) => {
    setStatus({ message: '', type: '' });

    if (googleCredential) {
      const response = await api.post('/api/auth/google', { credential: googleCredential });
      login(response.user);
      setStatus({ message: 'Bienvenido de nuevo', type: 'success' });
      navigate('/admin');
      return response;
    }

    if (webauthnIntent === 'auth-options') {
      return api.post('/api/auth/webauthn/auth-options', { username });
    }

    if (webauthnIntent === 'auth-verify') {
      const response = await api.post('/api/auth/webauthn/auth-verify', { username, credential });
      login(response.user);
      setStatus({ message: 'Bienvenido de nuevo', type: 'success' });
      navigate('/admin');
      return response;
    }

    if (webauthnIntent === 'register-options') {
      return api.post('/api/auth/webauthn/register-options', {});
    }

    if (webauthnIntent === 'register-verify') {
      return api.post('/api/auth/webauthn/register-verify', { credential });
    }

    try {
      const response = await api.post('/api/auth/login', { username, password });
      login(response.user);
      setStatus({ message: 'Bienvenido de nuevo', type: 'success' });
      navigate('/admin');
      return response;
    } catch (error) {
      const nextStatus = formatAuthError(error);
      setStatus(nextStatus);
      throw error;
    }
  };

  return <LoginAdmin onSubmit={handleSubmit} status={status} googleClientId={googleClientId} />;
};

export default LoginPage;
