// ============================================================
// EduAllocPro — AppShell Layout
// Desktop layout: sidebar (240px) + topbar (56px) + main canvas.
// ============================================================

import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import { DEFAULT_DISTRICT_NAME } from '../config'

const AppShell = ({ user }) => {
  return (
    <div className="min-h-screen bg-surface-bg">
      {/* Left sidebar */}
      <Sidebar user={user} />

      {/* Top bar */}
      <TopBar user={user} districtName={DEFAULT_DISTRICT_NAME} />

      {/* Main content area */}
      <main
        className="ml-sidebar pt-topbar min-h-screen"
        id="main-content"
        aria-label="Main content"
      >
        <Outlet />
      </main>
    </div>
  )
}

export default AppShell
