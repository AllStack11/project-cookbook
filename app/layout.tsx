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
        <div className="min-h-screen flex flex-col">
          <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-stone-100 print:hidden">
            <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-black tracking-tight text-stone-900 flex items-center gap-2">
                  <span className="bg-primary-500 text-white p-1.5 rounded-lg">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.5"
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      />
                    </svg>
                  </span>
                  JUST THE<span className="text-primary-600">RECIPE</span>
                </h1>
              </div>
            </div>
          </header>

          <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">{children}</main>

          <footer className="bg-white border-t border-stone-100 print:hidden">
            <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
              <p className="text-center text-sm text-stone-500 font-medium">
                &copy; {new Date().getFullYear()} Just The Recipe. Crafted for
                home chefs.
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
