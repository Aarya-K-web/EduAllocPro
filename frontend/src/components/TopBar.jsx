// ============================================================
// EduAllocPro — TopBar Component
// Breadcrumb + language toggle + user info.
// ============================================================

import { useLocation, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LanguageToggle from './LanguageToggle'

const ROUTE_LABELS = {
  '/dashboard': 'nav.dashboard',
  '/deploy':    'nav.deploy',
  '/plan':      'nav.plan',
  '/briefing':  'nav.briefing',
  '/beo':       'nav.beo',
}

const TopBar = ({ user, districtName }) => {
  const { t } = useTranslation()
  const location = useLocation()

  const currentLabel = ROUTE_LABELS[location.pathname] || 'nav.dashboard'

  return (
    <header
      className="fixed top-0 left-sidebar right-0 h-topbar bg-white border-b border-border z-20 flex items-center px-6 gap-4"
      aria-label="Top navigation bar"
    >
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 flex-1 min-w-0">
        <Link
          to="/dashboard"
          className="text-xs text-ink-muted hover:text-ink-secondary transition-colors"
        >
          {districtName || 'Nandurbar'}
        </Link>
        <span className="text-ink-muted text-xs" aria-hidden="true">/</span>
        <span className="text-xs font-medium text-ink-primary truncate">
          {t(currentLabel)}
        </span>
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <LanguageToggle variant="pill" />

        {user && (
          <div className="flex items-center gap-2 pl-3 border-l border-border">
            <div
              className="w-7 h-7 rounded-full bg-brand flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              aria-hidden="true"
            >
              {(user.displayName || user.email || 'U')[0].toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-medium text-ink-primary leading-tight truncate max-w-[120px]">
                {user.displayName || user.email}
              </p>
              <p className="text-2xs text-ink-muted capitalize leading-tight">
                {user.role || 'officer'}
              </p>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

export default TopBar
