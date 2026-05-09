const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://churchtrakr.online'

export const metadata = {
  title: 'Church Trakr — Attendance & Follow-Up App for Church Groups',
  description:
    'Church Trakr (also searched as Church Tracker) helps Nigerian church groups track attendance, follow up on absentees, and send SMS — all from one simple app.',
  keywords:
    'church attendance tracker Nigeria, church follow up app, church tracker, church group management, attendance tracking app church, Nigerian church app, ChurchTracker',
  metadataBase: new URL(APP_URL),
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

export default function MarketingLayout({ children }) {
  return children
}