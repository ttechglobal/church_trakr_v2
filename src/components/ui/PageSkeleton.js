/**
 * PageSkeleton — lightweight loading shimmer used by loading.js in each route.
 * Renders instantly (no JS needed for initial paint) giving perceived speed.
 */
export default function PageSkeleton({ title = true, cards = 3, compact = false }) {
  return (
    <div className="page-content pb-10" aria-busy="true" aria-label="Loading…">
      <style>{`
        @keyframes sk-shimmer {
          0%   { background-position: -600px 0 }
          100% { background-position:  600px 0 }
        }
        .sk {
          background: linear-gradient(90deg, #ede9e0 25%, #e0dbd0 50%, #ede9e0 75%);
          background-size: 600px 100%;
          animation: sk-shimmer 1.4s ease-in-out infinite;
          border-radius: 8px;
        }
      `}</style>

      {/* Header */}
      {title && (
        <div style={{ marginBottom: compact ? 12 : 20 }}>
          <div className="sk" style={{ height: compact ? 22 : 28, width: '55%', marginBottom: 8 }} />
          <div className="sk" style={{ height: 14, width: '35%' }} />
        </div>
      )}

      {/* Cards */}
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} style={{
          background: '#fff',
          borderRadius: 16,
          padding: compact ? '12px 14px' : '16px',
          marginBottom: 10,
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="sk" style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="sk" style={{ height: 15, width: '60%', marginBottom: 8 }} />
              <div className="sk" style={{ height: 12, width: '40%' }} />
            </div>
          </div>
          {!compact && (
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <div className="sk" style={{ height: 32, flex: 1, borderRadius: 9 }} />
              <div className="sk" style={{ height: 32, flex: 1, borderRadius: 9 }} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
