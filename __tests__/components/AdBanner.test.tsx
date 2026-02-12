import { render, screen, waitFor } from "@testing-library/react";
import AdBanner from "@/app/components/AdBanner/AdBanner";

describe("AdBanner", () => {
  const originalClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

  afterEach(() => {
    process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID = originalClientId;
  });

  it("renders nothing for premium users", () => {
    const { container } = render(<AdBanner slot="recipe-bottom" isPremium={true} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders placeholder when AdSense client ID is missing", () => {
    delete process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
    render(<AdBanner slot="recipe-sidebar" />);

    expect(screen.getByText(/Advertisement/i)).toBeInTheDocument();
    expect(screen.getByText(/Placeholder \(recipe-sidebar\)/i)).toBeInTheDocument();
  });

  it("renders adsense ins element when client ID is configured", async () => {
    process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID = "ca-pub-123456789";
    (window as any).adsbygoogle = [];

    const { container } = render(<AdBanner slot="recipe-bottom" format="fluid" />);

    const ins = container.querySelector("ins.adsbygoogle");
    expect(ins).toBeTruthy();
    expect(ins?.getAttribute("data-ad-client")).toBe("ca-pub-123456789");
    expect(ins?.getAttribute("data-ad-slot")).toBe("recipe-bottom");
    expect(ins?.getAttribute("data-ad-format")).toBe("fluid");
  });
});
