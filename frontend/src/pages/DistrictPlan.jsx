// ============================================================
// EduAllocPro — DistrictPlan Page (/plan)
// OR-Tools district assignment table.
// ============================================================

import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useOptimizer } from '../hooks/useDeployment'
import { getDIColors } from '../lib/diColors'
import { staggerContainer, cardEntrance } from '../lib/motion'
import { DEFAULT_DISTRICT_ID } from '../config'
import SkeletonCard from '../components/SkeletonCard'
import { useToast } from '../components/Toast'
import { useState } from 'react'

const DistrictPlan = () => {
  const { t } = useTranslation()
  const { addToast } = useToast()
  const { assignments, status, solverTime, loading, error, runOptimizer } = useOptimizer(DEFAULT_DISTRICT_ID)

  const handleRunOptimizer = async () => {
    await runOptimizer()
    addToast({
      message: 'District optimization complete',
      type:    'success',
    })
  }

  const [activeTab, setActiveTab] = useState('plan') // 'plan' | 'history'

  const MOCK_HISTORY = [
    { id: 1, action: 'Field Verification Requested', target: 'ZP School Molgi', user: 'Block Education Officer', time: '10 mins ago', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 2, action: 'Teacher Reassigned', target: 'Pradeep Vishnu Jadhav -> Ashram School Akkalkuwa', user: 'HR Admin', time: '1 hour ago', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
    { id: 3, action: 'Deployments Approved', target: '5 teachers deployed', user: 'District Collector', time: '2 hours ago', icon: 'M5 13l4 4L19 7' },
    { id: 4, action: 'Optimizer Run', target: 'Nandurbar District', user: 'System', time: '1 day ago', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
  ]

  const statusConfig = {
    OPTIMAL:  { label: t('plan.optimal'),  color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    FEASIBLE: { label: t('plan.feasible'), color: 'text-amber-600 bg-amber-50 border-amber-200' },
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink-primary">{t('plan.title')}</h1>
          <p className="text-sm text-ink-muted mt-1">{t('plan.subtitle')}</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Tabs */}
          <div className="flex p-1 bg-gray-100 rounded-lg w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('plan')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${activeTab === 'plan' ? 'bg-white text-ink-primary shadow-sm' : 'text-ink-muted hover:text-ink-secondary'}`}
            >
              Current Plan
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${activeTab === 'history' ? 'bg-white text-ink-primary shadow-sm' : 'text-ink-muted hover:text-ink-secondary'}`}
            >
              Audit History
            </button>
          </div>

          {activeTab === 'plan' && (
            <button
              onClick={handleRunOptimizer}
              disabled={loading}
              className="w-full sm:w-auto px-5 py-2 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-brand flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t('plan.running')}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {t('plan.runOptimizer')}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Status bar */}
      {status && activeTab === 'plan' && (
        <motion.div
          variants={cardEntrance}
          initial="initial"
          animate="animate"
          className="flex items-center gap-4 bg-white rounded-card shadow-card border border-border p-4 mb-6"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-ink-secondary">{t('plan.status')}:</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusConfig[status]?.color || ''}`}>
              {statusConfig[status]?.label || status}
            </span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs font-medium text-ink-secondary">{t('plan.totalAssignments')}:</span>
            <span className="text-sm font-bold font-mono text-brand" data-numeric="true">
              {assignments.length}
            </span>
          </div>
        </motion.div>
      )}

      {/* Error */}
      {error && activeTab === 'plan' && (
        <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Assignments table */}
      {activeTab === 'plan' && (
        loading ? (
          <SkeletonCard count={8} variant="row" />
        ) : assignments.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-16 h-16 text-ink-muted mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm text-ink-muted">{t('plan.noAssignments')}</p>
          </div>
        ) : (
        <div className="bg-white rounded-card shadow-card border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="table" aria-label="District assignment plan">
              <thead>
                <tr className="bg-gray-50 border-b border-border">
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-ink-secondary uppercase tracking-wide">
                    #
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-ink-secondary uppercase tracking-wide">
                    {t('plan.school')}
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-ink-secondary uppercase tracking-wide">
                    {t('plan.teacher')}
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-ink-secondary uppercase tracking-wide">
                    {t('plan.subject')}
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-ink-secondary uppercase tracking-wide">
                    Match Score
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-ink-secondary uppercase tracking-wide">
                    {t('plan.distance')}
                  </th>
                  <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-ink-secondary uppercase tracking-wide">
                    {t('plan.status')}
                  </th>
                </tr>
              </thead>
              <motion.tbody
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                {assignments.map((asgn, idx) => (
                  <motion.tr
                    key={asgn.assignment_id}
                    variants={cardEntrance}
                    className="border-b border-border last:border-0 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-xs font-mono text-ink-muted" data-numeric="true">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-ink-primary truncate max-w-[180px]">
                        {asgn.school_name}
                      </p>
                      <p className="text-2xs text-ink-muted font-mono" data-numeric="true">
                        {asgn.school_id}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-ink-primary truncate max-w-[160px]">
                        {asgn.teacher_name}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                        {asgn.subject}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-bold font-mono text-brand cursor-help" title={`DVS Score: ${(asgn.dvs * 100).toFixed(1)}%`} data-numeric="true">
                        {(asgn.dvs * 100).toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-mono text-ink-secondary" data-numeric="true">
                        {asgn.commute_km?.toFixed(1)} km
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={[
                        'text-xs font-medium px-2 py-0.5 rounded-full border',
                        asgn.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200',
                      ].join(' ')}>
                        {asgn.status === 'approved' ? t('deploy.approved') : t('deploy.pending')}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </div>
        </div>
        )
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <motion.div variants={cardEntrance} initial="initial" animate="animate" className="bg-white rounded-card shadow-card border border-border p-6 max-w-3xl">
          <h2 className="text-base font-bold text-ink-primary mb-6">Recent Activity</h2>
          <div className="relative border-l border-gray-200 ml-3 space-y-8">
            {MOCK_HISTORY.map((item) => (
              <div key={item.id} className="relative pl-6">
                <span className="absolute -left-3 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-brand-50 border border-brand/20 ring-4 ring-white">
                  <svg className="h-3.5 w-3.5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
                  </svg>
                </span>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                  <div>
                    <h3 className="text-sm font-semibold text-ink-primary">{item.action}</h3>
                    <p className="text-sm text-ink-secondary mt-0.5">{item.target}</p>
                    <p className="text-xs text-ink-muted mt-1">By {item.user}</p>
                  </div>
                  <span className="text-xs text-ink-muted whitespace-nowrap">{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default DistrictPlan
