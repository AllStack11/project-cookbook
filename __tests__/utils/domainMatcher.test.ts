import { matchesDomain } from "@/lib/utils/domainMatcher";

describe("domainMatcher", () => {
  it("matches exact domain", () => {
    expect(matchesDomain("instagram.com", "instagram.com")).toBe(true);
  });

  it("matches valid subdomain boundary", () => {
    expect(matchesDomain("m.instagram.com", "instagram.com")).toBe(true);
  });

  it("does not match lookalike domains", () => {
    expect(matchesDomain("evilinstagram.com", "instagram.com")).toBe(false);
  });

  it("ignores trailing dots and casing", () => {
    expect(matchesDomain("Instagram.COM.", "instagram.com")).toBe(true);
  });
});
