"use client";

import { useState } from "react";
import Image from "next/image";
import { Recipe } from "@/types/recipe";
import { formatMinutes } from "@/lib/utils/timeFormatter";
import AdBanner from "../AdBanner/AdBanner";
import SourceBadge from "../SourceBadge/SourceBadge";

interface RecipeCardProps {
  recipe: Recipe;
}

export default function RecipeCard({ recipe }: RecipeCardProps) {
  const [viewMode, setViewMode] = useState<"columns" | "document">("columns");
  const [currentServings, setCurrentServings] = useState(recipe.servings || 4);
  const [copySuccess, setCopySuccess] = useState(false);
  const originalServings = recipe.servings || 4;

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = async () => {
    const recipeText = formatRecipeAsText(recipe);
    await navigator.clipboard.writeText(recipeText);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  const adjustServings = (delta: number) => {
    setCurrentServings((prev) => Math.max(1, prev + delta));
  };

  const scaleIngredient = (ingredient: (typeof recipe.ingredients)[0]) => {
    if (!ingredient.amount) return ingredient;

    const ratio = currentServings / originalServings;
    const originalAmount = parseFloat(ingredient.amount);

    if (isNaN(originalAmount)) {
      return ingredient;
    }

    const scaledAmount = originalAmount * ratio;

    // Handle fractions nicely
    let displayAmount: string;
    if (scaledAmount % 1 === 0) {
      displayAmount = scaledAmount.toString();
    } else if (scaledAmount < 1) {
      // Convert to fractions for small amounts
      const fraction = scaledAmount;
      if (Math.abs(fraction - 0.25) < 0.05) displayAmount = "¼";
      else if (Math.abs(fraction - 0.33) < 0.05) displayAmount = "⅓";
      else if (Math.abs(fraction - 0.5) < 0.05) displayAmount = "½";
      else if (Math.abs(fraction - 0.67) < 0.05) displayAmount = "⅔";
      else if (Math.abs(fraction - 0.75) < 0.05) displayAmount = "¾";
      else displayAmount = scaledAmount.toFixed(2);
    } else {
      // For larger amounts, round to reasonable precision
      displayAmount =
        scaledAmount % 1 < 0.1 || scaledAmount % 1 > 0.9
          ? Math.round(scaledAmount).toString()
          : scaledAmount.toFixed(1);
    }

    return {
      ...ingredient,
      amount: displayAmount,
    };
  };

  const scaledIngredients = recipe.ingredients.map(scaleIngredient);

  return (
    <div className="w-full max-w-4xl mx-auto card-cozy overflow-hidden print:shadow-none print:border-none animate-fade-in-up">
      {/* Recipe Header/Banner */}
      <div className="bg-gradient-to-br from-chocolate-800 via-chocolate-900 to-chocolate-900 text-white relative overflow-hidden">
        {/* Background image with overlay */}
        {recipe.imageUrl && (
          <div className="absolute inset-0 z-0">
            <Image
              src={recipe.imageUrl}
              alt={recipe.title}
              fill
              className="object-cover opacity-30"
              sizes="(max-width: 896px) 100vw, 896px"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-chocolate-900 via-chocolate-900/70 to-chocolate-900/50" />
          </div>
        )}

        {/* Decorative pattern overlay */}
        <div className="absolute inset-0 opacity-5 pattern-kitchen pointer-events-none" />

        {/* Decorative corner element */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary-500/10 to-transparent rounded-bl-full pointer-events-none hidden md:block" />

        <div className="relative z-10 p-6 md:p-10 lg:p-12">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            <div className="flex-1 w-full">
              {/* Title */}
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight mb-4 leading-tight">
                {recipe.title}
              </h2>

              {/* Description */}
              {recipe.description && (
                <p className="text-cream-300 text-base md:text-lg leading-relaxed max-w-2xl font-medium mb-5">
                  {recipe.description}
                </p>
              )}

              {/* Source badge */}
              {recipe.sourcePlatform && (
                <SourceBadge
                  sourcePlatform={recipe.sourcePlatform}
                  className="bg-white/10 backdrop-blur-md border-white/20 text-white"
                />
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-row md:flex-col gap-3 w-full md:w-auto print:hidden">
              <button
                onClick={handlePrint}
                className="flex-1 md:flex-none justify-center flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-white text-sm font-bold transition-all border border-white/10 hover:border-white/20"
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
                    strokeWidth="2"
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
                Print
              </button>
              <button
                onClick={handleCopy}
                className="flex-1 md:flex-none justify-center flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 rounded-xl text-white text-sm font-bold transition-all shadow-lg shadow-primary-500/30"
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
                    strokeWidth="2"
                    d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                  />
                </svg>
                Copy
              </button>
            </div>
          </div>

          {/* Recipe Meta Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mt-8 md:mt-10 pt-8 md:pt-10 border-t border-white/10">
            {recipe.servings && (
              <div className="col-span-2 md:col-span-1 bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                <div className="text-cream-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-2">
                  Servings
                </div>
                <div className="flex items-center justify-center md:justify-start gap-3 print:gap-0">
                  <button
                    onClick={() => adjustServings(-1)}
                    disabled={currentServings <= 1}
                    className="print:hidden w-9 h-9 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg flex items-center justify-center text-white font-bold transition-all"
                    aria-label="Decrease servings"
                  >
                    −
                  </button>
                  <div className="text-xl font-black min-w-[70px] text-center">
                    {currentServings}
                    <span className="text-sm font-medium text-cream-400 ml-1">
                      {currentServings === 1 ? "person" : "people"}
                    </span>
                  </div>
                  <button
                    onClick={() => adjustServings(1)}
                    className="print:hidden w-9 h-9 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white font-bold transition-all"
                    aria-label="Increase servings"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
            {recipe.prepTime !== undefined && recipe.prepTime > 0 && (
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                <div className="text-cream-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">
                  Prep Time
                </div>
                <div className="text-xl font-black flex items-center gap-2">
                  <span className="text-lg opacity-60">⏱️</span>
                  {formatMinutes(recipe.prepTime)}
                </div>
              </div>
            )}
            {recipe.cookTime !== undefined && recipe.cookTime > 0 && (
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                <div className="text-cream-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">
                  Cook Time
                </div>
                <div className="text-xl font-black flex items-center gap-2">
                  <span className="text-lg opacity-60">🍳</span>
                  {formatMinutes(recipe.cookTime)}
                </div>
              </div>
            )}
            {recipe.totalTime !== undefined && recipe.totalTime > 0 && (
              <div className="col-span-2 md:col-span-1 bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                <div className="text-cream-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">
                  Total Time
                </div>
                <div className="text-xl font-black flex items-center gap-2">
                  <span className="text-lg opacity-60">⏰</span>
                  {formatMinutes(recipe.totalTime)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recipe Content */}
      <div className="p-6 md:p-10 lg:p-12 relative bg-white">
        {/* View mode toggle */}
        <div className="absolute top-4 md:top-6 right-4 md:right-6 flex bg-cream-100 rounded-xl p-1 border border-cream-200/50 print:hidden z-20">
          <button
            onClick={() => setViewMode("columns")}
            title="Columns View"
            className={`p-2 rounded-lg transition-all ${
              viewMode === "columns"
                ? "bg-white text-chocolate-900 shadow-warm-sm"
                : "text-chocolate-400 hover:text-chocolate-600"
            }`}
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
                strokeWidth="2.5"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h2m10-16h-2a2 2 0 00-2 2v12a2 2 0 002 2h2"
              />
            </svg>
          </button>
          <button
            onClick={() => setViewMode("document")}
            title="Document View"
            className={`p-2 rounded-lg transition-all ${
              viewMode === "document"
                ? "bg-white text-chocolate-900 shadow-warm-sm"
                : "text-chocolate-400 hover:text-chocolate-600"
            }`}
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
                strokeWidth="2.5"
                d="M4 6h16M4 12h16M4 18h7"
              />
            </svg>
          </button>
        </div>

        {viewMode === "columns" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 md:gap-14">
            {/* Ingredients Column */}
            <div className="lg:col-span-5">
              <h3 className="text-2xl md:text-3xl font-black text-chocolate-900 mb-6 md:mb-8 flex items-center gap-3">
                <span className="w-10 h-10 bg-gradient-to-br from-herb-100 to-herb-50 rounded-xl flex items-center justify-center text-xl shadow-warm-sm">
                  🛒
                </span>
                Ingredients
              </h3>
              <ul className="space-y-3">
                {scaledIngredients.map((ingredient, index) => (
                  <li
                    key={`ing-${ingredient.item}-${ingredient.amount || ""}-${index}`}
                    className="flex items-start group p-3 rounded-xl hover:bg-cream-50 transition-colors"
                  >
                    <div className="flex-shrink-0 w-9 h-9 bg-cream-100 rounded-lg flex items-center justify-center text-lg mr-4 group-hover:scale-110 group-hover:bg-cream-200 transition-all">
                      {getIngredientEmoji(ingredient.item)}
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="font-medium text-chocolate-800">
                        {ingredient.amount && (
                          <span className="text-primary-600 font-bold mr-1.5">
                            {ingredient.amount} {ingredient.unit}
                          </span>
                        )}
                        {ingredient.item}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-8 print:hidden">
                <AdBanner slot="recipe-sidebar" />
              </div>
            </div>

            {/* Instructions Column */}
            <div className="lg:col-span-7">
              <h3 className="text-2xl md:text-3xl font-black text-chocolate-900 mb-6 md:mb-8 flex items-center gap-3">
                <span className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-50 rounded-xl flex items-center justify-center text-xl shadow-warm-sm">
                  👨‍🍳
                </span>
                Instructions
              </h3>
              <div className="space-y-6 md:space-y-8">
                {recipe.instructions.map((instruction) => (
                  <div
                    key={instruction.step}
                    className="flex gap-4 md:gap-5 group"
                  >
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-chocolate-800 to-chocolate-900 text-white rounded-2xl flex items-center justify-center font-black text-sm md:text-base group-hover:from-primary-500 group-hover:to-primary-600 transition-all duration-300 shadow-warm">
                        {instruction.step}
                      </div>
                    </div>
                    <div className="pt-1 md:pt-2">
                      <p className="text-chocolate-700 leading-relaxed font-medium text-base md:text-lg">
                        {instruction.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-12">
            {/* Document View - Ingredients */}
            <section>
              <h3 className="text-2xl font-black text-chocolate-900 mb-6 pb-3 border-b-2 border-cream-200 flex items-center gap-3">
                <span className="text-2xl">🛒</span>
                Ingredients
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                {scaledIngredients.map((ingredient, index) => (
                  <div
                    key={`ing-doc-${ingredient.item}-${ingredient.amount || ""}-${index}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-cream-50 transition-colors"
                  >
                    <span className="text-lg flex-shrink-0">
                      {getIngredientEmoji(ingredient.item)}
                    </span>
                    <span className="text-chocolate-700 font-medium">
                      {ingredient.amount && (
                        <span className="text-primary-600 font-bold">
                          {ingredient.amount} {ingredient.unit}{" "}
                        </span>
                      )}
                      {ingredient.item}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Document View - Instructions */}
            <section>
              <h3 className="text-2xl font-black text-chocolate-900 mb-6 pb-3 border-b-2 border-cream-200 flex items-center gap-3">
                <span className="text-2xl">👨‍🍳</span>
                Preparation
              </h3>
              <div className="space-y-5">
                {recipe.instructions.map((instruction) => (
                  <div key={instruction.step} className="flex gap-4">
                    <span className="font-black text-cream-400 text-xl flex-shrink-0 w-8">
                      {String(instruction.step).padStart(2, "0")}
                    </span>
                    <p className="text-chocolate-700 leading-relaxed text-lg">
                      {instruction.text}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Notes Section */}
        {recipe.notes && recipe.notes.length > 0 && (
          <div className="mt-12 md:mt-16 p-6 md:p-8 bg-gradient-to-br from-cream-50 to-cream-100/50 rounded-3xl border border-cream-200/50">
            <h4 className="text-lg font-black text-chocolate-900 mb-4 flex items-center gap-2 uppercase tracking-wider">
              <span className="text-xl">📝</span>
              Chef's Notes
            </h4>
            <ul className="space-y-3">
              {recipe.notes.map((note, index) => (
                <li
                  key={index}
                  className="flex items-start text-chocolate-600 font-medium"
                >
                  <span className="text-primary-500 mr-3 text-xl leading-none">
                    •
                  </span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Nutrition Section */}
        {recipe.nutrition && (
          <div className="mt-12 md:mt-16 pt-8 md:pt-10 border-t border-cream-200">
            <h4 className="text-xl md:text-2xl font-black text-chocolate-900 mb-6 md:mb-8 flex items-center gap-3">
              <span className="text-2xl">📊</span>
              Nutrition Facts
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {recipe.nutrition.calories && (
                <div className="p-5 md:p-6 bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl border border-red-100 relative overflow-hidden group hover:shadow-warm transition-all">
                  <div className="absolute top-3 right-3 text-2xl opacity-20 group-hover:opacity-40 transition-opacity">
                    🔥
                  </div>
                  <div className="text-chocolate-400 text-[10px] font-bold uppercase tracking-widest mb-1">
                    Calories
                  </div>
                  <div className="text-2xl font-black text-chocolate-800">
                    {recipe.nutrition.calories}
                  </div>
                </div>
              )}
              {recipe.nutrition.protein && (
                <div className="p-5 md:p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 relative overflow-hidden group hover:shadow-warm transition-all">
                  <div className="absolute top-3 right-3 text-2xl opacity-20 group-hover:opacity-40 transition-opacity">
                    💪
                  </div>
                  <div className="text-chocolate-400 text-[10px] font-bold uppercase tracking-widest mb-1">
                    Protein
                  </div>
                  <div className="text-xl md:text-2xl font-black text-chocolate-800">
                    {recipe.nutrition.protein}
                  </div>
                </div>
              )}
              {recipe.nutrition.carbs && (
                <div className="p-5 md:p-6 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl border border-amber-100 relative overflow-hidden group hover:shadow-warm transition-all">
                  <div className="absolute top-3 right-3 text-2xl opacity-20 group-hover:opacity-40 transition-opacity">
                    🍞
                  </div>
                  <div className="text-chocolate-400 text-[10px] font-bold uppercase tracking-widest mb-1">
                    Carbs
                  </div>
                  <div className="text-xl md:text-2xl font-black text-chocolate-800">
                    {recipe.nutrition.carbs}
                  </div>
                </div>
              )}
              {recipe.nutrition.fat && (
                <div className="p-5 md:p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-100 relative overflow-hidden group hover:shadow-warm transition-all">
                  <div className="absolute top-3 right-3 text-2xl opacity-20 group-hover:opacity-40 transition-opacity">
                    🥑
                  </div>
                  <div className="text-chocolate-400 text-[10px] font-bold uppercase tracking-widest mb-1">
                    Fat
                  </div>
                  <div className="text-2xl font-black text-chocolate-800">
                    {recipe.nutrition.fat}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Source Link and Footer */}
        {(recipe.sourceUrl || recipe.confidenceScore !== undefined) && (
          <div className="mt-12 pt-8 border-t border-cream-200">
            {recipe.sourceUrl && (
              <div className="text-sm text-chocolate-400 font-medium flex items-center gap-2 mb-3">
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
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
                Extracted from:{" "}
                <a
                  href={recipe.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-700 underline underline-offset-4 decoration-primary-200 hover:decoration-primary-400 transition-colors"
                >
                  {recipe.sourceUrl}
                </a>
              </div>
            )}
            <div className="flex items-center justify-between flex-wrap gap-4 text-xs text-chocolate-400">
              {recipe.confidenceScore !== undefined && (
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-herb-50 rounded-full"
                  title="Extraction quality score based on completeness and detail"
                >
                  <svg
                    className="w-3.5 h-3.5 text-herb-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="font-medium text-herb-700">
                    Quality: {recipe.confidenceScore}%
                  </span>
                </div>
              )}
              <div className="print:hidden flex items-center gap-2 text-chocolate-500">
                <span>Enjoy your meal!</span>
                <span className="text-lg">✨</span>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Ad Banner */}
        <div className="mt-8 md:mt-12 print:hidden">
          <AdBanner
            slot="recipe-bottom"
            format="fluid"
            className="max-w-3xl mx-auto"
          />
        </div>
      </div>

      {/* Toast notification */}
      {copySuccess && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up print:hidden">
          <div className="bg-chocolate-900 text-white px-6 py-3 rounded-2xl shadow-warm-xl flex items-center gap-2 font-bold text-sm">
            <svg className="w-5 h-5 text-herb-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Recipe copied to clipboard!
          </div>
        </div>
      )}
    </div>
  );
}

function getIngredientEmoji(item: string): string {
  const lowercaseItem = item.toLowerCase();

  // Proteins
  if (lowercaseItem.includes("chicken")) return "🍗";
  if (
    lowercaseItem.includes("beef") ||
    lowercaseItem.includes("steak") ||
    lowercaseItem.includes("steaks") ||
    lowercaseItem.includes("ground meat")
  )
    return "🥩";
  if (
    lowercaseItem.includes("pork") ||
    lowercaseItem.includes("bacon") ||
    lowercaseItem.includes("ham") ||
    lowercaseItem.includes("hams") ||
    lowercaseItem.includes("sausage") ||
    lowercaseItem.includes("sausages")
  )
    return "🥓";
  if (
    lowercaseItem.includes("fish") ||
    lowercaseItem.includes("fishes") ||
    lowercaseItem.includes("salmon") ||
    lowercaseItem.includes("tuna") ||
    lowercaseItem.includes("cod")
  )
    return "🐟";
  if (
    lowercaseItem.includes("shrimp") ||
    lowercaseItem.includes("shrimps") ||
    lowercaseItem.includes("prawn") ||
    lowercaseItem.includes("prawns") ||
    lowercaseItem.includes("crab") ||
    lowercaseItem.includes("crabs") ||
    lowercaseItem.includes("lobster") ||
    lowercaseItem.includes("lobsters")
  )
    return "🍤";
  if (lowercaseItem.includes("egg")) return "🥚";
  if (
    lowercaseItem.includes("tofu") ||
    lowercaseItem.includes("tempeh") ||
    lowercaseItem.includes("soy")
  )
    return "🧊";
  if (lowercaseItem.includes("turkey")) return "🦃";
  if (lowercaseItem.includes("lamb")) return "🐑";

  // Vegetables
  if (
    lowercaseItem.includes("onion") ||
    lowercaseItem.includes("onions") ||
    lowercaseItem.includes("shallot") ||
    lowercaseItem.includes("shallots") ||
    lowercaseItem.includes("leek") ||
    lowercaseItem.includes("leeks")
  )
    return "🧅";
  if (lowercaseItem.includes("garlic")) return "🧄";
  if (lowercaseItem.includes("tomato") || lowercaseItem.includes("tomatoes"))
    return "🍅";
  if (
    lowercaseItem.includes("potato") ||
    lowercaseItem.includes("potatoes") ||
    lowercaseItem.includes("yam") ||
    lowercaseItem.includes("yams") ||
    lowercaseItem.includes("sweet potato") ||
    lowercaseItem.includes("sweet potatoes")
  )
    return "🥔";
  if (lowercaseItem.includes("carrot") || lowercaseItem.includes("carrots"))
    return "🥕";
  if (
    lowercaseItem.includes("broccoli") ||
    lowercaseItem.includes("cauliflower") ||
    lowercaseItem.includes("cauliflowers")
  )
    return "🥦";
  if (
    lowercaseItem.includes("pepper") ||
    lowercaseItem.includes("peppers") ||
    lowercaseItem.includes("chili") ||
    lowercaseItem.includes("chilis") ||
    lowercaseItem.includes("chilies") ||
    lowercaseItem.includes("jalapeno") ||
    lowercaseItem.includes("jalapenos") ||
    lowercaseItem.includes("capsicum") ||
    lowercaseItem.includes("capsicums")
  )
    return "🌶️";
  if (
    lowercaseItem.includes("cucumber") ||
    lowercaseItem.includes("cucumbers") ||
    lowercaseItem.includes("pickle") ||
    lowercaseItem.includes("pickles") ||
    lowercaseItem.includes("zucchini") ||
    lowercaseItem.includes("zucchinis")
  )
    return "🥒";
  if (
    lowercaseItem.includes("lettuce") ||
    lowercaseItem.includes("spinach") ||
    lowercaseItem.includes("kale") ||
    lowercaseItem.includes("chard") ||
    lowercaseItem.includes("chards") ||
    lowercaseItem.includes("arugula")
  )
    return "🥬";
  if (lowercaseItem.includes("corn") || lowercaseItem.includes("maize"))
    return "🌽";
  if (
    lowercaseItem.includes("mushroom") ||
    lowercaseItem.includes("mushrooms") ||
    lowercaseItem.includes("fungus")
  )
    return "🍄";
  if (lowercaseItem.includes("avocado") || lowercaseItem.includes("avocados"))
    return "🥑";
  if (
    lowercaseItem.includes("lemon") ||
    lowercaseItem.includes("lemons") ||
    lowercaseItem.includes("lime") ||
    lowercaseItem.includes("limes") ||
    lowercaseItem.includes("citrus")
  )
    return "🍋";
  if (lowercaseItem.includes("eggplant") || lowercaseItem.includes("eggplants"))
    return "🍆";
  if (
    lowercaseItem.includes("pea") ||
    lowercaseItem.includes("peas") ||
    lowercaseItem.includes("bean") ||
    lowercaseItem.includes("beans") ||
    lowercaseItem.includes("lentil") ||
    lowercaseItem.includes("lentils") ||
    lowercaseItem.includes("chickpea") ||
    lowercaseItem.includes("chickpeas")
  )
    return "🫛";
  if (lowercaseItem.includes("asparagus")) return "🎍";
  if (lowercaseItem.includes("cabbage") || lowercaseItem.includes("cabbages"))
    return "🥗";
  if (
    lowercaseItem.includes("herb") ||
    lowercaseItem.includes("herbs") ||
    lowercaseItem.includes("parsley") ||
    lowercaseItem.includes("cilantro") ||
    lowercaseItem.includes("basil") ||
    lowercaseItem.includes("thyme") ||
    lowercaseItem.includes("rosemary")
  )
    return "🌿";
  if (lowercaseItem.includes("ginger")) return "🫚";

  // Fruits
  if (lowercaseItem.includes("apple") || lowercaseItem.includes("apples"))
    return "🍎";
  if (lowercaseItem.includes("banana") || lowercaseItem.includes("bananas"))
    return "🍌";
  if (
    lowercaseItem.includes("blueberry") ||
    lowercaseItem.includes("blueberries")
  )
    return "🫐";
  if (
    lowercaseItem.includes("strawberry") ||
    lowercaseItem.includes("strawberries") ||
    lowercaseItem.includes("berry") ||
    lowercaseItem.includes("berries") ||
    lowercaseItem.includes("raspberry") ||
    lowercaseItem.includes("raspberries")
  )
    return "🍓";
  if (
    lowercaseItem.includes("grape") ||
    lowercaseItem.includes("grapes") ||
    lowercaseItem.includes("raisin") ||
    lowercaseItem.includes("raisins")
  )
    return "🍇";
  if (
    lowercaseItem.includes("orange") ||
    lowercaseItem.includes("oranges") ||
    lowercaseItem.includes("tangerine") ||
    lowercaseItem.includes("tangerines")
  )
    return "🍊";
  if (
    lowercaseItem.includes("pineapple") ||
    lowercaseItem.includes("pineapples")
  )
    return "🍍";
  if (
    lowercaseItem.includes("mango") ||
    lowercaseItem.includes("mangos") ||
    lowercaseItem.includes("mangoes")
  )
    return "🥭";
  if (lowercaseItem.includes("peach") || lowercaseItem.includes("peaches"))
    return "🍑";
  if (lowercaseItem.includes("cherry") || lowercaseItem.includes("cherries"))
    return "🍒";
  if (lowercaseItem.includes("coconut") || lowercaseItem.includes("coconuts"))
    return "🥥";
  if (lowercaseItem.includes("olive") || lowercaseItem.includes("olives"))
    return "🫒";

  // Dairy & Alternatives
  if (
    lowercaseItem.includes("milk") ||
    lowercaseItem.includes("cream") ||
    lowercaseItem.includes("half and half")
  )
    return "🥛";
  if (
    lowercaseItem.includes("cheese") ||
    lowercaseItem.includes("parmesan") ||
    lowercaseItem.includes("cheddar") ||
    lowercaseItem.includes("mozzarella") ||
    lowercaseItem.includes("feta")
  )
    return "🧀";
  if (lowercaseItem.includes("butter") || lowercaseItem.includes("margarine"))
    return "🧈";
  if (lowercaseItem.includes("yogurt") || lowercaseItem.includes("curd"))
    return "🍦";

  // Pantry & Others
  if (
    lowercaseItem.includes("flour") ||
    lowercaseItem.includes("flours") ||
    lowercaseItem.includes("baking powder") ||
    lowercaseItem.includes("baking soda") ||
    lowercaseItem.includes("yeast")
  )
    return "🥡";
  if (
    lowercaseItem.includes("sugar") ||
    lowercaseItem.includes("sugars") ||
    lowercaseItem.includes("sweetener") ||
    lowercaseItem.includes("sweeteners") ||
    lowercaseItem.includes("stevia")
  )
    return "🍬";
  if (lowercaseItem.includes("salt") || lowercaseItem.includes("salts"))
    return "🧂";
  if (
    lowercaseItem.includes("pepper") &&
    !lowercaseItem.includes("bell pepper")
  )
    return "🧂";
  if (
    lowercaseItem.includes("spice") ||
    lowercaseItem.includes("spices") ||
    lowercaseItem.includes("cinnamon") ||
    lowercaseItem.includes("paprika") ||
    lowercaseItem.includes("cumin") ||
    lowercaseItem.includes("turmeric")
  )
    return "🏺";
  if (lowercaseItem.includes("oil") || lowercaseItem.includes("oils"))
    return "🧴";
  if (
    lowercaseItem.includes("vinegar") ||
    lowercaseItem.includes("vinegars") ||
    lowercaseItem.includes("sauce") ||
    lowercaseItem.includes("sauces") ||
    lowercaseItem.includes("soy sauce") ||
    lowercaseItem.includes("ketchup") ||
    lowercaseItem.includes("mustard")
  )
    return "🫗";
  if (
    lowercaseItem.includes("bread") ||
    lowercaseItem.includes("breads") ||
    lowercaseItem.includes("toast") ||
    lowercaseItem.includes("toasts") ||
    lowercaseItem.includes("bun") ||
    lowercaseItem.includes("buns") ||
    lowercaseItem.includes("baguette") ||
    lowercaseItem.includes("baguettes")
  )
    return "🍞";
  if (
    lowercaseItem.includes("pasta") ||
    lowercaseItem.includes("pastas") ||
    lowercaseItem.includes("noodle") ||
    lowercaseItem.includes("noodles") ||
    lowercaseItem.includes("spaghetti") ||
    lowercaseItem.includes("macaroni")
  )
    return "🍝";
  if (
    lowercaseItem.includes("rice") ||
    lowercaseItem.includes("quinoa") ||
    lowercaseItem.includes("grain") ||
    lowercaseItem.includes("grains")
  )
    return "🍚";
  if (
    lowercaseItem.includes("water") ||
    lowercaseItem.includes("juice") ||
    lowercaseItem.includes("juices") ||
    lowercaseItem.includes("broth") ||
    lowercaseItem.includes("broths") ||
    lowercaseItem.includes("stock") ||
    lowercaseItem.includes("stocks") ||
    lowercaseItem.includes("wine") ||
    lowercaseItem.includes("wines") ||
    lowercaseItem.includes("beer") ||
    lowercaseItem.includes("beers")
  )
    return "💧";
  if (
    lowercaseItem.includes("honey") ||
    lowercaseItem.includes("syrup") ||
    lowercaseItem.includes("syrups") ||
    lowercaseItem.includes("maple")
  )
    return "🍯";
  if (
    lowercaseItem.includes("chocolate") ||
    lowercaseItem.includes("chocolates") ||
    lowercaseItem.includes("cocoa") ||
    lowercaseItem.includes("chip") ||
    lowercaseItem.includes("chips")
  )
    return "🍫";
  if (
    lowercaseItem.includes("nut") ||
    lowercaseItem.includes("nuts") ||
    lowercaseItem.includes("almond") ||
    lowercaseItem.includes("almonds") ||
    lowercaseItem.includes("walnut") ||
    lowercaseItem.includes("walnuts") ||
    lowercaseItem.includes("cashew") ||
    lowercaseItem.includes("cashews") ||
    lowercaseItem.includes("peanut") ||
    lowercaseItem.includes("peanuts") ||
    lowercaseItem.includes("seed") ||
    lowercaseItem.includes("seeds") ||
    lowercaseItem.includes("sesame") ||
    lowercaseItem.includes("sunflower")
  )
    return "🥜";
  if (
    lowercaseItem.includes("vanilla") ||
    lowercaseItem.includes("extract") ||
    lowercaseItem.includes("extracts")
  )
    return "🧪";
  if (
    lowercaseItem.includes("jam") ||
    lowercaseItem.includes("jams") ||
    lowercaseItem.includes("jelly") ||
    lowercaseItem.includes("jellies") ||
    lowercaseItem.includes("preserve") ||
    lowercaseItem.includes("preserves")
  )
    return "🍯";

  return "•";
}

function formatRecipeAsText(recipe: Recipe): string {
  let text = `${recipe.title.toUpperCase()}\n`;
  text += `${"=".repeat(recipe.title.length)}\n\n`;

  if (recipe.description) {
    text += `${recipe.description}\n\n`;
  }

  const stats = [];
  if (recipe.servings) stats.push(`Servings: ${recipe.servings}`);
  if (recipe.prepTime) stats.push(`Prep: ${formatMinutes(recipe.prepTime)}`);
  if (recipe.cookTime) stats.push(`Cook: ${formatMinutes(recipe.cookTime)}`);
  if (stats.length > 0) {
    text += `${stats.join(" | ")}\n\n`;
  }

  text += "INGREDIENTS:\n";
  recipe.ingredients.forEach((ing) => {
    const amount =
      ing.amount && ing.unit ? `${ing.amount} ${ing.unit}` : ing.amount || "";
    text += `- ${amount} ${ing.item}\n`;
  });

  text += "\nINSTRUCTIONS:\n";
  recipe.instructions.forEach((inst) => {
    text += `${inst.step}. ${inst.text}\n`;
  });

  if (recipe.notes && recipe.notes.length > 0) {
    text += "\nNOTES:\n";
    recipe.notes.forEach((note) => (text += `- ${note}\n`));
  }

  if (recipe.sourceUrl) {
    text += `\nSource: ${recipe.sourceUrl}\n`;
  }

  return text;
}
