import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for Just The Recipe",
};

export default function TermsOfService() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="card-cozy p-8 md:p-12">
        <h1 className="text-3xl md:text-4xl font-black text-chocolate-900 mb-8">
          Terms of Service
        </h1>

        <div className="prose prose-chocolate max-w-none">
          <p className="text-chocolate-600 mb-6">
            Last updated: February 12, 2026
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-chocolate-900 mb-4">
              Acceptance of Terms
            </h2>
            <p className="text-chocolate-700">
              By accessing or using Just The Recipe, you agree to be bound by
              these Terms of Service. If you do not agree to these terms, please
              do not use our service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-chocolate-900 mb-4">
              Recipe Data Ownership
            </h2>
            <p className="text-chocolate-700 mb-4">
              When you use our service to extract recipes from URLs or text, you
              acknowledge and agree that:
            </p>
            <ul className="list-disc list-inside text-chocolate-700 space-y-2 mb-4">
              <li>
                All extracted recipe data becomes the property of Just The
                Recipe upon extraction.
              </li>
              <li>
                We retain a perpetual, irrevocable license to use, store,
                modify, and distribute this recipe data for any purpose.
              </li>
              <li>
                This includes using extracted recipes to improve our AI models,
                create recipe databases, and enhance our service offerings.
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-chocolate-900 mb-4">
              Use of Service
            </h2>
            <p className="text-chocolate-700 mb-4">
              You agree to use our service only for lawful purposes. You may
              not:
            </p>
            <ul className="list-disc list-inside text-chocolate-700 space-y-2 mb-4">
              <li>
                Use the service to extract content you do not have permission to
                access
              </li>
              <li>Attempt to circumvent rate limits or abuse the service</li>
              <li>Use automated tools to scrape or bulk-extract recipes</li>
              <li>
                Submit malicious URLs or content designed to harm our systems
              </li>
            </ul>
            <p className="text-chocolate-700">
              We reserve the right to block or limit access to users who violate
              these terms or exceed reasonable usage limits (currently 10
              extractions per day per IP).
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-chocolate-900 mb-4">
              AI-Generated Content
            </h2>
            <p className="text-chocolate-700 mb-4">
              This service was created using various Large Language Models
              (LLMs) and AI technologies. Recipe extraction is performed using
              AI-powered content parsing which may not always be 100% accurate.
            </p>
            <p className="text-chocolate-700">
              You acknowledge that extracted recipes may contain errors or
              inaccuracies. Always verify ingredients, measurements, and cooking
              instructions before preparing any recipe.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-chocolate-900 mb-4">
              Disclaimer of Warranties
            </h2>
            <p className="text-chocolate-700">
              This service is provided "as is" without any warranties. We do not
              guarantee that the service will be uninterrupted, error-free, or
              that extracted recipes will be accurate or complete. Use extracted
              recipes at your own risk.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-chocolate-900 mb-4">
              Limitation of Liability
            </h2>
            <p className="text-chocolate-700">
              Just The Recipe shall not be liable for any damages arising from
              your use of the service, including but not limited to: food safety
              issues, allergic reactions, or any other consequences from
              following extracted recipes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-chocolate-900 mb-4">
              Changes to Terms
            </h2>
            <p className="text-chocolate-700">
              We may update these terms at any time. Continued use of the
              service after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-chocolate-900 mb-4">
              Contact
            </h2>
            <p className="text-chocolate-700">
              For questions about these terms, please contact us through our{" "}
              <Link href="/" className="text-primary-600 hover:underline">
                contact form
              </Link>
              .
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-cream-200">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
