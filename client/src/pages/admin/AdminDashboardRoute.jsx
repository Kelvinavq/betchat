import { AuthProvider } from '../../context/AuthContext'
import { TourProvider } from '../../context/TourContext'
import { BroadcastNotifProvider } from '../../context/BroadcastNotifContext'
import ProtectedRoute from '../../components/common/ProtectedRoute'
import DashboardPage from './DashboardPage'

export default function AdminDashboardRoute() {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <TourProvider>
          <BroadcastNotifProvider>
            <DashboardPage />
          </BroadcastNotifProvider>
        </TourProvider>
      </ProtectedRoute>
    </AuthProvider>
  )
}
