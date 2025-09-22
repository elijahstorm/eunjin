/**
 * CODE INSIGHT
 * This code's use case is to define the Web App Manifest for the poiima PWA. It sets app name, description, colors, icons, start_url, display mode, categories, and useful shortcuts. This file is consumed by the browser and referenced by the root layout metadata, and contains no UI.
 */

import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/manifest.webmanifest',
    name: 'poiima — AI 스마트 튜터',
    short_name: 'poiima',
    description:
      'poiima는 사용자가 PDF/DOCX/PPTX/TXT/이미지(스캔) 파일을 업로드하면 자동으로 요약을 제공하고 핵심 기반 퀴즈를 생성하며 문서 기반 대화형 질의응답을 지원하는 한국어 전용 AI 스마트 튜터입니다. SRS(예: SM-2) 기반 복습 일정과 오답 기반 맞춤퀴즈로 학습 효율을 높입니다.',
    lang: 'ko-KR',
    dir: 'ltr',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'browser'],
    orientation: 'portrait-primary',
    theme_color: '#4F46E5',
    background_color: '#0B1220',
    categories: ['education', 'productivity', 'utilities'],
    prefer_related_applications: false,
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icons/icon-256x256.png',
        sizes: '256x256',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icons/icon-384x384.png',
        sizes: '384x384',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icons/maskable-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/icons/maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/icons/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any'
      }
    ],
    screenshots: [
      {
        src: '/screenshots/dashboard-portrait.png',
        sizes: '1080x1920',
        type: 'image/png',
        form_factor: 'narrow',
        label: '대시보드 — 진행 상황과 추천 학습'
      },
      {
        src: '/screenshots/upload-portrait.png',
        sizes: '1080x1920',
        type: 'image/png',
        form_factor: 'narrow',
        label: '업로드 — 파일 드래그·드롭 및 진행 상태'
      }
    ],
    shortcuts: [
      {
        name: '업로드',
        short_name: '업로드',
        description: '새 학습자료를 업로드하고 분석을 시작합니다.',
        url: '/upload',
        icons: [
          {
            src: '/icons/shortcut-upload.png',
            sizes: '192x192',
            type: 'image/png'
          }
        ]
      },
      {
        name: '적응형 퀴즈',
        short_name: '퀴즈',
        description: '오답 기반 맞춤 퀴즈를 바로 시작합니다.',
        url: '/quizzes/adaptive',
        icons: [
          {
            src: '/icons/shortcut-quiz.png',
            sizes: '192x192',
            type: 'image/png'
          }
        ]
      },
      {
        name: '복습 세션',
        short_name: '복습',
        description: 'SRS 일정에 맞춰 오늘의 복습을 진행합니다.',
        url: '/reviews/session',
        icons: [
          {
            src: '/icons/shortcut-review.png',
            sizes: '192x192',
            type: 'image/png'
          }
        ]
      }
    ]
  }
}
