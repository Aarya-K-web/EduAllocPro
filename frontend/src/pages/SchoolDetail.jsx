// ============================================================
// EduAllocPro — SchoolDetail Page / Slide Panel
// Opens as slide panel over map — NEVER navigates away.
// Also used as standalone page at /schools/:id
// ============================================================

import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useSchoolDetail } from '../hooks/useSchools'
import { getDIColors } from '../lib/diColors'
import { cardEntrance, staggerContainer, diScoreCountUp } from '../lib/motion'
import DIBadge from '../components/DIBadge'
import DVSMeter from '../components/DVSMeter'
import FreshnessIndicator from '../components/FreshnessIndicator'
import EnrollmentSparkline from '../components/EnrollmentSparkline'
import SkeletonCard from '../components/SkeletonCard'

const DI_SIGNAL_LABELS = {
  stu_tea_ratio:    'Student-Teacher Ratio',
  subject_vacancy:  'Subject Vacancy',
  toilet:           'Toilet Availability',
  electricity:      'Electricity',
  classroom_ratio:  'Classroom Ratio',
  urban_distance:   'Urban Distance',
  enrollment_trend: 'Enrollment Trend',
  aser_proxy:       'Learning Outcome Proxy',
}

const DI_WEIGHTS = {
  stu_tea_ratio:    0.25,
  subject_vacancy:  0.20,
  toilet:           0.15,
  electricity:      0.10,
  classroom_ratio:  0.10,
  urban_distance:   0.08,
  enrollment_trend: 0.07,
  aser_proxy:       0.05,
}

/**
 * @param {object} props
 * @param {string} props.schoolId - when used as embedded panel
 * @param {function} props.onClose - close panel callback
 * @param {boolean} props.embedded - true when inside slide panel
 */
