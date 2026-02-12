import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RecipeCard from "@/app/components/RecipeCard/RecipeCard";
import { SourceType } from "@/types/recipe";

jest.mock("next/image", () => (props: any) => {
  const { src, alt, ...rest } = props;
  return <img src={src} alt={alt} {...rest} />;
});

jest.mock("@/app/components/AdBanner/AdBanner", () => {
  return function MockAdBanner(props: { slot: string }) {
    return <div data-testid={`ad-${props.slot}`} />;
  };
});

describe("RecipeCard", () => {
  const recipe = {
    title: "Test Soup",
    description: "A simple soup",
    servings: 2,
    prepTime: 10,
    cookTime: 20,
    totalTime: 30,
    ingredients: [
      { item: "water", amount: "1", unit: "cup" },
      { item: "salt", amount: "0.5", unit: "tsp" },
    ],
    instructions: [
      { step: 1, text: "Boil water" },
      { step: 2, text: "Add salt" },
    ],
    sourceUrl: "https://example.com/soup",
    sourcePlatform: SourceType.BLOG,
    confidenceScore: 92,
    notes: ["Serve hot"],
    nutrition: { calories: 120, protein: "3g" },
  };

  beforeEach(() => {
    Object.defineProperty(window, "print", {
      value: jest.fn(),
      writable: true,
    });
  });

  it("renders primary recipe sections", () => {
    render(<RecipeCard recipe={recipe as any} />);

    expect(screen.getByText("Test Soup")).toBeInTheDocument();
    expect(screen.getByText("Ingredients")).toBeInTheDocument();
    expect(screen.getByText("Instructions")).toBeInTheDocument();
    expect(screen.getByText("Quality: 92%")).toBeInTheDocument();
    expect(screen.getByTestId("ad-recipe-sidebar")).toBeInTheDocument();
  });

  it("supports print and copy actions", async () => {
    const user = userEvent.setup();
    const writeTextSpy = jest
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue(undefined);
    render(<RecipeCard recipe={recipe as any} />);

    await user.click(screen.getByRole("button", { name: /print/i }));
    expect(window.print).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /copy/i }));
    expect(writeTextSpy).toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByText(/Recipe copied to clipboard!/i)).toBeInTheDocument();
    });
  });

  it("adjusts servings and scales ingredient amounts", async () => {
    const user = userEvent.setup();
    render(<RecipeCard recipe={recipe as any} />);

    expect(screen.getByText("1 cup")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /increase servings/i }));

    expect(screen.getByText("1.5 cup")).toBeInTheDocument();
  });

  it("switches to document view", async () => {
    const user = userEvent.setup();
    render(<RecipeCard recipe={recipe as any} />);

    await user.click(screen.getByTitle("Document View"));

    expect(screen.getByText("Preparation")).toBeInTheDocument();
  });

  it("hides invalid placeholder nutrition values", () => {
    const recipeWithInvalidNutrition = {
      ...recipe,
      nutrition: {
        protein: "fat_g",
        carbs: "sugar_g",
        fat: "protein_g",
      },
    };

    render(<RecipeCard recipe={recipeWithInvalidNutrition as any} />);

    expect(screen.queryByText("Nutrition Facts")).not.toBeInTheDocument();
    expect(screen.queryByText("fat_g")).not.toBeInTheDocument();
    expect(screen.queryByText("sugar_g")).not.toBeInTheDocument();
    expect(screen.queryByText("protein_g")).not.toBeInTheDocument();
  });
});
