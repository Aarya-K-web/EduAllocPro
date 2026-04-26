// ============================================================
// EduAllocPro — Sidebar Component
// Dark (#0A0F1E) left nav, active state electric blue.
// ============================================================

import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { signOutUser } from '../lib/firebase'

const NAV_ITEMS = [
  {
    to:    '/dashboard',
    label: 'nav.dashboard',
    icon:  (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    to:    '/deploy',
    label: 'nav.deploy',
    icon:  (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    to:    '/plan',
    label: 'nav.plan',
    icon:  (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    to:    '/briefing',
    label: 'nav.briefing',
    icon:  (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    to:    '/beo',
    label: 'nav.beo',
    icon:  (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
      </svg>
    ),
  },
]

const Sidebar = ({ user }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOutUser()
    navigate('/login')
  }

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 w-sidebar bg-surface-sidebar flex flex-col z-30"
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">EduAllocPro</p>
            <p className="text-white/40 text-2xs leading-tight">Maharashtra</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto" aria-label="Primary navigation">
        <ul className="space-y-1" role="list">
          {NAV_ITEMS.map(item => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) => [
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  'focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 focus-visible:ring-offset-surface-sidebar',
                  isActive
                    ? 'bg-brand text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/8',
                ].join(' ')}
              >
                {item.icon}
                <span>{t(item.label)}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User + Sign Out */}
      <div className="px-3 py-4 border-t border-white/10">
        {user && (
          <div className="px-3 py-2 mb-2">
            <p className="text-white/80 text-xs font-medium truncate">{user.displayName || user.email}</p>
            <p className="text-white/40 text-2xs capitalize">{user.role || 'officer'}</p>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/8 transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {t('nav.logout')}
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
