// ============================================================
// EduAllocPro — Google Maps Custom Marker Builder
// Generates SVG markers based on DI score tier.
// DI 80+: pulsing ring (critical)
// DI 60-79: static dot #D97706 size 16
// DI 40-59: static dot #2563EB size 12
// DI 0-39:  static dot #059669 size 10
// ============================================================

import { getDITier } from './diColors'

/**
 * Build an SVG data URL for a map marker based on DI score.
 * @param {number} diScore
 * @param {boolean} isSelected - highlight selected school
 * @returns {string} SVG data URL
 */
export function buildMarkerSVG(diScore, isSelected = false) {
  const tier = getDITier(diScore)

  const configs = {
    critical: { color: '#E11D48', size: 20, pulse: true  },
    high:     { color: '#D97706', size: 16, pulse: false },
    moderate: { color: '#2563EB', size: 12, pulse: false },
    stable:   { color: '#059669', size: 10, pulse: false },
  }

  const { color, size, pulse } = configs[tier]
  const selectedColor = '#FFFFFF'
  const selectedStroke = isSelected ? `stroke="${selectedColor}" stroke-width="2"` : ''
  const viewSize = size + 8 // padding for ring

  if (pulse) {
    // Pulsing SVG ring for critical schools
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${viewSize * 2}" height="${viewSize * 2}" viewBox="0 0 ${viewSize * 2} ${viewSize * 2}">
        <circle cx="${viewSize}" cy="${viewSize}" r="${size / 2}" fill="${color}" ${selectedStroke} opacity="0.9"/>
        <circle cx="${viewSize}" cy="${viewSize}" r="${size / 2}" fill="none" stroke="${color}" stroke-width="2" opacity="0.6">
          <animate attributeName="r" from="${size / 2}" to="${size}" dur="2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite"/>
        </circle>
        ${isSelected ? `<circle cx="${viewSize}" cy="${viewSize}" r="${size / 2 + 3}" fill="none" stroke="${selectedColor}" stroke-width="2"/>` : ''}
      </svg>
    `
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.trim())}`
  }

  // Static dot for other tiers
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${viewSize}" height="${viewSize}" viewBox="0 0 ${viewSize} ${viewSize}">
      <circle cx="${viewSize / 2}" cy="${viewSize / 2}" r="${size / 2}" fill="${color}" ${selectedStroke} opacity="0.9"/>
      ${isSelected ? `<circle cx="${viewSize / 2}" cy="${viewSize / 2}" r="${size / 2 + 3}" fill="none" stroke="${selectedColor}" stroke-width="2"/>` : ''}
    </svg>
  `
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.trim())}`
}

/**
 * Get marker size for a DI score (used for AdvancedMarkerElement).
 * @param {number} diScore
 * @returns {number}
 */
export function getMarkerSize(diScore) {
  const tier = getDITier(diScore)
  const sizes = { critical: 20, high: 16, moderate: 12, stable: 10 }
  return sizes[tier]
}

/**
 * Get marker color hex for a DI score.
 * @param {number} diScore
 * @returns {string}
 */
export function getMarkerColor(diScore) {
  const tier = getDITier(diScore)
  const colors = {
    critical: '#E11D48',
    high:     '#D97706',
    moderate: '#2563EB',
    stable:   '#059669',
  }
  return colors[tier]
}
