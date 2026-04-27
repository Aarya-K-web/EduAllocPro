// ============================================================
// EduAllocPro — Secretary Dashboard (/secretary)
// High-level state-wide overview showing average DI scores.
// ============================================================

import React from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { staggerContainer, cardEntrance } from '../lib/motion'
import { useStore } from '../context/StoreContext'
import DIBadge from '../components/DIBadge'

const MOCK_DISTRICTS = [
  { id: 'NDB01', name: 'Nandurbar', avg_di: 68, critical_schools: 4, vacancies: 14, is_active: true },
  { id: 'NSK02', name: 'Nashik', avg_di: 42, critical_schools: 12, vacancies: 145, is_active: false },
  { id: 'DHL03', name: 'Dhule', avg_di: 51, critical_schools: 8, vacancies: 82, is_active: false },
  { id: 'PNE04', name: 'Pune', avg_di: 28, critical_schools: 2, vacancies: 430, is_active: false },
  { id: 'NGB05', name: 'Nagpur', avg_di: 35, critical_schools: 5, vacancies: 210, is_active: false },
]

const SecretaryDashboard = () => {
  const { t } = useTranslation()
  const { stats } = useStore() // Use Nandurbar real stats for Nandurbar

  // Update Nandurbar with actual stats from the store
  const districts = MOCK_DISTRICTS.map(d => {
    if (d.id === 'NDB01') {
      return {
        ...d,
        critical_schools: stats.criticalSchools,
        vacancies: stats.totalVacancies,
      }
    }
    return d
  }).sort((a, b) => b.avg_di - a.avg_di)

  const stateCriticalSchools = districts.reduce((sum, d) => sum + d.critical_schools, 0)
  const stateTotalVacancies = districts.reduce((sum, d) => sum + d.vacancies, 0)

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 h-screen overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-primary">State Overview: Maharashtra</h1>
          <p className="text-sm text-ink-muted mt-1">State Education Secretary Dashboard</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-ink-muted uppercase tracking-wider font-semibold">State Average DI</p>
          <div className="flex items-center justify-end gap-2 mt-1">
            <span className="text-3xl font-bold font-mono text-amber-600" data-numeric="true">45</span>
            <DIBadge score={45} size="md" showLabel={true} />
          </div>
        </div>
      </div>

      {/* State-wide Stats */}
      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Districts Monitored" value={districts.length} color="text-ink-primary" />
        <StatCard label="Total Critical Schools" value={stateCriticalSchools} color="text-di-critical" />
        <StatCard label="Statewide Vacancies" value={stateTotalVacancies} color="text-amber-600" />
      </motion.div>

      {/* District List */}
      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="bg-white rounded-card shadow-card border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-gray-50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink-primary">District Deprivation Index (DI) Ranking</h2>
        </div>
        <div className="divide-y divide-border">
          {districts.map((district, idx) => (
            <motion.div
              key={district.id}
              variants={cardEntrance}
              className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${district.is_active ? 'hover:bg-blue-50/50 cursor-pointer' : 'opacity-70 grayscale hover:bg-gray-50'}`}
              onClick={() => {
                if (district.is_active) {
                  window.location.href = '/dashboard' // Navigate to district view
                }
              }}
            >
              <div className="flex items-center gap-4 w-full sm:w-1/3">
                <span className="text-sm font-bold text-ink-muted font-mono w-6 text-right">#{idx + 1}</span>
                <div>
                  <h3 className="text-base font-bold text-ink-primary flex items-center gap-2">
                    {district.name}
                    {district.is_active && (
                      <span className="text-2xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        Active Sandbox
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-ink-muted mt-0.5">District Code: {district.id}</p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-around w-full sm:w-2/3">
                <div className="text-center">
                  <p className="text-xs text-ink-muted mb-1">Average DI</p>
                  <DIBadge score={district.avg_di} size="md" showLabel={true} />
                </div>
                <div className="text-center">
                  <p className="text-xs text-ink-muted mb-1">Critical Schools</p>
                  <p className="text-base font-bold font-mono text-di-critical" data-numeric="true">{district.critical_schools}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-ink-muted mb-1">Total Vacancies</p>
                  <p className="text-base font-bold font-mono text-amber-600" data-numeric="true">{district.vacancies}</p>
                </div>
                <div className="hidden sm:block">
                  <button 
                    disabled={!district.is_active}
                    className="p-2 text-ink-muted hover:text-brand disabled:opacity-30 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

const StatCard = ({ label, value, color }) => (
  <motion.div variants={cardEntrance} className="bg-white p-5 rounded-xl border border-border shadow-sm flex flex-col items-center justify-center text-center">
    <p className={`text-3xl font-bold font-mono mb-1 ${color}`} data-numeric="true">{value}</p>
    <p className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">{label}</p>
  </motion.div>
)

export default SecretaryDashboard
