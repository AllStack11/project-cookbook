import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Just The Recipe - Extract Recipes from Any Source",
  description:
    "Extract clean, structured recipes from YouTube videos, blog posts, and social media using AI-powered content parsing.",
  keywords: [
    "recipe",
    "cooking",
    "food",
    "just the recipe",
    "recipe extractor",
    "recipe parser",
  ],
  icons: {
    icon: "/favicon.svg",
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
                      <div className="w-1 h-2 bg-cream-400/60 rounded-full animate-steam" style={{ animationDelay: "0ms" }} />
                      <div className="w-1 h-2 bg-cream-400/60 rounded-full animate-steam" style={{ animationDelay: "200ms" }} />
                      <div className="w-1 h-2 bg-cream-400/60 rounded-full animate-steam" style={{ animationDelay: "400ms" }} />
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
                  <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-herb-50 border border-herb-200/50 rounded-full">
                    <div className="w-2 h-2 bg-herb-500 rounded-full animate-pulse" />
                    <span className="text-xs font-semibold text-herb-700">AI-Powered</span>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 py-8 md:py-12 px-4 sm:px-6 lg:px-8 relative z-10">
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
                    <p className="font-bold text-chocolate-800">Just The Recipe</p>
                    <p className="text-xs text-chocolate-500">Crafted for home chefs</p>
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
              <div className="mt-8 pt-6 border-t border-cream-200/50 flex items-center justify-center gap-2 text-chocolate-400">
                <span className="text-xs font-medium">Made with</span>
                <span className="text-primary-500">❤️</span>
                <span className="text-xs font-medium">for food lovers everywhere</span>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
