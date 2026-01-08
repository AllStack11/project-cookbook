'use client';

import { Recipe } from '@/types/recipe';

interface RecipeCardProps {
  recipe: Recipe;
}

export default function RecipeCard({ recipe }: RecipeCardProps) {
  const handlePrint = () => {
    window.print();
  };

  const handleCopy = async () => {
    const recipeText = formatRecipeAsText(recipe);
    await navigator.clipboard.writeText(recipeText);
    alert('Recipe copied to clipboard!');
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8 print:shadow-none">
      <div className="flex justify-between items-start mb-6 print:mb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{recipe.title}</h1>
          {recipe.description && (
            <p className="text-gray-600">{recipe.description}</p>
          )}
        </div>
        <div className="flex gap-2 print:hidden">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            Print
          </button>
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            Copy
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-sm">
        {recipe.servings && (
          <div className="bg-gray-50 p-3 rounded-md">
            <span className="font-semibold">Servings:</span> {recipe.servings}
          </div>
        )}
        {recipe.prepTime && (
          <div className="bg-gray-50 p-3 rounded-md">
            <span className="font-semibold">Prep Time:</span> {recipe.prepTime}
          </div>
        )}
        {recipe.cookTime && (
          <div className="bg-gray-50 p-3 rounded-md">
            <span className="font-semibold">Cook Time:</span> {recipe.cookTime}
          </div>
        )}
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Ingredients</h2>
        <ul className="space-y-2">
          {recipe.ingredients.map((ingredient, index) => (
            <li key={index} className="flex items-start">
              <span className="mr-2 text-primary-600">•</span>
              <span>
                {ingredient.amount && ingredient.unit && (
                  <span className="font-medium">{ingredient.amount} {ingredient.unit} </span>
                )}
                {ingredient.amount && !ingredient.unit && (
                  <span className="font-medium">{ingredient.amount} </span>
                )}
                {ingredient.item}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Instructions</h2>
        <ol className="space-y-4">
          {recipe.instructions.map((instruction) => (
            <li key={instruction.step} className="flex items-start">
              <span className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-semibold mr-4">
                {instruction.step}
              </span>
              <p className="pt-1">{instruction.text}</p>
            </li>
          ))}
        </ol>
      </div>

      {recipe.notes && recipe.notes.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Notes</h2>
          <ul className="space-y-2">
            {recipe.notes.map((note, index) => (
              <li key={index} className="flex items-start text-gray-700">
                <span className="mr-2">•</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {recipe.nutrition && (
        <div className="border-t pt-6">
          <h3 className="text-xl font-bold text-gray-900 mb-3">Nutrition Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {recipe.nutrition.calories && (
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="font-semibold text-gray-600">Calories</div>
                <div className="text-lg font-bold">{recipe.nutrition.calories}</div>
              </div>
            )}
            {recipe.nutrition.protein && (
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="font-semibold text-gray-600">Protein</div>
                <div className="text-lg font-bold">{recipe.nutrition.protein}</div>
              </div>
            )}
            {recipe.nutrition.carbs && (
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="font-semibold text-gray-600">Carbs</div>
                <div className="text-lg font-bold">{recipe.nutrition.carbs}</div>
              </div>
            )}
            {recipe.nutrition.fat && (
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="font-semibold text-gray-600">Fat</div>
                <div className="text-lg font-bold">{recipe.nutrition.fat}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {recipe.sourceUrl && (
        <div className="mt-6 pt-6 border-t text-sm text-gray-500 print:block">
          Source: <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">{recipe.sourceUrl}</a>
        </div>
      )}
    </div>
  );
}

function formatRecipeAsText(recipe: Recipe): string {
  let text = `${recipe.title}\n\n`;

  if (recipe.description) {
    text += `${recipe.description}\n\n`;
  }

  if (recipe.servings || recipe.prepTime || recipe.cookTime) {
    if (recipe.servings) text += `Servings: ${recipe.servings}\n`;
    if (recipe.prepTime) text += `Prep Time: ${recipe.prepTime}\n`;
    if (recipe.cookTime) text += `Cook Time: ${recipe.cookTime}\n`;
    text += '\n';
  }

  text += 'INGREDIENTS:\n';
  recipe.ingredients.forEach(ing => {
    const amount = ing.amount && ing.unit ? `${ing.amount} ${ing.unit}` : ing.amount || '';
    text += `- ${amount} ${ing.item}\n`;
  });

  text += '\nINSTRUCTIONS:\n';
  recipe.instructions.forEach(inst => {
    text += `${inst.step}. ${inst.text}\n`;
  });

  if (recipe.notes && recipe.notes.length > 0) {
    text += '\nNOTES:\n';
    recipe.notes.forEach(note => text += `- ${note}\n`);
  }

  return text;
}
