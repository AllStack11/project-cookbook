'use client';

import { useState } from 'react';
import InputForm from './components/InputForm/InputForm';
import RecipeCard from './components/RecipeCard/RecipeCard';
import LoadingState from './components/LoadingState/LoadingState';
import ErrorDisplay from './components/ErrorDisplay/ErrorDisplay';
import { Recipe } from '@/types/recipe';
import { ErrorCode } from '@/types/api';

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState<{ message: string; code?: ErrorCode } | null>(null);

  const handleSubmit = async (input: { url?: string; text?: string }) => {
    setIsLoading(true);
    setError(null);
    setRecipe(null);

    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      const data = await response.json();

      if (data.success) {
        setRecipe(data.recipe);
      } else {
        setError({
          message: data.error || 'Failed to extract recipe',
          code: data.errorCode,
        });
      }
    } catch (err) {
      setError({
        message: 'Network error. Please check your connection and try again.',
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
      <div className="text-center mb-8 print:hidden">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">
          Extract Recipes from Anywhere
        </h2>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Paste a URL from YouTube, a blog, or social media, or paste recipe text directly.
          We'll extract it into a clean, structured format.
        </p>
      </div>

      <div className="mb-8 print:hidden">
        <InputForm onSubmit={handleSubmit} isLoading={isLoading} />
      </div>

      {isLoading && <LoadingState />}

      {error && (
        <ErrorDisplay
          error={error.message}
          errorCode={error.code}
          onRetry={handleRetry}
        />
      )}

      {recipe && <RecipeCard recipe={recipe} />}

      {!isLoading && !error && !recipe && (
        <div className="text-center text-gray-500 mt-12 print:hidden">
          <div className="max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold mb-4">Supported Sources</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="text-3xl mb-2">🎥</div>
                <h4 className="font-semibold mb-2">YouTube</h4>
                <p className="text-sm text-gray-600">Extract recipes from cooking videos with transcripts</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="text-3xl mb-2">📝</div>
                <h4 className="font-semibold mb-2">Blogs</h4>
                <p className="text-sm text-gray-600">Get clean recipes from food blogs and websites</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="text-3xl mb-2">📱</div>
                <h4 className="font-semibold mb-2">Social Media</h4>
                <p className="text-sm text-gray-600">Extract from Instagram, TikTok, and more</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
