import type { Metadata, Viewport } from 'next'
import { Montserrat } from 'next/font/google'
import { PwaRegister } from '@/components/pwa'
import { Analytics } from '@/components/analytics'
import { StaleDeploymentGuard } from '@/components/stale-deployment-guard'
import { VisitTracker } from '@/components/visit-tracker'
import { site } from '@/lib/site'
import './globals.css'

const montserrat = Montserrat({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-montserrat',
  display: 'swap',
})

const title = site.title
const description = site.description

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title,
  description,
  applicationName: site.name,
  generator: undefined,
  category: 'entertainment',
  creator: site.name,
  publisher: site.name,
  keywords: [
    'моментальная лотерея',
    'лотерея онлайн',
    'лотерея Беларусь',
    'промо-лотерея',
    'моментальные билеты',
    'скретч-карта онлайн',
    'plinko',
    'колесо фортуны',
    'бонус за регистрацию',
    'розыгрыш призов',
    site.name,
  ],
  alternates: { canonical: '/' },
  verification: {
    yandex: '567c25a7aef880b6',
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
  },
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: site.url,
    siteName: site.name,
    title,
    description,
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
  appleWebApp: {
    capable: true,
    title: site.name,
    statusBarStyle: 'black-translucent',
  },
  formatDetection: { telephone: false },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'light',
  themeColor: '#ffffff',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" className={`bg-background ${montserrat.variable}`}>
      <body className="bg-background font-sans antialiased">
        {children}
        <PwaRegister />
        <StaleDeploymentGuard />
        <Analytics />
        <VisitTracker />
      </body>
    </html>
  )
}
