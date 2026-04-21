import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { FloatingNav } from "@/components/floating-nav";
import { Providers } from "./providers";
import { RegisterSW } from "./register-sw";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.BASE_URL || 'http://localhost:3000';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "鱼蛋宝宝",
    template: "%s · 鱼蛋宝宝",
  },
  description: "记录生活的每一面，用小账本和成长日志沉淀日常、复盘成长。",
  manifest: "/manifest.json",
  keywords: ['记账', '成长日志', '个人博客', 'Telegram Bot', 'PWA'],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    siteName: '鱼蛋宝宝',
    title: '鱼蛋宝宝',
    description: '记录生活的每一面，用小账本和成长日志沉淀日常、复盘成长。',
    url: '/',
    images: [
      {
        url: '/logo.png',
        width: 512,
        height: 512,
        alt: '鱼蛋宝宝',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '鱼蛋宝宝',
    description: '记录生活的每一面，用小账本和成长日志沉淀日常、复盘成长。',
    images: ['/logo.png'],
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
  icons: {
    icon: "/logo.png",
    apple: "/apple-home-logo.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "鱼蛋宝宝",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#F7F8FA',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="bg-background min-h-screen antialiased">
        <Providers>
          <div className="flex flex-col min-h-screen">
            <main className="flex-1 pb-[calc(env(safe-area-inset-bottom)+80px)]">
              {children}
            </main>
          </div>
          <FloatingNav />
        </Providers>
        <RegisterSW />
      </body>
    </html>
  );
}
