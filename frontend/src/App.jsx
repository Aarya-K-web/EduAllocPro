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
import Login         from './pages/Login'
import Dashboard     from './pages/Dashboard'
import SchoolDetail  from './pages/SchoolDetail'
import Deploy        from './pages/Deploy'
import DistrictPlan  from './pages/DistrictPlan'
import Briefing      from './pages/Briefing'
import BEODashboard  from './pages/BEODashboard'
import TeacherView   from './pages/TeacherView'

// Components
import { ToastProvider } from './components/Toast'

// Firebase
import { auth, getMockUser } from './lib/firebase'
import { IS_DEV } from './config'

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
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route
            path="/login"
            element={
              user
                ? <Navigate to={user.role === 'beo' ? '/beo' : '/dashboard'} replace />
                : <Login onLogin={handleLogin} />
            }
          />

          {/* Mobile BEO shell */}
          <Route
            path="/beo"
            element={
              <ProtectedRoute user={user}>
                <MobileShell user={user} />
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
                <AppShell user={user} />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"    element={<Dashboard />} />
            <Route path="schools/:id"  element={<SchoolDetail />} />
            <Route path="deploy"       element={<Deploy />} />
            <Route path="plan"         element={<DistrictPlan />} />
            <Route path="briefing"     element={<Briefing />} />
            <Route path="teacher/:id"  element={<TeacherView />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}

function detectRole(user) {
  if (user?.role) return user.role
  const email = (user?.email || '').toLowerCase()
  if (email.includes('beo'))       return 'beo'
  if (email.includes('secretary')) return 'secretary'
  return 'collector'
}

export default App
