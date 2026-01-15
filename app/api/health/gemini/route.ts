import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { status: "offline", error: "Missing API Key" },
      { status: 500 }
    );
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Use a lightweight call to check connectivity and key validity
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

    // Minimal request to verify API status
    // listModels() is also an option but requires different permissions sometimes
    // generateContent with a tiny prompt is very reliable for status check
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: "health check" }] }],
      generationConfig: { maxOutputTokens: 1 },
    });

    await result.response;

    const response = NextResponse.json({ status: "online" });
    // Cache for 5 minutes
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=60"
    );
    return response;
  } catch (error) {
    console.error("Gemini Health Check Failed:", error);
    return NextResponse.json(
      {
        status: "offline",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
