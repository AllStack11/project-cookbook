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
    if (isLoading && loadingRef.current) {
      loadingRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16 print:hidden">
        <h2 className="text-5xl md:text-6xl font-black text-stone-900 mb-6 tracking-tight leading-[1.1]">
          Turn any video into a <br />
          <span className="text-primary-600">perfect recipe.</span>
        </h2>
        <p className="text-lg text-stone-500 max-w-2xl mx-auto leading-relaxed">
          The cleanest way to extract recipes from YouTube, blogs, and social
          media. Always free, no fluff, just the food.
        </p>
      </div>

      <div className="mb-20 print:hidden">
        <InputForm onSubmit={handleSubmit} isLoading={isLoading} />
      </div>

      {!isLoading && !recipe && !error && (
        <div className="mb-12 print:hidden">
          <AdBanner slot="hero-bottom" />
        </div>
      )}

      {isLoading && (
        <div ref={loadingRef} className="space-y-12 scroll-mt-24">
          <LoadingState />
          <div className="print:hidden">
            <AdBanner slot="loading-bottom" />
          </div>
        </div>
      )}

      {error && (
        <ErrorDisplay
          error={error.message}
          errorCode={error.code}
          onRetry={handleRetry}
        />
      )}

      {recipe && <RecipeCard recipe={recipe} />}

      {!isLoading && !error && !recipe && (
        <div className="mt-24 print:hidden">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-12">
              <h3 className="text-2xl font-bold text-stone-900">
                Supported Sources
              </h3>
              <div className="h-px flex-1 bg-stone-100 ml-8"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="card-modern group hover:border-primary-100">
                <div className="w-12 h-12 bg-stone-50 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:bg-primary-50 transition-colors">
                  🎥
                </div>
                <h4 className="font-bold text-stone-900 mb-2">YouTube</h4>
                <p className="text-sm text-stone-500 leading-relaxed">
                  Convert transcripts into perfectly formatted instructions.
                </p>
              </div>
              <div className="card-modern group hover:border-primary-100">
                <div className="w-12 h-12 bg-stone-50 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:bg-primary-50 transition-colors">
                  📝
                </div>
                <h4 className="font-bold text-stone-900 mb-2">Food Blogs</h4>
                <p className="text-sm text-stone-500 leading-relaxed">
                  Skip the life stories and go straight to the ingredients.
                </p>
              </div>
              <div className="card-modern group hover:border-primary-100">
                <div className="w-12 h-12 bg-stone-50 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:bg-primary-50 transition-colors">
                  📱
                </div>
                <h4 className="font-bold text-stone-900 mb-2">Social Media</h4>
                <p className="text-sm text-stone-500 leading-relaxed">
                  Extract recipes from Instagram, TikTok, and more.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
