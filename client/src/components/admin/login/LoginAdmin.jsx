import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../../../assets/apple.svg';
import faceid from '../../../assets/faceid.svg';
import googleIcon from '../../../assets/google.svg';
import fingerprint from '../../../assets/fingerprint.svg';
import { useSystemConfig } from '../../../context/SystemConfigContext';
import {
  Section, LoginLayout,
  BrandPanel, BrandLogo, BrandTitle, BrandSub, BrandDivider, BrandTagline,
  FormPanel, FormInner, MobileLogo,
  Heading, Subtitle, Form, Socials, SsoBtn, Or,
  TextboxWrapper, TextboxInput, TextboxLabel, SubmitBtn, ForgotLink, Footer,
  AlertBox, FieldError, ModalOverlay, ModalCard, ModalTitle, ModalSub, ModalFoot, ModalBtn,
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

const loadGoogleScript = () => new Promise((resolve, reject) => {
  if (window.google?.accounts?.id) return resolve();
  const existing = document.querySelector('script[data-google-gis="true"]');
  if (existing) {
    existing.addEventListener('load', resolve, { once: true });
    existing.addEventListener('error', reject, { once: true });
    return;
  }
  const script = document.createElement('script');
  script.src = 'https://accounts.google.com/gsi/client';
  script.async = true;
  script.defer = true;
  script.dataset.googleGis = 'true';
  script.onload = resolve;
  script.onerror = reject;
  document.head.appendChild(script);
});

const LoginAdmin = ({ onSubmit, status, googleClientId }) => {
  const { systemConfig } = useSystemConfig();
  const navigate = useNavigate();
  const googleButtonRef = useRef(null);
  const googleInitializedRef = useRef(false);
  const [deviceType, setDeviceType] = useState('other');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(() => {
    try {
      const raw = sessionStorage.getItem('admin_login_cooldown_until');
      const until = raw ? Number(raw) : 0;
      return Math.max(0, Math.ceil((until - Date.now()) / 1000));
    } catch {
      return 0;
    }
  });
  const [loginNotice, setLoginNotice] = useState(() => {
    try {
      const raw = sessionStorage.getItem('admin_login_cooldown_until');
      const until = raw ? Number(raw) : 0;
      return until > Date.now()
        ? 'Demasiados intentos de inicio de sesión. Esperá antes de volver a intentarlo.'
        : '';
    } catch {
      return '';
    }
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [biometricNotice, setBiometricNotice] = useState('');
  const [googleButtonReady, setGoogleButtonReady] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [pendingLoginUser, setPendingLoginUser] = useState(null);

  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) setDeviceType('ios');
    else if (/android/i.test(ua)) setDeviceType('android');
    else setDeviceType('pc');
  }, []);

  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (cooldown > 0) return;
    setLoginNotice('');
    try { sessionStorage.removeItem('admin_login_cooldown_until'); } catch { /* ignore */ }
  }, [cooldown]);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      if (!googleClientId || !googleButtonRef.current || googleInitializedRef.current) return;
      try {
        await loadGoogleScript();
        if (cancelled || !window.google?.accounts?.id || !googleButtonRef.current) return;
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (resp) => {
            try { await onSubmit({ googleCredential: resp.credential }); }
            catch (err) { setBiometricNotice(err.message || 'No se pudo iniciar con Google.'); }
          },
        });
        googleButtonRef.current.innerHTML = '';
        const w = Math.max(140, Math.floor(googleButtonRef.current.getBoundingClientRect().width || 0));
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          type: 'standard', theme: 'outline', size: 'large',
          text: 'signin_with', shape: 'pill', logo_alignment: 'left', width: w,
        });
        setGoogleButtonReady(true);
        googleInitializedRef.current = true;
      } catch {
        setBiometricNotice('No se pudo cargar el inicio con Google.');
      }
    };
    init();
    return () => { cancelled = true; };
  }, [googleClientId, onSubmit]);

  const biometricIcon = deviceType === 'ios' ? faceid : fingerprint;
  const biometricLabel = deviceType === 'ios' ? 'FaceID' : 'Huella';
  const canUseWebAuthn = typeof window !== 'undefined' && Boolean(window.PublicKeyCredential);

  const base64UrlToBuffer = (v) => {
    const n = String(v || '').replace(/-/g, '+').replace(/_/g, '/');
    return Uint8Array.from(atob(n.padEnd(Math.ceil(n.length / 4) * 4, '=')), (c) => c.charCodeAt(0));
  };
  const bufferToBase64Url = (v) =>
    btoa(String.fromCharCode(...new Uint8Array(v))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || cooldown > 0) return;
    const trimmedUsername = username.trim();
    const errors = {};
    if (!trimmedUsername) errors.username = 'El usuario es obligatorio.';
    if (!password) errors.password = 'La contraseña es obligatoria.';
    if (password && password.length < 8) errors.password = 'La contraseña debe tener al menos 8 caracteres.';
    if (Object.keys(errors).length) { setFieldErrors(errors); return; }
    setFieldErrors({});
    setLoginNotice('');
    setLoading(true);
    try {
      const response = await onSubmit({ username: trimmedUsername, password });
      if (response?.user) { setPendingLoginUser(response.user); setShowEnrollModal(true); }
      setAttempts(0);
    } catch (error) {
      const code = String(error?.payload?.code || error?.code || '').toUpperCase();
      if (code === 'TOO_MANY_REQUESTS') {
        setAttempts(0);
        const secs = Math.max(1, Number(error?.retryAfter || error?.payload?.retryAfter || error?.payload?.retry_after || 15 * 60));
        const until = Date.now() + secs * 1000;
        setCooldown(secs);
        setLoginNotice(`Demasiados intentos. Acceso bloqueado temporalmente (${Math.max(1, Math.ceil(secs / 60))} min).`);
        try { sessionStorage.setItem('admin_login_cooldown_until', String(until)); } catch { /* ignore */ }
        return;
      }
      const next = attempts + 1;
      setAttempts(next);
      if (next >= 5) {
        const secs = 15 * 60;
        setCooldown(secs);
        setLoginNotice('Demasiados intentos. Acceso bloqueado temporalmente (15 min).');
        try { sessionStorage.setItem('admin_login_cooldown_until', String(Date.now() + secs * 1000)); } catch { /* ignore */ }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBiometric = async () => {
    if (!canUseWebAuthn || biometricBusy || cooldown > 0) return;
    const trimmedUsername = username.trim();
    if (!trimmedUsername) { setFieldErrors({ username: 'Ingresá tu usuario primero para usar biometría.' }); return; }
    setBiometricNotice('');
    setBiometricBusy(true);
    try {
      const options = await onSubmit({ username: trimmedUsername, webauthnIntent: 'auth-options' });
      if (!options?.challenge) throw new Error('Biometría no disponible');
      const credential = await navigator.credentials.get({
        publicKey: {
          ...options,
          challenge: base64UrlToBuffer(options.challenge),
          allowCredentials: (options.allowCredentials || []).map((item) => ({ ...item, id: base64UrlToBuffer(item.id) })),
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

  const busyText = cooldown > 0
    ? `Intentá en ${cooldown >= 60 ? `${Math.ceil(cooldown / 60)} min` : `${cooldown}s`}`
    : 'Ingresar';

  const handleCloseEnroll = () => {
    setShowEnrollModal(false);
    setPendingLoginUser(null);
    navigate('/admin');
  };

  const handleAcceptEnroll = async () => {
    setShowEnrollModal(false);
    if (pendingLoginUser) setPendingLoginUser(null);
    try {
      const options = await onSubmit({ webauthnIntent: 'register-options' });
      const credential = await navigator.credentials.create({
        publicKey: {
          ...options,
          challenge: base64UrlToBuffer(options.challenge),
          user: { ...options.user, id: base64UrlToBuffer(options.user.id) },
          excludeCredentials: (options.excludeCredentials || []).map((item) => ({ ...item, id: base64UrlToBuffer(item.id) })),
        },
      });
      await onSubmit({
        webauthnIntent: 'register-verify',
        credential: {
          id: credential.id,
          rawId: bufferToBase64Url(credential.rawId),
          type: credential.type,
          response: {
            clientDataJSON: bufferToBase64Url(credential.response.clientDataJSON),
            attestationObject: bufferToBase64Url(credential.response.attestationObject),
          },
        },
      });
      navigate('/admin');
    } catch (error) {
      setBiometricNotice(error.message || 'No se pudo configurar la biometría.');
    }
  };

  const appName = systemConfig.appName || 'Panel Admin';

  return (
    <Section>
      <LoginLayout>

        {/* ── Brand panel (desktop only) ── */}
        <BrandPanel>
          <BrandLogo src={systemConfig.logoUrl || logo} alt={appName} />
          <BrandTitle>{appName}</BrandTitle>
          <BrandSub>Panel de Administración</BrandSub>
          <BrandDivider />
          <BrandTagline>
            Todo el control de tu plataforma,<br />en un solo lugar.
          </BrandTagline>
        </BrandPanel>

        {/* ── Form panel ── */}
        <FormPanel>
          <FormInner>
            <MobileLogo src={systemConfig.logoUrl || logo} alt={appName} />
            <Heading>Bienvenido</Heading>
            <Subtitle>{appName}</Subtitle>

            {status?.message && <AlertBox $type={status.type}>{status.message}</AlertBox>}
            {loginNotice && <AlertBox $type="warning">{loginNotice}</AlertBox>}

            <Form onSubmit={handleSubmit}>
              <Socials>
                <SsoBtn
                  type="button"
                  disabled={!googleClientId || !googleButtonReady}
                  style={{ position: 'relative', overflow: 'hidden' }}
                >
                  <img src={googleIcon} alt="Google" />
                  <span>{googleClientId ? 'Google' : 'No disponible'}</span>
                  <div
                    ref={googleButtonRef}
                    aria-label="Iniciar sesión con Google"
                    style={{
                      position: 'absolute', inset: 0, opacity: 0,
                      cursor: googleClientId ? 'pointer' : 'not-allowed', width: '100%',
                    }}
                  />
                </SsoBtn>
                <SsoBtn type="button" invertIcon onClick={handleBiometric} disabled={!canUseWebAuthn || biometricBusy}>
                  <img src={biometricIcon} alt={biometricLabel} />
                  <span>{biometricBusy ? 'Verificando...' : biometricLabel}</span>
                </SsoBtn>
              </Socials>

              {biometricNotice && <FieldError>{biometricNotice}</FieldError>}

              <Or>o</Or>

              <Textbox
                id="login-admin-user"
                type="text"
                label="Usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                error={fieldErrors.username}
              />
              <Textbox
                id="login-admin-password"
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
            <Footer>{appName} &copy; 2026. Todos los derechos reservados.</Footer>
          </FormInner>
        </FormPanel>

      </LoginLayout>

      {showEnrollModal && (
        <ModalOverlay onMouseDown={(e) => e.target === e.currentTarget && handleCloseEnroll()}>
          <ModalCard>
            <ModalTitle>Configurar huella o Face ID</ModalTitle>
            <ModalSub>
              Guardá este dispositivo para ingresar más rápido y con la misma seguridad.
              La contraseña seguirá siendo válida como respaldo.
            </ModalSub>
            <ModalFoot>
              <ModalBtn type="button" onClick={handleCloseEnroll}>Ahora no</ModalBtn>
              <ModalBtn type="button" $v="primary" onClick={handleAcceptEnroll}>Configurar</ModalBtn>
            </ModalFoot>
          </ModalCard>
        </ModalOverlay>
      )}
    </Section>
  );
};

export default LoginAdmin;
