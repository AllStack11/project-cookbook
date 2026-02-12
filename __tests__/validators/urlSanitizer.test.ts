import dns from "dns";
import { validateUrlSafety } from "@/lib/utils/urlSanitizer";

jest.mock("dns", () => ({
  __esModule: true,
  default: {
    promises: {
      lookup: jest.fn(),
    },
  },
}));

const mockLookup = dns.promises.lookup as jest.MockedFunction<
  typeof dns.promises.lookup
>;

describe("urlSanitizer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("blocks localhost hostnames", async () => {
    const result = await validateUrlSafety("http://localhost:3000");
    expect(result.safe).toBe(false);
  });

  it("blocks private IP literals", async () => {
    const result = await validateUrlSafety("http://192.168.1.10/recipe");
    expect(result.safe).toBe(false);
  });

  it("fails closed on DNS resolution errors", async () => {
    mockLookup.mockRejectedValue(new Error("dns failure"));
    const result = await validateUrlSafety("https://example.com/recipe");
    expect(result.safe).toBe(false);
    expect(result.error).toContain("could not be resolved safely");
  });

  it("blocks hostnames resolving to private IPs", async () => {
    mockLookup.mockResolvedValue([
      { address: "93.184.216.34", family: 4 },
      { address: "10.0.0.5", family: 4 },
    ] as unknown as Awaited<ReturnType<typeof dns.promises.lookup>>);

    const result = await validateUrlSafety("https://example.com/recipe");
    expect(result.safe).toBe(false);
  });

  it("allows hostnames resolving only to public IPs", async () => {
    mockLookup.mockResolvedValue([
      { address: "93.184.216.34", family: 4 },
      { address: "2606:2800:220:1:248:1893:25c8:1946", family: 6 },
    ] as unknown as Awaited<ReturnType<typeof dns.promises.lookup>>);

    const result = await validateUrlSafety("https://example.com/recipe");
    expect(result.safe).toBe(true);
  });
});
