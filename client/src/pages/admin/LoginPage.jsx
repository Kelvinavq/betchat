import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuth from '../../hooks/useAuth'
import LoginAdmin from '../../components/admin/login/LoginAdmin'
import { api, setApiAuthToken } from '../../utils/api'

const LoginPage = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [status, setStatus] = useState({ message: '', type: '' })

  const handleSubmit = async ({ username, password }) => {
    setStatus({ message: '', type: '' })

    try {
      const response = await api.post('/api/auth/login', { username, password })
      const { token, user } = response
      setApiAuthToken(token)
      login(user, token)
      setStatus({ message: 'Bienvenido de nuevo', type: 'success' })
      navigate('/admin')
    } catch (error) {
      const message = error.payload?.error || error.message || 'Error al iniciar sesión'
      setStatus({ message, type: 'error' })
      throw new Error(message)
    }
  }

  return <LoginAdmin onSubmit={handleSubmit} status={status} />
}

export default LoginPage
