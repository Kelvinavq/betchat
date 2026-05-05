import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ChatProvider } from './context/ChatContext'
import ClientPage from './pages/client/ClientPage'
import LoginPage from './pages/admin/LoginPage'
import DashboardPage from './pages/admin/DashboardPage'
import ProtectedRoute from './components/common/ProtectedRoute'
import NotFoundPage from './pages/NotFoundPage'

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ChatProvider>
          <Routes>
            <Route path="/" element={<ClientPage />} />
            <Route path="/admin/login" element={<LoginPage />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <Navigate to="/admin/chat" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/:section"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </ChatProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
