import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for Just The Recipe - How we handle your data",
};

export default function PrivacyPolicy() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="card-cozy p-8 md:p-12">
        <h1 className="text-3xl md:text-4xl font-black text-chocolate-900 mb-8">
          Privacy Policy
        </h1>

        <div className="prose prose-chocolate max-w-none">
          <p className="text-chocolate-600 mb-6">
            Last updated: February 12, 2026
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-chocolate-900 mb-4">
              Recipe Data & Ownership
            </h2>
            <p className="text-chocolate-700 mb-4">
              When you extract a recipe using our service, the extracted recipe
              data becomes the property of Just The Recipe. By using our
              service, you grant us a perpetual, irrevocable license to store,
              process, and use this recipe data as we see fit.
            </p>
            <p className="text-chocolate-700">
              We retain all extracted recipe content indefinitely for the
              purpose of improving our AI extraction models, building recipe
              databases, and enhancing our service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-chocolate-900 mb-4">
              AI & LLM Technology
            </h2>
            <p className="text-chocolate-700 mb-4">
              This service was created using various Large Language Models
              (LLMs) including Google Gemini, OpenRouter, and other AI
              technologies. Recipe extraction is performed using AI-powered
              content parsing.
            </p>
            <p className="text-chocolate-700">
              Content you submit may be processed by third-party AI services to
              extract structured recipe information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-chocolate-900 mb-4">
              Data We Collect
            </h2>
            <p className="text-chocolate-700 mb-4">
              We collect minimal data to operate and improve our service:
            </p>
            <ul className="list-disc list-inside text-chocolate-700 space-y-2 mb-4">
              <li>
                <strong>Basic Telemetry:</strong> Anonymous usage metrics, error
                logs, and performance data to help us improve the service.
              </li>
              <li>
                <strong>Extracted Recipes:</strong> All recipe content extracted
                through our service is stored and retained.
              </li>
              <li>
                <strong>IP Address:</strong> Temporarily logged for rate
                limiting purposes (10 requests per day per IP).
              </li>
            </ul>
            <p className="text-chocolate-700">
              We do <strong>not</strong> collect personal information such as
              names, email addresses, or account data. No user accounts are
              required to use this service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-chocolate-900 mb-4">
              Cookies & Advertising
            </h2>
            <p className="text-chocolate-700 mb-4">
              We use Google AdSense to display advertisements. Google may use
              cookies and similar technologies to serve personalized ads based
              on your visits to this and other websites.
            </p>
            <p className="text-chocolate-700">
              You can opt out of personalized advertising by visiting{" "}
              <a
                href="https://www.google.com/settings/ads"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline"
              >
                Google Ad Settings
              </a>
              .
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-chocolate-900 mb-4">
              Third-Party Services
            </h2>
            <p className="text-chocolate-700 mb-4">
              We use the following third-party services:
            </p>
            <ul className="list-disc list-inside text-chocolate-700 space-y-2">
              <li>Google AdSense (advertising)</li>
              <li>Google Gemini API (recipe extraction)</li>
              <li>OpenRouter (LLM gateway)</li>
              <li>Vercel (hosting and analytics)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-chocolate-900 mb-4">
              Contact
            </h2>
            <p className="text-chocolate-700">
              For privacy-related questions, please contact us through our{" "}
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
