// ============================================================
// EduAllocPro — BottomTabBar Component
// Mobile BEO navigation — 360px viewport optimised.
// ============================================================

import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const TABS = [
  {
    to:    '/beo',
    label: 'nav.beo',
    icon:  (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    to:    '/dashboard',
    label: 'nav.dashboard',
    icon:  (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
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
]

const BottomTabBar = () => {
  const { t } = useTranslation()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-border z-30 safe-area-pb"
      aria-label="Mobile navigation"
    >
      <div className="flex items-stretch h-16">
        {TABS.map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) => [
              'flex-1 flex flex-col items-center justify-center gap-1 text-2xs font-medium transition-colors',
              'focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset',
              isActive
                ? 'text-brand'
                : 'text-ink-muted hover:text-ink-secondary',
            ].join(' ')}
          >
            {tab.icon}
            <span>{t(tab.label)}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export default BottomTabBar
