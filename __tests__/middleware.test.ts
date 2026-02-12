/** @jest-environment node */
import { NextRequest } from "next/server";

describe("middleware", () => {
  const makeRequest = (
    path: string,
    method = "GET",
    origin?: string
  ): NextRequest => {
    const headers = new Headers();
    if (origin) headers.set("origin", origin);

    return {
      method,
      headers,
      nextUrl: { pathname: path },
    } as any;
  };

  beforeEach(() => {
    jest.resetModules();
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  it("sets CORS headers for API request with matching configured origin", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    const { middleware } = await import("@/middleware");

    const response = middleware(
      makeRequest("/api/extract", "GET", "https://app.example.com")
    );

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://app.example.com"
    );
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe(
      "GET, POST, OPTIONS"
    );
    expect(response.headers.get("Access-Control-Allow-Headers")).toBe(
      "Content-Type"
    );
  });

  it("does not set allow-origin when configured origin does not match", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    const { middleware } = await import("@/middleware");

    const response = middleware(
      makeRequest("/api/extract", "GET", "https://evil.example.com")
    );

    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("allows request origin in development-style mode when no configured URL", async () => {
    const { middleware } = await import("@/middleware");

    const response = middleware(
      makeRequest("/api/extract", "GET", "https://localhost:3000")
    );

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://localhost:3000"
    );
  });

  it("returns 204 for OPTIONS preflight", async () => {
    const { middleware } = await import("@/middleware");

    const response = middleware(
      makeRequest("/api/extract", "OPTIONS", "https://localhost:3000")
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe(
      "GET, POST, OPTIONS"
    );
  });

  it("does not inject API CORS headers for non-API path", async () => {
    const { middleware } = await import("@/middleware");

    const response = middleware(makeRequest("/", "GET", "https://x.com"));

    expect(response.headers.get("Access-Control-Allow-Methods")).toBeNull();
    expect(response.headers.get("Access-Control-Allow-Headers")).toBeNull();
  });
});

