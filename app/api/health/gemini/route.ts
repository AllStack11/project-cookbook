import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("API:HealthCheck");

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ status: "offline" }, { status: 503 });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-lite",
    });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: "health check" }] }],
      generationConfig: { maxOutputTokens: 1 },
    });

    await result.response;

    const response = NextResponse.json({ status: "online" });
    // Cache for 1 minute with stale-while-revalidate
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=30"
    );
    return response;
  } catch (error) {
    logger.error("Gemini health check failed", { error });
    return NextResponse.json({ status: "offline" }, { status: 503 });
  }
}
