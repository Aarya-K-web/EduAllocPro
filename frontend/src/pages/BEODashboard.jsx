// ============================================================
// EduAllocPro — BEO Dashboard (/beo)
// Mobile-first Marathi BEO dashboard (360px viewport).
// Top 5 schools, defaults to Marathi language.
// ============================================================

import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useSchools } from '../hooks/useSchools'
import { setDefaultLangForRole } from '../i18n/config'
import { getDIColors, getDITier } from '../lib/diColors'
import { staggerContainer, cardEntrance } from '../lib/motion'
import { DEFAULT_DISTRICT_ID } from '../config'
import { useStore } from '../context/StoreContext'
import DIBadge from '../components/DIBadge'
import FreshnessIndicator from '../components/FreshnessIndicator'
import SkeletonCard from '../components/SkeletonCard'

const BEODashboard = ({ user }) => {
  const { t } = useTranslation()
  const { schools, loading, error } = useSchools(DEFAULT_DISTRICT_ID)

  // BEO defaults to Marathi
  useEffect(() => {
    setDefaultLangForRole('beo')
  }, [])

  const { stats } = useStore()
  const criticalCount = stats.criticalSchools
  const totalVacancies = stats.totalVacancies

  // Filtering and Pagination State
  const [statusFilter, setStatusFilter] = useState('All') // All, Critical, High, Moderate, Stable
  const [blockFilter, setBlockFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [visibleCount, setVisibleCount] = useState(5)

  // Get unique blocks for filter
  const blocks = useMemo(() => {
    return [...new Set(schools.map(s => s.block).filter(Boolean))]
  }, [schools])

  // Apply filters
  const filteredSchools = useMemo(() => {
    return schools.filter(s => {
      // Status Filter
      if (statusFilter !== 'All') {
        const tier = getDITier(s.di_score)
        if (tier.toLowerCase() !== statusFilter.toLowerCase()) return false
      }
      // Block Filter
      if (blockFilter && s.block !== blockFilter) return false
      // Search Filter
      if (searchQuery && !s.name?.toLowerCase().includes(searchQuery.toLowerCase())) return false
      
      return true
    }).sort((a, b) => (b.di_score ?? 0) - (a.di_score ?? 0))
  }, [schools, statusFilter, blockFilter, searchQuery])

  // Pagination
  const displayedSchools = filteredSchools.slice(0, visibleCount)

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 5)
  }

  return (
    <div className="min-h-screen bg-surface-bg">
      {/* Hero banner */}
      <div className="bg-surface-sidebar px-4 py-5">
        <h1 className="text-lg font-bold text-white">{t('beo.title')}</h1>
        <p className="text-sm text-white/60 mt-0.5">{t('beo.subtitle')}</p>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-2xl font-bold font-mono text-di-critical" data-numeric="true">
              {criticalCount}
            </p>
            <p className="text-xs text-white/60 mt-0.5">{t('dashboard.criticalSchools')}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-2xl font-bold font-mono text-amber-400" data-numeric="true">
              {totalVacancies}
            </p>
            <p className="text-xs text-white/60 mt-0.5">{t('dashboard.totalVacancies')}</p>
          </div>
        </div>
      </div>

      {/* Alert banner if critical schools exist */}
      {criticalCount > 0 && (
        <div className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
          <span className="text-red-500 text-lg flex-shrink-0" aria-hidden="true">⚠</span>
          <div>
            <p className="text-sm font-semibold text-red-800">
              {t('beo.urgentAction')}
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              {criticalCount} {t('beo.schoolsNeedAttention')}
            </p>
          </div>
        </div>
      )}

      {/* Filters Section */}
      <div className="px-4 py-4 space-y-3">
        <input
          type="text"
          placeholder="Search schools by name..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        />
        <div className="grid grid-cols-2 gap-3">
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setVisibleCount(5); }}
            className="w-full px-2 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white"
          >
            <option value="All">All Statuses</option>
            <option value="Critical">Critical (80-100)</option>
            <option value="High">High (60-79)</option>
            <option value="Moderate">Moderate (40-59)</option>
            <option value="Stable">Stable (0-39)</option>
          </select>
          <select
            value={blockFilter}
            onChange={e => { setBlockFilter(e.target.value); setVisibleCount(5); }}
            className="w-full px-2 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white"
          >
            <option value="">All Blocks</option>
            {blocks.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      </div>

      {/* School List */}
      <div className="px-4 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-ink-primary">School Priorities</h2>
          <span className="text-xs text-ink-muted">
            Showing {displayedSchools.length} of {filteredSchools.length}
          </span>
        </div>

        {loading ? (
          <SkeletonCard count={5} variant="school" />
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-sm text-ink-muted">{error}</p>
          </div>
        ) : filteredSchools.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-xl border border-border">
            <p className="text-sm text-ink-muted">No schools found matching filters.</p>
          </div>
        ) : (
          <>
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="space-y-3"
            >
              <AnimatePresence>
                {displayedSchools.map((school, idx) => (
                  <BEOSchoolCard
                    key={school.school_id}
                    school={school}
                    rank={idx + 1}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
            
            {visibleCount < filteredSchools.length && (
              <button
                onClick={handleLoadMore}
                className="w-full mt-4 py-2.5 bg-brand/10 text-brand rounded-lg text-sm font-semibold hover:bg-brand/20 transition-colors"
              >
                Load More
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── BEO School Card (mobile-optimised) ─────────────────────
const BEOSchoolCard = ({ school, rank }) => {
  const { t } = useTranslation()
  const colors = getDIColors(school.di_score)
  const tier   = getDITier(school.di_score)

  return (
    <motion.article
      variants={cardEntrance}
      className={`bg-white rounded-xl border border-border border-l-4 shadow-card ${colors.border}`}
    >
      <div className="p-4">
        {/* Rank + name */}
        <div className="flex items-start gap-3 mb-3">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 font-mono`}
            style={{ backgroundColor: colors.hex }}
            aria-label={`Rank ${rank}`}
            data-numeric="true"
          >
            {rank}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-ink-primary leading-tight">
              {school.name}
            </h3>
            <p className="text-xs text-ink-muted mt-0.5">{school.block}</p>
          </div>
          <DIBadge score={school.di_score} size="sm" showLabel={false} />
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <MiniStat
            label={t('di.score')}
            value={Math.round(school.di_score ?? 0)}
            color={colors.text}
          />
          <MiniStat
            label={t('school.vacancies')}
            value={school.total_vacancies}
            color="text-amber-600"
          />
          <MiniStat
            label={t('school.enrollment')}
            value={school.enrollment_total}
            color="text-ink-primary"
          />
        </div>

        {/* Freshness + RTE */}
        <div className="flex items-center justify-between">
          <FreshnessIndicator
            isStale={school.is_data_stale}
            ageMonths={school.data_age_months}
            variant="inline"
          />
          {!school.rte_compliant && (
            <span className="text-2xs bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full font-medium">
              {t('school.rteViolation')}
            </span>
          )}
        </div>

        {/* Find teachers CTA */}
        {school.total_vacancies > 0 && (
          <Link
            to={`/deploy?school_id=${school.school_id}`}
            className="mt-3 flex items-center justify-center gap-1.5 w-full py-2 px-3 bg-brand/10 text-brand rounded-lg text-xs font-semibold hover:bg-brand/20 transition-colors"
          >
            {t('school.findTeachers')} →
          </Link>
        )}
      </div>
    </motion.article>
  )
}

const MiniStat = ({ label, value, color }) => (
  <div className="bg-gray-50 rounded-lg p-2 text-center">
    <p className="text-2xs text-ink-muted mb-0.5 leading-tight">{label}</p>
    <p className={`text-base font-bold font-mono ${color}`} data-numeric="true">
      {value ?? '—'}
    </p>
  </div>
)

export default BEODashboard
