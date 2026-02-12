import dns from "dns";

const BLOCKED_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^.*\.local$/i,
  /^.*\.internal$/i,
  /^metadata\.google\.internal$/i,
];

/**
 * Check if an IP address is in a private/reserved range
 */
function isPrivateIP(ip: string): boolean {
  // IPv4 private/reserved ranges
  const ipv4Patterns = [
    /^127\./, // Loopback
    /^10\./, // Class A private
    /^172\.(1[6-9]|2\d|3[01])\./, // Class B private
    /^192\.168\./, // Class C private
    /^169\.254\./, // Link-local
    /^0\./, // Current network
    /^100\.(6[4-9]|[7-9]\d|1[0-2]\d)\./, // Shared address space (CGN)
    /^192\.0\.0\./, // IETF protocol assignments
    /^198\.1[89]\./, // Benchmarking
    /^224\./, // Multicast
    /^240\./, // Reserved
    /^255\.255\.255\.255$/, // Broadcast
  ];

  // IPv6 private/reserved
  const ipv6Patterns = [
    /^::1$/, // Loopback
    /^fc00:/i, // Unique local
    /^fd/i, // Unique local
    /^fe80:/i, // Link-local
    /^::$/,  // Unspecified
    /^::ffff:(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|0\.)/i, // IPv4-mapped
  ];

  for (const pattern of ipv4Patterns) {
    if (pattern.test(ip)) return true;
  }
  for (const pattern of ipv6Patterns) {
    if (pattern.test(ip)) return true;
  }

  return false;
}

/**
 * Validate that a URL is safe to fetch (not pointing to internal/private resources)
 */
export async function validateUrlSafety(
  url: string
): Promise<{ safe: boolean; error?: string }> {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return { safe: false, error: "Invalid URL format" };
  }

  // Block non-HTTP(S) protocols
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { safe: false, error: "Only HTTP and HTTPS URLs are allowed" };
  }

  // Block known internal hostnames
  for (const pattern of BLOCKED_HOSTNAME_PATTERNS) {
    if (pattern.test(parsed.hostname)) {
      return { safe: false, error: "URL points to a restricted address" };
    }
  }

  // Check if hostname is already an IP address
  const ipLiteralMatch = parsed.hostname.match(
    /^\[?([\da-fA-F:]+)\]?$|^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/
  );
  if (ipLiteralMatch) {
    const ip = ipLiteralMatch[1] || ipLiteralMatch[2];
    if (isPrivateIP(ip)) {
      return { safe: false, error: "URL points to a restricted address" };
    }
    return { safe: true };
  }

  // Resolve hostname to IP and check
  try {
    const lookup = dns.promises.lookup;
    const addresses = await lookup(parsed.hostname, { all: true, verbatim: true });
    if (addresses.length === 0) {
      return { safe: false, error: "URL hostname did not resolve to an address" };
    }

    if (addresses.some(({ address }) => isPrivateIP(address))) {
      return { safe: false, error: "URL resolves to a restricted address" };
    }
  } catch {
    // Fail closed on DNS failures to reduce SSRF bypass risk in ambiguous cases
    return { safe: false, error: "URL hostname could not be resolved safely" };
  }

  return { safe: true };
}
