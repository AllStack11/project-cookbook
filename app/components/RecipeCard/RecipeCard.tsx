"use client";

import { useState } from "react";
import { Recipe } from "@/types/recipe";

interface RecipeCardProps {
  recipe: Recipe;
}

export default function RecipeCard({ recipe }: RecipeCardProps) {
  const [viewMode, setViewMode] = useState<"columns" | "document">("columns");

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = async () => {
    const recipeText = formatRecipeAsText(recipe);
    await navigator.clipboard.writeText(recipeText);
    alert("Recipe copied to clipboard!");
  };

  return (
    <div className="w-full max-w-4xl mx-auto card-modern !p-0 overflow-hidden print:shadow-none print:border-none">
      {/* Recipe Header/Banner */}
      <div className="bg-stone-900 text-white relative">
        {recipe.imageUrl && (
          <div className="absolute inset-0 z-0">
            <img
              src={recipe.imageUrl}
              alt={recipe.title}
              className="w-full h-full object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/60 to-transparent" />
          </div>
        )}
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none hidden md:block z-10">
          <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
            <path
              fillRule="evenodd"
              d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        <div className="relative z-10 p-8 md:p-12">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-4">
                {recipe.title}
              </h1>
              {recipe.description && (
                <p className="text-stone-400 text-lg leading-relaxed max-w-2xl font-medium">
                  {recipe.description}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-3 print:hidden">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-white text-sm font-bold transition-all border border-white/10"
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
                className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 rounded-xl text-white text-sm font-bold transition-all shadow-lg shadow-primary-500/20"
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
                Copy Text
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-10 pt-10 border-t border-white/10">
            {recipe.servings && (
              <div>
                <div className="text-stone-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
                  Servings
                </div>
                <div className="text-xl font-bold">
                  {recipe.servings} People
                </div>
              </div>
            )}
            {recipe.prepTime && (
              <div>
                <div className="text-stone-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
                  Prep Time
                </div>
                <div className="text-xl font-bold">{recipe.prepTime}</div>
              </div>
            )}
            {recipe.cookTime && (
              <div>
                <div className="text-stone-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
                  Cook Time
                </div>
                <div className="text-xl font-bold">{recipe.cookTime}</div>
              </div>
            )}
            {recipe.totalTime && (
              <div>
                <div className="text-stone-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
                  Total Time
                </div>
                <div className="text-xl font-bold">{recipe.totalTime}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-8 md:p-12 relative">
        <div className="absolute top-8 right-8 flex bg-stone-100 rounded-xl p-1 border border-stone-200 print:hidden z-20">
          <button
            onClick={() => setViewMode("columns")}
            title="Columns View"
            className={`p-2 rounded-lg transition-all ${
              viewMode === "columns"
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-400 hover:text-stone-600"
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
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-400 hover:text-stone-600"
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
            {/* Ingredients Column */}
            <div className="lg:col-span-5">
              <h2 className="text-2xl font-black text-stone-900 mb-8 flex items-center gap-3">
                <span className="w-8 h-8 bg-stone-100 rounded-lg flex items-center justify-center text-sm">
                  🛒
                </span>
                Ingredients
              </h2>
              <ul className="space-y-4">
                {recipe.ingredients.map((ingredient, index) => (
                  <li
                    key={index}
                    className="flex items-start group pb-4 border-b border-stone-50 last:border-0"
                  >
                    <div className="flex-shrink-0 w-8 h-8 bg-stone-50 rounded-lg flex items-center justify-center text-sm mr-4 group-hover:scale-110 transition-transform">
                      {getIngredientEmoji(ingredient.item)}
                    </div>
                    <div className="flex-1 pt-0.5">
                      <div className="font-bold text-stone-800">
                        {ingredient.amount && (
                          <span className="text-primary-600 mr-1.5">
                            {ingredient.amount} {ingredient.unit}
                          </span>
                        )}
                        {ingredient.item}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Instructions Column */}
            <div className="lg:col-span-7">
              <h2 className="text-2xl font-black text-stone-900 mb-8 flex items-center gap-3">
                <span className="w-8 h-8 bg-stone-100 rounded-lg flex items-center justify-center text-sm">
                  🍳
                </span>
                Instructions
              </h2>
              <div className="space-y-10">
                {recipe.instructions.map((instruction) => (
                  <div key={instruction.step} className="flex gap-6 group">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-stone-900 text-white rounded-2xl flex items-center justify-center font-black text-sm group-hover:bg-primary-500 transition-colors duration-300">
                        {instruction.step}
                      </div>
                    </div>
                    <div className="pt-2">
                      <p className="text-stone-700 leading-relaxed font-medium text-lg">
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
              <h2 className="text-2xl font-black text-stone-900 mb-6 border-b-2 border-stone-100 pb-2">
                Ingredients
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                {recipe.ingredients.map((ingredient, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <span className="text-lg flex-shrink-0">
                      {getIngredientEmoji(ingredient.item)}
                    </span>
                    <span className="text-stone-700 font-medium">
                      {ingredient.amount && (
                        <span className="text-primary-700 font-bold">
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
              <h2 className="text-2xl font-black text-stone-900 mb-6 border-b-2 border-stone-100 pb-2">
                Preparation
              </h2>
              <div className="space-y-6">
                {recipe.instructions.map((instruction) => (
                  <div key={instruction.step} className="flex gap-4">
                    <span className="font-black text-stone-300 text-xl flex-shrink-0 w-8">
                      {String(instruction.step).padStart(2, "0")}
                    </span>
                    <p className="text-stone-700 leading-relaxed text-lg">
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
          <div className="mt-16 p-8 bg-stone-50 rounded-[2rem] border border-stone-100">
            <h3 className="text-lg font-black text-stone-900 mb-4 uppercase tracking-wider">
              Chef's Notes
            </h3>
            <ul className="space-y-3">
              {recipe.notes.map((note, index) => (
                <li
                  key={index}
                  className="flex items-start text-stone-600 font-medium"
                >
                  <span className="text-primary-500 mr-3 text-xl leading-none">
                    ·
                  </span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Nutrition Section */}
        {recipe.nutrition && (
          <div className="mt-16 pt-12 border-t border-stone-100">
            <h3 className="text-xl font-black text-stone-900 mb-8">
              Nutrition Facts
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {recipe.nutrition.calories && (
                <div className="p-6 bg-stone-50 rounded-2xl border border-stone-100 relative overflow-hidden group">
                  <div className="absolute top-2 right-2 text-xl opacity-20 group-hover:opacity-40 transition-opacity">
                    🔥
                  </div>
                  <div className="text-stone-400 text-[10px] font-black uppercase tracking-widest mb-1">
                    Calories
                  </div>
                  <div className="text-2xl font-black text-stone-800">
                    {recipe.nutrition.calories}
                  </div>
                </div>
              )}
              {recipe.nutrition.protein && (
                <div className="p-6 bg-stone-50 rounded-2xl border border-stone-100 relative overflow-hidden group">
                  <div className="absolute top-2 right-2 text-xl opacity-20 group-hover:opacity-40 transition-opacity">
                    💪
                  </div>
                  <div className="text-stone-400 text-[10px] font-black uppercase tracking-widest mb-1">
                    Protein
                  </div>
                  <div className="text-2xl font-black text-stone-800">
                    {recipe.nutrition.protein}
                  </div>
                </div>
              )}
              {recipe.nutrition.carbs && (
                <div className="p-6 bg-stone-50 rounded-2xl border border-stone-100 relative overflow-hidden group">
                  <div className="absolute top-2 right-2 text-xl opacity-20 group-hover:opacity-40 transition-opacity">
                    🍞
                  </div>
                  <div className="text-stone-400 text-[10px] font-black uppercase tracking-widest mb-1">
                    Carbs
                  </div>
                  <div className="text-2xl font-black text-stone-800">
                    {recipe.nutrition.carbs}
                  </div>
                </div>
              )}
              {recipe.nutrition.fat && (
                <div className="p-6 bg-stone-50 rounded-2xl border border-stone-100 relative overflow-hidden group">
                  <div className="absolute top-2 right-2 text-xl opacity-20 group-hover:opacity-40 transition-opacity">
                    🥑
                  </div>
                  <div className="text-stone-400 text-[10px] font-black uppercase tracking-widest mb-1">
                    Fat
                  </div>
                  <div className="text-2xl font-black text-stone-800">
                    {recipe.nutrition.fat}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Source Link */}
        {recipe.sourceUrl && (
          <div className="mt-12 pt-8 border-t border-stone-100 text-sm text-stone-400 font-medium flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
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
                className="text-primary-600 hover:text-primary-700 underline underline-offset-4 decoration-primary-200"
              >
                {recipe.sourceUrl}
              </a>
            </div>
            <div className="print:hidden">Enjoy your meal! ✨</div>
          </div>
        )}
      </div>
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
    lowercaseItem.includes("ground meat")
  )
    return "🥩";
  if (
    lowercaseItem.includes("pork") ||
    lowercaseItem.includes("bacon") ||
    lowercaseItem.includes("ham") ||
    lowercaseItem.includes("sausage")
  )
    return "🥓";
  if (
    lowercaseItem.includes("fish") ||
    lowercaseItem.includes("salmon") ||
    lowercaseItem.includes("tuna") ||
    lowercaseItem.includes("cod")
  )
    return "🐟";
  if (
    lowercaseItem.includes("shrimp") ||
    lowercaseItem.includes("prawn") ||
    lowercaseItem.includes("crab") ||
    lowercaseItem.includes("lobster")
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
    lowercaseItem.includes("shallot") ||
    lowercaseItem.includes("leek")
  )
    return "🧅";
  if (lowercaseItem.includes("garlic")) return "🧄";
  if (lowercaseItem.includes("tomato")) return "🍅";
  if (
    lowercaseItem.includes("potato") ||
    lowercaseItem.includes("yam") ||
    lowercaseItem.includes("sweet potato")
  )
    return "🥔";
  if (lowercaseItem.includes("carrot")) return "🥕";
  if (
    lowercaseItem.includes("broccoli") ||
    lowercaseItem.includes("cauliflower")
  )
    return "🥦";
  if (
    lowercaseItem.includes("pepper") ||
    lowercaseItem.includes("chili") ||
    lowercaseItem.includes("jalapeno") ||
    lowercaseItem.includes("capsicum")
  )
    return "🌶️";
  if (
    lowercaseItem.includes("cucumber") ||
    lowercaseItem.includes("pickle") ||
    lowercaseItem.includes("zucchini")
  )
    return "🥒";
  if (
    lowercaseItem.includes("lettuce") ||
    lowercaseItem.includes("spinach") ||
    lowercaseItem.includes("kale") ||
    lowercaseItem.includes("chard") ||
    lowercaseItem.includes("arugula")
  )
    return "🥬";
  if (lowercaseItem.includes("corn") || lowercaseItem.includes("maize"))
    return "🌽";
  if (lowercaseItem.includes("mushroom") || lowercaseItem.includes("fungus"))
    return "🍄";
  if (lowercaseItem.includes("avocado")) return "🥑";
  if (
    lowercaseItem.includes("lemon") ||
    lowercaseItem.includes("lime") ||
    lowercaseItem.includes("citrus")
  )
    return "🍋";
  if (lowercaseItem.includes("eggplant")) return "🍆";
  if (
    lowercaseItem.includes("pea") ||
    lowercaseItem.includes("bean") ||
    lowercaseItem.includes("lentil") ||
    lowercaseItem.includes("chickpea")
  )
    return "🫛";
  if (lowercaseItem.includes("asparagus")) return "🎍";
  if (lowercaseItem.includes("cabbage")) return "🥗";
  if (
    lowercaseItem.includes("herb") ||
    lowercaseItem.includes("parsley") ||
    lowercaseItem.includes("cilantro") ||
    lowercaseItem.includes("basil") ||
    lowercaseItem.includes("thyme") ||
    lowercaseItem.includes("rosemary")
  )
    return "🌿";
  if (lowercaseItem.includes("ginger")) return "🫚";

  // Fruits
  if (lowercaseItem.includes("apple")) return "🍎";
  if (lowercaseItem.includes("banana")) return "🍌";
  if (
    lowercaseItem.includes("strawberry") ||
    lowercaseItem.includes("berry") ||
    lowercaseItem.includes("blueberry") ||
    lowercaseItem.includes("raspberry")
  )
    return "🍓";
  if (lowercaseItem.includes("grape") || lowercaseItem.includes("raisin"))
    return "🍇";
  if (lowercaseItem.includes("orange") || lowercaseItem.includes("tangerine"))
    return "🍊";
  if (lowercaseItem.includes("pineapple")) return "🍍";
  if (lowercaseItem.includes("mango")) return "🥭";
  if (lowercaseItem.includes("peach")) return "🍑";
  if (lowercaseItem.includes("cherry")) return "🍒";
  if (lowercaseItem.includes("coconut")) return "🥥";
  if (lowercaseItem.includes("olive")) return "🫒";

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
    lowercaseItem.includes("baking powder") ||
    lowercaseItem.includes("baking soda") ||
    lowercaseItem.includes("yeast")
  )
    return "🥡";
  if (
    lowercaseItem.includes("sugar") ||
    lowercaseItem.includes("sweetener") ||
    lowercaseItem.includes("stevia")
  )
    return "🍬";
  if (lowercaseItem.includes("salt")) return "🧂";
  if (
    lowercaseItem.includes("pepper") &&
    !lowercaseItem.includes("bell pepper")
  )
    return "🧂"; // Use salt shaker for black pepper too
  if (
    lowercaseItem.includes("spice") ||
    lowercaseItem.includes("cinnamon") ||
    lowercaseItem.includes("paprika") ||
    lowercaseItem.includes("cumin") ||
    lowercaseItem.includes("turmeric")
  )
    return "🏺";
  if (
    lowercaseItem.includes("oil") ||
    lowercaseItem.includes("vinegar") ||
    lowercaseItem.includes("sauce") ||
    lowercaseItem.includes("soy sauce") ||
    lowercaseItem.includes("ketchup") ||
    lowercaseItem.includes("mustard")
  )
    return "🫗";
  if (
    lowercaseItem.includes("bread") ||
    lowercaseItem.includes("toast") ||
    lowercaseItem.includes("bun") ||
    lowercaseItem.includes("baguette")
  )
    return "🍞";
  if (
    lowercaseItem.includes("pasta") ||
    lowercaseItem.includes("noodle") ||
    lowercaseItem.includes("spaghetti") ||
    lowercaseItem.includes("macaroni")
  )
    return "🍝";
  if (
    lowercaseItem.includes("rice") ||
    lowercaseItem.includes("quinoa") ||
    lowercaseItem.includes("grain")
  )
    return "🍚";
  if (
    lowercaseItem.includes("water") ||
    lowercaseItem.includes("juice") ||
    lowercaseItem.includes("broth") ||
    lowercaseItem.includes("stock") ||
    lowercaseItem.includes("wine") ||
    lowercaseItem.includes("beer")
  )
    return "💧";
  if (
    lowercaseItem.includes("honey") ||
    lowercaseItem.includes("syrup") ||
    lowercaseItem.includes("maple")
  )
    return "🍯";
  if (
    lowercaseItem.includes("chocolate") ||
    lowercaseItem.includes("cocoa") ||
    lowercaseItem.includes("chip")
  )
    return "🍫";
  if (
    lowercaseItem.includes("nut") ||
    lowercaseItem.includes("almond") ||
    lowercaseItem.includes("walnut") ||
    lowercaseItem.includes("cashew") ||
    lowercaseItem.includes("peanut") ||
    lowercaseItem.includes("seed") ||
    lowercaseItem.includes("sesame") ||
    lowercaseItem.includes("sunflower")
  )
    return "🥜";
  if (lowercaseItem.includes("vanilla") || lowercaseItem.includes("extract"))
    return "🧪";
  if (
    lowercaseItem.includes("jam") ||
    lowercaseItem.includes("jelly") ||
    lowercaseItem.includes("preserve")
  )
    return "🍯";

  return "▫️"; // Default subtle bullet
}

function formatRecipeAsText(recipe: Recipe): string {
  let text = `${recipe.title.toUpperCase()}\n`;
  text += `${"=".repeat(recipe.title.length)}\n\n`;

  if (recipe.description) {
    text += `${recipe.description}\n\n`;
  }

  const stats = [];
  if (recipe.servings) stats.push(`Servings: ${recipe.servings}`);
  if (recipe.prepTime) stats.push(`Prep: ${recipe.prepTime}`);
  if (recipe.cookTime) stats.push(`Cook: ${recipe.cookTime}`);
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
