"use client";

import { useState, useEffect, useRef } from "react";
import InputForm from "./components/InputForm/InputForm";
import RecipeCard from "./components/RecipeCard/RecipeCard";
import LoadingState from "./components/LoadingState/LoadingState";
import ErrorDisplay from "./components/ErrorDisplay/ErrorDisplay";
import AdBanner from "./components/AdBanner/AdBanner";
import { Recipe } from "@/types/recipe";
import { ErrorCode } from "@/types/api";

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState<{
    message: string;
    code?: ErrorCode;
  } | null>(null);

  const loadingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Force scroll to top on refresh/load
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (isLoading && loadingRef.current) {
      // Add a 400ms delay to allow the button animation to complete
      const timeoutId = setTimeout(() => {
        if (loadingRef.current) {
          loadingRef.current.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }, 400);

      return () => clearTimeout(timeoutId);
    }
  }, [isLoading]);

  const handleSubmit = async (input: { url?: string; text?: string }) => {
    setIsLoading(true);
    setError(null);
    setRecipe(null);

    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      const data = await response.json();

      if (data.success) {
        // If it's a cache hit, add an artificial 5-second delay on the client side
        if (data.metadata?.cacheHit) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
        setRecipe(data.recipe);
      } else {
        setError({
          message: data.error || "Failed to extract recipe",
          code: data.errorCode,
        });
      }
    } catch (err) {
      setError({
        message: "Network error. Please check your connection and try again.",
        code: ErrorCode.NETWORK_ERROR,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setRecipe(null);
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-12 md:mb-20 print:hidden">
        {/* Floating kitchen elements - decorative */}
        <div className="relative inline-block mb-6 md:mb-8">
          <div className="absolute -left-16 -top-8 text-4xl md:text-5xl opacity-20 animate-float hidden md:block" style={{ animationDelay: "0s" }}>🥄</div>
          <div className="absolute -right-16 -top-4 text-3xl md:text-4xl opacity-20 animate-float hidden md:block" style={{ animationDelay: "0.5s" }}>🍴</div>
          <div className="absolute -left-12 top-16 text-2xl md:text-3xl opacity-15 animate-float hidden md:block" style={{ animationDelay: "1s" }}>🧂</div>
          <div className="absolute -right-10 top-20 text-2xl md:text-3xl opacity-15 animate-float hidden md:block" style={{ animationDelay: "1.5s" }}>🌿</div>

          {/* Main heading with warm gradient */}
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-chocolate-900 tracking-tight leading-[1.1]">
            Turn any video into a
            <br />
            <span className="text-gradient-warm relative">
              perfect recipe
              {/* Decorative underline */}
              <svg className="absolute -bottom-2 left-0 w-full h-3 text-primary-300/50" viewBox="0 0 200 12" preserveAspectRatio="none">
                <path d="M0,8 Q50,0 100,8 T200,8" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round"/>
              </svg>
            </span>
          </h2>
        </div>

        {/* Subheading */}
        <p className="text-lg md:text-xl text-chocolate-600 max-w-2xl mx-auto leading-relaxed mb-4">
          The cleanest way to extract recipes from YouTube, blogs, and social media.
        </p>

        {/* Trust badges */}
        <div className="flex flex-wrap items-center justify-center gap-3 md:gap-6 text-sm">
          <div className="flex items-center gap-2 text-chocolate-500">
            <div className="w-5 h-5 rounded-full bg-herb-100 flex items-center justify-center">
              <svg className="w-3 h-3 text-herb-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="font-medium">Always Free</span>
          </div>
          <div className="flex items-center gap-2 text-chocolate-500">
            <div className="w-5 h-5 rounded-full bg-herb-100 flex items-center justify-center">
              <svg className="w-3 h-3 text-herb-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="font-medium">No Signup</span>
          </div>
          <div className="flex items-center gap-2 text-chocolate-500">
            <div className="w-5 h-5 rounded-full bg-herb-100 flex items-center justify-center">
              <svg className="w-3 h-3 text-herb-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="font-medium">No Fluff</span>
          </div>
        </div>
      </div>

      {/* Input Form Section */}
      <div className="mb-12 md:mb-20 print:hidden">
        <InputForm onSubmit={handleSubmit} isLoading={isLoading} />
      </div>

      {/* Ad Banner (when not loading/showing content) */}
      {!isLoading && !recipe && !error && (
        <div className="mb-8 md:mb-12 print:hidden">
          <AdBanner slot="hero-bottom" />
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div ref={loadingRef} className="space-y-12 scroll-mt-24">
          <LoadingState />
          <div className="print:hidden">
            <AdBanner slot="loading-bottom" />
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <ErrorDisplay
          error={error.message}
          errorCode={error.code}
          onRetry={handleRetry}
        />
      )}

      {/* Recipe Card */}
      {recipe && <RecipeCard recipe={recipe} />}

      {/* Supported Sources Section */}
      {!isLoading && !error && !recipe && (
        <div className="mt-20 md:mt-32 print:hidden">
          <div className="max-w-5xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-12 md:mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-cream-100 rounded-full mb-4">
                <span className="text-xl">✨</span>
                <span className="text-sm font-bold text-chocolate-700 uppercase tracking-wider">Works Everywhere</span>
              </div>
              <h3 className="text-2xl md:text-3xl lg:text-4xl font-black text-chocolate-900 mb-4">
                Extract from Any Source
              </h3>
              <p className="text-chocolate-600 max-w-xl mx-auto">
                Paste a link and we'll handle the rest. Our AI understands content from all major platforms.
              </p>
            </div>

            {/* Source Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              {/* YouTube Card */}
              <div className="group card-cozy-hover p-8 text-center">
                <div className="relative inline-block mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-red-50 to-red-100 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform shadow-lg shadow-red-500/10">
                    🎥
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                  </div>
                </div>
                <h4 className="font-bold text-xl text-chocolate-900 mb-3">YouTube Videos</h4>
                <p className="text-chocolate-600 leading-relaxed">
                  Transform cooking video transcripts into perfectly formatted step-by-step instructions.
                </p>
              </div>

              {/* Food Blogs Card */}
              <div className="group card-cozy-hover p-8 text-center">
                <div className="relative inline-block mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform shadow-lg shadow-primary-500/10">
                    📝
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                    </svg>
                  </div>
                </div>
                <h4 className="font-bold text-xl text-chocolate-900 mb-3">Food Blogs</h4>
                <p className="text-chocolate-600 leading-relaxed">
                  Skip the life stories and endless scrolling. Get straight to the ingredients and instructions.
                </p>
              </div>

              {/* Social Media Card */}
              <div className="group card-cozy-hover p-8 text-center">
                <div className="relative inline-block mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-50 to-pink-100 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform shadow-lg shadow-purple-500/10">
                    📱
                  </div>
                  <div className="absolute -top-1 -right-1 flex -space-x-1">
                    <div className="w-5 h-5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full border-2 border-white" />
                    <div className="w-5 h-5 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full border-2 border-white" />
                  </div>
                </div>
                <h4 className="font-bold text-xl text-chocolate-900 mb-3">Social Media</h4>
                <p className="text-chocolate-600 leading-relaxed">
                  Extract recipes from Instagram, TikTok, and other platforms with just a link.
                </p>
              </div>
            </div>

            {/* Bottom CTA Section */}
            <div className="mt-16 md:mt-20 text-center">
              <div className="inline-flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-cream-100 to-cream-50 rounded-2xl border border-cream-200/50">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-lg border-2 border-white">👨‍🍳</div>
                  <div className="w-8 h-8 rounded-full bg-herb-100 flex items-center justify-center text-lg border-2 border-white">👩‍🍳</div>
                  <div className="w-8 h-8 rounded-full bg-cream-200 flex items-center justify-center text-lg border-2 border-white">🧑‍🍳</div>
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-chocolate-800">Join thousands of home chefs</p>
                  <p className="text-xs text-chocolate-500">Making cooking simpler, one recipe at a time</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
