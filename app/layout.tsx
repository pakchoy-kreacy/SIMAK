// ============================================================
// app/layout.tsx
// Root layout — font, metadata, QueryClient provider
// ============================================================

import type { Metadata, Viewport } from 'next'
import { Amiri, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const amiri = Amiri({
  subsets:  ['latin', 'arabic'],
  weight:   ['400', '700'],
  variable: '--font-amiri',
  display:  'swap',
})

const plusJakarta = Plus_Jakarta_Sans({
  subsets:  ['latin'],
  weight:   ['400', '500', '600', '700'],
  variable: '--font-plus-jakarta',
  display:  'swap',
})

export const metadata: Metadata = {
  title:       'SIMAK — Monitoring Akhlak & Karakter SDIT Al-Kautsar Muko-Muko',
  description: 'Aplikasi Monitoring Akhlak dan Karakter SDIT Al-Kautsar Muko-Muko',
  manifest:    '/manifest.json',
  icons: {
    icon: '/logo.png',
  },
  appleWebApp: {
    capable:       true,
    statusBarStyle: 'default',
    title:         'SIMAK',
  },
}

export const viewport: Viewport = {
  themeColor:       [{ media: '(prefers-color-scheme: light)', color: '#2D7A4F' }, { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' }],
  width:            'device-width',
  initialScale:     1,
  maximumScale:     5,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" className={`${amiri.variable} ${plusJakarta.variable}`} suppressHydrationWarning>
      <head>
        {/* Prevent FOUC — apply dark class before paint */}
        <script dangerouslySetInnerHTML={{
          __html: `
            try {
              const saved = localStorage.getItem('simak-dark-mode');
              const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              if (saved !== null ? saved === 'true' : prefersDark) {
                document.documentElement.classList.add('dark');
              }
            } catch(e) {}
          `
        }} />
      </head>
      <body className="font-body bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
