import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Recipe Extractor - Extract Recipes from Any Source',
  description: 'Extract clean, structured recipes from YouTube videos, blog posts, and social media using AI-powered content parsing.',
  keywords: ['recipe', 'cooking', 'food', 'recipe extractor', 'recipe parser'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex flex-col">
          <header className="bg-white shadow-sm print:hidden">
            <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
              <h1 className="text-2xl font-bold text-primary-600">Recipe Extractor</h1>
              <p className="text-sm text-gray-600">Extract recipes from YouTube, blogs, and more</p>
            </div>
          </header>

          <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
            {children}
          </main>

          <footer className="bg-white border-t print:hidden">
            <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
              <p className="text-center text-sm text-gray-500">
                &copy; {new Date().getFullYear()} Recipe Extractor. Built with Next.js and Claude AI.
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}
