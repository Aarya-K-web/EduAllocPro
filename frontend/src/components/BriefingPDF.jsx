// ============================================================
// EduAllocPro — BriefingPDF Component
// @react-pdf/renderer document for deployment order PDF.
// ============================================================

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    padding: 40,
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
  },
  header: {
    marginBottom: 24,
    borderBottom: '2px solid #2563EB',
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: '#475569',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
    marginBottom: 8,
    borderBottom: '1px solid #E2E8F0',
    paddingBottom: 4,
  },
  paragraph: {
    fontSize: 10,
    lineHeight: 1.6,
    color: '#475569',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    border: '1px solid #E2E8F0',
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#2563EB',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 8,
    color: '#94A3B8',
    textAlign: 'center',
  },
  actionItem: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#FFF7ED',
    border: '1px solid #FED7AA',
    borderRadius: 4,
  },
  actionPriority: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#C2410C',
    backgroundColor: '#FFEDD5',
    padding: '2 6',
    borderRadius: 3,
  },
  actionText: {
    flex: 1,
    fontSize: 9,
    color: '#0F172A',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTop: '1px solid #E2E8F0',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 8,
    color: '#94A3B8',
  },
  insightItem: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  insightBullet: {
    fontSize: 10,
    color: '#2563EB',
    fontFamily: 'Helvetica-Bold',
  },
  insightText: {
    flex: 1,
    fontSize: 9,
    color: '#475569',
    lineHeight: 1.5,
  },
})

const BriefingPDFDocument = ({ briefing }) => {
  if (!briefing) return null

  const generatedAt = new Date(briefing.generated_at).toLocaleString('en-IN', {
    dateStyle: 'long',
    timeStyle: 'short',
  })

  return (
    <Document
      title={`EduAllocPro District Briefing — ${briefing.district_name}`}
      author="EduAllocPro"
      subject="District Intelligence Briefing"
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>EduAllocPro — District Intelligence Briefing</Text>
          <Text style={styles.subtitle}>
            {briefing.district_name} District · Generated: {generatedAt}
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{briefing.critical_schools}</Text>
            <Text style={styles.statLabel}>Critical Schools</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{briefing.total_vacancies}</Text>
            <Text style={styles.statLabel}>Total Vacancies</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{briefing.rte_violations}</Text>
            <Text style={styles.statLabel}>RTE Violations</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{briefing.schools_monitored}</Text>
            <Text style={styles.statLabel}>Schools Monitored</Text>
          </View>
        </View>

        {/* English Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>District Summary</Text>
          <Text style={styles.paragraph}>{briefing.english_summary}</Text>
        </View>

        {/* Key Insights */}
        {briefing.key_insights?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Key Insights</Text>
            {briefing.key_insights.map((insight, idx) => (
              <View key={idx} style={styles.insightItem}>
                <Text style={styles.insightBullet}>{idx + 1}.</Text>
                <Text style={styles.insightText}>{insight}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Urgent Actions */}
        {briefing.urgent_actions?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Urgent Actions Required</Text>
            {briefing.urgent_actions.map((action) => (
              <View key={action.school_id} style={styles.actionItem}>
                <Text style={styles.actionPriority}>
                  {action.priority?.toUpperCase()}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.actionText, { fontFamily: 'Helvetica-Bold', marginBottom: 2 }]}>
                    {action.school_name}
                  </Text>
                  <Text style={styles.actionText}>{action.action}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>EduAllocPro — Maharashtra Education Department</Text>
          <Text style={styles.footerText}>CONFIDENTIAL — Government Use Only</Text>
        </View>
      </Page>
    </Document>
  )
}

export default BriefingPDFDocument
