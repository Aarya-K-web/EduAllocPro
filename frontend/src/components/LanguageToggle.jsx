// ============================================================
// EduAllocPro — LanguageToggle Component
// EN / मराठी toggle. Persists to localStorage only.
// ============================================================

import { useTranslation } from 'react-i18next'
import { setLanguage } from '../i18n/config'
import { ENABLE_MARATHI } from '../config'

/**
 * @param {object} props
 * @param {'button'|'pill'} props.variant
 * @param {string} props.className
 */
const LanguageToggle = ({ variant = 'pill', className = '' }) => {
  const { i18n } = useTranslation()
  const currentLang = i18n.language

  if (!ENABLE_MARATHI) return null

  const toggle = () => {
    setLanguage(currentLang === 'en' ? 'mr' : 'en')
  }

  if (variant === 'button') {
    return (
      <button
        onClick={toggle}
        className={[
          'text-sm font-medium px-3 py-1.5 rounded-lg transition-colors',
          'text-ink-secondary hover:text-ink-primary hover:bg-gray-100',
          'focus-visible:ring-2 focus-visible:ring-brand',
          className,
        ].join(' ')}
        aria-label={currentLang === 'en' ? 'Switch to Marathi' : 'Switch to English'}
        title={currentLang === 'en' ? 'मराठीत बदला' : 'Switch to English'}
      >
        {currentLang === 'en' ? 'मराठी' : 'EN'}
      </button>
    )
  }

  // Default: pill toggle
  return (
    <div
      className={[
        'inline-flex items-center bg-gray-100 rounded-full p-0.5 gap-0.5',
        className,
      ].join(' ')}
      role="group"
      aria-label="Language selection"
    >
      <button
        onClick={() => setLanguage('en')}
        className={[
          'px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150',
          'focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1',
          currentLang === 'en'
            ? 'bg-white text-ink-primary shadow-sm'
            : 'text-ink-muted hover:text-ink-secondary',
        ].join(' ')}
        aria-pressed={currentLang === 'en'}
        aria-label="English"
      >
        EN
      </button>
      <button
        onClick={() => setLanguage('mr')}
        className={[
          'px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150',
          'focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1',
          currentLang === 'mr'
            ? 'bg-white text-ink-primary shadow-sm'
            : 'text-ink-muted hover:text-ink-secondary',
        ].join(' ')}
        aria-pressed={currentLang === 'mr'}
        aria-label="मराठी (Marathi)"
      >
        मराठी
      </button>
    </div>
  )
}

export default LanguageToggle
