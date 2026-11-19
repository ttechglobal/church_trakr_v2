'use client'

// Last-resort boundary: replaces the root layout, so it must render its own <html>/<body>
// and cannot rely on global CSS or fonts.
export default function GlobalError({ reset }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: '100vh', background: '#1a3a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        <div role="alert" style={{ background: '#f7f5f0', borderRadius: 20, padding: '2rem 1.5rem', maxWidth: 400, width: '100%', textAlign: 'center' }}>
          <h1 style={{ margin: '0 0 8px', fontSize: 22, color: '#1a3a2a' }}>Something went wrong</h1>
          <p style={{ margin: '0 0 20px', fontSize: 15, color: '#4a5d51', lineHeight: 1.5 }}>
            ChurchTrakr hit an unexpected problem. Please try again.
          </p>
          <button type="button" onClick={reset}
            style={{ minHeight: 44, padding: '0 24px', borderRadius: 12, border: 'none', background: '#1a3a2a', color: '#ede9e0', fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
