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

  const statusConfig = {
    OPTIMAL:  { label: t('plan.optimal'),  color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    FEASIBLE: { label: t('plan.feasible'), color: 'text-amber-600 bg-amber-50 border-amber-200' },
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-ink-primary">{t('plan.title')}</h1>
          <p className="text-sm text-ink-muted mt-1">{t('plan.subtitle')}</p>
        </div>
        <button
          onClick={handleRunOptimizer}
          disabled={loading}
          className="px-5 py-2.5 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-brand flex items-center gap-2"
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
      </div>

      {/* Status bar */}
      {status && (
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
          {solverTime && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-ink-secondary">{t('plan.solverTime')}:</span>
              <span className="text-xs font-mono text-ink-primary" data-numeric="true">
                {solverTime.toFixed(1)}s
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs font-medium text-ink-secondary">{t('plan.totalAssignments')}:</span>
            <span className="text-sm font-bold font-mono text-brand" data-numeric="true">
              {assignments.length}
            </span>
          </div>
        </motion.div>
      )}

      {/* Error */}
      {error && (
        <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Assignments table */}
      {loading ? (
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
                    {t('plan.dvs')}
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
                      <span className="text-sm font-bold font-mono text-brand" data-numeric="true">
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
      )}
    </div>
  )
}

export default DistrictPlan
