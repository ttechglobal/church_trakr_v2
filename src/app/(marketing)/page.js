import Link from 'next/link'

// ── SEO Metadata ──────────────────────────────────────────────────────────────
export const metadata = {
  title: 'Church Trakr — Attendance & Follow-Up for Church Groups',
  description:
    'Track attendance, follow up on absentees, and grow your church group — all in one simple app built for Nigerian churches.',
  keywords:
    'church attendance tracker Nigeria, church follow up app, church group management, attendance tracking app church',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://churchtrakr.com'),
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Church Trakr — Never Miss a Member Again',
    description:
      'Simple attendance tracking and follow-up for church groups and departments. Built for Nigerian churches.',
    url: '/',
    siteName: 'Church Trakr',
    type: 'website',
    locale: 'en_NG',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Church Trakr — Never Miss a Member Again',
    description:
      'Simple attendance tracking and follow-up for church groups and departments. Built for Nigerian churches.',
  },
  robots: { index: true, follow: true },
}

// ── Structured data ───────────────────────────────────────────────────────────
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Church Trakr',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web, iOS, Android',
  description:
    'Church attendance tracking, member management, and follow-up tools for Nigerian church groups.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' },
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'https://churchtrakr.com',
}

// ── Data ──────────────────────────────────────────────────────────────────────
const STEPS = [
  {
    num: '①',
    title: 'Add Your Members',
    body: 'Import your full member list in seconds — by CSV, Excel, or one by one.',
  },
  {
    num: '②',
    title: 'Take Attendance',
    body: "Mark who came and who didn't, right from your phone. Takes under 5 minutes.",
  },
  {
    num: '③',
    title: 'Follow Up',
    body: 'See exactly who\'s absent. Reach out by SMS. Track who\'s been contacted. Never let anyone fall through.',
  },
]

const FEATURES = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M9 16l2 2 4-4"/>
      </svg>
    ),
    title: 'Attendance Tracking',
    body: 'Mark present and absent in under 5 minutes.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 01-2.18 2A19.79 19.79 0 0111.63 19a19.5 19.5 0 01-5-5 19.79 19.79 0 01-2.92-8.19A2 2 0 015.53 4h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11l-1.27 1.27a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
      </svg>
    ),
    title: 'Follow-Up Management',
    body: 'See who needs a call and track who\'s been reached.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
    ),
    title: 'SMS Messaging',
    body: 'Send bulk SMS to absentees or attendees directly.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
      </svg>
    ),
    title: 'Shareable Reports',
    body: 'Generate a clean attendance report to share on WhatsApp.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
    title: 'Member Management',
    body: 'Import your full list and keep member details in one place.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/>
      </svg>
    ),
    title: 'Church Dashboard',
    body: 'Church leadership sees all groups in one place.',
  },
]

const TESTIMONIALS = [
  {
    quote:
      'Church Trakr changed how we do follow-up. We went from losing track of members to knowing exactly who to reach every week.',
    name: 'Youth Pastor, Lagos',
    initials: 'PE',
    bg: '#1a3a2a',
  },
  {
    quote:
      'The reports alone are worth it. I send it to our senior pastor every Sunday and he loves seeing the numbers.',
    name: 'Group Leader, Abuja',
    initials: 'SG',
    bg: '#2d5a42',
  },
  {
    quote:
      'We imported 80 members and took attendance in under 3 minutes. It just works.',
    name: "Women's Ministry Leader, Port Harcourt",
    initials: 'DT',
    bg: '#4a8a65',
  },
]

