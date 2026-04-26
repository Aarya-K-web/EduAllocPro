// ============================================================
// EduAllocPro — API Client
// All fetch calls go through here. Falls back to mock data
// when the backend is unavailable.
// Attaches Firebase JWT Bearer token to every request.
// ============================================================

import { API_URL, API_TIMEOUT_MS } from '../config'
import {
  MOCK_SCHOOLS,
  MOCK_TEACHER_MATCHES,
  MOCK_ASSIGNMENTS,
  MOCK_BRIEFING,
} from './mockData'

/**
 * Get the current Firebase JWT token (or mock token in dev).
 */
async function getAuthToken() {
  try {
    const { auth, getMockUser } = await import('./firebase')
    if (auth?.currentUser) {
      return auth.currentUser.getIdToken()
    }
    // Dev fallback: use mock token
    const mockUser = getMockUser()
    if (mockUser) {
      return `mock-token-${mockUser.role}`
    }
  } catch {
    // Firebase not configured
  }
  return null
}

/**
 * Base fetch with timeout, auth header, and error handling.
 */
async function apiFetch(path, options = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS)

  const token = await getAuthToken()
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers,
    })
    clearTimeout(timer)

    // Handle auth errors
    if (res.status === 401) {
      // Redirect to login
      window.location.href = '/login'
      throw Object.assign(new Error('Authentication required'), { status: 401, code: 'UNAUTHORIZED' })
    }

    if (res.status === 429) {
      const retryAfter = res.headers.get('Retry-After') || '60'
      throw Object.assign(
        new Error(`Rate limited. Retry after ${retryAfter}s`),
        { status: 429, code: 'RATE_LIMITED', retryAfter: parseInt(retryAfter) }
      )
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw Object.assign(new Error(body.message || `HTTP ${res.status}`), {
        status: res.status,
        code:   body.error || 'API_ERROR',
      })
    }

    return res
  } catch (err) {
    clearTimeout(timer)
    if (err.name === 'AbortError') {
      throw Object.assign(new Error('Request timed out'), { code: 'TIMEOUT' })
    }
    throw err
  }
}

async function apiGet(path) {
  const res = await apiFetch(path)
  return res.json()
}

async function apiPost(path, body) {
  const res = await apiFetch(path, {
    method: 'POST',
    body:   JSON.stringify(body),
  })
  return res.json()
}

// ── Schools ─────────────────────────────────────────────────

export async function fetchSchools(districtId = 'NDB01', limit = 50) {
  try {
    return await apiGet(`/api/schools?district_id=${districtId}&limit=${limit}`)
  } catch {
    // Fallback to mock data
    return { schools: MOCK_SCHOOLS, total: MOCK_SCHOOLS.length }
  }
}

export async function fetchSchoolDetail(schoolId) {
  try {
    return await apiGet(`/api/schools/${schoolId}`)
  } catch {
    const school = MOCK_SCHOOLS.find(s => s.school_id === schoolId)
    if (!school) throw new Error(`School ${schoolId} not found`)
    return school
  }
}

// ── Deployment ───────────────────────────────────────────────

export async function fetchTeacherMatches(schoolId, vacancySubject) {
  try {
    return await apiGet(
      `/api/deploy/matches?school_id=${schoolId}&vacancy_subject=${encodeURIComponent(vacancySubject)}`
    )
  } catch {
    return { matches: MOCK_TEACHER_MATCHES }
  }
}

export async function postOptimize(districtId = 'NDB01') {
  try {
    return await apiPost('/api/deploy/optimize', { district_id: districtId })
  } catch {
    return {
      assignments: MOCK_ASSIGNMENTS,
      status:      'FEASIBLE',
      solver_time_s: 4.2,
      total_assignments: MOCK_ASSIGNMENTS.length,
    }
  }
}

export async function postApproveDeployment(deploymentId) {
  try {
    return await apiPost(`/api/deploy/${deploymentId}/approve`, {})
  } catch {
    return { deployment_id: deploymentId, status: 'approved' }
  }
}

// ── Briefing ─────────────────────────────────────────────────

export async function fetchBriefing(districtId = 'NDB01') {
  try {
    return await apiGet(`/api/briefing?district_id=${districtId}`)
  } catch {
    return MOCK_BRIEFING
  }
}

export async function postBriefingOrderPDF(districtId = 'NDB01') {
  try {
    const res = await apiFetch('/api/briefing/order', {
      method: 'POST',
      body:   JSON.stringify({ district_id: districtId }),
    })
    return res.blob()
  } catch {
    // Return null — PDF download will be handled by @react-pdf/renderer client-side
    return null
  }
}
