/**
 * CODE INSIGHT
 * This code's use case is to provide the global Root Layout for the Next.js app. It defines global metadata,
 * PWA essentials (manifest/robots/sitemap), and renders a minimal public header/footer. It defers authenticated
 * shells and complex navigation to nested layouts under (app)/. This file must include <html> and <body>, and
 * import global styles via ./globals.css.
 */

import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: '실시간 회의·강의 요약 서비스',
    template: '%s · 실시간 요약 서비스',
  },
  description:
    '브라우저 실시간 전사, 화자 분리, 하이라이트 기록, 자동 요약문서 생성까지 — 회의·강의 기록을 빠르고 정확하게.',
  applicationName: '실시간 회의·강의 요약 서비스',
  manifest: '/manifest.webmanifest',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: siteUrl,
    title: '실시간 회의·강의 요약 서비스',
    description:
      '실시간 전사, 화자 분리, 하이라이트, 자동 요약까지 한 번에. 회의록 작성 시간을 단축하세요.',
    siteName: '실시간 회의·강의 요약 서비스',
  },
  twitter: {
    card: 'summary_large_image',
    title: '실시간 회의·강의 요약 서비스',
    description:
      '실시간 전사 + 하이라이트 기반 요약. Supabase 백엔드 기반의 안전한 서비스.',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#0ea5e9',
  width: 'device-width',
  initialScale: 1,
}

function RootLayoutInner({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="sitemap" type="application/xml" href="/sitemap.xml" />
        <meta name="robots" content="index,follow" />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground shadow"
        >
          본문으로 건너뛰기
        </a>

        {children}
      </body>
    </html>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<main className="w-full"><div className="mx-auto max-w-2xl px-4 py-10 sm:py-14"><Skeleton className="h-10 w-full" /><Skeleton className="h-5 w-1/3" /></div></main>}>
      <RootLayoutInner>
        {children}
      </RootLayoutInner>
    </Suspense>
  );
}
