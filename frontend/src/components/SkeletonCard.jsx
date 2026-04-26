// ============================================================
// EduAllocPro — SkeletonCard Component
// Shimmer loading placeholder — NEVER use spinners.
// ============================================================

/**
 * @param {object} props
 * @param {number} props.count - number of skeleton cards to render
 * @param {'school'|'teacher'|'stat'|'row'} props.variant
 */
const SkeletonCard = ({ count = 1, variant = 'school' }) => {
  const items = Array.from({ length: count }, (_, i) => i)

  if (variant === 'stat') {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map(i => (
          <div key={i} className="bg-white rounded-card p-4 shadow-card">
            <div className="shimmer h-3 w-20 rounded mb-3" />
            <div className="shimmer h-8 w-16 rounded mb-2" />
            <div className="shimmer h-2 w-24 rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'teacher') {
    return (
      <div className="space-y-3">
        {items.map(i => (
          <div key={i} className="bg-white rounded-card p-4 shadow-card border border-border">
            <div className="flex items-start gap-3">
              <div className="shimmer w-8 h-8 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="shimmer h-4 w-40 rounded" />
                <div className="shimmer h-3 w-28 rounded" />
                <div className="shimmer h-2 w-full rounded mt-3" />
                <div className="flex gap-2 mt-2">
                  <div className="shimmer h-6 w-16 rounded-full" />
                  <div className="shimmer h-6 w-16 rounded-full" />
                  <div className="shimmer h-6 w-16 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'row') {
    return (
      <div className="space-y-2">
        {items.map(i => (
          <div key={i} className="flex items-center gap-4 p-3 bg-white rounded-lg border border-border">
            <div className="shimmer h-4 w-4 rounded" />
            <div className="shimmer h-4 w-32 rounded flex-1" />
            <div className="shimmer h-4 w-20 rounded" />
            <div className="shimmer h-4 w-16 rounded" />
            <div className="shimmer h-4 w-12 rounded" />
          </div>
        ))}
      </div>
    )
  }

  // Default: school card
  return (
    <div className="space-y-3">
      {items.map(i => (
        <div
          key={i}
          className="bg-white rounded-card p-4 shadow-card border-l-4 border-l-gray-200"
          aria-hidden="true"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="space-y-2 flex-1">
              <div className="shimmer h-4 w-48 rounded" />
              <div className="shimmer h-3 w-32 rounded" />
            </div>
            <div className="shimmer h-6 w-16 rounded-full ml-3" />
          </div>
          <div className="flex gap-2 mb-3">
            <div className="shimmer h-5 w-20 rounded-full" />
            <div className="shimmer h-5 w-16 rounded-full" />
          </div>
          <div className="shimmer h-2 w-full rounded" />
        </div>
      ))}
    </div>
  )
}

export default SkeletonCard
