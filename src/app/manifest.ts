import type { MetadataRoute } from "next";

/**
 * CODE INSIGHT
 * This code's use case is to provide the PWA Web App Manifest for the application.
 * It defines app identity, theme colors, icons, start URL, and helpful shortcuts
 * that deep-link into key app destinations. This route is consumed by browsers and
 * install surfaces; it should remain a lightweight, server-side manifest response
 * with no client logic or navigation rendering.
 */

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "실시간 회의·강의 요약 및 하이라이트 기반 요약 서비스",
    short_name: "라이브 요약",
    description:
      "브라우저에서 실시간 마이크 캡처·전사, 화자 분리, 하이라이트 동기화 및 자동 요약문서 생성까지 제공하는 회의/강의 생산성 서비스",
    lang: "ko-KR",
    dir: "ltr",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0f19",
    theme_color: "#0ea5e9",
    categories: ["productivity", "business", "education", "utilities", "communications"],
    icons: [
      { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-256x256.png", sizes: "256x256", type: "image/png", purpose: "any" },
      { src: "/icons/icon-384x384.png", sizes: "384x384", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ],
    shortcuts: [
      {
        name: "대시보드",
        short_name: "대시보드",
        description: "최근 세션과 진행 중 상태 보기",
        url: "/dashboard",
        icons: [{ src: "/icons/shortcut-dashboard.png", sizes: "96x96", type: "image/png" }]
      },
      {
        name: "새 세션 시작",
        short_name: "새 세션",
        description: "회의/강의 실시간 전사 세션 생성",
        url: "/sessions/new",
        icons: [{ src: "/icons/shortcut-new-session.png", sizes: "96x96", type: "image/png" }]
      },
      {
        name: "녹음 업로드",
        short_name: "업로드",
        description: "기존 녹음 파일을 업로드하여 전사/요약 처리",
        url: "/ingest/upload",
        icons: [{ src: "/icons/shortcut-upload.png", sizes: "96x96", type: "image/png" }]
      },
      {
        name: "Zoom 연동",
        short_name: "Zoom",
        description: "Zoom 계정 연동 및 녹음 가져오기",
        url: "/integrations/zoom",
        icons: [{ src: "/icons/shortcut-zoom.png", sizes: "96x96", type: "image/png" }]
      },
      {
        name: "Teams 연동",
        short_name: "Teams",
        description: "Microsoft Teams 계정 연동 및 녹음 가져오기",
        url: "/integrations/teams",
        icons: [{ src: "/icons/shortcut-teams.png", sizes: "96x96", type: "image/png" }]
      },
      {
        name: "내 프로필",
        short_name: "프로필",
        description: "계정/알림/디바이스 설정",
        url: "/settings/profile",
        icons: [{ src: "/icons/shortcut-profile.png", sizes: "96x96", type: "image/png" }]
      },
      {
        name: "도움말",
        short_name: "도움말",
        description: "문서와 자주 묻는 질문",
        url: "/help",
        icons: [{ src: "/icons/shortcut-help.png", sizes: "96x96", type: "image/png" }]
      },
      {
        name: "오프라인 페이지",
        short_name: "오프라인",
        description: "네트워크 끊김 시 사용 안내",
        url: "/offline",
        icons: [{ src: "/icons/shortcut-offline.png", sizes: "96x96", type: "image/png" }]
      },
      {
        name: "개인정보처리방침",
        short_name: "Privacy",
        description: "개인정보 및 데이터 처리 정책",
        url: "/legal/privacy",
        icons: [{ src: "/icons/shortcut-privacy.png", sizes: "96x96", type: "image/png" }]
      },
      {
        name: "서비스 이용약관",
        short_name: "Terms",
        description: "서비스 이용약관",
        url: "/legal/terms",
        icons: [{ src: "/icons/shortcut-terms.png", sizes: "96x96", type: "image/png" }]
      }
    ]
  };
}
