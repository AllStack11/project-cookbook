"use client";

import { useState, useEffect } from "react";

const COOKING_FACTS = [
  "Honey never spoils. Archaeologists have found 3,000-year-old honey in Egyptian tombs that's still edible!",
  "White chocolate isn't technically chocolate—it contains no cocoa solids, only cocoa butter.",
  "Carrots were originally purple! Orange carrots were cultivated in the Netherlands in the 17th century.",
  "Bananas are berries, but strawberries aren't. Botanically speaking!",
  "It takes about 10 pounds of milk to make 1 pound of cheese.",
  "Tomatoes have more genes than humans—about 35,000 compared to our 20,000-25,000.",
  "Avocados are toxic to birds and most pets. Keep your guacamole to yourself!",
  "Apples float in water because they're 25% air.",
  "Capsaicin, the compound that makes peppers spicy, can't actually burn you—it just tricks your brain!",
  "Peanuts aren't nuts—they're legumes, related to beans and lentils.",
  "The watermelon you eat is 92% water. Nature's hydration!",
  "Potatoes were the first vegetable grown in space (1995, aboard the Space Shuttle Columbia).",
  "The average strawberry has about 200 seeds on its surface.",
  "Salt used to be so valuable it was used as currency. The word 'salary' comes from 'salt'.",
  "Americans eat approximately 350 slices of pizza per second.",
  "There are over 100 ways to cook an egg. Master chef Auguste Escoffier had 143 recipes!",
  "The chocolate chip cookie was invented by accident in 1938.",
  "It takes 21 pounds of milk to make 1 pound of butter.",
  "Fresh bread has a better smell than taste because your nose can detect more flavors than your tongue.",
  "The world's most expensive cake sold for $75 million—it had 4,000 real diamonds!",
  "Pineapples take about 18-24 months to grow from planting to harvest.",
  "Broccoli is a man-made vegetable, developed from wild cabbage through selective breeding.",
  "Sushi actually refers to the vinegared rice, not the raw fish. The fish is called sashimi.",
  "The hole in the middle of doughnuts was originally to help them cook more evenly.",
  "Rice is the staple food for more than half of the world's population.",
  "Lemons float in water, but limes sink due to differences in density.",
  "Almond milk was a popular drink in medieval Europe long before cow's milk became common.",
  "Grapes explode when you put them in the microwave due to plasma formation.",
  "Cucumbers are 96% water, making them one of the most hydrating vegetables.",
  "The world's most expensive mushroom is the European white truffle, selling for up to $3,600 per pound.",
  "Cashews grow on the outside of a cashew apple, which is also edible.",
  "Sweet potatoes and yams are completely different plants from different continents.",
  "Mangoes are the most consumed fruit in the world, with over 45 million tons produced annually.",
  "Cherries are a natural source of melatonin, which can help regulate sleep.",
  "Kale is one of the most nutrient-dense foods on the planet, packed with vitamins A, K, and C.",
  "Eggplants are technically berries, and they're related to tomatoes and potatoes.",
  "Corn has more genes than humans—about 32,000 compared to our 20,000-25,000.",
  "Blueberries are one of the only natural foods that are truly blue in color.",
  "Oranges weren't originally orange—they were green! The orange color comes from cold weather.",
  "Coconuts can float across oceans and still germinate when they wash ashore.",
  "Olives are too bitter to eat straight from the tree—they need to be cured first.",
  "The largest tomato ever grown weighed 10 pounds 12.7 ounces (about 4.9 kg).",
  "The color of an egg's shell depends on the breed of the chicken, not its nutritional value.",
  "Sliced bread was invented in 1928 and was advertised as 'the greatest forward step in the baking industry'.",
  "Garlic has been used for medicinal purposes for over 5,000 years.",
  "It takes about 556 worker bees to gather 1 pound of honey from about 2 million flowers.",
  "Dark chocolate contains antioxidants that can improve blood flow and lower blood pressure.",
  "The most expensive steak in the world is Japanese Wagyu, which can cost over $300 per pound.",
  "The ice cream cone was invented at the 1904 World's Fair when an ice cream vendor ran out of cups.",
  "Beer is one of the oldest prepared beverages, dating back to at least 5,000 BC.",
];

const COOKING_EMOJIS = ["🍳", "🥘", "🍲", "🥗", "🍜", "🍝", "🍛", "🥧", "🍰", "🧁"];

