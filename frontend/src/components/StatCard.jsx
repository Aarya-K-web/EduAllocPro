// ============================================================
// EduAllocPro — StatCard Component
// Dashboard header stat cards with color tokens.
// ============================================================

import { motion } from 'framer-motion'
import { cardEntrance } from '../lib/motion'

const COLOR_VARIANTS = {
  critical: {
    icon:   'bg-red-100 text-red-600',
    value:  'text-di-critical',
    border: 'border-l-di-critical',
  },
  warning: {
    icon:   'bg-amber-100 text-amber-600',
    value:  'text-di-high',
    border: 'border-l-di-high',
  },
  brand: {
    icon:   'bg-blue-100 text-blue-600',
    value:  'text-brand',
    border: 'border-l-brand',
  },
  stable: {
    icon:   'bg-emerald-100 text-emerald-600',
    value:  'text-di-stable',
    border: 'border-l-di-stable',
  },
}

/**
 * @param {object} props
 * @param {string} props.label
 * @param {number|string} props.value
 * @param {string} props.sublabel
 * @param {'critical'|'warning'|'brand'|'stable'} props.variant
 * @param {React.ReactNode} props.icon
 */
const StatCard = ({
  label,
  value,
  sublabel,
  variant = 'brand',
  icon,
}) => {
  const colors = COLOR_VARIANTS[variant] || COLOR_VARIANTS.brand

  return (
    <motion.div
      variants={cardEntrance}
      className={[
        'bg-white rounded-card p-4 shadow-card border border-border',
        'border-l-4',
        colors.border,
      ].join(' ')}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-ink-secondary uppercase tracking-wide truncate">
            {label}
          </p>
          <p
            className={`text-3xl font-bold font-mono mt-1 ${colors.value}`}
            data-numeric="true"
          >
            {value}
          </p>
          {sublabel && (
            <p className="text-xs text-ink-muted mt-1">{sublabel}</p>
          )}
        </div>
        {icon && (
          <div className={`p-2 rounded-lg flex-shrink-0 ml-3 ${colors.icon}`}>
            {icon}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default StatCard
