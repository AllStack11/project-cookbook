import type { Metadata } from "next";
import Script from "next/script";
import AiStatusIndicator from "./components/AiStatusIndicator";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Just The Recipe - Extract Recipes from Any Source",
    template: "%s | Just The Recipe",
  },
  description:
    "Extract clean, structured recipes from YouTube videos, blog posts, and social media using AI-powered content parsing. No signup required.",
  keywords: [
    "recipe extractor",
    "recipe parser",
    "YouTube recipe",
    "cooking",
    "food",
    "just the recipe",
    "AI recipe",
    "recipe from video",
  ],
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://justtherecipe.app"
  ),
  openGraph: {
    title: "Just The Recipe - Extract Recipes from Any Source",
    description:
      "The cleanest way to extract recipes from YouTube, blogs, and social media. Powered by AI.",
    url: "/",
    siteName: "Just The Recipe",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Just The Recipe - AI-Powered Recipe Extraction",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Just The Recipe - Extract Recipes from Any Source",
    description:
      "The cleanest way to extract recipes from YouTube, blogs, and social media.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large" as const,
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.svg",
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {/* Skip navigation link for keyboard/screen reader users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-lg focus:font-semibold focus:shadow-lg"
        >
          Skip to main content
        </a>
        {process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
        <div className="min-h-screen flex flex-col relative">
          {/* Subtle background pattern */}
          <div className="fixed inset-0 pattern-kitchen pointer-events-none opacity-40" />

          {/* Warm gradient orbs for ambient lighting effect */}
          <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-primary-200/20 rounded-full blur-[120px] pointer-events-none" />
          <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-herb-200/15 rounded-full blur-[100px] pointer-events-none" />

          <header className="glass sticky top-0 z-50 print:hidden">
            <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between">
                <a href="/" className="flex items-center gap-3 group">
                  {/* Logo icon */}
                  <div className="relative">
                    <div className="bg-gradient-to-br from-primary-500 to-primary-600 text-white p-2.5 rounded-xl shadow-lg shadow-primary-500/20 group-hover:shadow-primary-500/30 transition-all group-hover:scale-105">
                      <svg
                        className="w-5 h-5 sm:w-6 sm:h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                        />
                      </svg>
                    </div>
                    {/* Steam effect */}
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div
                        className="w-1 h-2 bg-cream-400/60 rounded-full animate-steam"
                        style={{ animationDelay: "0ms" }}
                      />
                      <div
                        className="w-1 h-2 bg-cream-400/60 rounded-full animate-steam"
                        style={{ animationDelay: "200ms" }}
                      />
                      <div
                        className="w-1 h-2 bg-cream-400/60 rounded-full animate-steam"
                        style={{ animationDelay: "400ms" }}
                      />
                    </div>
                  </div>

                  {/* Logo text */}
                  <div className="flex flex-col">
                    <h1 className="text-lg sm:text-xl font-black tracking-tight text-chocolate-900 leading-none">
                      JUST THE
                      <span className="text-gradient-warm ml-1">RECIPE</span>
                    </h1>
                    <span className="text-[10px] sm:text-xs text-chocolate-500 font-medium tracking-wide hidden sm:block">
                      No fluff, just food
                    </span>
                  </div>
                </a>

                {/* Optional navigation placeholder for future */}
                <div className="flex items-center gap-2">
                  {/* AI status moved to footer */}
                </div>
              </div>
            </div>
          </header>

          <main id="main-content" className="flex-1 py-8 md:py-12 px-4 sm:px-6 lg:px-8 relative z-10">
            {children}
          </main>

          <footer className="relative z-10 bg-gradient-to-t from-cream-100 to-transparent border-t border-cream-200/50 print:hidden">
            <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 sm:px-6 lg:px-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                {/* Footer brand */}
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-primary-500 to-primary-600 text-white p-2 rounded-lg">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-chocolate-800">
                      Just The Recipe
                    </p>
                    <p className="text-xs text-chocolate-500">
                      Crafted for home chefs
                    </p>
                  </div>
                </div>

                {/* Decorative kitchen icons */}
                <div className="flex items-center gap-4 text-2xl opacity-30">
                  <span>🍳</span>
                  <span>🥘</span>
                  <span>🍰</span>
                  <span>🥗</span>
                  <span>🍜</span>
                </div>

                {/* Copyright */}
                <p className="text-sm text-chocolate-500 font-medium">
                  &copy; {new Date().getFullYear()} All rights reserved
                </p>
              </div>

              {/* Subtle divider with kitchen utensil pattern */}
              <div className="mt-8 pt-6 border-t border-cream-200/50 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-chocolate-400">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">Made with</span>
                  <span className="text-primary-500">❤️</span>
                  <span className="text-xs font-medium">
                    for food lovers everywhere
                  </span>
                </div>
                <div className="hidden sm:block w-1 h-1 bg-cream-300 rounded-full" />
                <AiStatusIndicator />
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