export default function LoadingState() {
  const [elapsed, setElapsed] = useState(0);
  const [factIndex, setFactIndex] = useState(() =>
    Math.floor(Math.random() * COOKING_FACTS.length)
  );
  const [emojiIndex, setEmojiIndex] = useState(() =>
    Math.floor(Math.random() * COOKING_EMOJIS.length)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Change fact every 6 seconds to a random one
    const factInterval = setInterval(() => {
      setFactIndex(Math.floor(Math.random() * COOKING_FACTS.length));
      setEmojiIndex(Math.floor(Math.random() * COOKING_EMOJIS.length));
    }, 6000);

    return () => clearInterval(factInterval);
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto card-cozy p-6 md:p-12 relative overflow-hidden min-h-[500px] md:min-h-[480px]">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-primary-100/30 to-transparent rounded-bl-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-herb-100/20 to-transparent rounded-tr-full pointer-events-none" />

      {/* Skeleton loader in background */}
      <div className="animate-pulse opacity-[0.04] select-none pointer-events-none hidden md:block absolute inset-6 md:inset-12">
        <div className="h-10 bg-chocolate-900 rounded-xl w-3/4 mb-6"></div>
        <div className="h-5 bg-chocolate-900 rounded-lg w-1/2 mb-12"></div>
        <div className="grid grid-cols-3 gap-6 mb-12">
          <div className="h-20 bg-chocolate-900 rounded-2xl"></div>
          <div className="h-20 bg-chocolate-900 rounded-2xl"></div>
          <div className="h-20 bg-chocolate-900 rounded-2xl"></div>
        </div>
        <div className="mb-12">
          <div className="h-8 bg-chocolate-900 rounded-lg w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-5 bg-chocolate-900 rounded-lg w-full"></div>
            ))}
          </div>
        </div>
      </div>

      {/* Main content overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full min-h-[400px]">
        <div className="bg-white rounded-4xl shadow-warm-xl border border-cream-200/60 p-8 md:p-12 max-w-2xl w-full text-center relative overflow-hidden">
          {/* Progress bar at top */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-cream-100 rounded-t-4xl overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-400 via-primary-500 to-primary-400 transition-all duration-1000 ease-linear"
              style={{ width: `${Math.min((elapsed / 45) * 100, 100)}%` }}
            />
          </div>

          {/* Animated cooking icon */}
          <div className="mb-6 md:mb-8">
            <div className="relative inline-block">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-primary-100 to-cream-100 rounded-3xl flex items-center justify-center text-4xl md:text-5xl animate-pulse-warm shadow-warm-lg">
                {COOKING_EMOJIS[emojiIndex]}
              </div>
              {/* Steam animation */}
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex gap-1">
                <div className="w-1.5 h-3 bg-cream-400/40 rounded-full animate-steam" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-3 bg-cream-400/40 rounded-full animate-steam" style={{ animationDelay: "300ms" }} />
                <div className="w-1.5 h-3 bg-cream-400/40 rounded-full animate-steam" style={{ animationDelay: "600ms" }} />
              </div>
            </div>
          </div>

          {/* Loading text */}
          <div className="space-y-3 mb-6 md:mb-8">
            <h3 className="text-2xl md:text-3xl font-black text-chocolate-900 tracking-tight">
              Cooking up your recipe...
            </h3>
            <p className="text-base md:text-lg text-chocolate-500 font-medium max-w-sm mx-auto leading-relaxed">
              Our AI is carefully reading every detail to get it just right
            </p>
          </div>

          {/* Status badges */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-cream-100 rounded-full">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <span className="text-xs font-bold text-chocolate-600 uppercase tracking-wider">
                {elapsed}s elapsed
              </span>
            </div>
            {elapsed > 30 && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-herb-50 border border-herb-200/50 rounded-full animate-fade-in">
                <span className="text-sm">✨</span>
                <span className="text-xs font-bold text-herb-700 uppercase tracking-wider">
                  Almost ready!
                </span>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="divider-warm mb-6 md:mb-8" />

          {/* Cooking fact card */}
          <div className="p-6 md:p-8 bg-gradient-to-br from-cream-50 to-cream-100/50 rounded-3xl border border-cream-200/50 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <div className="bg-white px-4 py-1.5 rounded-full border border-cream-200 shadow-warm-sm">
                <span className="text-xs font-black text-primary-600 uppercase tracking-widest">
                  Did You Know?
                </span>
              </div>
            </div>
            <p
              key={factIndex}
              className="text-base md:text-lg text-chocolate-700 leading-relaxed font-medium animate-fade-in pt-2"
            >
              {COOKING_FACTS[factIndex]}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
