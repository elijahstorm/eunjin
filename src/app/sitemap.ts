/**
 * CODE INSIGHT
 * This code's use case is to generate a production-ready XML sitemap for crawlers.
 * It lists only public, crawlable routes (marketing/help/legal/auth/offline) and excludes private app segments.
 * Dynamic share or app pages are intentionally omitted since they require runtime data.
 */

import type { MetadataRoute } from 'next'

export const revalidate = 3600

function getBaseUrl() {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL
  if (!envUrl) return 'http://localhost:3000'
  const hasProtocol = envUrl.startsWith('http://') || envUrl.startsWith('https://')
  const base = hasProtocol ? envUrl : `https://${envUrl}`
  return base.replace(/\/$/, '')
}

const PUBLIC_PATHS = [
  '/',
  '/help',
  '/legal',
  '/legal/privacy',
  '/legal/terms',
  '/offline',
  '/auth/sign-in',
  '/auth/sign-up',
  '/auth/reset-password',
  '/auth/verify-email',
] as const

const pathMeta: Record<string, { changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }> = {
  '/': { changeFrequency: 'daily', priority: 1.0 },
  '/help': { changeFrequency: 'weekly', priority: 0.7 },
  '/legal': { changeFrequency: 'yearly', priority: 0.3 },
  '/legal/privacy': { changeFrequency: 'yearly', priority: 0.3 },
  '/legal/terms': { changeFrequency: 'yearly', priority: 0.3 },
  '/offline': { changeFrequency: 'yearly', priority: 0.2 },
  '/auth/sign-in': { changeFrequency: 'monthly', priority: 0.5 },
  '/auth/sign-up': { changeFrequency: 'monthly', priority: 0.6 },
  '/auth/reset-password': { changeFrequency: 'monthly', priority: 0.4 },
  '/auth/verify-email': { changeFrequency: 'monthly', priority: 0.4 },
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getBaseUrl()
  const now = new Date()

  return PUBLIC_PATHS.map((path) => {
    const meta = pathMeta[path] || { changeFrequency: 'monthly', priority: 0.5 }
    return {
      url: `${baseUrl}${path}`,
      lastModified: now,
      changeFrequency: meta.changeFrequency,
      priority: meta.priority,
    }
  })
}
