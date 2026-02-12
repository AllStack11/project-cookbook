/** @jest-environment node */
import { NextResponse } from "next/server";
import { POST } from "@/app/api/extract/route";
import { ErrorCode, StatusCode } from "@/types/api";
import { SourceType } from "@/types/recipe";

jest.mock("@/lib/api/requestValidation", () => ({
  validateAndAuthorizeRequest: jest.fn(),
}));

jest.mock("@/lib/api/extractContent", () => ({
  extractContentFromUrl: jest.fn(),
}));

jest.mock("@/lib/api/processWithLLM", () => ({
  processContentWithLLM: jest.fn(),
}));

jest.mock("@/lib/utils/logger", () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    perf: jest.fn(),
  })),
}));

import { validateAndAuthorizeRequest } from "@/lib/api/requestValidation";
import { extractContentFromUrl } from "@/lib/api/extractContent";
import { processContentWithLLM } from "@/lib/api/processWithLLM";

const mockValidateAndAuthorizeRequest =
  validateAndAuthorizeRequest as jest.MockedFunction<
    typeof validateAndAuthorizeRequest
  >;
const mockExtractContentFromUrl = extractContentFromUrl as jest.MockedFunction<
  typeof extractContentFromUrl
>;
const mockProcessContentWithLLM = processContentWithLLM as jest.MockedFunction<
  typeof processContentWithLLM
>;

describe("extract route", () => {
  const request = {
    headers: new Headers(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns validation response when request validation fails", async () => {
    const validationResponse = NextResponse.json(
      {
        success: false,
        error: "Bad input",
      },
      { status: StatusCode.BAD_REQUEST }
    );

    mockValidateAndAuthorizeRequest.mockResolvedValue(validationResponse as any);

    const response = await POST(request);

    expect(response.status).toBe(StatusCode.BAD_REQUEST);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: "Bad input",
    });
  });

  it("handles URL flow and delegates to extraction + LLM", async () => {
    mockValidateAndAuthorizeRequest.mockResolvedValue({
      url: "https://example.com/recipe",
      ip: "1.1.1.1",
      isSuspicious: false,
    } as any);

    mockExtractContentFromUrl.mockResolvedValue({
      content: "page content",
      sourceType: SourceType.BLOG,
      sourceUrl: "https://example.com/recipe",
    } as any);

    mockProcessContentWithLLM.mockResolvedValue(
      NextResponse.json({ success: true }) as any
    );

    const response = await POST(request);

    expect(mockExtractContentFromUrl).toHaveBeenCalledWith(
      "https://example.com/recipe",
      "1.1.1.1",
      false,
      expect.any(Number),
      request
    );
    expect(mockProcessContentWithLLM).toHaveBeenCalledWith(
      "page content",
      SourceType.BLOG,
      "1.1.1.1",
      "https://example.com/recipe",
      expect.any(Number),
      request,
      false
    );

    expect(response.status).toBe(StatusCode.OK);
  });

  it("returns early extraction response for cache-hit or bypass", async () => {
    mockValidateAndAuthorizeRequest.mockResolvedValue({
      url: "https://example.com/recipe",
      ip: "1.1.1.1",
      isSuspicious: false,
    } as any);

    mockExtractContentFromUrl.mockResolvedValue({
      response: NextResponse.json({ success: true, metadata: { cacheHit: true } }),
    } as any);

    const response = await POST(request);

    expect(mockProcessContentWithLLM).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      metadata: { cacheHit: true },
    });
  });

  it("handles direct text flow without URL extraction", async () => {
    mockValidateAndAuthorizeRequest.mockResolvedValue({
      text: "recipe text",
      ip: "2.2.2.2",
      isSuspicious: true,
    } as any);

    mockProcessContentWithLLM.mockResolvedValue(
      NextResponse.json({ success: true }) as any
    );

    const response = await POST(request);

    expect(mockExtractContentFromUrl).not.toHaveBeenCalled();
    expect(mockProcessContentWithLLM).toHaveBeenCalledWith(
      "recipe text",
      SourceType.TEXT,
      "2.2.2.2",
      "",
      expect.any(Number),
      request,
      true
    );

    expect(response.status).toBe(StatusCode.OK);
  });

  it("returns internal error on unexpected exception", async () => {
    mockValidateAndAuthorizeRequest.mockRejectedValue(new Error("boom"));

    const response = await POST(request);

    expect(response.status).toBe(StatusCode.INTERNAL_SERVER_ERROR);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      errorCode: ErrorCode.INTERNAL_ERROR,
    });
  });
});

