import type { MetadataRoute } from 'next'

/**
 * CODE INSIGHT
 * This code's use case is to provide a production-ready robots.txt metadata route for SEO and crawler directives.
 * It sets allow/disallow rules for public vs. private app paths, and links to the generated sitemap and site host.
 */

function normalizeSiteUrl(): string {
  let url =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    'http://localhost:3000'

  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`
  }
  return url.replace(/\/$/, '')
}

const siteUrl = normalizeSiteUrl()

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/help',
          '/legal',
          '/legal/privacy',
          '/legal/terms',
          '/offline',
          '/manifest.webmanifest',
        ],
        disallow: [
          // API & internal
          '/api',
          '/_next',

          // Auth and user-specific areas
          '/auth',
          '/dashboard',
          '/onboarding',
          '/sessions',
          '/ingest',
          '/imports',
          '/integrations',
          '/consent',
          '/org',
          '/me',
          '/settings',
          '/admin',

          // Sharing and content pages that should generally not be indexed
          '/share/',
          '/c/',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
