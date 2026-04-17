export const metadata = {
  title: 'ChurchTrakr — Premium Church Management',
  description: 'Attendance tracking, member management, and follow-up tools for modern churches.',
}

const FEATURES = [
  {
    icon: '✅',
    title: 'Smart Attendance',
    desc: 'Take attendance in seconds. Mark present or absent, track trends, and see rates per group — all from your phone.',
  },
  {
    icon: '👥',
    title: 'Member Management',
    desc: 'Organize your congregation into groups, track birthdays, store contact details, and import from Excel.',
  },
  {
    icon: '🔔',
    title: 'Absentee Follow-up',
    desc: 'Never lose track of who\'s missing. Get alerts for absentees and reach out via call, WhatsApp, or SMS.',
  },
  {
    icon: '⭐',
    title: 'First Timers',
    desc: 'Record new visitors, track repeat visits, send welcome messages, and convert them to full members.',
  },
  {
    icon: '📊',
    title: 'Analytics & Reports',
    desc: 'Monthly trends, group comparisons, and exportable reports — beautiful enough to share in leadership meetings.',
  },
  {
    icon: '💬',
    title: 'SMS Messaging',
    desc: 'Send personalized SMS messages to your congregation. Reminders, follow-ups, and birthday greetings.',
  },
]

const TESTIMONIALS = [
  {
    quote: "ChurchTrakr transformed how we track our youth group. We used to do it all on paper — now it takes 30 seconds.",
    name: "Pastor Emmanuel",
    role: "Youth Pastor, Lagos",
    initials: "PE",
  },
  {
    quote: "The absentee follow-up feature alone is worth it. We've reconnected with so many members we would have lost.",
    name: "Sister Grace",
    role: "Women's Fellowship Leader",
    initials: "SG",
  },
  {
    quote: "The reports are so professional. I share them with our board every month and they love how clear everything is.",
    name: "Deacon Thomas",
    role: "Church Administrator",
    initials: "DT",
  },
]

