'use client'

import { useState, useEffect, useRef } from 'react'

// ── Data ──────────────────────────────────────────────────────────────────────
const STEPS = [
  { num: '01', title: 'Add Your Members',  body: 'Import your full member list in seconds — by CSV, Excel, or one by one.' },
  { num: '02', title: 'Take Attendance',   body: "Mark who came and who didn't, right from your phone. Takes under 5 minutes." },
  { num: '03', title: 'Follow Up',         body: "See exactly who's absent. Reach out by SMS. Track who's been contacted. Never let anyone fall through." },
]

const FEATURES = [
  { title: 'Attendance Tracking',  body: 'Mark present and absent in under 5 minutes.',                       Icon: CalendarIcon },
  { title: 'Follow-Up Management', body: "See who needs a call and track who's been reached.",                Icon: PhoneCallIcon },
  { title: 'SMS Messaging',        body: 'Send bulk SMS to absentees or attendees directly.',                 Icon: ChatIcon },
  { title: 'Shareable Reports',    body: 'Generate a clean attendance report to share on WhatsApp.',         Icon: ReportIcon },
  { title: 'Member Management',    body: 'Import your full list and keep member details in one place.',      Icon: PeopleIcon },
  { title: 'Church Dashboard',     body: 'Church leadership sees all groups in one place.',                  Icon: DashboardIcon },
]

const TESTIMONIALS = [
  { quote: 'Church Trakr changed how we do follow-up. We went from losing track of members to knowing exactly who to reach every week.', name: 'Youth Pastor, Lagos',              initials: 'PE', bg: '#1a3a2a' },
  { quote: 'The reports alone are worth it. I send it to our senior pastor every Sunday and he loves seeing the numbers.',               name: 'Group Leader, Abuja',              initials: 'SG', bg: '#2d5a42' },
  { quote: 'We imported 80 members and took attendance in under 3 minutes. It just works.',                                              name: "Women's Ministry Leader, Port Harcourt", initials: 'DT', bg: '#4a8a65' },
]

const FAQS = [
  { q: 'How do I track church attendance on my phone?',                  a: "Church Trakr (also known as Church Tracker) lets you mark attendance in under 5 minutes directly from your phone. Open the app, select your group, and tap each member's name to mark present or absent. Works on any smartphone." },
  { q: 'Is there a free church attendance app for Nigerian churches?',   a: 'Yes — Church Trakr is free to start. Create your account, add your members, and take attendance at no cost. SMS credits are available when ready, at just ₦5 per message. No monthly subscription, no hidden fees.' },
  { q: 'How do I follow up on church members who were absent?',          a: "Church Trakr shows you exactly who was absent every Sunday. From the Absentees page you can call them directly, send WhatsApp, or send bulk SMS. Track who's been reached and add notes per member." },
  { q: 'Can multiple people take attendance at the same time?',          a: 'Yes. Multiple team members can log in and mark attendance or follow-ups. All changes sync in real time so everyone sees the same data.' },
]

