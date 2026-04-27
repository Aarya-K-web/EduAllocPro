// ============================================================
// EduAllocPro — Global Store Context
// Provides a single source of truth for computed metrics
// (Critical Schools, Total Vacancies, RTE Violations).
// ============================================================

import React, { createContext, useContext, useMemo } from 'react'
import { MOCK_SCHOOLS } from '../lib/mockData'

const StoreContext = createContext()

export function StoreProvider({ children }) {
  // Compute global stats from the source data
  const stats = useMemo(() => {
    return {
      criticalSchools: MOCK_SCHOOLS.filter(s => s.di_score >= 80).length,
      totalVacancies: MOCK_SCHOOLS.reduce((sum, s) => sum + (s.total_vacancies || 0), 0),
      rteViolations: MOCK_SCHOOLS.filter(s => s.rte_compliant === false).length,
      schoolsMonitored: MOCK_SCHOOLS.length,
    }
  }, [])

  return (
    <StoreContext.Provider value={{ stats }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const context = useContext(StoreContext)
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider')
  }
  return context
}
