import { createLogger } from "./logger";

const logger = createLogger("Utils:VPNDetector");

const SUSPICIOUS_THRESHOLD = 0.5;

// Known bot/automation user-agent patterns
const BOT_UA_PATTERNS = [
  /curl\//i,
  /wget\//i,
  /python-requests/i,
  /axios\//i,
  /node-fetch/i,
  /httpie/i,
  /postman/i,
  /insomnia/i,
  /scrapy/i,
  /phantomjs/i,
  /headlesschrome/i,
];

/**
 * Detects if a request is coming from a VPN, proxy, or hosting provider.
 * Uses a scoring system with multiple signals.
 */
export async function isSuspiciousIP(
  ip: string,
  headers: Headers
): Promise<{
  isSuspicious: boolean;
  reason?: string;
  confidence: number;
}> {
  let score = 0;
  const reasons: string[] = [];

  // 1. Multi-hop proxy detection
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor && forwardedFor.split(",").length > 2) {
    score += 0.3;
    reasons.push("Multi-hop proxy detected");
  }

  // 2. Missing or empty IP
  if (!ip || ip === "unknown") {
    score += 0.4;
    reasons.push("No IP address available");
  }

  // 3. Vercel geo-header checks
  const country = headers.get("x-vercel-ip-country");
  const timezone = headers.get("x-vercel-ip-timezone");

  // Missing geo data when on Vercel suggests proxy/VPN hiding location
  const isVercel = !!(process.env.VERCEL || process.env.AWS_EXECUTION_ENV);
  if (isVercel && !country) {
    score += 0.2;
    reasons.push("Missing geo data on Vercel");
  }

  // Timezone mismatch with country can indicate VPN
  if (country && timezone) {
    const mismatch = detectGeoMismatch(country, timezone);
    if (mismatch) {
      score += 0.2;
      reasons.push(`Geo mismatch: ${country} with timezone ${timezone}`);
    }
  }

  // 4. User-agent analysis
  const userAgent = headers.get("user-agent") || "";
  if (!userAgent) {
    score += 0.3;
    reasons.push("Missing user-agent");
  } else {
    for (const pattern of BOT_UA_PATTERNS) {
      if (pattern.test(userAgent)) {
        score += 0.4;
        reasons.push("Bot/automation user-agent detected");
        break;
      }
    }
  }

  const isSuspicious = score >= SUSPICIOUS_THRESHOLD;

  if (isSuspicious) {
    logger.warn("Suspicious request detected", {
      ip,
      score,
      reasons,
    });
  }

  return {
    isSuspicious,
    reason: reasons.length > 0 ? reasons.join("; ") : undefined,
    confidence: Math.min(score, 1),
  };
}

/**
 * Basic geo mismatch detection between country code and timezone.
 */
function detectGeoMismatch(country: string, timezone: string): boolean {
  const countryTimezoneMap: Record<string, string[]> = {
    US: ["America/"],
    CA: ["America/"],
    GB: ["Europe/London"],
    DE: ["Europe/Berlin"],
    FR: ["Europe/Paris"],
    JP: ["Asia/Tokyo"],
    AU: ["Australia/"],
    IN: ["Asia/Kolkata", "Asia/Calcutta"],
    BR: ["America/Sao_Paulo", "America/Fortaleza"],
    CN: ["Asia/Shanghai"],
  };

  const expectedPrefixes = countryTimezoneMap[country];
  if (!expectedPrefixes) return false;

  return !expectedPrefixes.some((prefix) => timezone.startsWith(prefix));
}
