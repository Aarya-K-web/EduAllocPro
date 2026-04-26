// ============================================================
// EduAllocPro — useOfflineAware Hook
// Detects online/offline status and notifies the UI.
// ============================================================

import { useState, useEffect } from 'react'

export function useOfflineAware() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline  = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isOnline, isOffline: !isOnline }
}
