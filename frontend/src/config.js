// ============================================================
// EduAllocPro — Centralised Environment Configuration
// All env vars are read here. Import from this file, never
// directly from import.meta.env in components.
// ============================================================

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
export const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS) || 30000

// Google Maps
export const MAPS_API_KEY = import.meta.env.VITE_MAPS_API_KEY || ''
export const MAPS_MAP_ID  = import.meta.env.VITE_MAPS_MAP_ID  || ''
export const MAPS_DEFAULT_CENTER = {
  lat: Number(import.meta.env.VITE_MAPS_DEFAULT_LAT) || 21.3661,
  lng: Number(import.meta.env.VITE_MAPS_DEFAULT_LNG) || 74.2167,
}
export const MAPS_DEFAULT_ZOOM = Number(import.meta.env.VITE_MAPS_DEFAULT_ZOOM) || 9

// Firebase
export const FIREBASE_CONFIG = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY       || '',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN   || '',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID    || '',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID        || '',
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
}

// App behaviour
export const APP_ENV              = import.meta.env.VITE_APP_ENV || 'development'
export const IS_DEV               = APP_ENV === 'development'
export const DEFAULT_DISTRICT_ID  = import.meta.env.VITE_DEFAULT_DISTRICT_ID   || 'NDB01'
export const DEFAULT_DISTRICT_NAME = import.meta.env.VITE_DEFAULT_DISTRICT_NAME || 'Nandurbar'
export const DEFAULT_LANGUAGE     = import.meta.env.VITE_DEFAULT_LANGUAGE       || 'en'
export const ENABLE_MARATHI       = import.meta.env.VITE_ENABLE_MARATHI !== 'false'
export const STALE_DATA_THRESHOLD_MONTHS = Number(import.meta.env.VITE_STALE_DATA_THRESHOLD_MONTHS) || 12

// localStorage key — only allowed key
export const LANG_STORAGE_KEY = 'edualloc_lang'

// Map options — non-negotiable per spec
export const MAP_OPTIONS = {
  disableDefaultUI: true,
  clickableIcons:   false,
  gestureHandling:  'greedy',
  minZoom: 8,
  maxZoom: 17,
}
