"use client";

/**
 * CODE INSIGHT
 * This code's use case is the global Root Layout for the entire Next.js app. It defines the HTML and BODY skeleton,
 * global metadata (SEO, OpenGraph, Twitter, PWA manifest), responsive viewport, theme bootstrapping to avoid FOUC,
 * and imports global styles. It intentionally avoids rendering any navigation chrome (header/footer/sidebar) because
 * group-specific sub-layouts handle those.
 */

import "./globals.css"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import Script from "next/script"
import { cn } from "@/utils/utils"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" })

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://poiima.app"
const APP_NAME = "poiima"
const APP_TITLE = "poiima — AI 스마트 튜터"
const APP_DESCRIPTION =
  "친근한 한국어 PWA AI 튜터: 문서 업로드 → 요약·퀴즈·대화형 QA, SRS 기반 학습 스케줄을 제공합니다."

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  applicationName: APP_NAME,
  title: {
    default: APP_TITLE,
    template: "%s | poiima",
  },
  description: APP_DESCRIPTION,
  keywords: [
    "poiima",
    "AI",
    "스마트 튜터",
    "요약",
    "퀴즈",
    "QA",
    "RAG",
    "SRS",
    "학습",
  ],
  authors: [{ name: "poiima" }],
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  alternates: {
    canonical: "/",
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png" }],
    shortcut: ["/favicon.ico"],
  },
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0B0F19" },
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
  ],
  formatDetection: { telephone: false, email: false, address: false },
  category: "education",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
  openGraph: {
    type: "website",
    url: APP_URL,
    siteName: APP_NAME,
    title: APP_TITLE,
    description: APP_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: APP_TITLE,
    description: APP_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0B0F19" },
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" dir="ltr" suppressHydrationWarning className={cn("h-full", inter.variable)}>
      <head />
      <body className={cn(
        "min-h-screen bg-background text-foreground antialiased",
        "selection:bg-primary selection:text-primary-foreground"
      )}>
        {/* Prevent theme flash by setting theme before React hydration */}
        <Script id="poiima-theme-init" strategy="beforeInteractive">{`(function(){try{var t=localStorage.getItem('poiima.theme');if(!t){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'};var d=document.documentElement;d.dataset.theme=t;if(t==='dark'){d.classList.add('dark')}else{d.classList.remove('dark')}}catch(e){}})();`}</Script>

        {/* Accessible skip link for keyboard users */}
        <a
          href="#__poiima_root"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
        >
          바로가기: 본문으로 건너뛰기
        </a>

        <div id="__poiima_root" className="flex min-h-screen flex-col">
          {children}
        </div>

        <noscript>
          <div className="fixed inset-x-0 bottom-0 z-50 m-4 rounded-md bg-destructive p-3 text-destructive-foreground shadow-lg">
            이 앱의 일부 기능은 자바스크립트를 필요로 합니다. 브라우저에서 자바스크립트를 활성화해주세요.
          </div>
        </noscript>
      </body>
    </html>
  )
}
