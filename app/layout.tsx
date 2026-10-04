import type { Metadata, Viewport } from 'next'
import { Inter, Manrope, Unbounded } from 'next/font/google'
import { PwaRegister } from '@/components/pwa'
import { Analytics } from '@/components/analytics'
import { site } from '@/lib/site'
import './globals.css'

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
})

const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-manrope',
  display: 'swap',
})

const unbounded = Unbounded({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-display',
  weight: ['600', '700', '800', '900'],
  display: 'swap',
})

const title = 'ToLoto — игровой кабинет'
const description = 'Игровой кабинет, билеты, результаты и реферальные приглашения ToLoto. Платёжные операции обрабатываются вручную через Telegram.'

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
  colorScheme: 'dark',
  themeColor: '#2a0f4a',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" className={`bg-background ${inter.variable} ${manrope.variable} ${unbounded.variable}`}>
      <body className="bg-background font-sans antialiased">
        <aside aria-label="Статус платежей" className="border-b border-border bg-card px-4 py-3 text-center text-sm leading-relaxed text-foreground">Баланс игровой. Привязка карт, пополнение и вывод обрабатываются администратором вручную через Telegram-бота.</aside>
        {children}
        <PwaRegister />
        <Analytics />
      </body>
    </html>
  )
}
