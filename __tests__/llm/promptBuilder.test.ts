import {
  buildRecipeExtractionPrompt,
  buildFallbackPrompt,
} from "@/lib/llm/promptBuilder";
import { SourceType } from "@/types/recipe";

describe("promptBuilder", () => {
  it("includes source-specific guidance for YouTube", () => {
    const prompt = buildRecipeExtractionPrompt("video content", SourceType.YOUTUBE);

    expect(prompt).toContain("YouTube content");
    expect(prompt).toContain("CRITICAL SECURITY INSTRUCTION");
    expect(prompt).toContain("noRecipeFound");
  });

  it("includes source-specific guidance for Instagram", () => {
    const prompt = buildRecipeExtractionPrompt("caption", SourceType.INSTAGRAM);

    expect(prompt).toContain("Instagram post caption");
    expect(prompt).toContain("infer reasonable cooking instructions");
  });

  it("builds total fallback prompt when title is missing", () => {
    const prompt = buildFallbackPrompt(
      { title: "", ingredients: [], instructions: [] } as any,
      "context",
      ["title"]
    );

    expect(prompt).toContain("Generate a complete, high-quality recipe");
    expect(prompt).toContain("isGenerated");
  });

  it("builds partial fallback prompt when specific fields are missing", () => {
    const prompt = buildFallbackPrompt(
      { title: "Soup", ingredients: [], instructions: [] } as any,
      "context",
      ["ingredients", "instructions"]
    );

    expect(prompt).toContain("Enhance and complete the following partial recipe");
    expect(prompt).toContain("fields were missing or invalid");
    expect(prompt).toContain("ingredients, instructions");
  });
});
