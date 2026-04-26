// ============================================================
// EduAllocPro — TeacherMatchCard Component
// Rank badge, 3 metric cells, DVS meter, approve button.
// Optimistic UI for deployment approval.
// ============================================================

import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { cardEntrance } from '../lib/motion'
import DVSMeter from './DVSMeter'

const RANK_COLORS = ['bg-amber-400', 'bg-gray-300', 'bg-amber-600', 'bg-gray-200', 'bg-gray-200']

/**
 * @param {object} props
 * @param {object} props.match - teacher match object
 * @param {number} props.match.rank
 * @param {object} props.match.teacher
 * @param {number} props.match.di_score
 * @param {number} props.match.match_score
 * @param {number} props.match.retention_score
 * @param {number} props.match.dvs
 * @param {number} props.match.commute_km
 * @param {string} props.match.status
 * @param {function} props.onApprove - called with teacher_id
 * @param {boolean} props.isApproved
 * @param {boolean} props.isApproving
 */
const TeacherMatchCard = ({
  match,
  onApprove,
  isApproved  = false,
  isApproving = false,
}) => {
  const { t } = useTranslation()
  const { rank, teacher, di_score, match_score, retention_score, dvs, commute_km } = match

  const approved = isApproved || match.status === 'approved'

  const handleApprove = () => {
    if (!approved && !isApproving) {
      onApprove?.(teacher.teacher_id)
    }
  }

  return (
    <motion.article
      variants={cardEntrance}
      className="bg-white rounded-card shadow-card border border-border overflow-hidden"
    >
      <div className="p-4">
        {/* Header: rank badge + teacher name */}
        <div className="flex items-start gap-3 mb-4">
          {/* Rank badge */}
          <div
            className={[
              'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
              'text-xs font-bold text-white font-mono',
              RANK_COLORS[rank - 1] || 'bg-gray-200',
            ].join(' ')}
            aria-label={`${t('deploy.rank')} ${rank}`}
            data-numeric="true"
          >
            {rank}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-ink-primary truncate">
              {teacher.name}
            </h3>
            <p className="text-xs text-ink-muted mt-0.5">
              {teacher.employee_id} · {teacher.qualification}
            </p>
          </div>

          {/* Commute distance */}
          <div className="text-right flex-shrink-0">
            <span className="text-xs font-mono font-semibold text-ink-secondary" data-numeric="true">
              {commute_km?.toFixed(1)}
            </span>
            <span className="text-2xs text-ink-muted ml-0.5">{t('teacher.km')}</span>
          </div>
        </div>

        {/* 3 metric cells */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <MetricCell
            label={t('di.score')}
            value={Math.round(di_score)}
            color="text-di-critical"
          />
          <MetricCell
            label={t('teacher.matchScore')}
            value={Math.round(match_score)}
            color="text-teal-600"
          />
          <MetricCell
            label={t('teacher.retentionScore')}
            value={Math.round(retention_score)}
            color="text-amber-600"
          />
        </div>

        {/* DVS Meter */}
        <div className="mb-4">
          <DVSMeter
            diScore={di_score}
            matchScore={match_score}
            retentionScore={retention_score}
            showTotal={true}
            showLabels={false}
            size="sm"
          />
        </div>

        {/* Subject tags */}
        <div className="flex flex-wrap gap-1 mb-4">
          {teacher.subject_specialization?.map(subj => (
            <span
              key={`${teacher.teacher_id}-${subj}`}
              className="text-2xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-medium"
            >
              {subj}
            </span>
          ))}
          {teacher.long_dist_consent && (
            <span className="text-2xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
              Long-dist ✓
            </span>
          )}
        </div>

        {/* Approve button */}
        <button
          onClick={handleApprove}
          disabled={approved || isApproving}
          aria-label={approved ? t('deploy.approved') : t('deploy.approveDeployment')}
          aria-live="polite"
          className={[
            'w-full py-2 px-4 rounded-lg text-sm font-semibold transition-all duration-200',
            'focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1',
            approved
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
              : isApproving
              ? 'bg-blue-50 text-blue-500 border border-blue-200 cursor-wait'
              : 'bg-brand text-white hover:bg-brand-700 active:scale-95',
          ].join(' ')}
        >
          {approved ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {t('deploy.approved')}
            </span>
          ) : isApproving ? (
            t('common.loading')
          ) : (
            t('deploy.approveDeployment')
          )}
        </button>
      </div>
    </motion.article>
  )
}

// ── Internal sub-component ──────────────────────────────────
const MetricCell = ({ label, value, color }) => (
  <div className="bg-gray-50 rounded-lg p-2 text-center">
    <p className="text-2xs text-ink-muted mb-0.5 leading-tight">{label}</p>
    <p className={`text-lg font-bold font-mono ${color}`} data-numeric="true">
      {value}
    </p>
  </div>
)

export default TeacherMatchCard
