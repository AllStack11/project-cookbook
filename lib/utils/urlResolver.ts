import { matchesDomain } from "@/lib/utils/domainMatcher";

const SEARCH_ENGINE_DOMAINS = [
  "bing.com",
  "google.com",
  "duckduckgo.com",
  "search.yahoo.com",
  "yandex.com",
  "baidu.com",
];

const WRAPPED_URL_QUERY_KEYS = [
  "url",
  "u",
  "target",
  "dest",
  "destination",
  "redirect",
  "redirect_url",
  "r",
  "ru",
  "rurl",
  "adurl",
  "imgurl",
  "mediaurl",
  "uddg",
];

const SEARCH_PATH_HINTS = ["/url", "/redirect", "/redir", "/link", "/ck"];

export interface ResolveUrlResult {
  originalUrl: string;
  resolvedUrl: string;
  wasSearchEngine: boolean;
  wasResolved: boolean;
  resolutionMethod?: "query-param" | "response-url" | "page-content";
}

export function isSearchEngineUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    return SEARCH_ENGINE_DOMAINS.some((domain) =>
      matchesDomain(hostname, domain)
    );
  } catch {
    return false;
  }
}

function tryParseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function decodeCandidates(value: string): string[] {
  const candidates = new Set<string>([value]);
  let current = value;

  for (let i = 0; i < 2; i += 1) {
    try {
      const decoded = decodeURIComponent(current);
      if (decoded === current) break;
      candidates.add(decoded);
      current = decoded;
    } catch {
      break;
    }
  }

  return [...candidates];
}

function extractUrlFromValue(value: string): URL | null {
  for (const candidate of decodeCandidates(value)) {
    const parsed = tryParseUrl(candidate);
    if (parsed && (parsed.protocol === "http:" || parsed.protocol === "https:")) {
      return parsed;
    }
  }

  const embeddedHttpMatch = value.match(/https?%3A%2F%2F[^&\s]+/i);
  if (embeddedHttpMatch) {
    for (const candidate of decodeCandidates(embeddedHttpMatch[0])) {
      const parsed = tryParseUrl(candidate);
      if (
        parsed &&
        (parsed.protocol === "http:" || parsed.protocol === "https:")
      ) {
        return parsed;
      }
    }
  }

  return null;
}

function isLikelySearchRedirectPath(pathname: string): boolean {
  return SEARCH_PATH_HINTS.some((prefix) => pathname.startsWith(prefix));
}

function chooseBestCandidate(
  urls: URL[],
  sourceHostname: string
): URL | null {
  const nonSearchEngineUrls = urls.filter(
    (url) => !isSearchEngineUrl(url.toString()) && url.hostname !== sourceHostname
  );
  if (nonSearchEngineUrls.length > 0) {
    const youtubeCandidate = nonSearchEngineUrls.find((url) =>
      matchesDomain(url.hostname.toLowerCase(), "youtube.com")
    ) ??
      nonSearchEngineUrls.find((url) =>
        matchesDomain(url.hostname.toLowerCase(), "youtu.be")
      );
    return youtubeCandidate ?? nonSearchEngineUrls[0];
  }

  return null;
}

function extractUrlsFromHtml(html: string): URL[] {
  const candidates = new Set<string>();
  const directMatches = html.match(/https?:\/\/[^\s"'<>\\]+/gi) ?? [];
  const escapedMatches = html.match(/https?:\\\/\\\/[^\s"'<>]+/gi) ?? [];
  const encodedMatches = html.match(/https?%3A%2F%2F[^"'&\s<]+/gi) ?? [];

  for (const match of directMatches) candidates.add(match);
  for (const match of escapedMatches) {
    candidates.add(match.replace(/\\\//g, "/").replace(/\\u0026/g, "&"));
  }
  for (const match of encodedMatches) {
    for (const decoded of decodeCandidates(match)) {
      candidates.add(decoded);
    }
  }

  const parsedUrls: URL[] = [];
  for (const candidate of candidates) {
    const parsed = tryParseUrl(candidate);
    if (parsed && (parsed.protocol === "http:" || parsed.protocol === "https:")) {
      parsedUrls.push(parsed);
    }
  }

  return parsedUrls;
}

export async function resolveSearchEngineUrl(
  inputUrl: string
): Promise<ResolveUrlResult> {
  const parsedInput = tryParseUrl(inputUrl);
  if (!parsedInput) {
    return {
      originalUrl: inputUrl,
      resolvedUrl: inputUrl,
      wasSearchEngine: false,
      wasResolved: false,
    };
  }

  const sourceHostname = parsedInput.hostname.toLowerCase();
  const wasSearchEngine = SEARCH_ENGINE_DOMAINS.some((domain) =>
    matchesDomain(sourceHostname, domain)
  );

  if (!wasSearchEngine) {
    return {
      originalUrl: inputUrl,
      resolvedUrl: inputUrl,
      wasSearchEngine: false,
      wasResolved: false,
    };
  }

  const paramCandidates: URL[] = [];
  const queryParams = parsedInput.searchParams;

  for (const key of WRAPPED_URL_QUERY_KEYS) {
    const value = queryParams.get(key);
    if (!value) continue;
    const extracted = extractUrlFromValue(value);
    if (extracted) paramCandidates.push(extracted);
  }

  if (
    paramCandidates.length === 0 &&
    isLikelySearchRedirectPath(parsedInput.pathname.toLowerCase())
  ) {
    for (const value of queryParams.values()) {
      const extracted = extractUrlFromValue(value);
      if (extracted) paramCandidates.push(extracted);
    }
  }

  const fromParams = chooseBestCandidate(paramCandidates, sourceHostname);
  if (fromParams) {
    return {
      originalUrl: inputUrl,
      resolvedUrl: fromParams.toString(),
      wasSearchEngine: true,
      wasResolved: true,
      resolutionMethod: "query-param",
    };
  }

  try {
    const response = await fetch(inputUrl, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; RecipeExtractorBot/1.0; +https://example.com/bot)",
      },
    });

    const finalUrl = tryParseUrl(response.url);
    if (
      finalUrl &&
      !isSearchEngineUrl(finalUrl.toString()) &&
      finalUrl.toString() !== inputUrl
    ) {
      return {
        originalUrl: inputUrl,
        resolvedUrl: finalUrl.toString(),
        wasSearchEngine: true,
        wasResolved: true,
        resolutionMethod: "response-url",
      };
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("text/html")) {
      const html = await response.text();
      const htmlCandidates = extractUrlsFromHtml(html);
      const fromHtml = chooseBestCandidate(htmlCandidates, sourceHostname);
      if (fromHtml) {
        return {
          originalUrl: inputUrl,
          resolvedUrl: fromHtml.toString(),
          wasSearchEngine: true,
          wasResolved: true,
          resolutionMethod: "page-content",
        };
      }
    }
  } catch {
    // Best-effort resolver: keep original URL if network fetch fails.
  }

  return {
    originalUrl: inputUrl,
    resolvedUrl: inputUrl,
    wasSearchEngine: true,
    wasResolved: false,
  };
}
