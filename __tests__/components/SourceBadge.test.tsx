import { render, screen } from "@testing-library/react";
import SourceBadge from "@/app/components/SourceBadge/SourceBadge";
import { SourceType } from "@/types/recipe";

describe("SourceBadge", () => {
  it("renders nothing without sourcePlatform", () => {
    const { container } = render(<SourceBadge />);
    expect(container.firstChild).toBeNull();
  });

  it("renders correct label for YouTube", () => {
    render(<SourceBadge sourcePlatform={SourceType.YOUTUBE} />);
    expect(screen.getByText("YouTube")).toBeInTheDocument();
  });

  it("renders text input label", () => {
    render(<SourceBadge sourcePlatform={SourceType.TEXT} />);
    expect(screen.getByText("Text Input")).toBeInTheDocument();
  });
});
