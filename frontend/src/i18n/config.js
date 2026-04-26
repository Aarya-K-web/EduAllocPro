// ============================================================
// EduAllocPro — i18next Configuration
// Supports English (en) and Marathi (mr)
// Language preference stored in localStorage under 'edualloc_lang'
// ============================================================

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from './locales/en.json'
import mr from './locales/mr.json'

import { LANG_STORAGE_KEY, DEFAULT_LANGUAGE, ENABLE_MARATHI } from '../config'

const supportedLngs = ENABLE_MARATHI ? ['en', 'mr'] : ['en']

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      mr: { translation: mr },
    },
    supportedLngs,
    fallbackLng: 'en',
    defaultNS: 'translation',
    lng: localStorage.getItem(LANG_STORAGE_KEY) || DEFAULT_LANGUAGE,

    detection: {
      // Only use localStorage — no URL params, no navigator
      order: ['localStorage'],
      lookupLocalStorage: LANG_STORAGE_KEY,
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false, // React already escapes
    },

    react: {
      useSuspense: false,
    },
  })

/**
 * Set language and persist to localStorage.
 * Only allowed storage key per spec.
 */
export function setLanguage(lang) {
  if (!supportedLngs.includes(lang)) return
  localStorage.setItem(LANG_STORAGE_KEY, lang)
  i18n.changeLanguage(lang)

  // Apply/remove Marathi body class for line-height override
  if (lang === 'mr') {
    document.documentElement.classList.add('lang-mr')
    document.documentElement.setAttribute('lang', 'mr')
  } else {
    document.documentElement.classList.remove('lang-mr')
    document.documentElement.setAttribute('lang', 'en')
  }
}

/**
 * Set default language based on user role.
 * BEO role defaults to Marathi per spec.
 */
export function setDefaultLangForRole(role) {
  const stored = localStorage.getItem(LANG_STORAGE_KEY)
  if (stored) return // Respect user's explicit choice

  if (role === 'beo') {
    setLanguage('mr')
  } else {
    setLanguage(DEFAULT_LANGUAGE)
  }
}

// Apply initial lang class on load
const initialLang = localStorage.getItem(LANG_STORAGE_KEY) || DEFAULT_LANGUAGE
if (initialLang === 'mr') {
  document.documentElement.classList.add('lang-mr')
  document.documentElement.setAttribute('lang', 'mr')
}

export default i18n
