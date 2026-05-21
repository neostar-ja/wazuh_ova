import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import LoginPage from './components/auth/LoginPage'
import DashboardPage from './components/dashboard/DashboardPage'
import AlertsPage from './components/alerts/AlertsPage'
import InvestigatePage from './components/investigate/InvestigatePage'
import IOCPage from './components/ioc/IOCPage'
import CompliancePage from './components/compliance/CompliancePage'
import AssetsPage from './components/assets/AssetsPage'
import KPIPage from './components/kpi/KPIPage'
import AdminPage from './components/admin/AdminPage'
import { useAuth } from './hooks/useAuth'

const BASE = (import.meta.env.VITE_BASE_PATH || '/wazuh').replace(/\/+$/, '') || '/'

function ProtectedRoute({ children, roles }) {
  const { user, isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user?.role)) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter basename={BASE}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="investigate" element={<InvestigatePage />} />
          <Route path="ioc" element={<IOCPage />} />
          <Route path="compliance" element={<CompliancePage />} />
          <Route path="assets" element={<AssetsPage />} />
          <Route path="kpi" element={<KPIPage />} />
          <Route
            path="admin/*"
            element={
              <ProtectedRoute roles={['admin', 'superadmin']}>
                <AdminPage />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
