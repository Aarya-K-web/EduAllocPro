// ============================================================
// EduAllocPro — Teacher Dashboard
// Dedicated view for teachers to see their profile, scores, and deployment.
// ============================================================

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useOutletContext } from 'react-router-dom'
import { staggerContainer, cardEntrance, fadeIn } from '../lib/motion'
import { MOCK_TEACHERS, MOCK_SCHOOLS } from '../lib/mockData'
import DVSMeter from '../components/DVSMeter'
import DIBadge from '../components/DIBadge'
import { useToast } from '../components/Toast'

const TeacherDashboard = () => {
  const { t } = useTranslation()
  const { addToast } = useToast()
  const { user } = useOutletContext() || {}

  // Find demo teacher based on user email or ID, fallback to TCH-801
  const teacherId = user?.email?.split('@')[0].toUpperCase() // e.g. teacher@... -> TEACHER
  let initialTeacher = MOCK_TEACHERS.find(t => t.teacher_id === teacherId || t.teacher_id === user?.uid)
  if (!initialTeacher) initialTeacher = MOCK_TEACHERS.find(t => t.teacher_id === "TCH-801") || MOCK_TEACHERS[0]
  
  // Ensure the displayed name matches the auth user's display name if available
  if (user?.displayName) {
    initialTeacher = { ...initialTeacher, name: user.displayName }
  }

  const [teacher, setTeacher] = useState(initialTeacher)
  const [isEditing, setIsEditing] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    qualification: teacher.qualification,
    years_experience: teacher.years_experience,
    years_rural: teacher.years_rural,
    subject_specialization: teacher.subject_specialization?.join(', ') || '',
    commute_distance: teacher.commute_distance || 30
  })
  
  // Find proposed school (mock logic)
  const proposedSchool = MOCK_SCHOOLS.find(s =>
    s.vacancies?.some(v => teacher.subject_specialization?.includes(v.subject))
  ) || MOCK_SCHOOLS[0]

  const handleSave = (e) => {
    e.preventDefault()
    
    // Parse subjects back to array
    const subjects = formData.subject_specialization.split(',').map(s => s.trim()).filter(Boolean)
    
    // Update local teacher state
    setTeacher(prev => ({
      ...prev,
      qualification: formData.qualification,
      years_experience: parseInt(formData.years_experience, 10),
      years_rural: parseInt(formData.years_rural, 10),
      subject_specialization: subjects,
      commute_distance: parseInt(formData.commute_distance, 10),
      // Dummy bump to retention score to show dynamic AI
      retention_score: Math.min(100, prev.retention_score + 5) 
    }))

    setIsEditing(false)
    addToast({
      message: 'Profile Updated. AI Retention Score Recalculated!',
      type: 'success',
    })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div variants={fadeIn} initial="initial" animate="animate" className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-primary">Welcome, {teacher.name}</h1>
          <p className="text-sm text-ink-muted">Teacher Profile & Dashboard</p>
        </div>
        {!isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-white border border-border text-ink-primary rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors shadow-sm"
          >
            Edit Profile
          </button>
        )}
      </motion.div>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        {/* Profile Details or Edit Form */}
        {isEditing ? (
          <motion.div variants={cardEntrance} className="bg-white rounded-card shadow-card border border-brand p-5">
            <h2 className="text-xs font-semibold text-brand uppercase tracking-wide mb-4">
              Edit Profile
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1">Subject Specialization (comma separated)</label>
                <input 
                  type="text" 
                  value={formData.subject_specialization}
                  onChange={e => setFormData({...formData, subject_specialization: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-brand"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1">Qualification</label>
                <select 
                  value={formData.qualification}
                  onChange={e => setFormData({...formData, qualification: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-brand bg-white"
                >
                  <option value="D.Ed">D.Ed</option>
                  <option value="B.Ed">B.Ed</option>
                  <option value="M.Ed">M.Ed</option>
                  <option value="PhD">PhD</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1">Total Experience (Yrs)</label>
                  <input 
                    type="number" min="0" max="50"
                    value={formData.years_experience}
                    onChange={e => setFormData({...formData, years_experience: e.target.value})}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-brand"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1">Rural Experience (Yrs)</label>
                  <input 
                    type="number" min="0" max="50"
                    value={formData.years_rural}
                    onChange={e => setFormData({...formData, years_rural: e.target.value})}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-brand"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1">Max Commute Distance (km)</label>
                <input 
                  type="number" min="5" max="100"
                  value={formData.commute_distance}
                  onChange={e => setFormData({...formData, commute_distance: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-brand"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-2 bg-gray-100 text-ink-secondary rounded-lg text-sm font-semibold hover:bg-gray-200">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-2 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand-700">
                  Save Changes
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          <motion.div variants={cardEntrance} className="bg-white rounded-card shadow-card border border-border p-5">
            <h2 className="text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-4">
              My Profile
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
                      key={subj}
                      className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-medium"
                    >
                      {subj}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <InfoCell label="Qualification" value={teacher.qualification} />
              <InfoCell label="Experience" value={`${teacher.years_experience} Years`} numeric />
              <InfoCell label="Rural Experience" value={`${teacher.years_rural} Years`} numeric />
              <InfoCell label="Max Commute" value={`${teacher.commute_distance || 30} km`} numeric />
            </div>

            {/* Teacher Consent Toggle */}
            <div className="mt-6 pt-5 border-t border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-ink-primary">Critical Relocation Consent</h3>
                  <p className="text-xs text-ink-muted mt-0.5">I am willing to relocate &gt; 50km for a critical school</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newConsent = !teacher.long_dist_consent
                    setTeacher(prev => ({ ...prev, long_dist_consent: newConsent }))
                    addToast({
                      message: newConsent ? 'Relocation preference saved. Thank you!' : 'Relocation preference updated.',
                      type: 'success',
                    })
                  }}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 ${teacher.long_dist_consent ? 'bg-brand' : 'bg-gray-200'}`}
                  role="switch"
                  aria-checked={teacher.long_dist_consent}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${teacher.long_dist_consent ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Proposed Posting */}
        <motion.div variants={cardEntrance} className="bg-white rounded-card shadow-card border border-border p-5">
          <h2 className="text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-4 flex items-center justify-between">
            <span>Proposed Deployment</span>
            <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full">ACTION REQUIRED</span>
          </h2>
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-bold text-ink-primary">{proposedSchool.name}</h3>
              <p className="text-sm text-ink-muted">{proposedSchool.block} · {proposedSchool.district_name}</p>
            </div>
            <DIBadge score={proposedSchool.di_score} size="md" />
          </div>

          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <DVSMeter
              diScore={proposedSchool.di_score}
              matchScore={teacher.match_score}
              retentionScore={teacher.retention_score}
              showTotal={true}
              showLabels={true}
              size="md"
            />
          </div>

          <button
            onClick={() => window.location.href = `/teacher/${teacher.teacher_id}`}
            className="w-full py-2.5 px-4 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors"
          >
            Review & Consent
          </button>
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

export default TeacherDashboard
