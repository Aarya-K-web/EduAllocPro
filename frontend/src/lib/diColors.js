// ============================================================
// EduAllocPro — DI Color System
// Maps DI scores to the 4-tier color system.
// NEVER use red for anything other than DI Critical.
// ============================================================

export const DI_TIERS = {
  CRITICAL: 'critical',
  HIGH:     'high',
  MODERATE: 'moderate',
  STABLE:   'stable',
}

export const DI_THRESHOLDS = {
  CRITICAL: 80, // DI 80-100
  HIGH:     60, // DI 60-79
  MODERATE: 40, // DI 40-59
  STABLE:    0, // DI 0-39
}

export const DI_COLORS = {
  critical: {
    hex:        '#E11D48',
    bg:         'bg-di-critical',
    text:       'text-di-critical',
    border:     'border-di-critical',
    badgeBg:    'bg-red-50',
    badgeText:  'text-red-700',
    badgeBorder:'border-red-200',
    tailwind:   'red',
  },
  high: {
    hex:        '#D97706',
    bg:         'bg-di-high',
    text:       'text-di-high',
    border:     'border-di-high',
    badgeBg:    'bg-amber-50',
    badgeText:  'text-amber-700',
    badgeBorder:'border-amber-200',
    tailwind:   'amber',
  },
  moderate: {
    hex:        '#2563EB',
    bg:         'bg-di-moderate',
    text:       'text-di-moderate',
    border:     'border-di-moderate',
    badgeBg:    'bg-blue-50',
    badgeText:  'text-blue-700',
    badgeBorder:'border-blue-200',
    tailwind:   'blue',
  },
  stable: {
    hex:        '#059669',
    bg:         'bg-di-stable',
    text:       'text-di-stable',
    border:     'border-di-stable',
    badgeBg:    'bg-emerald-50',
    badgeText:  'text-emerald-700',
    badgeBorder:'border-emerald-200',
    tailwind:   'emerald',
  },
}

/**
 * Get DI tier string from a numeric score.
 * @param {number|null} score - DI score 0-100
 * @returns {'critical'|'high'|'moderate'|'stable'}
 */
export function getDITier(score) {
  if (score === null || score === undefined) return DI_TIERS.STABLE
  if (score >= DI_THRESHOLDS.CRITICAL) return DI_TIERS.CRITICAL
  if (score >= DI_THRESHOLDS.HIGH)     return DI_TIERS.HIGH
  if (score >= DI_THRESHOLDS.MODERATE) return DI_TIERS.MODERATE
  return DI_TIERS.STABLE
}

/**
 * Get the full color config object for a DI score.
 * @param {number|null} score
 * @returns {object} DI_COLORS entry
 */
export function getDIColors(score) {
  return DI_COLORS[getDITier(score)]
}

/**
 * Get the hex color for a DI score.
 * @param {number|null} score
 * @returns {string} hex color
 */
export function getDIHex(score) {
  return getDIColors(score).hex
}

/**
 * Get the Tailwind border-left class for a school card.
 * @param {number|null} score
 * @returns {string}
 */
export function getDIBorderClass(score) {
  return getDIColors(score).border
}

/**
 * Get i18n tier key for translation.
 * @param {number|null} score
 * @returns {string}
 */
export function getDITierKey(score) {
  return `di.${getDITier(score)}`
}
