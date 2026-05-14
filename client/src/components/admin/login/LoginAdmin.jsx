import { useRef, useState, useEffect } from 'react';
import logo from '../../../assets/apple.svg';
import faceid from '../../../assets/faceid.svg';
import googleIcon from '../../../assets/google.svg';
import fingerprint from '../../../assets/fingerprint.svg';
import { useSystemConfig } from '../../../context/SystemConfigContext';
import { useWebGLBackground } from './useWebGLBackground';
import {
  Section,
  Canvas,
  Card,
  Logo,
  Subtitle,
  Form,
  Socials,
  SsoBtn,
  Or,
  TextboxWrapper,
  TextboxInput,
  TextboxLabel,
  SubmitBtn,
  ForgotLink,
  Footer,
  AlertBox,
  FieldError,
} from './LoginAdmin.styles';

const Textbox = ({ id, type, label, value, onChange, error }) => (
  <TextboxWrapper>
    <TextboxInput
      value={value}
      onChange={onChange}
      type={type}
      id={id}
      autoComplete={type === 'password' ? 'current-password' : 'username'}
      $hasError={Boolean(error)}
    />
    <TextboxLabel htmlFor={id}>{label}</TextboxLabel>
    {error && <FieldError>{error}</FieldError>}
  </TextboxWrapper>
);

const LoginAdmin = ({ onSubmit, status }) => {
  const { systemConfig } = useSystemConfig();
  const canvasRef = useRef(null);
  const [deviceType, setDeviceType] = useState('other');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const [fieldErrors, setFieldErrors] = useState({});
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [biometricNotice, setBiometricNotice] = useState('');

  useWebGLBackground(canvasRef);

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
      setDeviceType('ios');
    } else if (/android/i.test(userAgent)) {
      setDeviceType('android');
    } else {
      setDeviceType('pc');
    }
  }, []);

  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setInterval(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const biometricIcon = deviceType === 'ios' ? faceid : fingerprint;
  const biometricLabel = deviceType === 'ios' ? 'FaceID' : 'Huella';
  const canUseWebAuthn = typeof window !== 'undefined' && Boolean(window.PublicKeyCredential);

  const base64UrlToBuffer = (value) => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
  const bufferToBase64Url = (value) => btoa(String.fromCharCode(...new Uint8Array(value))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading || cooldown > 0) return;

    const trimmedUsername = username.trim();
    const errors = {};

    if (!trimmedUsername) {
      errors.username = 'El usuario es obligatorio.';
    }
    if (!password) {
      errors.password = 'La contraseña es obligatoria.';
    }
    if (password && password.length < 8) {
      errors.password = 'La contraseña debe tener al menos 8 caracteres.';
    }

    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      await onSubmit({ username: trimmedUsername, password });
      setAttempts(0);
    } catch {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);

      if (nextAttempts >= 5) {
        setCooldown(30);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBiometric = async () => {
    if (!canUseWebAuthn || biometricBusy || cooldown > 0) return;

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setFieldErrors({ username: 'Ingresa tu usuario primero para usar biometría.' });
      return;
    }

    setBiometricNotice('');
    setBiometricBusy(true);

    try {
      const options = await onSubmit({
        username: trimmedUsername,
        password,
        webauthnIntent: 'auth-options',
      });

      if (!options?.challenge) {
        throw new Error('Biometría no disponible');
      }

      const credential = await navigator.credentials.get({
        publicKey: {
          ...options,
          challenge: base64UrlToBuffer(options.challenge),
          allowCredentials: (options.allowCredentials || []).map((item) => ({
            ...item,
            id: base64UrlToBuffer(item.id),
          })),
        },
      });

      await onSubmit({
        username: trimmedUsername,
        webauthnIntent: 'auth-verify',
        credential: {
          id: credential.id,
          rawId: bufferToBase64Url(credential.rawId),
          type: credential.type,
          response: {
            clientDataJSON: bufferToBase64Url(credential.response.clientDataJSON),
            authenticatorData: bufferToBase64Url(credential.response.authenticatorData),
            signature: bufferToBase64Url(credential.response.signature),
            userHandle: credential.response.userHandle ? bufferToBase64Url(credential.response.userHandle) : null,
          },
        },
      });
    } catch (error) {
      setBiometricNotice(error.message || 'No se pudo usar la biometría en este dispositivo.');
    } finally {
      setBiometricBusy(false);
    }
  };

  const busyText = cooldown > 0 ? `Intenta nuevamente en ${cooldown}s` : 'Ingresar';

  return (
    <Section>
      <Canvas ref={canvasRef} />
      <Card>
        <Logo src={systemConfig.logoUrl || logo} alt={systemConfig.appName} />
        <Subtitle>{systemConfig.appName}</Subtitle>
        {status?.message && <AlertBox $type={status.type}>{status.message}</AlertBox>}
        <Form onSubmit={handleSubmit}>
          <Socials>
            <SsoBtn type="button">
              <img src={googleIcon} alt="Google" />
              <span>Google</span>
            </SsoBtn>
            <SsoBtn type="button" invertIcon onClick={handleBiometric} disabled={!canUseWebAuthn || biometricBusy}>
              <img src={biometricIcon} alt={biometricLabel} />
              <span>{biometricBusy ? 'Verificando...' : biometricLabel}</span>
            </SsoBtn>
          </Socials>
          {biometricNotice && <FieldError>{biometricNotice}</FieldError>}
          <Or>o</Or>
          <Textbox
            id="login-6-user"
            type="text"
            label="Usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            error={fieldErrors.username}
          />
          <Textbox
            id="login-6-password"
            type="password"
            label="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
          />
          <SubmitBtn type="submit" disabled={loading || cooldown > 0}>
            {loading ? 'Validando...' : busyText}
          </SubmitBtn>
        </Form>
        <ForgotLink href="#">¿Olvidaste tu contraseña?</ForgotLink>
        <Footer>{systemConfig.appName} &copy; 2026. Todos los derechos reservados.</Footer>
      </Card>
    </Section>
  );
};

export default LoginAdmin;
