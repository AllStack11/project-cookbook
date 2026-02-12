"use client";

import { useState, useRef, useEffect } from "react";

interface InputFormProps {
  onSubmit: (input: { url?: string; text?: string }) => void;
  isLoading: boolean;
}

export default function InputForm({ onSubmit, isLoading }: InputFormProps) {
  const [inputType, setInputType] = useState<"url" | "text">("url");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Trigger substantial click animation
    setIsAnimating(true);
    if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
    animationTimeoutRef.current = setTimeout(() => setIsAnimating(false), 600);

    if (inputType === "url") {
      if (!url.trim()) {
        setError("Please enter a URL");
        return;
      }
      onSubmit({ url: url.trim() });
    } else {
      if (!text.trim()) {
        setError("Please enter some text");
        return;
      }
      onSubmit({ text: text.trim() });
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="card-cozy p-2 md:p-3 relative overflow-hidden">
        {/* Decorative corner accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary-100/40 to-transparent rounded-bl-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-herb-100/30 to-transparent rounded-tr-[80px] pointer-events-none" />

        <div className="relative">
          {/* Tab Switcher */}
          <div className="flex p-1.5 bg-cream-100/80 rounded-2xl mb-4 md:mb-6">
            <button
              type="button"
              onClick={() => setInputType("url")}
              className={`flex-1 flex items-center justify-center gap-2.5 py-3 md:py-3.5 px-4 rounded-xl text-sm font-bold transition-all duration-200 ${
                inputType === "url"
                  ? "bg-white text-chocolate-900 shadow-warm-sm"
                  : "text-chocolate-500 hover:text-chocolate-700 hover:bg-cream-50"
              }`}
            >
              <svg
                className="w-4.5 h-4.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
              <span>Paste URL</span>
            </button>
            <button
              type="button"
              onClick={() => setInputType("text")}
              className={`flex-1 flex items-center justify-center gap-2.5 py-3 md:py-3.5 px-4 rounded-xl text-sm font-bold transition-all duration-200 ${
                inputType === "text"
                  ? "bg-white text-chocolate-900 shadow-warm-sm"
                  : "text-chocolate-500 hover:text-chocolate-700 hover:bg-cream-50"
              }`}
            >
              <svg
                className="w-4.5 h-4.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span>Paste Text</span>
            </button>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="px-3 md:px-5 pb-4 md:pb-6 pt-1"
          >
            {inputType === "url" ? (
              <div className="mb-5 md:mb-6">
                <div className="relative group">
                  {/* Input field */}
                  <label htmlFor="url" className="sr-only">Recipe URL</label>
                  <input
                    type="url"
                    id="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Paste a YouTube link, blog URL, or recipe page..."
                    className="input-cozy text-base pr-12"
                    disabled={isLoading}
                  />
                  {/* Icon indicator */}
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                    <span className={`transition-all duration-200 ${url ? 'text-primary-500 scale-100' : 'text-cream-400 scale-90'}`}>
                      {url ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      )}
                    </span>
                  </div>
                </div>
                {/* Helper text */}
                <p className="mt-2 text-xs text-chocolate-400 font-medium pl-1">
                  Supports YouTube, Instagram, TikTok, food blogs, and more
                </p>
              </div>
            ) : (
              <div className="mb-5 md:mb-6">
                <label htmlFor="text" className="sr-only">Recipe text</label>
                <textarea
                  id="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste the recipe content here... We'll format it beautifully for you."
                  rows={6}
                  className="input-cozy text-base resize-none"
                  disabled={isLoading}
                />
                {/* Helper text */}
                <p className="mt-2 text-xs text-chocolate-400 font-medium pl-1">
                  Paste any recipe text and we'll structure it for you
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-5 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700 text-sm font-semibold flex items-center gap-3 animate-fade-in">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`btn-primary w-full flex items-center justify-center gap-3 text-base group ${
                isAnimating ? "animate-click-substantial" : ""
              }`}
            >
              {isAnimating && <div className="shimmer-effect" />}
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>Extracting Recipe...</span>
                </>
              ) : (
                <>
                  <span className="text-xl">🍳</span>
                  <span>Extract Recipe</span>
                  <svg
                    className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
