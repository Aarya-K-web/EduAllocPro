// ============================================================
// EduAllocPro — Shared Auth Utilities
// Single source of truth for role detection.
// Used by App.jsx, Login.jsx, and any future auth consumers.
// ============================================================

/**
 * Detect user role from a Firebase user object or mock user.
 * Priority: explicit role property → Firebase custom claims → email pattern.
 *
 * @param {object} user - Firebase user or mock user object
 * @returns {'collector'|'beo'|'secretary'|'teacher'|'school'} role string
 */
export function detectRole(user) {
  if (!user) return 'collector'

  // 1. Explicit role already set (mock users, custom claims resolved upstream)
  if (user.role) return user.role

  // 2. Firebase custom claims (populated by backend on token refresh)
  const claims = user?.reloadUserInfo?.customAttributes
  if (claims) {
    try {
      const parsed = JSON.parse(claims)
      if (parsed.role) return parsed.role
    } catch { /* ignore */ }
  }

  // 3. Email pattern fallback (for demo accounts without custom claims)
  const email = (user?.email || '').toLowerCase()
  if (email.includes('beo'))       return 'beo'
  if (email.includes('secretary')) return 'secretary'
  if (email.includes('teacher'))   return 'teacher'
  if (email.includes('school'))    return 'school'

  return 'collector'
}

/**
 * Get the default route for a given role.
 *
 * @param {string} role
 * @returns {string} route path
 */
export function getDefaultRoute(role) {
  if (role === 'beo')     return '/beo'
  if (role === 'teacher') return '/teacher-dashboard'
  if (role === 'school')  return '/school-dashboard'
  return '/dashboard'
}
