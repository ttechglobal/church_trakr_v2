/**
 * GET /sitemap.xml
 * Dynamically generated sitemap for SEO.
 */
export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://churchtrakr.com'

  const pages = [
    { url: '/',       priority: '1.0', changefreq: 'weekly'  },
    { url: '/login',  priority: '0.8', changefreq: 'monthly' },
    { url: '/signup', priority: '0.9', changefreq: 'monthly' },
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url>
    <loc>${baseUrl}${p.url}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
</urlset>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  })
}
