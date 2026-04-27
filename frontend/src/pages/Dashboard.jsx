// ============================================================
// EduAllocPro — Dashboard Page
// 60/40 split: Google Maps heatmap (left) + DI-sorted school cards (right)
// School detail opens as Framer Motion slide panel — NEVER navigate()
// ============================================================

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { MapContainer, TileLayer, Marker, useMap, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { useStore } from '../context/StoreContext'
import { useSchools } from '../hooks/useSchools'
import { MAPS_DEFAULT_CENTER, MAPS_DEFAULT_ZOOM, DEFAULT_DISTRICT_ID } from '../config'
import { getDIHex, getDITier, DI_COLORS } from '../lib/diColors'
import { staggerContainer, slideInRight } from '../lib/motion'
import { MOCK_STATS } from '../lib/mockData'

import StatCard from '../components/StatCard'
import SchoolCard from '../components/SchoolCard'
import SkeletonCard from '../components/SkeletonCard'
import SchoolDetailPanel from './SchoolDetail'

// ── Map Pan Component ───────────────────────────────────────
const MapUpdater = ({ center, zoom }) => {
  const map = useMap()
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || map.getZoom())
    }
  }, [center, zoom, map])
  return null
}

// ── Map Marker Component ────────────────────────────────────
const SchoolMarker = ({ school, isSelected, onClick }) => {
  const tier  = getDITier(school.di_score)
  const color = getDIHex(school.di_score)
  const sizes = { critical: 20, high: 16, moderate: 12, stable: 10 }
  const size  = sizes[tier]

  // Create a custom divIcon for Leaflet
  const customIcon = L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div class="relative flex items-center justify-center focus:outline-none" style="width: ${size + 16}px; height: ${size + 16}px; transform: translate(-50%, -50%);">
        ${tier === 'critical' ? `<span class="absolute rounded-full ring-pulse" style="width: ${size}px; height: ${size}px; background-color: ${color}; opacity: 0.4;"></span>` : ''}
        <span class="rounded-full block transition-transform duration-150 ${isSelected ? 'scale-150 ring-2 ring-white ring-offset-1' : 'hover:scale-125'}" style="width: ${size}px; height: ${size}px; background-color: ${color}; box-shadow: ${isSelected ? `0 0 0 3px ${color}40` : 'none'};"></span>
      </div>
    `,
    iconSize: [0, 0], // The HTML handles the sizing and centering
  })

  return (
    <Marker
      position={[school.lat, school.lng]}
      icon={customIcon}
      eventHandlers={{
        // Only trigger click if we want to programmatically open the panel right away, 
        // but now we'll rely on the Popup to show details.
        click: () => {}
      }}
    >
      <Popup className="custom-popup">
        <div className="p-1 min-w-[200px]">
          <h3 className="font-bold text-ink-primary text-sm mb-1">{school.name}</h3>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: color + '20', color: color }}>
              DI {school.di_score} • {tier.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-ink-muted mb-3">
            {school.total_vacancies} {school.total_vacancies === 1 ? 'Vacancy' : 'Vacancies'}
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick(school.school_id);
            }}
            className="w-full text-center text-xs font-semibold text-brand hover:text-brand-700 py-1.5 bg-brand/5 rounded-lg transition-colors"
          >
            View Details
          </button>
        </div>
      </Popup>
    </Marker>
  )
}

// ── Map Fallback ───────────────────────────────────────────
const MapFallback = ({ schools, onSchoolClick }) => {
  const { t } = useTranslation()
  return (
    <div className="w-full h-full bg-gray-900 flex flex-col items-center justify-center gap-4 relative">
      <div className="text-center">
        <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        <p className="text-gray-400 text-sm font-medium">{t('errors.mapUnavailable')}</p>
        <p className="text-gray-600 text-xs mt-1">Map rendering failed</p>
      </div>
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {schools.map(s => (
          <div
            key={s.school_id}
            className="absolute w-3 h-3 rounded-full opacity-60"
            style={{
              backgroundColor: getDIHex(s.di_score),
              left: `${((s.lng - 73.5) / 1.5) * 100}%`,
              top:  `${((21.9 - s.lat) / 1.0) * 100}%`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ── Main Dashboard ──────────────────────────────────────────
const Dashboard = () => {
  const { t } = useTranslation()
  const { schools, loading, error } = useSchools(DEFAULT_DISTRICT_ID)
  const [selectedSchoolId, setSelectedSchoolId] = useState(null)
  const [mapCenter, setMapCenter] = useState(MAPS_DEFAULT_CENTER)

  const handleSchoolClick = useCallback((schoolId) => {
    setSelectedSchoolId(prev => prev === schoolId ? null : schoolId)
    if (schools.length) {
      const school = schools.find(s => s.school_id === schoolId)
      if (school) {
        setMapCenter([school.lat, school.lng])
      }
    }
  }, [schools])

  const handleClosePanel = useCallback(() => {
    setSelectedSchoolId(null)
  }, [])

  // Use shared global stats
  const { stats } = useStore()

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Stats header */}
      <div className="px-6 py-4 bg-surface-bg border-b border-border flex-shrink-0">
        <div className="mb-3">
          <h1 className="text-lg font-bold text-ink-primary">{t('dashboard.title')}</h1>
          <p className="text-xs text-ink-muted">{t('dashboard.subtitle')}</p>
        </div>
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        >
          <StatCard
            label={t('dashboard.criticalSchools')}
            value={stats.criticalSchools}
            sublabel={t('di.critical')}
            variant="critical"
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
          />
          <StatCard
            label={t('dashboard.totalVacancies')}
            value={stats.totalVacancies}
            sublabel={t('common.vacancies')}
            variant="warning"
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
          />
          <StatCard
            label={t('dashboard.rteViolations')}
            value={stats.rteViolations}
            sublabel="RTE Act 2009"
            variant="critical"
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
          />
          <StatCard
            label={t('dashboard.schoolsMonitored')}
            value={stats.schoolsMonitored}
            sublabel={t('common.schools')}
            variant="stable"
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
          />
        </motion.div>
      </div>

      {/* 60/40 split: Map + School list */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Map (60%) */}
        <div className="relative" style={{ flex: '0 0 60%' }}>
          <MapContainer
            center={MAPS_DEFAULT_CENTER}
            zoom={MAPS_DEFAULT_ZOOM}
            style={{ width: '100%', height: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapUpdater center={mapCenter} zoom={null} />
            {schools.map(school => (
              <SchoolMarker
                key={school.school_id}
                school={school}
                isSelected={selectedSchoolId === school.school_id}
                onClick={handleSchoolClick}
              />
            ))}
          </MapContainer>

          {/* Map legend */}
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-xl p-3 shadow-card border border-border">
            <p className="text-2xs font-semibold text-ink-secondary mb-2 uppercase tracking-wide">
              {t('di.label')}
            </p>
            {[
              { label: t('di.critical'), color: DI_COLORS.critical.hex, range: '80-100' },
              { label: t('di.high'),     color: DI_COLORS.high.hex,     range: '60-79' },
              { label: t('di.moderate'), color: DI_COLORS.moderate.hex, range: '40-59' },
              { label: t('di.stable'),   color: DI_COLORS.stable.hex,   range: '0-39' },
            ].map(item => (
              <div key={item.range} className="flex items-center gap-2 mb-1 last:mb-0">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                  aria-hidden="true"
                />
                <span className="text-2xs text-ink-secondary">{item.label}</span>
                <span className="text-2xs text-ink-muted font-mono ml-auto" data-numeric="true">
                  {item.range}
                </span>
              </div>
            ))}
          </div>

          {/* School detail slide panel — overlays map */}
          <AnimatePresence>
            {selectedSchoolId && (
              <motion.div
                key="school-panel"
                variants={slideInRight}
                initial="initial"
                animate="animate"
                exit="exit"
                className="absolute top-0 right-0 bottom-0 w-96 bg-white shadow-panel overflow-y-auto z-10"
              >
                <SchoolDetailPanel
                  schoolId={selectedSchoolId}
                  onClose={handleClosePanel}
                  embedded
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: School list (40%) */}
        <div className="flex-1 overflow-y-auto bg-surface-bg border-l border-border">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-ink-primary">
                {t('dashboard.schoolList')}
              </h2>
              <span className="text-xs text-ink-muted font-mono" data-numeric="true">
                {schools.length} {t('common.schools')}
              </span>
            </div>

            {loading ? (
              <SkeletonCard count={6} variant="school" />
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-sm text-ink-muted">{error}</p>
                <button className="mt-2 text-xs text-brand hover:underline">{t('common.retry')}</button>
              </div>
            ) : schools.length === 0 ? (
              <p className="text-sm text-ink-muted text-center py-8">{t('dashboard.noSchools')}</p>
            ) : (
              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="space-y-2"
              >
                {schools.map(school => (
                  <SchoolCard
                    key={school.school_id}
                    school={school}
                    onClick={handleSchoolClick}
                    isSelected={selectedSchoolId === school.school_id}
                  />
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
