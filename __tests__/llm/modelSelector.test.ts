import {
  selectModel,
  GEMINI_FLASH,
  GEMINI_FLASH_LITE,
} from "@/lib/llm/modelSelector";

describe("modelSelector", () => {
  it("uses flash-lite by default", () => {
    const model = selectModel({
      contentLength: 1000,
      sourceType: "blog",
      requestCount: 1,
    });

    expect(model).toBe(GEMINI_FLASH_LITE);
  });

  it("upgrades to flash for long content", () => {
    const model = selectModel({
      contentLength: 10001,
      sourceType: "blog",
      requestCount: 1,
    });

    expect(model).toBe(GEMINI_FLASH);
  });

  it("upgrades retry from flash-lite to flash", () => {
    const model = selectModel({
      contentLength: 500,
      sourceType: "blog",
      requestCount: 1,
      isRetry: true,
      previousModel: GEMINI_FLASH_LITE,
    });

    expect(model).toBe(GEMINI_FLASH);
  });

  it("keeps flash-lite on retry when previous model was not lite", () => {
    const model = selectModel({
      contentLength: 500,
      sourceType: "blog",
      requestCount: 1,
      isRetry: true,
      previousModel: GEMINI_FLASH,
    });

    expect(model).toBe(GEMINI_FLASH_LITE);
  });
});
