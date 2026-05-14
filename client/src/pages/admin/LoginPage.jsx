import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuth from '../../hooks/useAuth'
import LoginAdmin from '../../components/admin/login/LoginAdmin'
import { api } from '../../utils/api'

const LoginPage = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [status, setStatus] = useState(() => {
    try {
      const raw = sessionStorage.getItem('login_schedule_alert')
      if (raw) {
        sessionStorage.removeItem('login_schedule_alert')
        const { access_start, access_end } = JSON.parse(raw)
        return {
          message: `Tu horario de acceso es de ${access_start} a ${access_end}. Podés volver a ingresar dentro de ese rango.`,
          type: 'schedule',
        }
      }
    } catch { /* ignore */ }
    return { message: '', type: '' }
  })

  const handleSubmit = async ({ username, password, webauthnIntent, credential }) => {
    setStatus({ message: '', type: '' })

    try {
      if (webauthnIntent === 'auth-options') {
        return await api.post('/api/auth/webauthn/auth-options', { username })
      }

      if (webauthnIntent === 'auth-verify') {
        const response = await api.post('/api/auth/webauthn/auth-verify', { username, credential })
        login(response.user)
        setStatus({ message: 'Bienvenido de nuevo', type: 'success' })
        navigate('/admin')
        return response
      }

      const response = await api.post('/api/auth/login', { username, password })
      login(response.user)
      setStatus({ message: 'Bienvenido de nuevo', type: 'success' })
      if (window.confirm('¿Quieres configurar Face ID / huella para el próximo acceso?')) {
        try {
          const options = await api.post('/api/auth/webauthn/register-options', {})
          const credential = await navigator.credentials.create({
            publicKey: {
              ...options,
              challenge: Uint8Array.from(atob(options.challenge.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)),
              user: {
                ...options.user,
                id: Uint8Array.from(atob(options.user.id.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)),
              },
              excludeCredentials: (options.excludeCredentials || []).map((item) => ({
                ...item,
                id: Uint8Array.from(atob(item.id.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)),
              })),
            },
          })

          await api.post('/api/auth/webauthn/register-verify', {
            credential: {
              id: credential.id,
              rawId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, ''),
              type: credential.type,
              response: {
                clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(credential.response.clientDataJSON))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, ''),
                attestationObject: btoa(String.fromCharCode(...new Uint8Array(credential.response.attestationObject))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, ''),
              },
            },
          })
        } catch {
          // Si falla el enrolamiento, mantenemos el login normal sin bloquear el acceso.
        }
      }
      navigate('/admin')
    } catch (error) {
      const message = error.payload?.error || error.message || 'Error al iniciar sesión'
      setStatus({ message, type: 'error' })
      throw new Error(message, { cause: error })
    }
  }

  return <LoginAdmin onSubmit={handleSubmit} status={status} />
}

export default LoginPage
