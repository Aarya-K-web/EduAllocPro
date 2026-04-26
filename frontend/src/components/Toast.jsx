// ============================================================
// EduAllocPro — Toast Notification Component
// Slide-in from right. Uses aria-live for screen readers.
// ============================================================

import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { toastSlideIn } from '../lib/motion'

const ToastContext = createContext(null)

const ICONS = {
  success: (
    <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  warning: (
    <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  ),
  info: (
    <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
}

const BG_CLASSES = {
  success: 'border-emerald-200 bg-emerald-50',
  error:   'border-red-200 bg-red-50',
  warning: 'border-amber-200 bg-amber-50',
  info:    'border-blue-200 bg-blue-50',
}

let toastId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback(({ message, type = 'info', duration = 4000 }) => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type }])
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, duration)
    }
    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}

      {/* Toast container */}
      <div
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
        aria-live="polite"
        aria-atomic="false"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              variants={toastSlideIn}
              initial="initial"
              animate="animate"
              exit="exit"
              className={[
                'pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-panel',
                'max-w-sm min-w-[280px] bg-white',
                BG_CLASSES[toast.type] || BG_CLASSES.info,
              ].join(' ')}
              role="status"
            >
              <span className="flex-shrink-0 mt-0.5">{ICONS[toast.type]}</span>
              <p className="text-sm text-ink-primary flex-1">{toast.message}</p>
              <button
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 text-ink-muted hover:text-ink-secondary transition-colors"
                aria-label="Dismiss notification"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export default ToastProvider