// ── Component ─────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div style={{ fontFamily: 'var(--font-dm-sans),system-ui,sans-serif', background: '#fff', color: '#1a2e22' }}>

      {/* Structured data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <GlobalStyles />

      {/* ── 1. NAVBAR ─────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: '1px solid rgba(26,58,42,0.08)',
        height: 64, display: 'flex', alignItems: 'center',
        padding: '0 1.5rem',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#1a3a2a,#2d5a42)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M10 3v14M3 10h14" stroke="#c9a84c" strokeWidth="2.5" strokeLinecap="round"/></svg>
            </div>
            <span style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontWeight: 700, fontSize: 18, color: '#1a3a2a', letterSpacing: '-0.02em' }}>
              Church Trakr
            </span>
          </div>
          {/* CTAs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <a href="/login" style={{ fontSize: 14, fontWeight: 600, color: '#4a5568', textDecoration: 'none', padding: '0 0.875rem', height: 40, display: 'inline-flex', alignItems: 'center', borderRadius: 9, transition: 'color 0.15s' }}>
              Login
            </a>
            <a href="/signup" style={{ fontSize: 14, fontWeight: 700, color: '#e8d5a0', background: '#1a3a2a', padding: '0 1.125rem', height: 40, display: 'inline-flex', alignItems: 'center', borderRadius: 10, textDecoration: 'none', boxShadow: '0 2px 8px rgba(26,58,42,0.22)', letterSpacing: '-0.01em' }}>
              Get Started Free →
            </a>
          </div>
        </div>
      </nav>

      {/* ── 2. HERO ───────────────────────────────────────────────────────── */}
      <section style={{
        background: 'linear-gradient(160deg, #0b1a12 0%, #1a3a2a 55%, #2d5a42 100%)',
        padding: 'clamp(4rem, 10vw, 7rem) 1.5rem clamp(5rem, 12vw, 9rem)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Dot grid */}
        <div aria-hidden style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '28px 28px' }} />
        {/* Gold glow */}
        <div aria-hidden style={{ position: 'absolute', top: '20%', right: '15%', width: 320, height: 320, borderRadius: '50%', background: 'rgba(201,168,76,0.07)', filter: 'blur(60px)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(2rem, 6vw, 5rem)', alignItems: 'center' }} className="hero-grid">
          {/* Left — copy */}
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(201,168,76,0.14)', border: '1px solid rgba(201,168,76,0.28)', borderRadius: 20, padding: '6px 14px', marginBottom: '1.75rem' }}>
              <span style={{ fontSize: 13, color: '#c9a84c', fontWeight: 700 }}>✦ Built for Nigerian churches</span>
            </div>

            <h1 style={{
              fontFamily: 'var(--font-playfair),Georgia,serif',
              fontSize: 'clamp(2.6rem, 5.5vw, 4rem)',
              fontWeight: 700, color: '#fff', lineHeight: 1.08,
              margin: '0 0 1.375rem', letterSpacing: '-0.03em',
            }}>
              Follow-up is<br />
              <span style={{ color: '#c9a84c' }}>Discipleship.</span>
            </h1>

            <p style={{ fontSize: 'clamp(1rem, 2vw, 1.175rem)', color: 'rgba(255,255,255,0.62)', maxWidth: 460, lineHeight: 1.7, margin: '0 0 2.5rem' }}>
              Knowing who came — and who didn't —<br />
              is just the beginning. Church Trakr helps<br />
              your team take the next step, every Sunday.
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <a href="/signup" className="cta-primary" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                height: 54, padding: '0 2rem', borderRadius: 14,
                background: 'linear-gradient(135deg,#c9a84c,#e8d5a0)',
                color: '#1a3a2a', fontWeight: 800, fontSize: 16,
                textDecoration: 'none', letterSpacing: '-0.01em',
                boxShadow: '0 8px 28px rgba(201,168,76,0.32)',
                transition: 'all 0.2s',
              }}>
                Get Started Free
              </a>
              <a href="#how-it-works" style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.72)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 0.5rem' }}>
                See How It Works
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </a>
            </div>

            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)', marginTop: '1rem' }}>
              Free to start · No credit card required
            </p>
          </div>

          {/* Right — phone mockup (placeholder with gradient) */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }} className="hero-img-wrap" aria-hidden>
            <div style={{
              width: '100%', maxWidth: 280, aspectRatio: '9/19',
              borderRadius: 36, overflow: 'hidden',
              background: 'linear-gradient(160deg,#0f2a1a,#2d5a42)',
              border: '2px solid rgba(255,255,255,0.08)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
              position: 'relative',
            }}>
              {/* Status bar */}
              <div style={{ height: 44, padding: '12px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>9:41</span>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#0b1a12' }} />
                <div style={{ display: 'flex', gap: 4 }}>
                  {[4,5,6].map(w => <div key={w} style={{ width: 2, height: w, background: 'rgba(255,255,255,0.4)', borderRadius: 1 }} />)}
                </div>
              </div>
              {/* App UI preview */}
              <div style={{ padding: '16px 16px 0' }}>
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Sunday Attendance</span>
                    <span style={{ fontSize: 11, color: '#c9a84c', fontWeight: 700 }}>32 / 38</span>
                  </div>
                  {['Adaeze O.', 'Michael A.', 'Grace N.', 'Samuel I.', 'Ruth K.'].map((name, i) => (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 0', borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: `rgba(201,168,76,${0.2 + i * 0.05})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#c9a84c', flexShrink: 0 }}>
                        {name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', flex: 1 }}>{name}</span>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: i !== 2 ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d={i !== 2 ? 'M2 6l3 3 5-5' : 'M3 3l6 6M9 3l-6 6'} stroke={i !== 2 ? '#16a34a' : '#dc2626'} strokeWidth="1.5" strokeLinecap="round"/></svg>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ background: 'rgba(201,168,76,0.12)', borderRadius: 12, padding: '10px 14px', marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>6 absentees</span>
                  <span style={{ fontSize: 10, color: '#c9a84c', fontWeight: 700 }}>Follow up →</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. SOCIAL PROOF BAR ───────────────────────────────────────────── */}
      <section style={{ background: '#f7f5f0', borderBottom: '1px solid rgba(26,58,42,0.07)', padding: '1.25rem 1.5rem', textAlign: 'center' }}>
        <p style={{ fontSize: 14, color: '#8a9e90', fontWeight: 600, margin: '0 0 0.5rem', letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: 11 }}>
          Trusted by church groups across Nigeria
        </p>
        <p style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 18, fontWeight: 700, color: '#1a3a2a', margin: 0 }}>
          50+ active church groups and growing
        </p>
      </section>

      {/* ── 4. THE PROBLEM ────────────────────────────────────────────────── */}
      <section style={{ background: '#f7f5f0', padding: 'clamp(3rem,7vw,5.5rem) 1.5rem' }}>
        <div style={{ maxWidth: 620, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 'clamp(1.05rem,2vw,1.2rem)', lineHeight: 1.9, color: '#374151', margin: '0 0 1.5rem' }}>
            Every Sunday, people come. People don't come.
          </p>
          <p style={{ fontSize: 'clamp(1.05rem,2vw,1.2rem)', lineHeight: 1.9, color: '#374151', margin: '0 0 1.5rem' }}>
            And then Monday arrives — and nobody knows<br />
            who to call, who to check on, or even how<br />
            many people actually showed up.
          </p>
          <p style={{ fontSize: 'clamp(1.05rem,2vw,1.2rem)', lineHeight: 1.9, color: '#374151', margin: '0 0 1.5rem' }}>
            The register gets lost. The follow-up never happens.<br />
            And slowly, members start to drift.
          </p>
          <p style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 'clamp(1.1rem,2.5vw,1.4rem)', fontWeight: 700, color: '#1a3a2a', margin: 0 }}>
            Church Trakr was built to fix exactly that.
          </p>
        </div>
      </section>

      {/* ── 5. HOW IT WORKS ───────────────────────────────────────────────── */}
      <section id="how-it-works" style={{ background: 'linear-gradient(160deg,#0b1a12,#1a3a2a)', padding: 'clamp(3.5rem,8vw,6rem) 1.5rem' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 'clamp(2.5rem,5vw,4rem)' }}>
            <h2 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 'clamp(1.75rem,4vw,2.5rem)', fontWeight: 700, color: '#fff', margin: '0 0 0.75rem', letterSpacing: '-0.025em' }}>
              Three steps. Every Sunday.
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 'clamp(1.5rem,3vw,2rem)' }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: '2rem 1.75rem', border: '1px solid rgba(255,255,255,0.07)', position: 'relative' }}>
                <div style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 40, fontWeight: 800, color: 'rgba(201,168,76,0.3)', marginBottom: '0.75rem', lineHeight: 1 }}>
                  {s.num}
                </div>
                <h3 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 0.625rem', letterSpacing: '-0.015em' }}>
                  {s.title}
                </h3>
                <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', margin: 0, lineHeight: 1.65 }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. FEATURES ───────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(3.5rem,8vw,6rem) 1.5rem' }}>
        <div style={{ maxWidth: 1040, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 'clamp(2.5rem,5vw,4rem)' }}>
            <h2 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 'clamp(1.75rem,4vw,2.5rem)', fontWeight: 700, color: '#1a3a2a', margin: '0 0 0.75rem', letterSpacing: '-0.025em' }}>
              Everything your group needs.<br />Nothing you don't.
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(270px,1fr))', gap: '1.125rem' }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid rgba(26,58,42,0.08)', borderRadius: 18, padding: '1.625rem', boxShadow: '0 1px 6px rgba(26,58,42,0.05)', transition: 'all 0.2s' }} className="feat-card">
                <div style={{ width: 46, height: 46, borderRadius: 13, background: 'rgba(26,58,42,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a3a2a', marginBottom: '1rem' }}>
                  {f.icon}
                </div>
                <h3 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 17, fontWeight: 700, color: '#1a3a2a', margin: '0 0 0.5rem', letterSpacing: '-0.015em' }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: 14, color: '#6b7280', margin: 0, lineHeight: 1.65 }}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. REPORTS SHOWCASE ───────────────────────────────────────────── */}
      <section style={{ background: '#f7f5f0', padding: 'clamp(3.5rem,8vw,6rem) 1.5rem' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(2rem,6vw,5rem)', alignItems: 'center' }} className="two-col">
          <div>
            <h2 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 'clamp(1.75rem,4vw,2.5rem)', fontWeight: 700, color: '#1a3a2a', margin: '0 0 1.25rem', letterSpacing: '-0.025em' }}>
              A report worth sharing.
            </h2>
            <p style={{ fontSize: 'clamp(1rem,2vw,1.1rem)', color: '#374151', lineHeight: 1.75, margin: '0 0 1rem' }}>
              Generate a beautiful attendance summary every Sunday — and share it straight to your WhatsApp group in seconds.
            </p>
            <p style={{ fontSize: 'clamp(1rem,2vw,1.1rem)', color: '#374151', lineHeight: 1.75, margin: '0 0 2rem', fontStyle: 'italic' }}>
              Church leaders see numbers. You give them clarity.
            </p>
            <a href="/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 48, padding: '0 1.75rem', borderRadius: 12, background: '#1a3a2a', color: '#e8d5a0', fontWeight: 700, fontSize: 14, textDecoration: 'none', boxShadow: '0 4px 16px rgba(26,58,42,0.22)' }}>
              Generate your first report →
            </a>
          </div>
          {/* Report preview card */}
          <div style={{ background: '#1a3a2a', borderRadius: 20, padding: '1.75rem', boxShadow: '0 20px 60px rgba(26,58,42,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Sunday Report</p>
                <p style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 18, fontWeight: 800, color: '#fff', margin: 0 }}>Youth Ministry</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Nov 10, 2024</p>
              </div>
            </div>
            {[
              { label: 'Total Members', value: '38', color: '#fff' },
              { label: 'Present', value: '32', color: '#86efac' },
              { label: 'Absent', value: '6', color: '#fca5a5' },
              { label: 'Attendance Rate', value: '84%', color: '#c9a84c' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{label}</span>
                <span style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 20, fontWeight: 800, color }}>{value}</span>
              </div>
            ))}
            <div style={{ marginTop: '1rem', padding: '10px 14px', background: 'rgba(201,168,76,0.12)', borderRadius: 10, textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: '#c9a84c', fontWeight: 700, margin: 0, letterSpacing: '0.06em' }}>SHARED ON WHATSAPP ✓</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. TESTIMONIALS ───────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(3.5rem,8vw,6rem) 1.5rem' }}>
        <div style={{ maxWidth: 1040, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 'clamp(1.75rem,4vw,2.5rem)', fontWeight: 700, color: '#1a3a2a', margin: '0 0 clamp(2rem,4vw,3.5rem)', textAlign: 'center', letterSpacing: '-0.025em' }}>
            What church leaders are saying
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(270px,1fr))', gap: '1.25rem' }} className="testimonial-grid">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid rgba(26,58,42,0.08)', borderRadius: 20, padding: '1.75rem', boxShadow: '0 2px 12px rgba(26,58,42,0.05)', position: 'relative' }}>
                <div style={{ fontSize: 40, fontFamily: 'Georgia,serif', color: '#c9a84c', lineHeight: 1, marginBottom: '0.875rem', opacity: 0.7 }}>❝</div>
                <p style={{ fontSize: 15, color: '#374151', lineHeight: 1.75, margin: '0 0 1.5rem', fontStyle: 'italic' }}>
                  "{t.quote}"
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#c9a84c', flexShrink: 0 }}>
                    {t.initials}
                  </div>
                  <p style={{ fontSize: 13, color: '#8a9e90', margin: 0, fontWeight: 600 }}>{t.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 9. PRICING TEASER ─────────────────────────────────────────────── */}
      <section style={{ background: '#f7f5f0', padding: 'clamp(3.5rem,8vw,5.5rem) 1.5rem', textAlign: 'center' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 'clamp(1.75rem,4vw,2.5rem)', fontWeight: 700, color: '#1a3a2a', margin: '0 0 1.5rem', letterSpacing: '-0.025em' }}>
            Start free. Grow as you go.
          </h2>
          <p style={{ fontSize: 'clamp(1rem,2vw,1.1rem)', color: '#374151', lineHeight: 1.8, margin: '0 0 1rem' }}>
            Create your account for free.<br />
            Add your members. Take attendance.
          </p>
          <p style={{ fontSize: 'clamp(1rem,2vw,1.1rem)', color: '#374151', lineHeight: 1.8, margin: '0 0 1.5rem' }}>
            SMS credits are available when you're ready<br />
            to reach out — at just <strong style={{ color: '#1a3a2a' }}>₦5 per message</strong>.
          </p>
          <p style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 'clamp(1rem,2vw,1.15rem)', fontWeight: 700, color: '#1a3a2a', margin: '0 0 2.5rem' }}>
            No monthly subscription. No hidden fees.<br />Pay only for what you use.
          </p>
          <a href="/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 54, padding: '0 2.25rem', borderRadius: 14, background: '#1a3a2a', color: '#e8d5a0', fontWeight: 800, fontSize: 16, textDecoration: 'none', boxShadow: '0 6px 22px rgba(26,58,42,0.25)' }}>
            Get Started Free →
          </a>
        </div>
      </section>

      {/* ── 10. FINAL CTA ─────────────────────────────────────────────────── */}
      <section style={{ background: 'linear-gradient(160deg,#0b1a12,#1a3a2a)', padding: 'clamp(4rem,10vw,8rem) 1.5rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 600, borderRadius: '50%', background: 'rgba(201,168,76,0.05)', filter: 'blur(80px)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 600, margin: '0 auto', position: 'relative' }}>
          <h2 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 'clamp(2rem,5vw,3.25rem)', fontWeight: 700, color: '#fff', margin: '0 0 1.25rem', letterSpacing: '-0.03em', lineHeight: 1.15 }}>
            Your members matter.
          </h2>
          <p style={{ fontSize: 'clamp(1rem,2vw,1.2rem)', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, margin: '0 0 2.5rem' }}>
            Start tracking. Start following up.<br />
            Start making every Sunday count.
          </p>
          <a href="/signup" className="cta-primary" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            height: 58, padding: '0 2.5rem', borderRadius: 16,
            background: 'linear-gradient(135deg,#c9a84c,#e8d5a0)',
            color: '#1a3a2a', fontWeight: 800, fontSize: 17,
            textDecoration: 'none', boxShadow: '0 8px 32px rgba(201,168,76,0.32)',
            letterSpacing: '-0.01em',
          }}>
            Create Your Free Account
          </a>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', marginTop: '1rem' }}>
            No credit card needed · Takes 60 seconds
          </p>
        </div>
      </section>

      {/* ── 11. FOOTER ────────────────────────────────────────────────────── */}
      <footer style={{ background: '#0b1a12', padding: 'clamp(2.5rem,5vw,4rem) 1.5rem 1.5rem' }}>
        <div style={{ maxWidth: 1040, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '2rem', marginBottom: '2.5rem' }} className="footer-grid">
            {/* Brand */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: '0.875rem' }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#1a3a2a,#2d5a42)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="12" height="12" viewBox="0 0 20 20" fill="none"><path d="M10 3v14M3 10h14" stroke="#c9a84c" strokeWidth="2.5" strokeLinecap="round"/></svg>
                </div>
                <span style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontWeight: 700, fontSize: 16, color: '#fff' }}>Church Trakr</span>
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', margin: 0, fontStyle: 'italic', lineHeight: 1.6 }}>
                "Follow-up is Discipleship."
              </p>
            </div>
            {/* Links */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.875rem' }}>Navigation</p>
              {[['/', 'Home'], ['#how-it-works', 'How It Works'], ['#features', 'Features'], ['/login', 'Login'], ['/signup', 'Sign Up']].map(([href, label]) => (
                <a key={href} href={href} style={{ display: 'block', fontSize: 14, color: 'rgba(255,255,255,0.55)', textDecoration: 'none', marginBottom: '0.5rem', transition: 'color 0.15s' }}>{label}</a>
              ))}
            </div>
            {/* Contact */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.875rem' }}>Contact</p>
              <a href="mailto:support@churchtrakr.com" style={{ display: 'block', fontSize: 14, color: 'rgba(255,255,255,0.55)', textDecoration: 'none', marginBottom: '0.5rem' }}>
                support@churchtrakr.com
              </a>
              <a href="https://wa.me/2348050340350" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#25D366', textDecoration: 'none' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp Support
              </a>
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.5rem', textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', margin: 0 }}>
              © 2025 Church Trakr. Built with love for the Church.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ── Global styles ─────────────────────────────────────────────────────────────
function GlobalStyles() {
  return (
    <style>{`
      .cta-primary:hover { transform: translateY(-2px); box-shadow: 0 14px 36px rgba(201,168,76,0.4) !important; }
      .feat-card:hover   { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(26,58,42,0.1) !important; }

      /* Hero: 2-col on desktop, single col on mobile */
      .hero-grid { }
      @media (max-width: 768px) {
        .hero-grid { grid-template-columns: 1fr !important; }
        .hero-img-wrap { display: none !important; }
      }

      /* Two-col sections */
      @media (max-width: 768px) {
        .two-col { grid-template-columns: 1fr !important; }
      }

      /* Testimonials scrollable on mobile */
      @media (max-width: 768px) {
        .testimonial-grid {
          display: flex !important;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          gap: 1rem !important;
          padding-bottom: 0.5rem;
        }
        .testimonial-grid > * {
          min-width: 85vw;
          scroll-snap-align: start;
        }
      }

      /* Footer grid on mobile */
      @media (max-width: 640px) {
        .footer-grid { grid-template-columns: 1fr !important; gap: 1.5rem !important; }
      }
    `}</style>
  )
}
