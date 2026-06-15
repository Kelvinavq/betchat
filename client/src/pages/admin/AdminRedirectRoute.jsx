import { Navigate } from 'react-router-dom'
import { AuthProvider } from '../../context/AuthContext'
import ProtectedRoute from '../../components/common/ProtectedRoute'

export default function AdminRedirectRoute() {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <Navigate to="/admin/chat" replace />
      </ProtectedRoute>
    </AuthProvider>
  )
}
