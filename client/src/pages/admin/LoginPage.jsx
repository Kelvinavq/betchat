import { useNavigate } from 'react-router-dom'
import useAuth from '../../hooks/useAuth'
import LoginAdmin from '../../components/admin/login/LoginAdmin'

const LoginPage = () => {
  const navigate = useNavigate()
  const { setUser } = useAuth()

  const handleSubmit = (e) => {
    e.preventDefault()
    setUser({ id: 1, name: 'Admin', role: 'admin' })
    navigate('/admin')
  }

  return <LoginAdmin onSubmit={handleSubmit} />
}

export default LoginPage
