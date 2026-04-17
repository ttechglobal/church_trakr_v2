// Reusable skeleton components for loading states
// Usage: import { PageSkeleton, CardSkeleton, ListSkeleton } from '@/components/ui/Skeletons'

const shimmerStyle = {
  background: 'linear-gradient(90deg, #ede9e0 25%, #e5e0d8 50%, #ede9e0 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.4s infinite',
  borderRadius: 12,
}

// ── Single card skeleton ──────────────────────────────────────────────────────

export function CardSkeleton({ height = 80 }) {
  return (
    <>
      <div style={{ ...shimmerStyle, height, marginBottom: 8 }} />
      <style>{`
        @keyframes shimmer {
          from { background-position: 200% 0; }
          to   { background-position: -200% 0; }
        }
      `}</style>
    </>
  )
}

// ── List of card skeletons ────────────────────────────────────────────────────

export function ListSkeleton({ count = 4, height = 72 }) {
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{ ...shimmerStyle, height, opacity: 1 - i * 0.15 }} />
        ))}
      </div>
      <style>{`
        @keyframes shimmer {
          from { background-position: 200% 0; }
          to   { background-position: -200% 0; }
        }
      `}</style>
    </>
  )
}

// ── Full page skeleton (dashboard-style) ─────────────────────────────────────

export function DashboardSkeleton() {
  return (
    <>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '1.75rem 1.25rem' }}>
        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ ...shimmerStyle, height: 16, width: 120, marginBottom: 8 }} />
          <div style={{ ...shimmerStyle, height: 28, width: 240, marginBottom: 6 }} />
          <div style={{ ...shimmerStyle, height: 14, width: 100 }} />
        </div>
        {/* CTA */}
        <div style={{ ...shimmerStyle, height: 72, marginBottom: '1.25rem', borderRadius: 16 }} />
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: '1.25rem' }}>
          {[1,2,3].map(i => <div key={i} style={{ ...shimmerStyle, height: 90, borderRadius: 14 }} />)}
        </div>
        {/* List */}
        <div style={{ ...shimmerStyle, height: 22, width: 160, marginBottom: 10 }} />
        <ListSkeleton count={4} height={68} />
      </div>
      <style>{`
        @keyframes shimmer {
          from { background-position: 200% 0; }
          to   { background-position: -200% 0; }
        }
      `}</style>
    </>
  )
}

// ── Members list skeleton ─────────────────────────────────────────────────────

export function MemberListSkeleton({ count = 6 }) {
  return (
    <>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '1.75rem 1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ ...shimmerStyle, height: 28, width: 120, marginBottom: 8 }} />
            <div style={{ ...shimmerStyle, height: 16, width: 160 }} />
          </div>
          <div style={{ ...shimmerStyle, height: 40, width: 120, borderRadius: 12 }} />
        </div>
        <div style={{ ...shimmerStyle, height: 44, marginBottom: 10, borderRadius: 11 }} />
        <div style={{ display: 'flex', gap: 6, marginBottom: '1.25rem' }}>
          {[80, 60, 80, 40].map((w, i) => (
            <div key={i} style={{ ...shimmerStyle, height: 32, width: w, borderRadius: 20 }} />
          ))}
        </div>
        <ListSkeleton count={count} height={76} />
      </div>
      <style>{`
        @keyframes shimmer {
          from { background-position: 200% 0; }
          to   { background-position: -200% 0; }
        }
      `}</style>
    </>
  )
}

// ── Attendance mark skeleton ──────────────────────────────────────────────────

export function AttendanceMarkSkeleton({ count = 8 }) {
  return (
    <>
      {/* Sticky header placeholder */}
      <div style={{ background: '#fff', borderBottom: '1px solid rgba(26,58,42,0.08)', padding: '0.875rem 1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ ...shimmerStyle, width: 32, height: 32, borderRadius: 8 }} />
          <div style={{ flex: 1 }}>
            <div style={{ ...shimmerStyle, height: 16, width: 140, marginBottom: 5 }} />
            <div style={{ ...shimmerStyle, height: 12, width: 100 }} />
          </div>
        </div>
        <div style={{ ...shimmerStyle, height: 6, borderRadius: 3, marginBottom: 10 }} />
        <div style={{ ...shimmerStyle, height: 38, borderRadius: 10 }} />
      </div>
      <div style={{ padding: '0.75rem 1.25rem' }}>
        <ListSkeleton count={count} height={62} />
      </div>
      <style>{`
        @keyframes shimmer {
          from { background-position: 200% 0; }
          to   { background-position: -200% 0; }
        }
      `}</style>
    </>
  )
}

// ── Analytics skeleton ────────────────────────────────────────────────────────

export function AnalyticsSkeleton() {
  return (
    <>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '1.75rem 1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ ...shimmerStyle, height: 28, width: 130, marginBottom: 8 }} />
            <div style={{ ...shimmerStyle, height: 16, width: 200 }} />
          </div>
          <div style={{ ...shimmerStyle, height: 44, width: 160, borderRadius: 12 }} />
        </div>
        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: '1.5rem' }}>
          {[1,2,3].map(i => <div key={i} style={{ ...shimmerStyle, height: 100, borderRadius: 14 }} />)}
        </div>
        {/* Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 10, marginBottom: '1.5rem' }}>
          {[1,2,3,4].map(i => <div key={i} style={{ ...shimmerStyle, height: 130, borderRadius: 14 }} />)}
        </div>
        <div style={{ ...shimmerStyle, height: 180, borderRadius: 14 }} />
      </div>
      <style>{`
        @keyframes shimmer {
          from { background-position: 200% 0; }
          to   { background-position: -200% 0; }
        }
      `}</style>
    </>
  )
}