export default function LandingPage() {
  return (
    <div style={{ fontFamily: 'var(--font-dm-sans),system-ui,sans-serif', background: '#fff', color: '#1a2e22' }}>

      {/* ── Nav ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(26,58,42,0.08)',
        padding: '0 1.5rem',
        height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        maxWidth: '100%',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'linear-gradient(135deg,#1a3a2a,#2d5a42)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <path d="M10 3v14M3 10h14" stroke="#c9a84c" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontWeight: 700, fontSize: 18, color: '#1a3a2a', letterSpacing: '-0.02em' }}>
            ChurchTrakr
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <a href="/login" style={{ fontSize: 14, fontWeight: 600, color: '#4a5568', textDecoration: 'none', padding: '0 0.875rem', height: 38, display: 'inline-flex', alignItems: 'center' }}>
            Sign in
          </a>
          <a href="/signup" style={{
            fontSize: 14, fontWeight: 700, color: '#e8d5a0',
            background: '#1a3a2a', padding: '0 1.125rem', height: 38,
            display: 'inline-flex', alignItems: 'center',
            borderRadius: 10, textDecoration: 'none',
            boxShadow: '0 2px 8px rgba(26,58,42,0.25)',
            letterSpacing: '-0.01em',
          }}>
            Get started free →
          </a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        background: 'linear-gradient(180deg, #0f1f17 0%, #1a3a2a 60%, #2d5a42 100%)',
        padding: 'clamp(4rem, 10vw, 8rem) 1.5rem clamp(5rem, 12vw, 10rem)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle grid pattern */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.03,
          backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }} />

        <div style={{ position: 'relative', maxWidth: 720, margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)',
            borderRadius: 20, padding: '6px 14px', marginBottom: '1.5rem',
          }}>
            <span style={{ fontSize: 14, color: '#c9a84c', fontWeight: 700 }}>✦ Church management, simplified</span>
          </div>

          <h1 style={{
            fontFamily: 'var(--font-playfair),Georgia,serif',
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
            fontWeight: 700,
            color: '#fff',
            lineHeight: 1.1,
            margin: '0 0 1.25rem',
            letterSpacing: '-0.03em',
          }}>
            Track attendance.<br />
            <span style={{ color: '#c9a84c' }}>Grow your church.</span>
          </h1>

          <p style={{
            fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
            color: 'rgba(255,255,255,0.65)',
            maxWidth: 520, margin: '0 auto 2.5rem',
            lineHeight: 1.65,
          }}>
            ChurchTrakr gives pastors and group leaders the tools to track attendance, follow up with absentees, and understand congregation trends — all from their phone.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/signup" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '0 2rem', height: 56,
              background: 'linear-gradient(135deg,#c9a84c,#e8d5a0)',
              color: '#1a3a2a', borderRadius: 16,
              fontWeight: 800, fontSize: 16, textDecoration: 'none',
              boxShadow: '0 8px 32px rgba(201,168,76,0.35)',
              letterSpacing: '-0.01em', transition: 'all 0.2s',
            }}>
              Start for free →
            </a>
            <a href="/login" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '0 1.5rem', height: 56,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff', borderRadius: 16,
              fontWeight: 600, fontSize: 15, textDecoration: 'none',
              letterSpacing: '-0.01em',
            }}>
              Sign in to dashboard
            </a>
          </div>

          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: '1.25rem' }}>
            Free to get started · No credit card required
          </p>
        </div>
      </section>

      {/* ── Stats banner ── */}
      <section style={{ background: '#f7f5f0', borderBottom: '1px solid rgba(26,58,42,0.08)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem', textAlign: 'center' }}>
          {[
            { value: '500+', label: 'Church groups using ChurchTrakr' },
            { value: '50,000+', label: 'Members tracked' },
            { value: '98%', label: 'Report on time, every week' },
            { value: '< 30s', label: 'Average attendance session' },
          ].map(s => (
            <div key={s.label}>
              <p style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 32, fontWeight: 800, color: '#1a3a2a', margin: '0 0 4px', letterSpacing: '-0.03em' }}>{s.value}</p>
              <p style={{ fontSize: 13, color: '#8a9e90', margin: 0, fontWeight: 500, lineHeight: 1.4 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ maxWidth: 960, margin: '0 auto', padding: 'clamp(3rem,8vw,6rem) 1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: 'clamp(2rem,5vw,4rem)' }}>
          <h2 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 'clamp(1.75rem,4vw,2.5rem)', fontWeight: 700, color: '#1a3a2a', margin: '0 0 12px', letterSpacing: '-0.025em' }}>
            Everything your church needs
          </h2>
          <p style={{ fontSize: 'clamp(1rem,2vw,1.125rem)', color: '#8a9e90', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
            Built specifically for African church groups who manage attendance on mobile devices.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{
              background: '#fff',
              border: '1px solid rgba(26,58,42,0.08)',
              borderRadius: 20, padding: '1.75rem',
              boxShadow: '0 2px 12px rgba(26,58,42,0.05)',
              transition: 'all 0.2s ease',
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 16,
                background: 'rgba(26,58,42,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 26, marginBottom: '1rem',
              }}>
                {f.icon}
              </div>
              <h3 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 18, fontWeight: 700, color: '#1a3a2a', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
                {f.title}
              </h3>
              <p style={{ fontSize: 15, color: '#6b7280', margin: 0, lineHeight: 1.65 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ background: 'linear-gradient(135deg,#0f1f17,#1a3a2a)', padding: 'clamp(3rem,8vw,6rem) 1.5rem' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 'clamp(1.75rem,4vw,2.5rem)', fontWeight: 700, color: '#fff', margin: '0 0 1rem', letterSpacing: '-0.025em' }}>
            How it works
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', marginBottom: 'clamp(2rem,5vw,3.5rem)', lineHeight: 1.6 }}>
            Three simple steps to transform how you manage your church
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
            {[
              { step: '01', title: 'Create your account', desc: 'Sign up in 60 seconds. Add your church or group name, and you\'re ready.' },
              { step: '02', title: 'Add your members', desc: 'Import from Excel or add members manually. Organize into groups.' },
              { step: '03', title: 'Start tracking', desc: 'Take attendance every Sunday. View trends, follow up absentees, generate reports.' },
            ].map(s => (
              <div key={s.step} style={{ textAlign: 'center' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', margin: '0 auto 1rem',
                  background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-playfair),Georgia,serif', fontWeight: 800,
                  fontSize: 18, color: '#c9a84c',
                }}>
                  {s.step}
                </div>
                <h3 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 17, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>
                  {s.title}
                </h3>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section style={{ maxWidth: 960, margin: '0 auto', padding: 'clamp(3rem,8vw,6rem) 1.5rem' }}>
        <h2 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 'clamp(1.75rem,4vw,2.5rem)', fontWeight: 700, color: '#1a3a2a', margin: '0 0 2.5rem', textAlign: 'center', letterSpacing: '-0.025em' }}>
          Trusted by church leaders
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
          {TESTIMONIALS.map((t, i) => (
            <div key={i} style={{
              background: '#fff', border: '1px solid rgba(26,58,42,0.08)',
              borderRadius: 20, padding: '1.75rem',
              boxShadow: '0 2px 12px rgba(26,58,42,0.05)',
            }}>
              <div style={{ fontSize: 24, color: '#c9a84c', marginBottom: 12, letterSpacing: -1 }}>❝</div>
              <p style={{ fontSize: 15, color: '#374151', lineHeight: 1.7, margin: '0 0 1.25rem', fontStyle: 'italic' }}>
                "{t.quote}"
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: 'linear-gradient(135deg,#1a3a2a,#2d5a42)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#c9a84c', fontSize: 13, fontWeight: 800,
                }}>
                  {t.initials}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#1a3a2a', margin: 0 }}>{t.name}</p>
                  <p style={{ fontSize: 12, color: '#8a9e90', margin: 0 }}>{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{
        background: 'linear-gradient(135deg,#1a3a2a,#2d5a42)',
        padding: 'clamp(3rem,8vw,6rem) 1.5rem',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 'clamp(1.75rem,4vw,2.75rem)', fontWeight: 700, color: '#fff', margin: '0 0 1rem', letterSpacing: '-0.025em' }}>
            Ready to transform your church management?
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', margin: '0 0 2rem', lineHeight: 1.6 }}>
            Join hundreds of church groups already using ChurchTrakr to track attendance and grow their congregations.
          </p>
          <a href="/signup" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '0 2rem', height: 56,
            background: 'linear-gradient(135deg,#c9a84c,#e8d5a0)',
            color: '#1a3a2a', borderRadius: 16,
            fontWeight: 800, fontSize: 16, textDecoration: 'none',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            letterSpacing: '-0.01em',
          }}>
            Get started for free →
          </a>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', marginTop: '1rem' }}>
            No credit card · Free forever for small groups
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        background: '#0f1f17',
        padding: '2rem 1.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 7, background: 'rgba(201,168,76,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="10" height="10" viewBox="0 0 20 20" fill="none">
              <path d="M10 3v14M3 10h14" stroke="#c9a84c" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontWeight: 700, fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
            ChurchTrakr
          </span>
        </div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
          © {new Date().getFullYear()} ChurchTrakr. Built for church leaders.
        </p>
        <div style={{ display: 'flex', gap: 16 }}>
          {[['Sign in', '/login'], ['Sign up', '/signup']].map(([label, href]) => (
            <a key={href} href={href} style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontWeight: 500 }}>
              {label}
            </a>
          ))}
        </div>
      </footer>

    </div>
  )
}