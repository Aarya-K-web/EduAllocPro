// ============================================================
// EduAllocPro — useSchools Hook
// Fetches school list for a district, sorted by DI score DESC.
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import { fetchSchools, fetchSchoolDetail } from '../lib/api'
import { DEFAULT_DISTRICT_ID } from '../config'

export function useSchools(districtId = DEFAULT_DISTRICT_ID) {
  const [schools,  setSchools]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [total,    setTotal]    = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchSchools(districtId)
      setSchools(data.schools || [])
      setTotal(data.total || 0)
    } catch (err) {
      setError(err.message || 'Failed to load schools')
    } finally {
      setLoading(false)
    }
  }, [districtId])

  useEffect(() => { load() }, [load])

  return { schools, loading, error, total, refetch: load }
}

export function useSchoolDetail(schoolId) {
  const [school,  setSchool]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const load = useCallback(async () => {
    if (!schoolId) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchSchoolDetail(schoolId)
      setSchool(data)
    } catch (err) {
      setError(err.message || 'Failed to load school detail')
    } finally {
      setLoading(false)
    }
  }, [schoolId])

  useEffect(() => { load() }, [load])

  return { school, loading, error, refetch: load }
}
