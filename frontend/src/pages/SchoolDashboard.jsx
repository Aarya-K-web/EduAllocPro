// ============================================================
// EduAllocPro — School Dashboard
// Dedicated view for School Headmasters to see school profile and allocated teachers.
// ============================================================

import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useOutletContext } from 'react-router-dom'
import { staggerContainer, cardEntrance, fadeIn } from '../lib/motion'
import { MOCK_SCHOOLS, MOCK_TEACHERS } from '../lib/mockData'
import DIBadge from '../components/DIBadge'
import TeacherMatchCard from '../components/TeacherMatchCard'

const SchoolDashboard = () => {
  const { t } = useTranslation()
  const { user } = useOutletContext() || {}

  // Find demo school based on user email or ID, fallback to first
  const schoolId = user?.email?.split('@')[0].toUpperCase() // e.g. school@... -> SCHOOL
  let school = MOCK_SCHOOLS.find(s => s.school_id === schoolId || s.school_id === user?.uid)
  if (!school) school = MOCK_SCHOOLS[0]

  
  // Find allocated/proposed teachers
  const allocatedTeachers = MOCK_TEACHERS.filter(t => 
    school.vacancies?.some(v => t.subject_specialization?.includes(v.subject))
  ).slice(0, 2) // just mock 2

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div variants={fadeIn} initial="initial" animate="animate">
        <h1 className="text-2xl font-bold text-ink-primary">Welcome, {school.name}</h1>
        <p className="text-sm text-ink-muted">School Dashboard</p>
      </motion.div>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 gap-6"
      >
        {/* School Profile */}
        <motion.div variants={cardEntrance} className="bg-white rounded-card shadow-card border border-border p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1">
                School Profile
              </h2>
              <p className="text-sm text-ink-muted">{school.block} · {school.district_name}</p>
            </div>
            <DIBadge score={school.di_score} size="md" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <InfoCell label="UDISE Code" value={school.school_id} numeric />
            <InfoCell label="Total Enrollment" value={school.enrollment} numeric />
            <InfoCell label="Current Teachers" value={school.num_teachers} numeric />
            <InfoCell label="PTR" value={school.ptr} numeric />
          </div>
          
          {school.rte_violation && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-red-800">RTE Act Violation</p>
                <p className="text-xs text-red-700 mt-0.5">Pupil-Teacher Ratio exceeds 30:1. Urgent deployment required.</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Current Vacancies */}
        <motion.div variants={cardEntrance} className="bg-white rounded-card shadow-card border border-border p-5">
          <h2 className="text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-4">
            Current Vacancies
          </h2>
          <div className="flex flex-wrap gap-2">
            {school.vacancies?.map((vac, idx) => (
              <div key={idx} className="bg-gray-50 border border-border rounded-lg px-3 py-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                <span className="text-sm font-medium text-ink-primary">{vac.subject}</span>
              </div>
            ))}
            {(!school.vacancies || school.vacancies.length === 0) && (
              <p className="text-sm text-ink-muted">No current vacancies reported.</p>
            )}
          </div>
        </motion.div>

        {/* Allocated Teachers */}
        <motion.div variants={cardEntrance}>
          <h2 className="text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-4 px-1">
            Allocated & Proposed Teachers
          </h2>
          {allocatedTeachers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allocatedTeachers.map((teacher, index) => {
                // Construct mock match object expected by TeacherMatchCard
                const match = {
                  rank: index + 1,
                  teacher: teacher,
                  di_score: school.di_score,
                  match_score: teacher.match_score,
                  retention_score: teacher.retention_score,
                  dvs: teacher.dvs || 75.5,
                  commute_km: 15.2,
                  status: 'proposed'
                }
                return (
                  <TeacherMatchCard
                    key={teacher.teacher_id}
                    match={match}
                    readOnly={true}
                  />
                )
              })}
            </div>
          ) : (
            <div className="bg-white border border-dashed border-border rounded-lg p-8 text-center">
              <p className="text-sm text-ink-muted">No teachers have been proposed or allocated yet.</p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
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

export default SchoolDashboard
