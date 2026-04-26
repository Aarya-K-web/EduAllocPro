// ============================================================
// EduAllocPro — DVSMeter Component
// 3-segment bar: DI×0.40 blue | Match×0.35 teal | Retention×0.25 amber
// DVS = (DI/100)*0.40 + (match/100)*0.35 + (retention/100)*0.25
// ============================================================

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { dvsBarFill } from '../lib/motion'

const DVS_WEIGHTS = { di: 0.40, match: 0.35, retention: 0.25 }

const SEGMENT_CONFIG = [
  { key: 'di',        color: '#2563EB', label: 'dvs.di',        weight: DVS_WEIGHTS.di },
  { key: 'match',     color: '#0D9488', label: 'dvs.match',     weight: DVS_WEIGHTS.match },
  { key: 'retention', color: '#D97706', label: 'dvs.retention', weight: DVS_WEIGHTS.retention },
]

/**
 * @param {object} props
 * @param {number} props.diScore        - 0-100
 * @param {number} props.matchScore     - 0-100
 * @param {number} props.retentionScore - 0-100
 * @param {boolean} props.showLabels    - show segment labels below bar
 * @param {boolean} props.showTotal     - show total DVS score
 * @param {'sm'|'md'|'lg'} props.size
 */
const DVSMeter = ({
  diScore        = 0,
  matchScore     = 0,
  retentionScore = 0,
  showLabels     = true,
  showTotal      = true,
  size           = 'md',
}) => {
  const { t } = useTranslation()

  const dvs = (
    (diScore / 100)        * DVS_WEIGHTS.di +
    (matchScore / 100)     * DVS_WEIGHTS.match +
    (retentionScore / 100) * DVS_WEIGHTS.retention
  )

  // Each segment's visual width = its contribution to DVS (as % of total bar)
  const diWidth        = (diScore / 100)        * DVS_WEIGHTS.di        * 100
  const matchWidth     = (matchScore / 100)     * DVS_WEIGHTS.match     * 100
  const retentionWidth = (retentionScore / 100) * DVS_WEIGHTS.retention * 100

  const barHeight = { sm: 'h-1.5', md: 'h-2', lg: 'h-3' }[size]

  const ariaLabel = t('dvs.ariaLabel', {
    di:        Math.round(diScore),
    match:     Math.round(matchScore),
    retention: Math.round(retentionScore),
  })

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="w-full"
    >
      {/* Total DVS score */}
      {showTotal && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-ink-secondary font-medium">
            {t('dvs.label')}
          </span>
          <span
            className="text-sm font-semibold font-mono text-ink-primary"
            data-numeric="true"
          >
            {(dvs * 100).toFixed(1)}
          </span>
        </div>
      )}

      {/* 3-segment bar */}
      <div
        className={`w-full bg-gray-100 rounded-full overflow-hidden flex ${barHeight}`}
        role="presentation"
      >
        {/* DI segment — blue */}
        <motion.div
          className="h-full rounded-l-full"
          style={{ backgroundColor: '#2563EB' }}
          variants={dvsBarFill(diWidth, 0)}
          initial="initial"
          animate="animate"
          aria-label={`${t('dvs.di')}: ${Math.round(diScore)}`}
        />
        {/* Match segment — teal */}
        <motion.div
          className="h-full"
          style={{ backgroundColor: '#0D9488' }}
          variants={dvsBarFill(matchWidth, 0.2)}
          initial="initial"
          animate="animate"
          aria-label={`${t('dvs.match')}: ${Math.round(matchScore)}`}
        />
        {/* Retention segment — amber */}
        <motion.div
          className="h-full rounded-r-full"
          style={{ backgroundColor: '#D97706' }}
          variants={dvsBarFill(retentionWidth, 0.4)}
          initial="initial"
          animate="animate"
          aria-label={`${t('dvs.retention')}: ${Math.round(retentionScore)}`}
        />
      </div>

      {/* Segment labels */}
      {showLabels && (
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {SEGMENT_CONFIG.map(seg => {
            const score = seg.key === 'di' ? diScore : seg.key === 'match' ? matchScore : retentionScore
            return (
              <div key={seg.key} className="flex items-center gap-1">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: seg.color }}
                  aria-hidden="true"
                />
                <span className="text-2xs text-ink-muted">
                  {t(seg.label)}
                </span>
                <span
                  className="text-2xs font-mono font-semibold text-ink-secondary"
                  data-numeric="true"
                >
                  {Math.round(score)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default DVSMeter
