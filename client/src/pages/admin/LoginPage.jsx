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
    return { message: '', type: '' };
  });
  const [googleClientId, setGoogleClientId] = useState(null);

  useEffect(() => {
    api.get('/api/auth/google-config')
      .then((data) => setGoogleClientId(data.clientId || null))
      .catch(() => setGoogleClientId(null));
  }, []);

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

    const response = await api.post('/api/auth/login', { username, password });
    login(response.user);
    setStatus({ message: 'Bienvenido de nuevo', type: 'success' });
    return response;
  };

  return <LoginAdmin onSubmit={handleSubmit} status={status} googleClientId={googleClientId} />;
};

export default LoginPage;
