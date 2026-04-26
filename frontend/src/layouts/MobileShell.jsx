// ============================================================
// EduAllocPro — MobileShell Layout
// Mobile-first layout for BEO dashboard (360px viewport).
// Defaults to Marathi language for BEO role.
// ============================================================

import { Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import BottomTabBar from '../components/BottomTabBar'
import LanguageToggle from '../components/LanguageToggle'
import { setDefaultLangForRole } from '../i18n/config'

const MobileShell = ({ user }) => {
  // BEO role defaults to Marathi
  useEffect(() => {
    if (user?.role === 'beo') {
      setDefaultLangForRole('beo')
    }
  }, [user?.role])

  return (
    <div className="min-h-screen bg-surface-bg flex flex-col max-w-sm mx-auto">
      {/* Mobile top bar */}
      <header className="bg-surface-sidebar text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-brand rounded flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <span className="text-sm font-bold">EduAllocPro</span>
        </div>
        <LanguageToggle variant="pill" />
      </header>

      {/* Main content */}
      <main
        className="flex-1 overflow-y-auto pb-20"
        id="main-content"
        aria-label="Main content"
      >
        <Outlet />
      </main>

      {/* Bottom tab bar */}
      <BottomTabBar />
    </div>
  )
}

export default MobileShell
