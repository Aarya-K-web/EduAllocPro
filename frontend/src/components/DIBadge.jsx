// ============================================================
// EduAllocPro — DIBadge Component
// 4-tier color system: Critical / High / Moderate / Stable
// aria-label required per accessibility spec.
// ============================================================

import { useTranslation } from 'react-i18next'
import { getDITier, DI_COLORS } from '../lib/diColors'

/**
 * @param {object} props
 * @param {number|null} props.score - DI score 0-100
 * @param {'sm'|'md'|'lg'} props.size - badge size
 * @param {boolean} props.showScore - show numeric score
 * @param {boolean} props.showLabel - show tier label
 * @param {string} props.className - extra classes
 */
const DIBadge = ({
  score,
  size      = 'md',
  showScore = true,
  showLabel = true,
  factors   = [],
  className = '',
}) => {
  const { t } = useTranslation()

  const tier   = getDITier(score)
  const colors = DI_COLORS[tier]
  const label  = t(`di.${tier}`)
  const displayScore = score !== null && score !== undefined ? Math.round(score) : '—'

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  }

  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  }

  let ariaLabel = t('di.ariaLabel', {
    score: displayScore,
    tier:  label,
  })
  
  let titleAttr = undefined
  if (factors && factors.length > 0) {
    titleAttr = `Deprivation Factors:\n• ${factors.join('\n• ')}`
    ariaLabel += `. Factors: ${factors.join(', ')}`
  }

  return (
    <span
      role="img"
      aria-label={ariaLabel}
      title={titleAttr}
      className={[
        'inline-flex items-center rounded-full font-medium border',
        colors.badgeBg,
        colors.badgeText,
        colors.badgeBorder,
        sizeClasses[size],
        className,
      ].join(' ')}
    >
      {/* Colored dot */}
      <span
        className={[
          'rounded-full flex-shrink-0',
          dotSizes[size],
        ].join(' ')}
        style={{ backgroundColor: colors.hex }}
        aria-hidden="true"
      />

      {/* Tier label */}
      {showLabel && (
        <span className="font-devanagari-safe">{label}</span>
      )}

      {/* Numeric score — always JetBrains Mono */}
      {showScore && score !== null && score !== undefined && (
        <span
          className="font-mono font-semibold"
          data-numeric="true"
          aria-hidden="true"
        >
          {Math.round(score)}
        </span>
      )}
    </span>
  )
}

export default DIBadge
