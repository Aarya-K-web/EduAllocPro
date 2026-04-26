// ============================================================
// EduAllocPro — TeacherView Page (/teacher/:id)
// Teacher proposed posting + consent form.
// ============================================================

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { staggerContainer, cardEntrance, fadeIn } from '../lib/motion'
import { MOCK_TEACHERS, MOCK_SCHOOLS } from '../lib/mockData'
import DVSMeter from '../components/DVSMeter'
import DIBadge from '../components/DIBadge'
import { useToast } from '../components/Toast'

const TeacherView = () => {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToast } = useToast()

  const [consentGiven,    setConsentGiven]    = useState(false)
  const [consentSubmitted, setConsentSubmitted] = useState(false)
  const [submitting,      setSubmitting]      = useState(false)

  // Find teacher from mock data
  const teacher = MOCK_TEACHERS.find(t => t.teacher_id === id) || MOCK_TEACHERS[0]

  // Find proposed school (highest DI with matching subject)
  const proposedSchool = MOCK_SCHOOLS.find(s =>
    s.vacancies?.some(v => teacher.subject_specialization?.includes(v.subject))
  ) || MOCK_SCHOOLS[0]

  const dvs = teacher.dvs || (
    (proposedSchool.di_score / 100) * 0.40 +
    (teacher.match_score / 100)     * 0.35 +
    (teacher.retention_score / 100) * 0.25
  )

  const handleConsentSubmit = async (e) => {
    e.preventDefault()
    if (!consentGiven) return

    setSubmitting(true)
    // Simulate API call
    await new Promise(r => setTimeout(r, 1200))
    setConsentSubmitted(true)
    setSubmitting(false)
    addToast({
      message: t('teacher.consentSubmit') + ' — ' + t('deploy.approved'),
      type:    'success',
    })
  }

  if (consentSubmitted) {
    return (
      <motion.div
        variants={fadeIn}
        initial="initial"
        animate="animate"
        className="p-6 max-w-lg mx-auto text-center py-16"
      >
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-ink-primary mb-2">{t('deploy.approved')}</h2>
        <p className="text-sm text-ink-muted mb-6">
          Your consent has been recorded. The deployment order will be processed.
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-5 py-2.5 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors"
        >
          {t('common.back')} to Dashboard
        </button>
      </motion.div>
    )
  }

  return (
    <motion.div
      variants={fadeIn}
      initial="initial"
      animate="animate"
      className="p-6 max-w-2xl mx-auto"
    >
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink-secondary mb-3 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t('common.back')}
        </button>
        <h1 className="text-xl font-bold text-ink-primary">Teacher Deployment Notice</h1>
        <p className="text-sm text-ink-muted mt-1">Proposed posting details and consent form</p>
      </div>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="space-y-5"
      >
        {/* Teacher profile */}
        <motion.div variants={cardEntrance} className="bg-white rounded-card shadow-card border border-border p-5">
          <h2 className="text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-4">
            Teacher Profile
          </h2>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-brand/10 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-bold text-brand">
                {teacher.name[0]}
              </span>
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-ink-primary">{teacher.name}</h3>
              <p className="text-sm text-ink-muted">{teacher.employee_id}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {teacher.subject_specialization?.map(subj => (
                  <span
                    key={`${teacher.teacher_id}-${subj}`}
                    className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-medium"
                  >
                    {subj}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <InfoCell label={t('teacher.qualification')} value={teacher.qualification} />
            <InfoCell label={t('teacher.experience')} value={`${teacher.years_experience} ${t('teacher.years')}`} numeric />
            <InfoCell label="Rural Experience" value={`${teacher.years_rural} ${t('teacher.years')}`} numeric />
            <InfoCell label="Current District" value={teacher.current_district} />
          </div>
        </motion.div>

        {/* Proposed posting */}
        <motion.div variants={cardEntrance} className="bg-white rounded-card shadow-card border border-border p-5">
          <h2 className="text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-4">
            {t('teacher.proposedPosting')}
          </h2>
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-bold text-ink-primary">{proposedSchool.name}</h3>
              <p className="text-sm text-ink-muted">{proposedSchool.block} · {proposedSchool.district_name}</p>
              <p className="text-xs text-ink-muted font-mono mt-1" data-numeric="true">
                UDISE: {proposedSchool.school_id}
              </p>
            </div>
            <DIBadge score={proposedSchool.di_score} size="md" />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <InfoCell
              label={t('teacher.commuteDistance')}
              value={`${teacher.lat ? '45.2' : '—'} ${t('teacher.km')}`}
              numeric
            />
            <InfoCell
              label="Vacancy Subject"
              value={proposedSchool.vacancies?.[0]?.subject || '—'}
            />
          </div>

          {/* DVS Meter */}
          <div className="bg-gray-50 rounded-xl p-4">
            <DVSMeter
              diScore={proposedSchool.di_score}
              matchScore={teacher.match_score}
              retentionScore={teacher.retention_score}
              showTotal={true}
              showLabels={true}
              size="md"
            />
          </div>
        </motion.div>

        {/* Consent form */}
        <motion.div variants={cardEntrance} className="bg-white rounded-card shadow-card border border-border p-5">
          <h2 className="text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-4">
            {t('teacher.consentForm')}
          </h2>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-amber-800 leading-relaxed">
              This deployment is proposed based on the Deprivation Index score of{' '}
              <strong>{Math.round(proposedSchool.di_score)}</strong> for{' '}
              <strong>{proposedSchool.name}</strong>. Your subject expertise in{' '}
              <strong>{teacher.subject_specialization?.join(', ')}</strong> is required at this school.
            </p>
          </div>

          <form onSubmit={handleConsentSubmit}>
            <label className="flex items-start gap-3 cursor-pointer mb-5">
              <input
                type="checkbox"
                checked={consentGiven}
                onChange={e => setConsentGiven(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-brand border-border rounded focus:ring-brand"
                aria-required="true"
              />
              <span className="text-sm text-ink-primary">
                {t('teacher.consentGiven')}
              </span>
            </label>

            <button
              type="submit"
              disabled={!consentGiven || submitting}
              className="w-full py-3 px-4 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-brand"
              aria-live="polite"
            >
              {submitting ? t('common.loading') : t('teacher.consentSubmit')}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

const InfoCell = ({ label, value, numeric = false }) => (
  <div className="bg-gray-50 border border-border rounded-lg p-2.5">
    <p className="text-2xs text-ink-muted mb-0.5">{label}</p>
    <p
      className={`text-sm font-semibold text-ink-primary ${numeric ? 'font-mono' : ''}`}
      data-numeric={numeric ? 'true' : undefined}
    >
      {value || '—'}
    </p>
  </div>
)

export default TeacherView
