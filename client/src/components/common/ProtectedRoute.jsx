import { Navigate } from 'react-router-dom'
import useAuth from '../../hooks/useAuth'

const ProtectedRoute = ({ children }) => {
  const { user, initializing } = useAuth()

  if (initializing) {
    return null
  }

  return user ? children : <Navigate to="/admin/login" replace />
}

export default ProtectedRoute
