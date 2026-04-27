// ============================================================
// EduAllocPro — SchoolCard Component
// DI border-left color, vacancy pills, enrollment sparkline, RTE badge.
// NEVER use index as key — always school_id.
// ============================================================

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { cardEntrance } from '../lib/motion'
import { getDIColors, getDITier } from '../lib/diColors'
import { useToast } from './Toast'
import DIBadge from './DIBadge'
import EnrollmentSparkline from './EnrollmentSparkline'
import FreshnessIndicator from './FreshnessIndicator'

/**
 * @param {object} props
 * @param {object} props.school - school data object
 * @param {function} props.onClick - called with school_id
 * @param {boolean} props.isSelected
 */
const SchoolCard = ({ school, onClick, isSelected = false }) => {
  const { t } = useTranslation()
  const { addToast } = useToast()
  const colors = getDIColors(school.di_score)
  
  const [verifyRequested, setVerifyRequested] = useState(false)

  const handleClick = () => onClick?.(school.school_id)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  return (
    <motion.article
      variants={cardEntrance}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-pressed={isSelected}
      aria-label={`${school.name}, ${t('di.label')}: ${Math.round(school.di_score ?? 0)}`}
      className={[
        'bg-white rounded-card shadow-card border border-border border-l-4 cursor-pointer',
        'transition-all duration-150 hover:shadow-md hover:-translate-y-0.5',
        'focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1',
        isSelected ? 'ring-2 ring-brand ring-offset-1' : '',
        colors.border,
      ].join(' ')}
    >
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-ink-primary leading-tight truncate">
              {school.name}
            </h3>
            <p className="text-xs text-ink-muted mt-0.5">
              {school.block} · {school.cluster}
            </p>
          </div>
          <DIBadge score={school.di_score} factors={school.di_factors} size="sm" />
        </div>

        {/* Vacancy pills + RTE badge */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {school.vacancies?.slice(0, 3).map((v, idx) => (
            <span
              key={`${school.school_id}-vac-${idx}`}
              className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 text-2xs font-medium px-2 py-0.5 rounded-full"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" aria-hidden="true" />
              {v.subject}
              {v.count > 1 && (
                <span className="font-mono" data-numeric="true">×{v.count}</span>
              )}
            </span>
          ))}
          {school.vacancies?.length > 3 && (
            <span className="text-2xs text-ink-muted px-1">
              +{school.vacancies.length - 3} {t('common.vacancies')}
            </span>
          )}
          {!school.rte_compliant && (
            <span 
              className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 text-2xs font-medium px-2 py-0.5 rounded-full cursor-help"
              title="RTE Act 2009 Violation: Pupil-Teacher Ratio exceeds 30:1 or critical infrastructure missing."
            >
              RTE ✗
            </span>
          )}
        </div>

        {/* Bottom row: enrollment sparkline + freshness */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-muted">
              {t('school.enrollment')}:
            </span>
            <span className="text-xs font-mono font-semibold text-ink-secondary" data-numeric="true">
              {school.enrollment_total?.toLocaleString() ?? '—'}
            </span>
            {school.enrollment_trend && (
              <EnrollmentSparkline data={school.enrollment_trend} width={60} height={24} />
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <FreshnessIndicator
              isStale={school.is_data_stale}
              ageMonths={school.data_age_months}
              variant="inline"
              overrideText={verifyRequested ? 'Verification Requested' : undefined}
            />
            {school.is_data_stale && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setVerifyRequested(true)
                  addToast({ message: 'Field verification request sent to block office.', type: 'info' })
                }}
                disabled={verifyRequested}
                className="text-2xs font-semibold px-2 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {verifyRequested ? 'Requested ✓' : 'Request Verification'}
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  )
}

export default SchoolCard
