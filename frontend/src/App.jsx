// ============================================================
// EduAllocPro — App Router
// All routes defined here. Auth guard wraps protected routes.
// ============================================================

import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'

// i18n — must be imported before any component that uses useTranslation
import './i18n/config'

// Layouts
import AppShell    from './layouts/AppShell'
import MobileShell from './layouts/MobileShell'

// Pages
import Login            from './pages/Login'
import Dashboard        from './pages/Dashboard'
import SchoolDetail     from './pages/SchoolDetail'
import Deploy           from './pages/Deploy'
import DistrictPlan     from './pages/DistrictPlan'
import Briefing         from './pages/Briefing'
import BEODashboard     from './pages/BEODashboard'
import TeacherView      from './pages/TeacherView'
import TeacherDashboard from './pages/TeacherDashboard'
import SchoolDashboard  from './pages/SchoolDashboard'
import SecretaryDashboard from './pages/SecretaryDashboard'

// Components
import { ToastProvider } from './components/Toast'
import { StoreProvider } from './context/StoreContext'

// Firebase
import { auth, getMockUser } from './lib/firebase'
import { IS_DEV } from './config'
import { detectRole, getDefaultRoute } from './lib/auth'

// ── Auth Guard ──────────────────────────────────────────────
const ProtectedRoute = ({ user, children }) => {
  if (!user) return <Navigate to="/login" replace />
  return children
}

// ── App ─────────────────────────────────────────────────────
function App() {
  const [user,         setUser]         = useState(null)
  const [authLoading,  setAuthLoading]  = useState(true)

  useEffect(() => {
    // Try Firebase auth listener
    if (auth) {
      const unsubscribe = auth.onAuthStateChanged(firebaseUser => {
        if (firebaseUser) {
          // Attach role from custom claims or email pattern
          const role = detectRole(firebaseUser)
          setUser({ ...firebaseUser, role })
        } else {
          setUser(null)
        }
        setAuthLoading(false)
      })
      return unsubscribe
    }

    // Dev fallback: check mock session
    if (IS_DEV) {
      const mockUser = getMockUser()
      setUser(mockUser)
    }
    setAuthLoading(false)
  }, [])

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser)
  }

  const handleLogout = () => {
    setUser(null)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-surface-sidebar flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <p className="text-white/60 text-sm">Loading EduAllocPro...</p>
        </div>
      </div>
    )
  }

  return (
    <StoreProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route
              path="/login"
              element={
                user
                  ? <Navigate to={getDefaultRoute(user.role)} replace />
                  : <Login onLogin={handleLogin} />
              }
            />

            {/* Mobile BEO shell */}
            <Route
              path="/beo"
              element={
                <ProtectedRoute user={user}>
                  {/* Phase 3, Item 15: Use AppShell instead of MobileShell on desktop, but for now we replace it with AppShell */}
                  <AppShell user={user} onLogout={handleLogout} />
                </ProtectedRoute>
              }
            >
              <Route index element={<BEODashboard user={user} />} />
            </Route>

            {/* Desktop app shell */}
            <Route
              path="/"
              element={
                <ProtectedRoute user={user}>
                  <AppShell user={user} onLogout={handleLogout} />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard"          element={<Dashboard />} />
              <Route path="schools/:id"        element={<SchoolDetail />} />
              <Route path="deploy"             element={<Deploy />} />
              <Route path="plan"               element={<DistrictPlan />} />
              <Route path="briefing"           element={<Briefing />} />
              <Route path="teacher/:id"        element={<TeacherView />} />
              <Route path="teacher-dashboard"  element={<TeacherDashboard />} />
              <Route path="school-dashboard"   element={<SchoolDashboard />} />
              <Route path="secretary"          element={<SecretaryDashboard />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to={user ? getDefaultRoute(user.role) : '/login'} replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </StoreProvider>
  )
}



export default App
