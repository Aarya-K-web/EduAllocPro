// ============================================================
// EduAllocPro — EnrollmentSparkline Component
// Recharts mini sparkline for enrollment trend.
// ============================================================

import { ResponsiveContainer, LineChart, Line, Tooltip } from 'recharts'

/**
 * @param {object} props
 * @param {number[]} props.data - array of enrollment delta values
 * @param {number} props.width
 * @param {number} props.height
 */
const EnrollmentSparkline = ({ data = [], width = 80, height = 32 }) => {
  if (!data || data.length === 0) return null

  const chartData = data.map((value, i) => ({ i, value }))

  // Determine trend color
  const last  = data[data.length - 1]
  const first = data[0]
  const trend = last - first
  const color = trend >= 0 ? '#059669' : '#E11D48'

  return (
    <div
      style={{ width, height }}
      aria-hidden="true"
      title={`Enrollment trend: ${trend >= 0 ? '+' : ''}${trend}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              return (
                <div className="bg-surface-sidebar text-white text-xs px-2 py-1 rounded shadow-lg font-mono">
                  {payload[0].value > 0 ? '+' : ''}{payload[0].value}
                </div>
              )
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default EnrollmentSparkline
