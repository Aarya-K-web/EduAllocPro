// ============================================================
// EduAllocPro — FreshnessIndicator Component
// Shows UDISE data age warning when data is >12 months old.
// ============================================================

import { useTranslation } from 'react-i18next'
import { STALE_DATA_THRESHOLD_MONTHS } from '../config'

/**
 * @param {object} props
 * @param {boolean} props.isStale       - is data stale?
 * @param {number}  props.ageMonths     - data age in months
 * @param {'inline'|'badge'|'banner'} props.variant
 */
const FreshnessIndicator = ({
  isStale   = false,
  ageMonths = 0,
  variant   = 'badge',
  overrideText,
}) => {
  const { t } = useTranslation()

  if (!isStale) {
    if (variant === 'badge') {
      return (
        <span className="inline-flex items-center gap-1 text-2xs text-emerald-600 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
          {t('freshness.fresh')}
        </span>
      )
    }
    return null
  }

  const warning = t('freshness.staleWarning', { months: ageMonths })

  if (variant === 'inline') {
    return (
      <span
        className="inline-flex items-center gap-1 text-2xs text-amber-600 font-medium"
        title={warning}
      >
        <span aria-hidden="true">⚠</span>
        {overrideText || t('freshness.fieldVerifyRequired')}
      </span>
    )
  }

  if (variant === 'banner') {
    return (
      <div
        role="alert"
        className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
      >
        <span className="text-amber-500 text-sm mt-0.5 flex-shrink-0" aria-hidden="true">⚠</span>
        <div>
          <p className="text-xs font-semibold text-amber-800">
            {overrideText || t('freshness.fieldVerifyRequired')}
          </p>
          <p className="text-xs text-amber-700 mt-0.5">{warning}</p>
        </div>
      </div>
    )
  }

  // Default: badge
  return (
    <span
      className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 text-2xs font-medium px-2 py-0.5 rounded-full"
      title={warning}
    >
      <span aria-hidden="true">⚠</span>
      {overrideText || t('freshness.fieldVerifyRequired')}
    </span>
  )
}

export default FreshnessIndicator
