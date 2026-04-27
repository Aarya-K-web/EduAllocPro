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

  // New states for Combobox and filtering
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBlock, setSelectedBlock] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

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

  // Get unique blocks
  const blocks = [...new Set(schoolsWithVacancies.map(s => s.block).filter(Boolean))]

  // Filter schools by search and block
  const filteredSchools = schoolsWithVacancies.filter(s => {
    const matchesSearch = s.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.school_id?.includes(searchQuery)
    const matchesBlock = selectedBlock ? s.block === selectedBlock : true
    return matchesSearch && matchesBlock
  })

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
          {/* Block filter */}
          <div>
            <label className="block text-xs font-medium text-ink-secondary mb-1.5">
              Filter by Block
            </label>
            <select
              value={selectedBlock}
              onChange={e => {
                setSelectedBlock(e.target.value)
                setSelectedSchoolId('')
                setSelectedSubject('')
                setSearchQuery('')
              }}
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm text-ink-primary bg-white focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="">All Blocks</option>
              {blocks.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          {/* School selector (Combobox) */}
          <div className="relative">
            <label className="block text-xs font-medium text-ink-secondary mb-1.5">
              {t('deploy.selectSchool')}
            </label>
            <input
              type="text"
              value={selectedSchoolId && !showDropdown ? selectedSchool?.name || '' : searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setShowDropdown(true)
                if (selectedSchoolId) {
                  setSelectedSchoolId('')
                  setSelectedSubject('')
                }
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search by school name..."
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm text-ink-primary bg-white focus:outline-none focus:ring-2 focus:ring-brand"
            />
            {showDropdown && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-border rounded-lg shadow-lg max-h-60 overflow-auto">
                {filteredSchools.length > 0 ? (
                  filteredSchools.map(s => (
                    <div
                      key={s.school_id}
                      onClick={() => {
                        setSelectedSchoolId(s.school_id)
                        setSearchQuery('')
                        setShowDropdown(false)
                        setSelectedSubject('')
                      }}
                      className="px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                    >
                      <p className="text-sm font-medium text-ink-primary">{s.name}</p>
                      <p className="text-xs text-ink-muted">
                        {s.block} · DI {Math.round(s.di_score ?? 0)} · {s.total_vacancies} {s.total_vacancies === 1 ? 'vacancy' : 'vacancies'}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-4 text-center text-sm text-ink-muted">No schools found</div>
                )}
              </div>
            )}
            {showDropdown && (
              <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)}></div>
            )}
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

        <div className="mt-4 flex flex-col items-end">
          <button
            onClick={handleFindMatches}
            disabled={!selectedSchoolId || !selectedSubject || matchesLoading}
            className="px-5 py-2.5 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-brand"
          >
            {matchesLoading ? t('common.loading') : t('deploy.findMatches')}
          </button>
          
          {(!selectedSchoolId || !selectedSubject) && (
            <p className="text-xs text-ink-muted mt-2">
              Select a school and subject to find matching teachers.
            </p>
          )}
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
        <motion.div variants={cardEntrance} initial="initial" animate="animate" className="text-center py-16 px-4 border border-dashed border-border rounded-xl bg-gray-50/50">
          <div className="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <p className="text-base font-semibold text-ink-primary mb-1">{t('deploy.noMatches')}</p>
          <p className="text-sm text-ink-muted max-w-sm mx-auto">
            We couldn't find any eligible teachers for this subject who meet the deployment criteria.
          </p>
        </motion.div>
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
