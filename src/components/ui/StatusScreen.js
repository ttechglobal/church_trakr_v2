/**
 * Shared full-page notice used by 404 and error boundaries.
 * No hooks, so it works in both server and client components.
 *
 * `inline` = rendered inside the app shell (keeps sidebar/nav visible); otherwise it
 * fills the screen on the brand background like the login page.
 */
export default function StatusScreen({ code, title, message, children, inline = false }) {
  const card = (
    <div
      role="alert"
      style={{
        background: '#f7f5f0', borderRadius: 20, padding: '2rem 1.5rem', width: '100%', maxWidth: 400,
        textAlign: 'center', boxShadow: '0 20px 60px rgba(15,26,19,0.24)',
      }}
    >
      {code && (
        <p style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 44, fontWeight: 700, color: '#7a5c12', margin: 0, lineHeight: 1 }}>
          {code}
        </p>
      )}
      <h1 style={{ fontSize: 22, margin: code ? '0.75rem 0 0.5rem' : '0 0 0.5rem' }}>{title}</h1>
      <p style={{ fontSize: 15, color: '#4a5d51', margin: '0 0 1.5rem', lineHeight: 1.5 }}>{message}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </div>
  )

  if (inline) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 1rem' }}>{card}</div>
  }
  return (
    <div style={{ minHeight: '100dvh', background: '#1a3a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      {card}
    </div>
  )
}
