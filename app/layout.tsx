import type { Metadata, Viewport } from 'next'
import { Montserrat } from 'next/font/google'
import { PwaRegister } from '@/components/pwa'
import { Analytics } from '@/components/analytics'
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
  keywords: ['лотерея', 'промо-лотерея', 'Беларусь', 'моментальная лотерея', 'розыгрыш', 'бонус за регистрацию'],
  alternates: { canonical: '/' },
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
  robots: { index: false, follow: false },
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
        <Analytics />
      </body>
    </html>
  )
}
