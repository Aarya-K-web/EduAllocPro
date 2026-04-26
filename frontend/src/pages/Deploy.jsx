// ============================================================
// EduAllocPro — Deploy Page
// Teacher match cards with DVS meter breakdown.
// ============================================================

import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useTeacherMatches, useApproveDeployment } from '../hooks/useDeployment'
import { useSchools } from '../hooks/useSchools'
import { staggerContainer, cardEntrance } from '../lib/motion'
import { DEFAULT_DISTRICT_ID } from '../config'
import TeacherMatchCard from '../components/TeacherMatchCard'
import SkeletonCard from '../components/SkeletonCard'
import { useToast } from '../components/Toast'

const Deploy = () => {
  const { t } = useTranslation()
  const { addToast } = useToast()
  const [searchParams] = useSearchParams()

  const preselectedSchoolId = searchParams.get('school_id') || ''
  const [selectedSchoolId, setSelectedSchoolId] = useState(preselectedSchoolId)
  const [selectedSubject,  setSelectedSubject]  = useState('')

  const { schools, loading: schoolsLoading } = useSchools(DEFAULT_DISTRICT_ID)
  const { matches, loading: matchesLoading, findMatches } = useTeacherMatches()
  const { approve, approving, approved } = useApproveDeployment()

  // Get vacancies for selected school
  const selectedSchool = schools.find(s => s.school_id === selectedSchoolId)
  const vacancies = selectedSchool?.vacancies || []

  // Auto-select first vacancy subject
  useEffect(() => {
    if (vacancies.length > 0 && !selectedSubject) {
      setSelectedSubject(vacancies[0].subject)
    }
  }, [vacancies, selectedSubject])

  const handleFindMatches = () => {
    if (selectedSchoolId && selectedSubject) {
      findMatches(selectedSchoolId, selectedSubject)
    }
  }

  const handleApprove = async (teacherId) => {
    const deploymentId = `deploy-${teacherId}-${selectedSchoolId}`
    await approve(deploymentId)
    addToast({
      message: t('deploy.approved') + ' — ' + t('common.loading'),
      type:    'success',
    })
  }

  // Schools with vacancies only
  const schoolsWithVacancies = schools.filter(s => s.total_vacancies > 0)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-ink-primary">{t('deploy.title')}</h1>
        <p className="text-sm text-ink-muted mt-1">{t('deploy.subtitle')}</p>
      </div>

      {/* Selection controls */}
      <motion.div
        variants={cardEntrance}
        initial="initial"
        animate="animate"
        className="bg-white rounded-card shadow-card border border-border p-5 mb-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* School selector */}
          <div className="sm:col-span-2">
            <label
              htmlFor="school-select"
              className="block text-xs font-medium text-ink-secondary mb-1.5"
            >
              {t('deploy.selectSchool')}
            </label>
            <select
              id="school-select"
              value={selectedSchoolId}
              onChange={e => {
                setSelectedSchoolId(e.target.value)
                setSelectedSubject('')
              }}
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm text-ink-primary bg-white focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="">{t('deploy.selectSchool')}</option>
              {schoolsWithVacancies.map(s => (
                <option key={s.school_id} value={s.school_id}>
                  {s.name} — DI {Math.round(s.di_score ?? 0)} ({s.total_vacancies} vacancies)
                </option>
              ))}
            </select>
          </div>

          {/* Vacancy subject selector */}
          <div>
            <label
              htmlFor="subject-select"
              className="block text-xs font-medium text-ink-secondary mb-1.5"
            >
              {t('deploy.selectVacancy')}
            </label>
            <select
              id="subject-select"
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              disabled={!selectedSchoolId || vacancies.length === 0}
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm text-ink-primary bg-white focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">{t('deploy.selectVacancy')}</option>
              {vacancies.map((v, idx) => (
                <option key={`${selectedSchoolId}-${v.subject}-${idx}`} value={v.subject}>
                  {v.subject} (Grade {v.grade_range}) ×{v.count}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleFindMatches}
            disabled={!selectedSchoolId || !selectedSubject || matchesLoading}
            className="px-5 py-2.5 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-brand"
          >
            {matchesLoading ? t('common.loading') : t('deploy.findMatches')}
          </button>
        </div>
      </motion.div>

      {/* Results */}
      {matchesLoading ? (
        <SkeletonCard count={5} variant="teacher" />
      ) : matches.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-ink-primary">
              {matches.length} {t('common.teachers')} — {selectedSubject}
            </h2>
            {selectedSchool && (
              <span className="text-xs text-ink-muted">
                {selectedSchool.name}
              </span>
            )}
          </div>
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {matches.map(match => (
              <TeacherMatchCard
                key={match.teacher.teacher_id}
                match={match}
                onApprove={handleApprove}
                isApproved={approved[`deploy-${match.teacher.teacher_id}-${selectedSchoolId}`]}
                isApproving={approving[`deploy-${match.teacher.teacher_id}-${selectedSchoolId}`]}
              />
            ))}
          </motion.div>
        </div>
      ) : selectedSchoolId && selectedSubject ? (
        <div className="text-center py-12">
          <svg className="w-12 h-12 text-ink-muted mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-sm text-ink-muted">{t('deploy.noMatches')}</p>
        </div>
      ) : (
        <div className="text-center py-12">
          <svg className="w-12 h-12 text-ink-muted mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-sm text-ink-muted">{t('deploy.selectSchool')}</p>
        </div>
      )}
    </div>
  )
}

export default Deploy
