export default function AuthLayout({ children }) {
  return (
    <div className="min-h-dvh bg-forest flex flex-col">
      {/* Subtle texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
      />
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12">
        {/* Logo mark */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)' }}
          >
            {/* Simple cross / checkmark icon */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3v18M3 12h18"
                stroke="#c9a84c"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <span
            className="text-gold font-display text-2xl font-semibold tracking-tight"
            style={{ letterSpacing: '-0.02em' }}
          >
            ChurchTrakr
          </span>
        </div>

        {/* Card */}
        <div
          className="w-full max-w-sm rounded-3xl p-8"
          style={{
            background: 'rgba(247,245,240,0.97)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
          }}
        >
          {children}
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-sm" style={{ color: 'rgba(247,245,240,0.4)' }}>
          Attendance & member management for church groups
        </p>
      </div>
    </div>
  )
}
