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
  "🍍 Pineapples take about 18-24 months to grow from planting to harvest.",
  "🥦 Broccoli is a man-made vegetable, developed from wild cabbage through selective breeding.",
  "🍣 Sushi actually refers to the vinegared rice, not the raw fish. The fish is called sashimi.",
  "🍩 The hole in the middle of doughnuts was originally to help them cook more evenly.",
  "🍚 Rice is the staple food for more than half of the world's population.",
  "🍋 Lemons float in water, but limes sink due to differences in density.",
  "🥛 Almond milk was a popular drink in medieval Europe long before cow's milk became common.",
  "🍇 Grapes explode when you put them in the microwave due to plasma formation.",
  "🥒 Cucumbers are 96% water, making them one of the most hydrating vegetables.",
  "🍄 The world's most expensive mushroom is the European white truffle, selling for up to $3,600 per pound.",
  "🌰 Cashews grow on the outside of a cashew apple, which is also edible.",
  "🍠 Sweet potatoes and yams are completely different plants from different continents.",
  "🥭 Mangoes are the most consumed fruit in the world, with over 45 million tons produced annually.",
  "🍒 Cherries are a natural source of melatonin, which can help regulate sleep.",
  "🥬 Kale is one of the most nutrient-dense foods on the planet, packed with vitamins A, K, and C.",
  "🍆 Eggplants are technically berries, and they're related to tomatoes and potatoes.",
  "🌽 Corn has more genes than humans—about 32,000 compared to our 20,000-25,000.",
  "🫐 Blueberries are one of the only natural foods that are truly blue in color.",
  "🍊 Oranges weren't originally orange—they were green! The orange color comes from cold weather.",
  "🥥 Coconuts can float across oceans and still germinate when they wash ashore.",
  "🫒 Olives are too bitter to eat straight from the tree—they need to be cured first.",
  "🍅 The largest tomato ever grown weighed 10 pounds 12.7 ounces (about 4.9 kg).",
  "🥚 The color of an egg's shell depends on the breed of the chicken, not its nutritional value.",
  "🍞 Sliced bread was invented in 1928 and was advertised as 'the greatest forward step in the baking industry'.",
  "🧄 Garlic has been used for medicinal purposes for over 5,000 years.",
  "🍯 It takes about 556 worker bees to gather 1 pound of honey from about 2 million flowers.",
  "🍫 Dark chocolate contains antioxidants that can improve blood flow and lower blood pressure.",
  "🥩 The most expensive steak in the world is Japanese Wagyu, which can cost over $300 per pound.",
  "🍦 The ice cream cone was invented at the 1904 World's Fair when an ice cream vendor ran out of cups.",
  "🍺 Beer is one of the oldest prepared beverages, dating back to at least 5,000 BC.",
  "🍷 A single bottle of wine contains about 1.27 kg (2.8 lbs) of grapes.",
  "🧅 Onions make you cry because they release a gas that reacts with the water in your eyes to form sulfuric acid.",
  "🥨 Pretzels were invented by monks in the early Middle Ages as a reward for children who learned their prayers.",
  "🍋 Lemon juice can remove odors from cutting boards and hands after handling garlic or fish.",
  "🥑 Avocados were once called 'alligator pears' because of their rough skin and shape.",
  "🍓 Strawberries are the only fruit with seeds on the outside—each strawberry has about 200 seeds.",
  "🥜 Peanut butter was originally developed as a protein substitute for people with poor teeth.",
  "🍕 The first pizza delivery was in 1889 when Queen Margherita of Italy requested a pizza from a local pizzeria.",
  "🍰 The world's largest cake weighed over 128,000 pounds (58,000 kg) and was made in Alabama in 1989.",
  "🍚 Saffron, made from crocus flower stigmas, is the world's most expensive spice by weight.",
  "🌶️ The Carolina Reaper is the world's hottest chili pepper, measuring over 2.2 million Scoville Heat Units.",
  "🍌 Bananas are slightly radioactive due to their potassium content, but you'd need to eat 10 million at once to get radiation poisoning.",
  "🍅 Ketchup was originally sold as medicine in the 1830s, claiming to cure diarrhea and indigestion.",
  "🥛 The world's most expensive coffee is Kopi Luwak, made from beans eaten and excreted by civet cats.",
  "🍇 Raisins were discovered accidentally when grapes dried on the vine in ancient times.",
  "🥬 Spinach became famous for its iron content due to a decimal point error—it has 3.5 mg per 100g, not 35 mg.",
  "🍄 Mushrooms are more closely related to humans than to plants—they're in the fungi kingdom.",
  "🥕 Baby carrots aren't actually baby carrots—they're regular carrots cut and shaped into small pieces.",
  "🍯 A single honeybee produces only about 1/12 teaspoon of honey in its entire lifetime.",
  "🍫 Chocolate was used as currency by the Aztecs, who valued cacao beans more than gold.",
  "🥩 The term 'steak' comes from the Old Norse word 'steik', meaning 'to roast on a stick'.",
  "🍦 The average American eats about 23 pounds of ice cream per year.",
  "🍺 The foam on beer is called the 'head' and helps release the beer's aromas.",
  "🍷 Red wine gets its color from the grape skins, which are left in during fermentation.",
  "🧅 The world's largest onion weighed 18 pounds 11 ounces (about 8.5 kg).",
  "🥨 Germany has over 1,500 types of bread, more than any other country in the world.",
  "🍋 California produces about 80% of the world's lemons.",
  "🥑 Mexico consumes more avocados than any other country—about 7 pounds per person annually.",
  "🍓 Ancient Romans believed strawberries could cure everything from melancholy to bad breath.",
  "🥜 Astronaut Alan Shepard smuggled a peanut aboard Apollo 14 for good luck.",
  "🍕 The most expensive pizza in the world costs $12,000 and is topped with caviar, lobster, and 24-karat gold flakes.",
  "🍰 Napoleon Bonaparte's wedding cake was 10 feet tall and weighed 300 pounds.",
  "🍚 Rice farming is so important in Japan that the word for 'cooked rice' (gohan) also means 'meal'.",
  "🌶️ Eating spicy food can actually help you cool down by making you sweat, which evaporates and cools your skin.",
  "🍌 The scientific name for banana is Musa sapientum, which means 'fruit of the wise men'.",
  "🍅 There are more than 10,000 varieties of tomatoes worldwide.",
  "🥛 Cheese is the most stolen food in the world, accounting for about 4% of all food theft.",
  "🍇 It takes about 2.5 pounds of grapes to make one bottle of wine.",
  "🥬 Cabbage was used by ancient Egyptians as a hangover cure before big feasts.",
  "🍄 The largest living organism on Earth is a honey fungus in Oregon that covers 2,385 acres (965 hectares).",
  "🥕 Eating too many carrots can actually turn your skin orange due to beta-carotene buildup.",
  "🍯 Bees must visit about 2 million flowers to make one pound of honey.",
  "🍫 The chocolate industry is worth over $100 billion globally.",
  "🥩 The world's largest hamburger weighed 2,014 pounds (914 kg) and was cooked in Minnesota in 2012.",
  "🍦 The waffle cone was invented at the 1904 St. Louis World's Fair when an ice cream vendor ran out of dishes.",
  "🍺 The oldest known recipe in the world is for beer, dating back to ancient Sumeria around 1800 BC.",
  "🍷 A wine bottle's 'punt' (the indentation at the bottom) originally helped strengthen hand-blown bottles.",
  "🧅 Ancient Egyptians worshipped onions, believing their spherical shape and concentric rings symbolized eternal life.",
  "🥨 The pretzel's shape is said to represent arms crossed in prayer.",
  "🍋 Meyer lemons are a cross between a lemon and a mandarin orange.",
  "🥑 An avocado tree can produce up to 500 avocados per year.",
  "🍓 Strawberries are members of the rose family.",
  "🥜 George Washington Carver developed over 300 uses for peanuts, including shampoo and shaving cream.",
  "🍕 The first pizzeria in the United States opened in New York City in 1905.",
  "🍰 The phrase 'piece of cake' originated in the 1870s when cakes were given as prizes for winning competitions.",
  "🍚 Sushi chefs in Japan train for at least 10 years before they're considered masters.",
  "🌶️ Bell peppers have zero Scoville Heat Units—they're not spicy at all!",
  "🍌 Bananas are the world's most popular fruit, with over 100 billion eaten annually.",
  "🍅 The world's largest ketchup bottle is a water tower in Collinsville, Illinois, standing 170 feet tall.",
  "🥛 Butter can be stored at room temperature for up to two weeks without spoiling.",
  "🍇 Champagne bubbles are created during a second fermentation process in the bottle.",
  "🥬 Romaine lettuce is one of the oldest cultivated vegetables, dating back to ancient Egypt.",
  "🍄 The portobello mushroom is just a mature cremini mushroom.",
  "🥕 Carrot tops are edible and can be used like parsley in salads and soups.",
  "🍯 Honeybees can recognize human faces.",
  "🍫 Eating dark chocolate can improve brain function due to its flavonoid content.",
  "🥩 The most expensive cut of beef is the tenderloin, also known as filet mignon.",
  "🍦 It takes about 50 licks to finish a single scoop of ice cream.",
  "🍺 The alcohol in beer comes from yeast eating sugar and producing carbon dioxide and ethanol.",
  "🍷 Wine gets better with age because chemical reactions continue in the bottle, softening tannins and developing flavors.",
  "🧅 Cutting onions under running water or chilling them first can reduce tears.",
  "🥨 The world's largest pretzel weighed 842 pounds (382 kg) and was made in Germany in 2008.",
  "🍋 Lemon trees can produce fruit year-round in tropical climates.",
  "🥑 Avocados have more potassium than bananas.",
  "🍓 Strawberries are the first fruit to ripen in spring.",
  "🥜 Peanuts are used in dynamite—the oil can be processed into glycerol, which is used to make nitroglycerin.",
  "🍕 The Margherita pizza was named after Queen Margherita of Italy in 1889, with toppings representing the Italian flag: red (tomato), white (mozzarella), and green (basil).",
  "🍰 The world's most expensive dessert is the 'Frozen Haute Chocolate' ice cream sundae, costing $25,000 at a New York restaurant.",
  "🍚 Rice paddies produce about 20% of the world's methane emissions due to bacteria in the waterlogged soil.",
  "🌶️ The Scoville Scale measures pepper spiciness, named after its creator, Wilbur Scoville, in 1912.",
  "🍌 The banana plant is not a tree—it's the world's largest herb.",
  "🍅 Tomatoes are the world's most popular fruit, with over 170 million tons produced annually.",
  "🥛 The world's oldest cheese was found in an Egyptian tomb and is over 3,200 years old.",
  "🍇 Wine grapes are different from table grapes—they're smaller, sweeter, and have thicker skins.",
  "🥬 The word 'salad' comes from the Latin 'salata', meaning 'salted things'.",
  "🍄 Some mushrooms can glow in the dark due to a chemical reaction called bioluminescence.",
  "🥕 The world's longest carrot measured 20 feet 5.9 inches (6.245 meters).",
  "🍯 Bees communicate through dance—the 'waggle dance' tells other bees where to find flowers.",
  "🍫 Switzerland consumes the most chocolate per capita—about 19.8 pounds per person per year.",
  "🥩 Dry-aged beef develops its flavor from enzymes breaking down muscle tissue and moisture evaporating.",
  "🍦 The ice cream sundae was invented when ice cream sodas couldn't be sold on Sundays due to blue laws.",
  "🍺 The world's strongest beer has 67.5% alcohol by volume.",
  "🍷 A wine's 'legs' or 'tears' (the droplets that form on the glass) indicate alcohol content, not quality.",
  "🧅 Onions and garlic are both members of the allium family, along with leeks, chives, and shallots.",
  "🥨 Soft pretzels were brought to America by German immigrants in the 19th century.",
  "🍋 Lemon juice can lighten hair color when exposed to sunlight.",
  "🥑 Avocado seeds can be grown into houseplants, though they may not produce fruit.",
  "🍓 Strawberries are the only fruit with seeds on the outside.",
  "🥜 It takes about 540 peanuts to make a 12-ounce jar of peanut butter.",
  "🍕 The world's largest pizza was made in Rome in 2012 and measured 13,580.28 square feet (1,261.65 m²).",
  "🍰 The world's tallest cake was over 108 feet (33 meters) tall, made in Indonesia in 2008.",
  "🍚 Sake is made from fermented rice and is often called 'rice wine', but it's actually brewed more like beer.",
  "🌶️ Eating spicy food releases endorphins, which are natural painkillers that create a feeling of euphoria.",
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
