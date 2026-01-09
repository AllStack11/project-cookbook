import { createLogger } from "./logger";

const logger = createLogger("Utils:VPNDetector");

/**
 * Detects if a request is coming from a VPN, proxy, or hosting provider.
 * This is a multi-layered check using:
 * 1. Known headers (Vercel/Cloudflare specific)
 * 2. IP Intelligence APIs (Optional placeholder)
 */
export async function isSuspiciousIP(
  ip: string,
  headers: Headers
): Promise<{
  isSuspicious: boolean;
  reason?: string;
  confidence: number;
}> {
  // 1. Check for common VPN/Proxy headers
  // Some CDNs or proxies add these headers (currently unused but may be used in future enhancements)

  // If there are multiple hops in x-forwarded-for, it's more likely to be a proxy/VPN
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor && forwardedFor.split(",").length > 2) {
    logger.warn("Suspicious multi-hop connection detected", {
      ip,
      hops: forwardedFor,
    });
    return {
      isSuspicious: true,
      reason: "Multi-hop proxy detected",
      confidence: 0.7,
    };
  }

  // 2. Vercel-specific checks (if applicable)
  // Vercel sometimes provides location info that can be inconsistent with VPNs
  // Currently unused but may be used for future geo-based detection
  // const country = headers.get("x-vercel-ip-country");
  // const city = headers.get("x-vercel-ip-city");

  // If we wanted to use an external API like ip-api.com (Free for non-commercial)
  // try {
  //   const response = await fetch(`http://ip-api.com/json/${ip}?fields=proxy,hosting`);
  //   const data = await response.json();
  //   if (data.proxy || data.hosting) {
  //     return { isSuspicious: true, reason: data.proxy ? "VPN/Proxy" : "Hosting Provider", confidence: 0.9 };
  //   }
  // } catch (e) {
  //   logger.error("Failed to check external IP intelligence", e);
  // }

  return { isSuspicious: false, confidence: 0 };
}
