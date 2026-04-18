import { Playfair_Display, DM_Sans } from 'next/font/google'
import '../styles/globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
  weight: ['300', '400', '500', '600'],
})

export const metadata = {
  title: {
    default: 'ChurchTrakr',
    template: '%s · ChurchTrakr',
  },
  description: 'Attendance & member management for church groups',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ChurchTrakr',
  },
}

export const viewport = {
  themeColor:   '#1a3a2a',
  width:        'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable}`}>
      <head>
        {/* PWA manifest — explicit <link> is more reliable than metadata API */}
        <link rel="manifest" href="/manifest.json" />

        {/* Apple PWA */}
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="ChurchTrakr" />
      </head>
      <body>{children}</body>
    </html>
  )
}
