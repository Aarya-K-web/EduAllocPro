// ============================================================
// EduAllocPro — Firebase Auth Initialisation
// Gracefully degrades if config is missing (dev without Firebase).
// ============================================================

import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { FIREBASE_CONFIG, IS_DEV } from '../config'

let app = null
let auth = null

// Only initialise if we have a real project ID
const hasFirebaseConfig = Boolean(FIREBASE_CONFIG.projectId && FIREBASE_CONFIG.apiKey)

if (hasFirebaseConfig) {
  try {
    app  = initializeApp(FIREBASE_CONFIG)
    auth = getAuth(app)
  } catch (err) {
    if (IS_DEV) console.warn('[EduAllocPro] Firebase init failed:', err.message)
  }
}

export { auth }

/**
 * Sign in with email + password.
 * Falls back to mock auth in dev when Firebase is not configured.
 */
export async function signInWithEmail(email, password) {
  const isMockUser = Boolean(MOCK_USERS[email.toLowerCase()])

  // Force mock auth for demo accounts in development
  if (IS_DEV && (isMockUser || !auth)) {
    return mockSignIn(email, password)
  }

  if (!auth) {
    throw new Error('Firebase not configured')
  }

  const credential = await signInWithEmailAndPassword(auth, email, password)
  return credential.user
}

/**
 * Sign out the current user.
 */
export async function signOutUser() {
  if (!auth) {
    // Clear mock session
    sessionStorage.removeItem('mock_user')
    return
  }
  await signOut(auth)
}

// ── Mock Auth (dev only) ────────────────────────────────────
const MOCK_USERS = {
  'collector@nandurbar.gov.in': { role: 'collector', name: 'District Collector' },
  'beo@nandurbar.gov.in':       { role: 'beo',       name: 'Block Education Officer' },
  'secretary@maharashtra.gov.in': { role: 'secretary', name: 'Education Secretary' },
}

function mockSignIn(email, password) {
  const user = MOCK_USERS[email.toLowerCase()]
  if (!user || password !== 'demo1234') {
    throw Object.assign(new Error('Invalid credentials'), { code: 'auth/wrong-password' })
  }
  const mockUser = {
    uid:         `mock-${user.role}`,
    email,
    displayName: user.name,
    role:        user.role,
    getIdToken:  async () => `mock-token-${user.role}`,
  }
  sessionStorage.setItem('mock_user', JSON.stringify(mockUser))
  return mockUser
}

/**
 * Get the current mock user from session (dev only).
 */
export function getMockUser() {
  try {
    const raw = sessionStorage.getItem('mock_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
