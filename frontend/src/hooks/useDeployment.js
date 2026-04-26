// ============================================================
// EduAllocPro — useDeployment Hook
// Teacher matching + optimistic approval UI.
// ============================================================

import { useState, useCallback } from 'react'
import { fetchTeacherMatches, postOptimize, postApproveDeployment } from '../lib/api'
import { DEFAULT_DISTRICT_ID } from '../config'

export function useTeacherMatches(schoolId, vacancySubject) {
  const [matches,  setMatches]  = useState([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  const findMatches = useCallback(async (sid, subject) => {
    if (!sid || !subject) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchTeacherMatches(sid, subject)
      setMatches(data.matches || [])
    } catch (err) {
      setError(err.message || 'Failed to find teacher matches')
    } finally {
      setLoading(false)
    }
  }, [])

  return { matches, loading, error, findMatches, setMatches }
}

export function useOptimizer(districtId = DEFAULT_DISTRICT_ID) {
  const [assignments, setAssignments] = useState([])
  const [status,      setStatus]      = useState(null)
  const [solverTime,  setSolverTime]  = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState(null)

  const runOptimizer = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await postOptimize(districtId)
      setAssignments(data.assignments || [])
      setStatus(data.status || 'OPTIMAL')
      setSolverTime(data.solver_time_s || null)
    } catch (err) {
      setError(err.message || 'Optimizer failed')
    } finally {
      setLoading(false)
    }
  }, [districtId])

  return { assignments, status, solverTime, loading, error, runOptimizer }
}

export function useApproveDeployment() {
  const [approving, setApproving] = useState({}) // { [deploymentId]: true }
  const [approved,  setApproved]  = useState({}) // { [deploymentId]: true }
  const [error,     setError]     = useState(null)

  const approve = useCallback(async (deploymentId) => {
    // Optimistic UI — mark as approved immediately
    setApproved(prev => ({ ...prev, [deploymentId]: true }))
    setApproving(prev => ({ ...prev, [deploymentId]: true }))

    try {
      await postApproveDeployment(deploymentId)
    } catch (err) {
      // Rollback on failure
      setApproved(prev => ({ ...prev, [deploymentId]: false }))
      setError(err.message || 'Approval failed')
    } finally {
      setApproving(prev => ({ ...prev, [deploymentId]: false }))
    }
  }, [])

  return { approve, approving, approved, error }
}
