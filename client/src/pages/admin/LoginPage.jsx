import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuth from '../../hooks/useAuth'
import LoginAdmin from '../../components/admin/login/LoginAdmin'
import { api } from '../../utils/api'

const LoginPage = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [status, setStatus] = useState({ message: '', type: '' })

  const handleSubmit = async ({ username, password }) => {
    setStatus({ message: '', type: '' })

    try {
      const response = await api.post('/api/auth/login', { username, password })
      login(response.user)
      setStatus({ message: 'Bienvenido de nuevo', type: 'success' })
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