// ── Page component ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const h = () => { if (window.innerWidth >= 768) setMenuOpen(false) }
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  return (
    <div style={{ fontFamily: "var(--font-dm-sans,'DM Sans',system-ui,sans-serif)", background: '#fff', color: '#111827' }}>
      <GlobalStyles />

      {/* sr-only SEO terms */}
      <span style={{ position:'absolute', width:1, height:1, padding:0, margin:-1, overflow:'hidden', clip:'rect(0,0,0,0)', whiteSpace:'nowrap', border:0 }}>
        Church Tracker ChurchTracker Church Trakr church attendance tracker Nigeria church follow up app Nigerian church app
      </span>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context':'https://schema.org','@type':'SoftwareApplication',
        name:'Church Trakr', alternateName:['Church Tracker','ChurchTracker','Church Trakr App'],
        applicationCategory:'BusinessApplication', operatingSystem:'Web, Android, iOS',
        description:'Church attendance tracking and follow-up management app for Nigerian church groups.',
        offers:{'@type':'Offer',price:'0',priceCurrency:'NGN'},
      })}} />

      {/* ─────────────── NAVBAR ─────────────── */}
      <nav className="ct-nav">
        <div className="ct-nav-inner">
          <a href="/" className="ct-logo">
            <div className="ct-logo-mark">
              <svg width="13" height="13" viewBox="0 0 20 20" fill="none"><path d="M10 3v14M3 10h14" stroke="#c9a84c" strokeWidth="2.5" strokeLinecap="round"/></svg>
            </div>
            <span className="ct-logo-text">Church Trakr</span>
          </a>
          <div className="ct-nav-desktop">
            <a href="#how-it-works" className="ct-nav-link">How It Works</a>
            <a href="#features"     className="ct-nav-link">Features</a>
            <a href="/login"        className="ct-nav-link">Login</a>
            <a href="/signup"       className="ct-btn-nav">Get Started Free →</a>
          </div>
          <button className="ct-hamburger" onClick={() => setMenuOpen(v => !v)} aria-label={menuOpen ? 'Close menu' : 'Open menu'}>
            {menuOpen
              ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
            }
          </button>
        </div>
        {menuOpen && (
          <div className="ct-mobile-menu">
            {[['/', 'Home'], ['#how-it-works', 'How It Works'], ['#features', 'Features'], ['/login', 'Login']].map(([href, lbl]) => (
              <a key={href} href={href} className="ct-mobile-link" onClick={() => setMenuOpen(false)}>{lbl}</a>
            ))}
            <a href="/signup" className="ct-mobile-cta" onClick={() => setMenuOpen(false)}>Get Started Free →</a>
          </div>
        )}
      </nav>

      {/* ─────────────── HERO ─────────────── */}
      <section className="ct-hero">
        <div className="ct-hero-grid-bg" aria-hidden />
        <div className="ct-hero-glow"    aria-hidden />
        <div className="ct-hero-inner">
          <div className="ct-hero-copy">
            <h1 className="ct-hero-h1">
              Follow-up is<br />
              <span className="ct-hero-accent">Discipleship.</span>
            </h1>
            <p className="ct-hero-sub">
              Church Trakr closes that gap —<br className="ct-hero-br" />
              so no member is ever left behind
              without someone noticing.
            </p>
            <div className="ct-hero-ctas">
              <a href="/signup" className="ct-btn-primary">Get Started Free</a>
              <a href="#how-it-works" className="ct-btn-ghost">
                See How It Works
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </a>
            </div>
            <p className="ct-hero-note">Free to start · No credit card required</p>
          </div>
          {/* Hero image — visible on desktop beside copy, below text on mobile */}
          <div className="ct-hero-img-col">
            <div className="ct-hero-frame">
              {/* Replace /images/hero-phone.webp with generated image */}
              <img src="/images/hero-phone.webp" alt="Church Trakr attendance app on smartphone" className="ct-hero-real-img" loading="eager" onError={e => e.target.style.display='none'} />
              {/* Fallback app mockup */}
              <div className="ct-phone-fallback" aria-hidden>
                <div className="ct-phone-bar">
                  <span>9:41</span>
                  <div className="ct-phone-notch"/>
                  <div className="ct-phone-sig">{[4,5,6].map(h=><div key={h} style={{height:h,width:2,background:'rgba(255,255,255,0.4)',borderRadius:1}}/>)}</div>
                </div>
                <div style={{padding:'16px 16px 0'}}>
                  <div style={{background:'rgba(255,255,255,0.06)',borderRadius:14,padding:14}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:12,fontSize:12,color:'rgba(255,255,255,0.5)'}}>
                      <span>Sunday Attendance</span><span style={{color:'#c9a84c',fontWeight:700}}>32 / 38</span>
                    </div>
                    {['Adaeze O.','Michael A.','Grace N.','Samuel I.','Ruth K.'].map((name,i) => (
                      <div key={name} style={{display:'flex',alignItems:'center',gap:9,padding:'7px 0',borderBottom:i<4?'1px solid rgba(255,255,255,0.05)':'none'}}>
                        <div style={{width:26,height:26,borderRadius:'50%',background:`rgba(201,168,76,${0.2+i*0.05})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:800,color:'#c9a84c',flexShrink:0}}>
                          {name.split(' ').map(n=>n[0]).join('')}
                        </div>
                        <span style={{fontSize:12,color:'rgba(255,255,255,0.75)',flex:1}}>{name}</span>
                        <div style={{width:18,height:18,borderRadius:'50%',background:i!==2?'rgba(22,163,74,0.2)':'rgba(220,38,38,0.15)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                          <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d={i!==2?'M2 6l3 3 5-5':'M3 3l6 6M9 3l-6 6'} stroke={i!==2?'#16a34a':'#dc2626'} strokeWidth="1.5" strokeLinecap="round"/></svg>
                        </div>
                      </div>
                    ))}
                    <div style={{background:'rgba(201,168,76,0.12)',borderRadius:12,padding:'10px 14px',marginTop:10,display:'flex',justifyContent:'space-between',fontSize:11}}>
                      <span style={{color:'rgba(255,255,255,0.6)'}}>6 absentees</span>
                      <span style={{color:'#c9a84c',fontWeight:700}}>Follow up →</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────── PROBLEM ─────────────── */}
      <FadeIn>
        <section className="ct-problem">
          <div className="ct-problem-inner">
            <div className="ct-problem-text">
              <p className="ct-pline">Every Sunday, people come.</p>
              <p className="ct-pline">Some don't.</p>
              <div style={{height:16}}/>
              <p className="ct-pline">And then Monday arrives.</p>
              <div style={{height:16}}/>
              <p className="ct-pline">Nobody knows who to call.</p>
              <p className="ct-pline">Nobody knows who to check on.</p>
              <p className="ct-pline">The register is somewhere — maybe.</p>
              <p className="ct-pline">The follow-up? It never happened.</p>
              <div style={{height:16}}/>
              <p className="ct-pline" style={{color:'#9ca3af'}}>And slowly, quietly, members start to drift.</p>
              <div style={{height:24}}/>
              <p className="ct-problem-closer">Church Trakr was built to stop that.</p>
            </div>
            <div className="ct-problem-img-wrap">
              {/* Replace /images/problem-split.webp with generated image */}
              <img
                src="/images/problem-split.webp"
                alt="Messy handwritten attendance register beside a clean digital attendance app"
                className="ct-problem-img" loading="lazy"
                data-prompt="Split composition: left half crumpled handwritten church attendance sheet with pen on wooden desk; right half clean smartphone screen with digital checklist. Warm natural light. Flat lay overhead. No people. Analog chaos vs digital clarity."
                onError={e => e.target.style.display='none'}
              />
            </div>
          </div>
        </section>
      </FadeIn>

      {/* ─────────────── HOW IT WORKS ─────────────── */}
      <FadeIn>
        <section id="how-it-works" className="ct-steps">
          <div className="ct-section-inner">
            <div className="ct-section-hd">
              <h2 className="ct-h2 ct-light">Three steps. Every Sunday.</h2>
            </div>
            <div className="ct-steps-grid">
              {STEPS.map((s, i) => (
                <div key={i} className="ct-step-card">
                  <div className="ct-step-num">{s.num}</div>
                  <h3 className="ct-step-title">{s.title}</h3>
                  <p className="ct-step-body">{s.body}</p>
                </div>
              ))}
            </div>
            <div className="ct-steps-img-wrap">
              {/* Replace /images/steps-followup.webp with generated image */}
              <img src="/images/steps-followup.webp" alt="Church leader sending a follow-up message on phone"
                className="ct-steps-img" loading="lazy"
                data-prompt="Candid warm photo of a young Nigerian man in smart casual, smiling while typing on his phone in a bright modern church lobby. Natural window light. Bokeh background. No screen content visible. Editorial photography style."
                onError={e => e.target.style.display='none'}
              />
            </div>
          </div>
        </section>
      </FadeIn>

      {/* ─────────────── FEATURES ─────────────── */}
      <FadeIn>
        <section id="features" className="ct-features">
          <div className="ct-section-inner">
            <div className="ct-section-hd">
              <h2 className="ct-h2">Everything your group needs.<br/>Nothing you don't.</h2>
            </div>
            <div className="ct-features-img-wrap">
              {/* Replace /images/features-team.webp with generated image */}
              <img src="/images/features-team.webp" alt="Church leaders reviewing attendance data together on a tablet"
                className="ct-features-img" loading="lazy"
                data-prompt="Candid photo of 2-3 young Nigerian church leaders mixed gender gathered around a tablet looking at data. Smiling, engaged. Bright modern church office. Natural light. Collaborative and purposeful. No screen content visible."
                onError={e => e.target.style.display='none'}
              />
            </div>
            <div className="ct-features-grid">
              {FEATURES.map((f, i) => (
                <div key={i} className="ct-feat-card">
                  <div className="ct-feat-icon"><f.Icon /></div>
                  <h3 className="ct-feat-title">{f.title}</h3>
                  <p className="ct-feat-body">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeIn>

      {/* ─────────────── REPORTS ─────────────── */}
      <FadeIn>
        <section className="ct-reports">
          <div className="ct-section-inner ct-two-col">
            <div>
              <h2 className="ct-h2" style={{marginBottom:20}}>A report worth sharing.</h2>
              <p className="ct-body">Generate a beautiful attendance summary every Sunday — and share it straight to your WhatsApp group in seconds.</p>
              <p className="ct-body" style={{fontStyle:'italic',marginBottom:32}}>Church leaders see numbers. You give them clarity.</p>
              <a href="/signup" className="ct-btn-dark">Generate your first report →</a>
            </div>
            <div>
              {/* Replace /images/report-hand.webp with generated image */}
              <img src="/images/report-hand.webp" alt="Hand holding phone with Church Trakr attendance report showing bold numbers"
                className="ct-report-real-img" loading="lazy"
                data-prompt="Close-up of a hand holding a smartphone with a beautifully designed church attendance report card. Bold numbers, clean typography — present, absent, followed up. Softly blurred warm background. Conveying clarity and professionalism. Premium product photography."
                onError={e => e.target.style.display='none'}
              />
              {/* Fallback report card */}
              <div className="ct-report-card">
                <div className="ct-report-hd">
                  <div><p className="ct-report-lbl">Sunday Report</p><p className="ct-report-name">Youth Ministry</p></div>
                  <p className="ct-report-lbl">Nov 10, 2024</p>
                </div>
                {[['Total Members','38','#fff'],['Present','32','#86efac'],['Absent','6','#fca5a5'],['Attendance','84%','#c9a84c']].map(([lbl,val,col]) => (
                  <div key={lbl} className="ct-report-row">
                    <span style={{fontSize:13,color:'rgba(255,255,255,0.5)'}}>{lbl}</span>
                    <span style={{fontFamily:'var(--font-playfair,Georgia,serif)',fontSize:22,fontWeight:800,color:col}}>{val}</span>
                  </div>
                ))}
                <div className="ct-report-shared">SHARED ON WHATSAPP ✓</div>
              </div>
            </div>
          </div>
        </section>
      </FadeIn>

      {/* ─────────────── TESTIMONIALS ─────────────── */}
      <FadeIn>
        <section className="ct-testimonials">
          <div className="ct-section-inner">
            <h2 className="ct-h2 ct-centered" style={{marginBottom:'clamp(2rem,4vw,3.5rem)'}}>What church leaders are saying</h2>
            <div className="ct-t-grid">
              {TESTIMONIALS.map((t, i) => (
                <div key={i} className="ct-t-card">
                  <div style={{fontSize:40,fontFamily:'Georgia,serif',color:'#c9a84c',opacity:.7,lineHeight:1,marginBottom:14}}>❝</div>
                  <p style={{fontSize:15,color:'#374151',lineHeight:1.75,fontStyle:'italic',marginBottom:24}}>"{t.quote}"</p>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <div style={{width:36,height:36,borderRadius:'50%',background:t.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:'#c9a84c',flexShrink:0}}>{t.initials}</div>
                    <p style={{fontSize:13,color:'#8a9e90',fontWeight:600}}>{t.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeIn>

      {/* ─────────────── PRICING ─────────────── */}
      <FadeIn>
        <section style={{background:'#f7f5f0',padding:'clamp(4rem,8vw,5.5rem) 24px',textAlign:'center'}}>
          <div style={{maxWidth:540,margin:'0 auto'}}>
            <h2 className="ct-h2" style={{marginBottom:24}}>Start free. Grow as you go.</h2>
            <p className="ct-body">Create your account for free.<br/>Add your members. Take attendance.</p>
            <p className="ct-body">SMS credits when you're ready — at just <strong>₦5 per message</strong>.</p>
            <p style={{fontFamily:'var(--font-playfair,Georgia,serif)',fontSize:'clamp(1rem,2vw,1.15rem)',fontWeight:700,color:'#1a3a2a',margin:'8px 0 32px',lineHeight:1.6}}>
              No monthly subscription. No hidden fees.<br/>Pay only for what you use.
            </p>
            <a href="/signup" className="ct-btn-primary">Get Started Free →</a>
          </div>
        </section>
      </FadeIn>

      {/* ─────────────── FAQ ─────────────── */}
      <FadeIn>
        <section style={{padding:'clamp(4rem,8vw,6rem) 24px'}}>
          <div className="ct-section-inner">
            <h2 className="ct-h2 ct-centered" style={{marginBottom:'clamp(2rem,4vw,3.5rem)'}}>Common questions</h2>
            <div style={{maxWidth:720,margin:'0 auto'}}>
              {FAQS.map((faq, i) => <FAQItem key={i} q={faq.q} a={faq.a} />)}
            </div>
          </div>
        </section>
      </FadeIn>

      {/* ─────────────── FINAL CTA ─────────────── */}
      <section className="ct-cta">
        {/* Replace /images/cta-congregation.webp with generated image */}
        <img src="/images/cta-congregation.webp" alt="Nigerian church congregation during Sunday service, viewed from behind looking toward a bright stage"
          className="ct-cta-bg" loading="lazy"
          data-prompt="Wide-angle cinematic photo of vibrant Nigerian church congregation during Sunday service, viewed from slightly behind and above looking toward bright modern stage. Standing, engaged, worshipping. Warm golden lighting. Uplifting community spirit. Slightly darkened vignette for text overlay. No faces clearly identifiable."
          onError={e => e.target.style.display='none'}
        />
        <div className="ct-cta-overlay" aria-hidden/>
        <div className="ct-cta-inner">
          <h2 className="ct-cta-h2">Your members matter.</h2>
          <p className="ct-cta-sub">Start tracking. Start following up.<br/>Start making every Sunday count.</p>
          <a href="/signup" className="ct-btn-primary ct-btn-lg">Create Your Free Account</a>
          <p style={{fontSize:12,color:'rgba(255,255,255,0.25)',marginTop:16}}>No credit card needed · Takes 60 seconds</p>
        </div>
      </section>

      {/* ─────────────── FOOTER ─────────────── */}
      <footer className="ct-footer">
        <div className="ct-section-inner">
          <div className="ct-footer-grid">
            <div>
              <div style={{display:'flex',alignItems:'center',gap:9,marginBottom:10}}>
                <div className="ct-logo-mark"><svg width="12" height="12" viewBox="0 0 20 20" fill="none"><path d="M10 3v14M3 10h14" stroke="#c9a84c" strokeWidth="2.5" strokeLinecap="round"/></svg></div>
                <span className="ct-logo-text" style={{fontSize:15}}>Church Trakr</span>
              </div>
              <p style={{fontSize:13,color:'rgba(255,255,255,0.38)',fontStyle:'italic',lineHeight:1.6}}>"Follow-up is Discipleship."</p>
            </div>
            <div>
              <p className="ct-footer-hd">Navigation</p>
              {[['/', 'Home'],['#how-it-works','How It Works'],['#features','Features'],['/login','Login'],['/signup','Sign Up']].map(([href,lbl]) => (
                <a key={href} href={href} className="ct-footer-link">{lbl}</a>
              ))}
            </div>
            <div>
              <p className="ct-footer-hd">Contact</p>
              <a href="mailto:support@churchtrakr.com" className="ct-footer-link">support@churchtrakr.com</a>
              <a href="https://wa.me/2348050340350" target="_blank" rel="noreferrer" style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:13,fontWeight:600,color:'#25D366',textDecoration:'none',marginTop:4}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp Support
              </a>
            </div>
          </div>
          <div style={{borderTop:'1px solid rgba(255,255,255,0.06)',paddingTop:24,textAlign:'center'}}>
            <p style={{fontSize:12,color:'rgba(255,255,255,0.25)'}}>© 2025 Church Trakr. Built with love for the Church.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ── Accordion FAQ ──────────────────────────────────────────────────────────────
function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{borderBottom:'1px solid rgba(26,58,42,0.1)'}}>
      <button onClick={() => setOpen(v => !v)}
        style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',gap:16,background:'none',border:'none',cursor:'pointer',padding:'20px 0',textAlign:'left',fontSize:16,fontWeight:700,color:'#111827',minHeight:64,fontFamily:'inherit'}}>
        <span>{q}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{transform:open?'rotate(180deg)':'none',transition:'transform 0.2s',flexShrink:0}}><path d="M6 9l6 6 6-6"/></svg>
      </button>
      {open && <p style={{fontSize:15,color:'#374151',lineHeight:1.75,paddingBottom:20}}>{a}</p>}
    </div>
  )
}

// ── Scroll fade-in ─────────────────────────────────────────────────────────────
function FadeIn({ children }) {
  const ref = useRef(null)
  const [vis, setVis] = useState(false)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setVis(true); return }
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect() } }, { threshold: 0.07 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return <div ref={ref} style={{opacity:vis?1:0,transform:vis?'none':'translateY(18px)',transition:'opacity 0.45s ease,transform 0.45s ease'}}>{children}</div>
}

// ── Icons ──────────────────────────────────────────────────────────────────────
function CalendarIcon()  { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M9 16l2 2 4-4"/></svg> }
function PhoneCallIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2A19.79 19.79 0 0111.63 19a19.5 19.5 0 01-5-5 19.79 19.79 0 01-2.92-8.19A2 2 0 015.53 4h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11l-1.27 1.27a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg> }
function ChatIcon()      { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> }
function ReportIcon()    { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg> }
function PeopleIcon()    { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg> }
function DashboardIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg> }

// ── Styles ─────────────────────────────────────────────────────────────────────
function GlobalStyles() {
  return <style>{`
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    html{scroll-behavior:smooth}

    /* Nav */
    .ct-nav{position:sticky;top:0;z-index:100;background:rgba(255,255,255,0.93);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom:1px solid rgba(26,58,42,0.08)}
    .ct-nav-inner{max-width:1100px;margin:0 auto;height:64px;display:flex;align-items:center;justify-content:space-between;padding:0 24px}
    .ct-logo{display:flex;align-items:center;gap:9px;text-decoration:none}
    .ct-logo-mark{width:32px;height:32px;border-radius:9px;background:linear-gradient(135deg,#1a3a2a,#2d5a42);display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .ct-logo-text{font-family:var(--font-playfair,Georgia,serif);font-weight:700;font-size:18px;color:#1a3a2a;letter-spacing:-0.02em}
    .ct-nav-desktop{display:flex;align-items:center;gap:8px}
    .ct-nav-link{font-size:14px;font-weight:600;color:#4b5563;text-decoration:none;padding:0 12px;height:40px;display:inline-flex;align-items:center;border-radius:8px;transition:color 0.15s}
    .ct-nav-link:hover{color:#1a3a2a}
    .ct-btn-nav{font-size:14px;font-weight:700;color:#e8d5a0;background:#1a3a2a;padding:0 18px;height:40px;display:inline-flex;align-items:center;border-radius:10px;text-decoration:none;box-shadow:0 2px 8px rgba(26,58,42,0.22);transition:all 0.2s}
    .ct-btn-nav:hover{background:#2d5a42}
    .ct-hamburger{display:none;background:none;border:none;cursor:pointer;color:#1a3a2a;min-width:44px;min-height:44px;align-items:center;justify-content:center;border-radius:8px}
    .ct-mobile-menu{background:#fff;border-top:1px solid rgba(26,58,42,0.08);padding:12px 24px 20px;display:flex;flex-direction:column;gap:0}
    .ct-mobile-link{font-size:16px;font-weight:600;color:#374151;text-decoration:none;padding:12px 0;border-bottom:1px solid rgba(26,58,42,0.06);min-height:48px;display:flex;align-items:center}
    .ct-mobile-cta{margin-top:12px;height:52px;display:flex;align-items:center;justify-content:center;background:#1a3a2a;color:#e8d5a0;text-decoration:none;border-radius:12px;font-size:15px;font-weight:700}

    /* Buttons */
    .ct-btn-primary{display:inline-flex;align-items:center;gap:8px;height:52px;padding:0 32px;border-radius:10px;background:linear-gradient(135deg,#c9a84c,#e8d5a0);color:#1a3a2a;font-weight:800;font-size:16px;text-decoration:none;box-shadow:0 8px 28px rgba(201,168,76,0.3);transition:all 0.2s;letter-spacing:-0.01em}
    .ct-btn-primary:hover{transform:translateY(-2px);box-shadow:0 14px 36px rgba(201,168,76,0.42)}
    .ct-btn-lg{height:58px;padding:0 40px;font-size:17px}
    .ct-btn-ghost{display:inline-flex;align-items:center;gap:6px;font-size:15px;font-weight:600;color:rgba(255,255,255,0.75);text-decoration:none;padding:0 8px;height:52px;transition:color 0.15s}
    .ct-btn-ghost:hover{color:#fff}
    .ct-btn-dark{display:inline-flex;align-items:center;gap:8px;height:48px;padding:0 28px;border-radius:10px;background:#1a3a2a;color:#e8d5a0;font-weight:700;font-size:14px;text-decoration:none;box-shadow:0 4px 16px rgba(26,58,42,0.22);transition:all 0.2s}
    .ct-btn-dark:hover{background:#2d5a42;transform:translateY(-1px)}

    /* Section utilities */
    .ct-section-inner{max-width:1040px;margin:0 auto;padding:0 24px}
    .ct-section-hd{text-align:center;margin-bottom:clamp(2rem,4vw,3.5rem)}
    .ct-h2{font-family:var(--font-playfair,Georgia,serif);font-size:clamp(1.75rem,4vw,2.5rem);font-weight:700;color:#111827;line-height:1.15;letter-spacing:-0.025em}
    .ct-h2.ct-light{color:#fff}
    .ct-h2.ct-centered{text-align:center}
    .ct-body{font-size:clamp(1rem,2vw,1.1rem);color:#374151;line-height:1.75;margin-bottom:16px}
    .ct-two-col{display:grid;grid-template-columns:1fr 1fr;gap:clamp(2rem,6vw,5rem);align-items:center}

    /* Hero */
    .ct-hero{background:linear-gradient(160deg,#0b1a12 0%,#1a3a2a 55%,#2d5a42 100%);padding:clamp(4rem,10vw,7rem) 24px clamp(5rem,12vw,9rem);position:relative;overflow:hidden}
    .ct-hero-grid-bg{position:absolute;inset:0;opacity:0.04;background-image:radial-gradient(circle at 1px 1px,#fff 1px,transparent 0);background-size:28px 28px}
    .ct-hero-glow{position:absolute;top:20%;right:15%;width:320px;height:320px;border-radius:50%;background:rgba(201,168,76,0.07);filter:blur(60px);pointer-events:none}
    .ct-hero-inner{max-width:1100px;margin:0 auto;position:relative;display:grid;grid-template-columns:1fr 1fr;gap:clamp(2rem,6vw,5rem);align-items:center}
    .ct-hero-copy{}
    .ct-hero-h1{font-family:var(--font-playfair,Georgia,serif);font-size:clamp(2.4rem,5.5vw,4rem);font-weight:700;color:#fff;line-height:1.08;letter-spacing:-0.03em;margin-bottom:24px}
    .ct-hero-accent{color:#c9a84c}
    .ct-hero-sub{font-size:clamp(1rem,2vw,1.175rem);color:rgba(255,255,255,0.62);line-height:1.7;margin-bottom:40px;max-width:460px}
    .ct-hero-ctas{display:flex;gap:16px;flex-wrap:wrap;align-items:center;margin-bottom:16px}
    .ct-hero-note{font-size:12px;color:rgba(255,255,255,0.28)}
    .ct-hero-img-col{display:flex;justify-content:center;align-items:center}
    .ct-hero-frame{width:100%;max-width:300px;aspect-ratio:9/19;border-radius:36px;overflow:hidden;border:2px solid rgba(255,255,255,0.08);box-shadow:0 32px 80px rgba(0,0,0,0.5);position:relative;background:linear-gradient(160deg,#0f2a1a,#2d5a42)}
    .ct-hero-real-img{width:100%;height:100%;object-fit:cover;display:block}
    .ct-phone-fallback{position:absolute;inset:0}
    .ct-phone-bar{height:44px;padding:12px 20px 0;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:rgba(255,255,255,0.5);font-weight:700}
    .ct-phone-notch{width:18px;height:18px;border-radius:50%;background:#0b1a12}
    .ct-phone-sig{display:flex;gap:4px;align-items:flex-end}

    /* Problem */
    .ct-problem{background:#f7f5f0;padding:clamp(4rem,9vw,7rem) 24px}
    .ct-problem-inner{max-width:1000px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:clamp(3rem,6vw,6rem);align-items:center}
    .ct-pline{font-size:clamp(1.05rem,2vw,1.2rem);line-height:2;color:#374151}
    .ct-problem-closer{font-family:var(--font-playfair,Georgia,serif);font-size:clamp(1.15rem,2.5vw,1.45rem);font-weight:700;color:#1a3a2a;line-height:1.4}
    .ct-problem-img-wrap{display:flex;justify-content:center}
    .ct-problem-img{width:100%;max-width:420px;border-radius:20px;box-shadow:0 16px 48px rgba(0,0,0,0.12);object-fit:cover}

    /* Steps */
    .ct-steps{background:linear-gradient(160deg,#0b1a12,#1a3a2a);padding:clamp(4rem,8vw,6.5rem) 24px}
    .ct-steps-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(1.5rem,3vw,2rem);margin-bottom:clamp(2.5rem,5vw,4rem)}
    .ct-step-card{background:rgba(255,255,255,0.05);border-radius:20px;padding:clamp(1.5rem,3vw,2rem);border:1px solid rgba(255,255,255,0.07)}
    .ct-step-num{font-family:var(--font-playfair,Georgia,serif);font-size:48px;font-weight:800;color:rgba(201,168,76,0.25);line-height:1;margin-bottom:12px}
    .ct-step-title{font-family:var(--font-playfair,Georgia,serif);font-size:20px;font-weight:700;color:#fff;margin-bottom:10px;letter-spacing:-0.015em}
    .ct-step-body{font-size:15px;color:rgba(255,255,255,0.55);line-height:1.65}
    .ct-steps-img-wrap{display:flex;justify-content:center}
    .ct-steps-img{width:100%;max-width:500px;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,0.4);object-fit:cover;height:280px}

    /* Features */
    .ct-features{padding:clamp(4rem,8vw,6.5rem) 24px}
    .ct-features-img-wrap{display:flex;justify-content:center;margin-bottom:clamp(2rem,4vw,3.5rem)}
    .ct-features-img{width:100%;max-width:640px;border-radius:20px;box-shadow:0 16px 48px rgba(26,58,42,0.1);object-fit:cover;height:300px}
    .ct-features-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(1rem,2vw,1.25rem)}
    .ct-feat-card{background:#fff;border:1px solid rgba(26,58,42,0.08);border-radius:18px;padding:clamp(1.25rem,2.5vw,1.625rem);box-shadow:0 1px 6px rgba(26,58,42,0.05);transition:all 0.2s}
    .ct-feat-card:hover{transform:translateY(-3px);box-shadow:0 10px 28px rgba(26,58,42,0.1)}
    .ct-feat-icon{width:46px;height:46px;border-radius:13px;background:rgba(26,58,42,0.07);display:flex;align-items:center;justify-content:center;color:#1a3a2a;margin-bottom:16px}
    .ct-feat-title{font-family:var(--font-playfair,Georgia,serif);font-size:17px;font-weight:700;color:#111827;margin-bottom:8px;letter-spacing:-0.015em}
    .ct-feat-body{font-size:14px;color:#6b7280;line-height:1.65}

    /* Reports */
    .ct-reports{background:#f7f5f0;padding:clamp(4rem,8vw,6.5rem) 24px}
    .ct-report-real-img{width:100%;border-radius:20px;box-shadow:0 20px 60px rgba(26,58,42,0.15);object-fit:cover}
    .ct-report-card{background:#1a3a2a;border-radius:20px;padding:28px;box-shadow:0 20px 60px rgba(26,58,42,0.2);border:1px solid rgba(255,255,255,0.05)}
    .ct-report-hd{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px}
    .ct-report-lbl{font-size:11px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.06em;font-weight:600;margin-bottom:3px}
    .ct-report-name{font-family:var(--font-playfair,Georgia,serif);font-size:18px;font-weight:800;color:#fff}
    .ct-report-row{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.06)}
    .ct-report-row:last-of-type{border:none}
    .ct-report-shared{margin-top:16px;padding:10px 14px;background:rgba(201,168,76,0.12);border-radius:10px;text-align:center;font-size:11px;color:#c9a84c;font-weight:700;letter-spacing:0.06em}

    /* Testimonials */
    .ct-testimonials{padding:clamp(4rem,8vw,6.5rem) 24px}
    .ct-t-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
    .ct-t-card{background:#fff;border:1px solid rgba(26,58,42,0.08);border-radius:20px;padding:28px;box-shadow:0 2px 12px rgba(26,58,42,0.05)}

    /* CTA */
    .ct-cta{position:relative;padding:clamp(5rem,12vw,9rem) 24px;text-align:center;overflow:hidden;background:linear-gradient(160deg,#0b1a12,#1a3a2a)}
    .ct-cta-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.25}
    .ct-cta-overlay{position:absolute;inset:0;background:linear-gradient(160deg,rgba(11,26,18,0.85),rgba(26,58,42,0.85))}
    .ct-cta-inner{position:relative;max-width:580px;margin:0 auto}
    .ct-cta-h2{font-family:var(--font-playfair,Georgia,serif);font-size:clamp(2rem,5vw,3.25rem);font-weight:700;color:#fff;margin-bottom:20px;letter-spacing:-0.03em;line-height:1.15}
    .ct-cta-sub{font-size:clamp(1rem,2vw,1.2rem);color:rgba(255,255,255,0.6);line-height:1.7;margin-bottom:40px}

    /* Footer */
    .ct-footer{background:#0b1a12;padding:clamp(2.5rem,5vw,4rem) 24px 24px}
    .ct-footer-grid{display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:2rem;margin-bottom:40px}
    .ct-footer-hd{font-size:11px;font-weight:700;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:14px}
    .ct-footer-link{display:block;font-size:14px;color:rgba(255,255,255,0.55);text-decoration:none;margin-bottom:8px;transition:color 0.15s;min-height:28px}
    .ct-footer-link:hover{color:#fff}

    /* ── Responsive ── */
    @media (max-width:1024px){
      .ct-features-grid{grid-template-columns:repeat(2,1fr)}
    }
    @media (max-width:768px){
      .ct-nav-desktop{display:none!important}
      .ct-hamburger{display:flex!important}

      .ct-hero-inner{grid-template-columns:1fr!important}
      .ct-hero-sub{max-width:100%}
      .ct-hero-br{display:none}
      .ct-hero-ctas{flex-direction:column;align-items:stretch}
      .ct-hero-ctas .ct-btn-primary,
      .ct-hero-ctas .ct-btn-ghost{width:100%;justify-content:center;height:52px}
      .ct-hero-img-col{margin-top:40px}
      .ct-hero-frame{max-width:240px;margin:0 auto}

      .ct-problem-inner{grid-template-columns:1fr!important}
      .ct-problem-img-wrap{margin-top:32px}
      .ct-problem-img{max-width:100%}

      .ct-steps-grid{grid-template-columns:1fr;gap:16px}
      .ct-features-grid{grid-template-columns:1fr}
      .ct-two-col{grid-template-columns:1fr!important}
      .ct-footer-grid{grid-template-columns:1fr!important;gap:24px!important}

      .ct-t-grid{display:flex!important;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;scrollbar-width:none;gap:16px;padding-bottom:8px}
      .ct-t-grid > *{min-width:84vw;scroll-snap-align:start;flex-shrink:0}

      .ct-h2{font-size:clamp(1.5rem,6vw,2rem)!important}
      .ct-hero-h1{font-size:clamp(2.2rem,9vw,2.8rem)!important}
    }

    @media (prefers-reduced-motion:reduce){
      *{animation:none!important;transition:none!important}
    }
  `}</style>
}