import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ORIGIN = process.env.NEXT_PUBLIC_APP_URL || "";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const origin = request.headers.get("origin");

  // CORS for API routes
  if (request.nextUrl.pathname.startsWith("/api/")) {
    // Only allow same-origin or the configured app URL
    if (origin) {
      if (ALLOWED_ORIGIN && origin === ALLOWED_ORIGIN) {
        response.headers.set("Access-Control-Allow-Origin", origin);
      } else if (!ALLOWED_ORIGIN) {
        // During development with no configured URL, allow the request origin
        response.headers.set("Access-Control-Allow-Origin", origin);
      }
      // If origin doesn't match, don't set the header (browser will block)
    }

    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, OPTIONS"
    );
    response.headers.set("Access-Control-Allow-Headers", "Content-Type");

    // Handle preflight requests
    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: response.headers,
      });
    }
  }

  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
