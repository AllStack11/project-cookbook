import { NextResponse } from "next/server";
import { createLogger } from "@/lib/utils/logger";
import { checkLLMProviderHealth } from "@/lib/llm/provider";
import { selectModelCandidates } from "@/lib/llm/modelSelector";
import { kv } from "@vercel/kv";

const logger = createLogger("API:HealthCheck");

export async function GET() {
  // Pinging KV database to prevent auto-archiving (keep-alive heartbeat)
  try {
    await kv.get("healthcheck:ping");
  } catch (e) {
    logger.warn("KV keep-alive ping failed", { error: e });
  }

  const models = selectModelCandidates({
    contentLength: 0,
    sourceType: "healthcheck",
    requestCount: 0,
  }).map((candidate) => candidate.model);

  try {
    for (const model of models) {
      const isOnline = await checkLLMProviderHealth(model);
      if (isOnline) {
        const response = NextResponse.json({ status: "online" });
        response.headers.set(
          "Cache-Control",
          "public, s-maxage=60, stale-while-revalidate=30"
        );
        return response;
      }
    }

    return NextResponse.json({ status: "offline" }, { status: 503 });
  } catch (error) {
    logger.error("LLM health check failed", { error, models });
    return NextResponse.json({ status: "offline" }, { status: 503 });
  }
}
