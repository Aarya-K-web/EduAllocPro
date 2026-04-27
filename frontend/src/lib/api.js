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
    const data = await apiGet(
      `/api/deploy/matches?school_id=${schoolId}&vacancy_subject=${encodeURIComponent(vacancySubject)}`
    )
    // Normalize flat backend TeacherMatch → nested shape expected by TeacherMatchCard
    const diScore = data.school_di_score ?? 0
    return {
      ...data,
      matches: (data.matches || []).map(m => normalizeMatch(m, diScore)),
    }
  } catch {
    // Dynamic mock logic to ensure accurate filtering by subject
    const { MOCK_TEACHERS, MOCK_SCHOOLS } = await import('./mockData')
    const school = MOCK_SCHOOLS.find(s => s.school_id === schoolId)
    const diScore = school?.di_score || 87
    
    const matchingTeachers = MOCK_TEACHERS.filter(t => 
      t.subject_specialization?.includes(vacancySubject)
    )
    
    const syntheticMatches = matchingTeachers.map((teacher, index) => ({
      rank: index + 1,
      teacher,
      di_score: diScore,
      match_score: teacher.match_score,
      retention_score: teacher.retention_score,
      dvs: teacher.dvs,
      commute_km: Math.floor(Math.random() * 40) + 5,
      deployment_id: null,
      status: 'pending',
    }))
    
    return { matches: syntheticMatches }
  }
}

/**
 * Reshape the flat TeacherMatch returned by the backend into the nested
 * { teacher: {...}, di_score, match_score, retention_score, dvs, commute_km }
 * shape that TeacherMatchCard consumes.
 *
 * @param {object} m - flat TeacherMatch from /api/deploy/matches
 * @param {number} diScore - school DI score from the parent MatchListResponse
 */
function normalizeMatch(m, diScore) {
  return {
    rank:            m.rank,
    di_score:        diScore,
    match_score:     m.match_score,
    retention_score: m.retention_score,
    dvs:             m.dvs_score,             // component uses .dvs
    commute_km:      m.distance_km ?? null,   // component uses .commute_km
    status:          'pending',
    teacher: {
      teacher_id:              m.teacher_id,
      name:                    m.name,
      employee_id:             m.teacher_id,  // no employee_id in model — use teacher_id
      qualification:           m.qualification,
      subject_specialization:  m.subjects ?? [],
      long_dist_consent:       m.is_within_80km ?? true,
    },
    // Pass through DVS breakdown and extra flags for richer UI
    dvs_score:         m.dvs_score,
    dvs_breakdown:     m.dvs_breakdown,
    retention_warning: m.retention_warning,
    retention_risk:    m.retention_risk,
    is_synthetic:      m.is_synthetic,
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
