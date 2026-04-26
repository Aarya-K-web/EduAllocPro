// ============================================================
// EduAllocPro — Login Page
// Firebase Auth sign-in with role detection.
// Demo credentials shown in dev mode.
// ============================================================

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { signInWithEmail } from '../lib/firebase'
import { setDefaultLangForRole } from '../i18n/config'
import { IS_DEV } from '../config'
import { fadeIn, cardEntrance } from '../lib/motion'
import LanguageToggle from '../components/LanguageToggle'

const DEMO_ACCOUNTS = [
  { email: 'collector@nandurbar.gov.in', role: 'District Collector', password: 'demo1234' },
  { email: 'beo@nandurbar.gov.in',       role: 'Block Education Officer', password: 'demo1234' },
  { email: 'secretary@maharashtra.gov.in', role: 'Education Secretary', password: 'demo1234' },
]

const Login = ({ onLogin }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const user = await signInWithEmail(email, password)
      // Detect role from email domain / custom claims
      const role = detectRole(user)
      const userWithRole = { ...user, role }

      setDefaultLangForRole(role)
      onLogin?.(userWithRole)

      // Route based on role
      if (role === 'beo') {
        navigate('/beo')
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      const code = err.code || ''
      if (code.includes('wrong-password') || code.includes('user-not-found') || code.includes('invalid-credential')) {
        setError(t('auth.errors.invalidCredentials'))
      } else if (code.includes('network')) {
        setError(t('auth.errors.networkError'))
      } else {
        setError(err.message || t('auth.errors.unknown'))
      }
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (account) => {
    setEmail(account.email)
    setPassword(account.password)
    setError(null)
  }

  return (
    <motion.div
      variants={fadeIn}
      initial="initial"
      animate="animate"
      className="min-h-screen bg-surface-sidebar flex items-center justify-center p-4"
    >
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Language toggle */}
        <div className="flex justify-end mb-4">
          <LanguageToggle variant="pill" />
        </div>

        <motion.div
          variants={cardEntrance}
          className="bg-white rounded-2xl shadow-panel p-8"
        >
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-ink-primary">EduAllocPro</h1>
              <p className="text-xs text-ink-muted">{t('app.tagline')}</p>
            </div>
          </div>

          <h2 className="text-lg font-semibold text-ink-primary mb-6">
            {t('auth.signIn')}
          </h2>

          {/* Error message */}
          {error && (
            <div
              role="alert"
              className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {/* Sign-in form */}
          <form onSubmit={handleSubmit} noValidate>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-ink-secondary mb-1.5"
                >
                  {t('auth.email')}
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm text-ink-primary placeholder-ink-muted focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-shadow"
                  placeholder="officer@nandurbar.gov.in"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-ink-secondary mb-1.5"
                >
                  {t('auth.password')}
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm text-ink-primary placeholder-ink-muted focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-shadow"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full py-2.5 px-4 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand-700 active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
              >
                {loading ? t('auth.signingIn') : t('auth.signIn')}
              </button>
            </div>
          </form>

          {/* Demo accounts (dev only) */}
          {IS_DEV && (
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-xs font-medium text-ink-muted mb-3 uppercase tracking-wide">
                Demo Accounts
              </p>
              <div className="space-y-2">
                {DEMO_ACCOUNTS.map(account => (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => fillDemo(account)}
                    className="w-full text-left px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <p className="text-xs font-medium text-ink-primary">{account.role}</p>
                    <p className="text-2xs text-ink-muted font-mono">{account.email}</p>
                  </button>
                ))}
              </div>
              <p className="text-2xs text-ink-muted mt-2 text-center">
                Password: <span className="font-mono">demo1234</span>
              </p>
            </div>
          )}
        </motion.div>

        <p className="text-center text-xs text-white/40 mt-4">
          Maharashtra Education Department · EduAllocPro v1.0
        </p>
      </div>
    </motion.div>
  )
}

// Detect role from user object (Firebase custom claims or email pattern)
function detectRole(user) {
  if (user.role) return user.role
  const email = (user.email || '').toLowerCase()
  if (email.includes('beo'))       return 'beo'
  if (email.includes('secretary')) return 'secretary'
  return 'collector'
}

export default Login