const SchoolDetailPanel = ({ schoolId: propSchoolId, onClose, embedded = false }) => {
  const { t } = useTranslation()
  const params = useParams()
  const navigate = useNavigate()

  const schoolId = propSchoolId || params.id
  const { school, loading, error } = useSchoolDetail(schoolId)

  const handleClose = () => {
    if (onClose) {
      onClose()
    } else {
      navigate(-1)
    }
  }

  if (loading) {
    return (
      <div className="p-4">
        <SkeletonCard count={3} variant="school" />
      </div>
    )
  }

  if (error || !school) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-ink-muted">{error || 'School not found'}</p>
        <button onClick={handleClose} className="mt-3 text-xs text-brand hover:underline">
          {t('common.back')}
        </button>
      </div>
    )
  }

  const colors = getDIColors(school.di_score)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className={`px-5 py-4 border-b border-border border-l-4 flex-shrink-0 ${colors.border}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-ink-primary leading-tight">
              {school.name}
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              {school.block} · {school.cluster}
            </p>
            <p className="text-2xs text-ink-muted font-mono mt-1" data-numeric="true">
              UDISE: {school.school_id}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <DIBadge score={school.di_score} size="md" />
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-gray-100 transition-colors focus-visible:ring-2 focus-visible:ring-brand"
              aria-label={t('common.close')}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Freshness indicator */}
        <div className="mt-2">
          <FreshnessIndicator
            isStale={school.is_data_stale}
            ageMonths={school.data_age_months}
            variant={school.is_data_stale ? 'banner' : 'badge'}
          />
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="p-5 space-y-5"
        >
          {/* DI Score count-up */}
          <motion.div variants={cardEntrance} className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-ink-secondary uppercase tracking-wide">
                {t('di.label')}
              </h3>
              <motion.span
                variants={diScoreCountUp}
                className={`text-3xl font-bold font-mono ${colors.text}`}
                data-numeric="true"
              >
                {Math.round(school.di_score ?? 0)}
              </motion.span>
            </div>

            {/* DI breakdown bars */}
            {school.di_breakdown && (
              <div className="space-y-2">
                {Object.entries(DI_WEIGHTS).map(([key, weight]) => {
                  const rawScore = school.di_breakdown[key] ?? 0
                  const contribution = rawScore * weight * 100
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-2xs text-ink-muted w-32 flex-shrink-0 truncate">
                        {DI_SIGNAL_LABELS[key]}
                      </span>
                      <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: colors.hex }}
                          initial={{ width: 0 }}
                          animate={{ width: `${rawScore * 100}%` }}
                          transition={{ duration: 0.6, delay: 0.1 }}
                        />
                      </div>
                      <span className="text-2xs font-mono text-ink-muted w-8 text-right" data-numeric="true">
                        {(rawScore * 100).toFixed(0)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </motion.div>

          {/* School info grid */}
          <motion.div variants={cardEntrance}>
            <h3 className="text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-3">
              School Information
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <InfoCell label={t('school.medium')}   value={school.medium} />
              <InfoCell label={t('school.category')} value={school.category} />
              <InfoCell
                label={t('school.enrollment')}
                value={school.enrollment_total?.toLocaleString()}
                numeric
              />
              <InfoCell
                label={t('school.urbanDistance')}
                value={`${school.urban_distance_km} km`}
                numeric
              />
              <InfoCell
                label={t('school.toiletStatus')}
                value={school.toilet_available ? t('school.available') : t('school.notAvailable')}
                highlight={!school.toilet_available ? 'error' : 'ok'}
              />
              <InfoCell
                label={t('school.electricityStatus')}
                value={school.electricity_available ? t('school.available') : t('school.notAvailable')}
                highlight={!school.electricity_available ? 'error' : 'ok'}
              />
            </div>
          </motion.div>

          {/* Enrollment trend */}
          {school.enrollment_trend && (
            <motion.div variants={cardEntrance} className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-ink-secondary uppercase tracking-wide">
                  {t('school.enrollmentTrend')}
                </h3>
                <EnrollmentSparkline data={school.enrollment_trend} width={100} height={36} />
              </div>
            </motion.div>
          )}

          {/* Vacancies */}
          {school.vacancies?.length > 0 && (
            <motion.div variants={cardEntrance}>
              <h3 className="text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-3">
                {t('school.vacancies')} ({school.total_vacancies})
              </h3>
              <div className="space-y-2">
                {school.vacancies.map((v, idx) => (
                  <div
                    key={`${school.school_id}-vac-${idx}`}
                    className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-blue-800">{v.subject}</p>
                      <p className="text-xs text-blue-600">Grade {v.grade_range}</p>
                    </div>
                    <span className="text-sm font-bold font-mono text-blue-700" data-numeric="true">
                      ×{v.count}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* RTE status */}
          <motion.div variants={cardEntrance}>
            <div className={[
              'flex items-center gap-3 rounded-xl p-3 border',
              school.rte_compliant
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-red-50 border-red-200',
            ].join(' ')}>
              <span className={school.rte_compliant ? 'text-emerald-600' : 'text-red-600'} aria-hidden="true">
                {school.rte_compliant ? '✓' : '✗'}
              </span>
              <div>
                <p className={`text-sm font-semibold ${school.rte_compliant ? 'text-emerald-800' : 'text-red-800'}`}>
                  {school.rte_compliant ? t('school.rteCompliant') : t('school.rteViolation')}
                </p>
                <p className={`text-xs ${school.rte_compliant ? 'text-emerald-600' : 'text-red-600'}`}>
                  PTR: {school.stu_tea_ratio}:1
                </p>
              </div>
            </div>
          </motion.div>

          {/* Find teachers CTA */}
          {school.total_vacancies > 0 && (
            <motion.div variants={cardEntrance}>
              <a
                href={`/deploy?school_id=${school.school_id}`}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {t('school.findTeachers')}
              </a>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

// ── Internal sub-component ──────────────────────────────────
const InfoCell = ({ label, value, numeric = false, highlight }) => (
  <div className="bg-white border border-border rounded-lg p-2.5">
    <p className="text-2xs text-ink-muted mb-0.5">{label}</p>
    <p
      className={[
        'text-sm font-semibold',
        highlight === 'error' ? 'text-red-600' : highlight === 'ok' ? 'text-emerald-600' : 'text-ink-primary',
        numeric ? 'font-mono' : '',
      ].join(' ')}
      data-numeric={numeric ? 'true' : undefined}
    >
      {value || '—'}
    </p>
  </div>
)

export default SchoolDetailPanel
