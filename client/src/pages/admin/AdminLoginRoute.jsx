import { AuthProvider } from '../../context/AuthContext'
import LoginPage from './LoginPage'

export default function AdminLoginRoute() {
  return (
    <AuthProvider>
      <LoginPage />
    </AuthProvider>
  )
}
