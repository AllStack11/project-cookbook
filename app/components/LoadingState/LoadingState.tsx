"use client";

import { useState, useEffect } from "react";

const COOKING_FACTS = [
  "🍯 Honey never spoils. Archaeologists have found 3,000-year-old honey in Egyptian tombs that's still edible!",
  "🍫 White chocolate isn't technically chocolate—it contains no cocoa solids, only cocoa butter.",
  "🥕 Carrots were originally purple! Orange carrots were cultivated in the Netherlands in the 17th century.",
  "🍌 Bananas are berries, but strawberries aren't. Botanically speaking!",
  "🧀 It takes about 10 pounds of milk to make 1 pound of cheese.",
  "🍅 Tomatoes have more genes than humans—about 35,000 compared to our 20,000-25,000.",
  "🥑 Avocados are toxic to birds and most pets. Keep your guacamole to yourself!",
  "🍎 Apples float in water because they're 25% air.",
  "🌶️ Capsaicin, the compound that makes peppers spicy, can't actually burn you—it just tricks your brain!",
  "🥜 Peanuts aren't nuts—they're legumes, related to beans and lentils.",
  "🍉 The watermelon you eat is 92% water. Nature's hydration!",
  "🥔 Potatoes were the first vegetable grown in space (1995, aboard the Space Shuttle Columbia).",
  "🍓 The average strawberry has about 200 seeds on its surface.",
  "🧂 Salt used to be so valuable it was used as currency. The word 'salary' comes from 'salt'.",
  "🍕 Americans eat approximately 350 slices of pizza per second.",
  "🥚 There are over 100 ways to cook an egg. Master chef Auguste Escoffier had 143 recipes!",
  "🍪 The chocolate chip cookie was invented by accident in 1938.",
  "🧈 It takes 21 pounds of milk to make 1 pound of butter.",
  "🥖 Fresh bread has a better smell than taste because your nose can detect more flavors than your tongue.",
  "🍰 The world's most expensive cake sold for $75 million—it had 4,000 real diamonds!",
];

export default function LoadingState() {
  const [elapsed, setElapsed] = useState(0);
  const [factIndex, setFactIndex] = useState(() =>
    Math.floor(Math.random() * COOKING_FACTS.length)
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
    }, 6000);

    return () => clearInterval(factInterval);
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto card-modern !p-12 relative overflow-hidden min-h-[500px]">
      {/* Skeleton loader in background - reduced opacity */}
      <div className="animate-pulse opacity-[0.03] select-none pointer-events-none">
        <div className="h-10 bg-stone-900 rounded-xl w-3/4 mb-6"></div>
        <div className="h-5 bg-stone-900 rounded-lg w-1/2 mb-12"></div>

        <div className="grid grid-cols-3 gap-6 mb-12">
          <div className="h-20 bg-stone-900 rounded-2xl"></div>
          <div className="h-20 bg-stone-900 rounded-2xl"></div>
          <div className="h-20 bg-stone-900 rounded-2xl"></div>
        </div>

        <div className="mb-12">
          <div className="h-8 bg-stone-900 rounded-lg w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-5 bg-stone-900 rounded-lg w-full"></div>
            ))}
          </div>
        </div>
      </div>

      {/* Overlay content - in a card centered on top of skeleton */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-8 z-10">
        <div className="bg-white rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] border border-stone-100 p-12 max-w-2xl w-full text-center relative overflow-hidden">
          {/* Subtle progress bar at the very top of the card */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-stone-50">
            <div
              className="h-full bg-primary-500 transition-all duration-1000 ease-linear"
              style={{ width: `${Math.min((elapsed / 45) * 100, 100)}%` }}
            ></div>
          </div>

          <div className="space-y-8">
            {/* Loading indicator */}
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-3">
                <div
                  className="w-2.5 h-2.5 bg-primary-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                ></div>
                <div
                  className="w-2.5 h-2.5 bg-primary-500 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                ></div>
                <div
                  className="w-2.5 h-2.5 bg-primary-500 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                ></div>
              </div>
              <h3 className="text-2xl font-black text-stone-900 tracking-tight">
                Simmering your recipe...
              </h3>
              <p className="text-stone-500 font-medium max-w-sm mx-auto leading-relaxed">
                Our AI is carefully reading every detail to ensure 100%
                accuracy.
              </p>
              <div className="flex items-center justify-center gap-4 pt-2">
                <div className="px-3 py-1 bg-stone-100 rounded-full text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                  Elapsed: {elapsed}s
                </div>
                {elapsed > 35 && (
                  <div className="px-3 py-1 bg-primary-50 rounded-full text-[10px] font-bold text-primary-600 uppercase tracking-widest animate-pulse">
                    Plating now...
                  </div>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center justify-center gap-4">
              <div className="h-px w-12 bg-stone-100"></div>
              <div className="text-stone-300">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="h-px w-12 bg-stone-100"></div>
            </div>

            {/* Cooking Facts Section */}
            <div className="p-8 bg-stone-50 rounded-[2rem] border border-stone-100 relative group">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-4 py-1 rounded-full border border-stone-100 shadow-sm text-[10px] font-black text-primary-600 tracking-[0.2em] uppercase">
                Chef's Fact
              </div>
              <p
                key={factIndex}
                className="text-lg text-stone-800 leading-relaxed animate-fade-in font-bold italic"
              >
                "{COOKING_FACTS[factIndex]}"
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
