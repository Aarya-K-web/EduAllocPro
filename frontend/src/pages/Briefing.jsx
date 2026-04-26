// ============================================================
// EduAllocPro — Briefing Page (/briefing)
// Gemini briefing view (English + Marathi) with PDF download.
// ============================================================

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useBriefing } from '../hooks/useBriefing'
import { staggerContainer, cardEntrance, fadeIn } from '../lib/motion'
import { DEFAULT_DISTRICT_ID } from '../config'
import SkeletonCard from '../components/SkeletonCard'
import { useToast } from '../components/Toast'

const Briefing = () => {
  const { t, i18n } = useTranslation()
  const { addToast } = useToast()
  const { briefing, loading, error } = useBriefing(DEFAULT_DISTRICT_ID)
  const [downloading, setDownloading] = useState(false)
  const [activeTab, setActiveTab] = useState(i18n.language === 'mr' ? 'mr' : 'en')

  const handleDownloadPDF = async () => {
    if (!briefing) return
    try {
      // Dynamically import to avoid SSR/bundle issues
      const { pdf } = await import('@react-pdf/renderer')
      const { default: BriefingPDFDocument } = await import('../components/BriefingPDF')
      const { createElement } = await import('react')
      const blob = await pdf(createElement(BriefingPDFDocument, { briefing })).toBlob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `EduAllocPro_Briefing_${DEFAULT_DISTRICT_ID}_${new Date().toISOString().slice(0, 10)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      addToast({ message: 'PDF downloaded successfully', type: 'success' })
    } catch (err) {
      addToast({ message: 'PDF generation failed — ' + err.message, type: 'error' })
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <SkeletonCard count={4} variant="school" />
      </div>
    )
  }

  if (error || !briefing) {
    return (
      <div className="p-6 text-center py-16">
        <p className="text-sm text-ink-muted">{error || t('briefing.noData')}</p>
      </div>
    )
  }

  const generatedAt = new Date(briefing.generated_at).toLocaleString(
    i18n.language === 'mr' ? 'mr-IN' : 'en-IN',
    { dateStyle: 'medium', timeStyle: 'short' }
  )

  return (
    <motion.div
      variants={fadeIn}
      initial="initial"
      animate="animate"
      className="p-6 max-w-4xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-ink-primary">{t('briefing.title')}</h1>
          <p className="text-sm text-ink-muted mt-1">{t('briefing.subtitle')}</p>
          <p className="text-xs text-ink-muted mt-1">
            {t('briefing.generatedAt')}: <span className="font-mono" data-numeric="true">{generatedAt}</span>
          </p>
        </div>
        <button
          onClick={handleDownloadPDF}
          disabled={downloading}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand-700 active:scale-95 transition-all disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-brand"
          aria-label={t('briefing.generatePDF')}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {downloading ? t('briefing.generating') : t('briefing.generatePDF')}
        </button>
      </div>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="space-y-5"
      >
        {/* Summary tabs */}
        <motion.div variants={cardEntrance} className="bg-white rounded-card shadow-card border border-border overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab('en')}
              className={[
                'flex-1 py-3 text-sm font-medium transition-colors',
                activeTab === 'en'
                  ? 'text-brand border-b-2 border-brand bg-blue-50/50'
                  : 'text-ink-muted hover:text-ink-secondary',
              ].join(' ')}
              aria-selected={activeTab === 'en'}
              role="tab"
            >
              {t('briefing.englishSummary')}
            </button>
            <button
              onClick={() => setActiveTab('mr')}
              className={[
                'flex-1 py-3 text-sm font-medium transition-colors',
                activeTab === 'mr'
                  ? 'text-brand border-b-2 border-brand bg-blue-50/50'
                  : 'text-ink-muted hover:text-ink-secondary',
              ].join(' ')}
              aria-selected={activeTab === 'mr'}
              role="tab"
            >
              {t('briefing.marathiSummary')}
            </button>
          </div>

          {/* Summary content */}
          <div className="p-5" role="tabpanel">
            {activeTab === 'en' ? (
              <p className="text-sm text-ink-primary leading-relaxed">
                {briefing.english_summary}
              </p>
            ) : (
              <p className="text-sm text-ink-primary leading-relaxed font-devanagari" style={{ lineHeight: 1.85 }}>
                {briefing.marathi_summary}
              </p>
            )}
          </div>
        </motion.div>

        {/* Key insights */}
        {briefing.key_insights?.length > 0 && (
          <motion.div variants={cardEntrance} className="bg-white rounded-card shadow-card border border-border p-5">
            <h2 className="text-sm font-semibold text-ink-primary mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              {t('briefing.keyInsights')}
            </h2>
            <ul className="space-y-2" role="list">
              {briefing.key_insights.map((insight, idx) => (
                <li
                  key={`insight-${idx}`}
                  className="flex items-start gap-2 text-sm text-ink-secondary"
                >
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5 font-mono" data-numeric="true">
                    {idx + 1}
                  </span>
                  {insight}
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Urgent actions */}
        {briefing.urgent_actions?.length > 0 && (
          <motion.div variants={cardEntrance} className="bg-white rounded-card shadow-card border border-border p-5">
            <h2 className="text-sm font-semibold text-ink-primary mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-di-critical" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {t('briefing.urgentActions')}
            </h2>
            <div className="space-y-3" role="list">
              {briefing.urgent_actions.map((action) => (
                <div
                  key={action.school_id}
                  role="listitem"
                  className={[
                    'flex items-start gap-3 p-3 rounded-lg border',
                    action.priority === 'critical'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-amber-50 border-amber-200',
                  ].join(' ')}
                >
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${
                      action.priority === 'critical'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {action.priority === 'critical' ? t('di.critical') : t('di.high')}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink-primary">{action.school_name}</p>
                    <p className="text-xs text-ink-secondary mt-0.5">{action.action}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Stats summary */}
        <motion.div variants={cardEntrance} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: t('dashboard.criticalSchools'), value: briefing.critical_schools, color: 'text-di-critical' },
            { label: t('dashboard.totalVacancies'),  value: briefing.total_vacancies,  color: 'text-di-high' },
            { label: t('dashboard.rteViolations'),   value: briefing.rte_violations,   color: 'text-di-critical' },
            { label: t('dashboard.schoolsMonitored'), value: briefing.schools_monitored, color: 'text-di-stable' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-card shadow-card border border-border p-4 text-center">
              <p className={`text-2xl font-bold font-mono ${stat.color}`} data-numeric="true">
                {stat.value}
              </p>
              <p className="text-xs text-ink-muted mt-1">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

export default Briefing
