import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorDisplay from "@/app/components/ErrorDisplay/ErrorDisplay";
import { ErrorCode } from "@/types/api";

jest.mock("@/lib/utils/cookingMessages", () => ({
  getFunnyCookingError: jest.fn(() => "funny fallback message"),
}));

describe("ErrorDisplay", () => {
  beforeEach(() => {
    Object.defineProperty(window, "scrollTo", {
      value: jest.fn(),
      writable: true,
    });
  });

  it("renders rate limit UI and handles retry", async () => {
    const user = userEvent.setup();
    const onRetry = jest.fn();

    render(
      <ErrorDisplay
        error="rate limit"
        errorCode={ErrorCode.RATE_LIMIT_EXCEEDED}
        onRetry={onRetry}
      />
    );

    expect(screen.getByText("Slow Down, Chef!")).toBeInTheDocument();
    expect(screen.getByText(/Free Tier Limits/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: /back to top/i }));
    expect(window.scrollTo).toHaveBeenCalled();
  });

  it("uses funny message for LLM errors and shows technical details", () => {
    render(
      <ErrorDisplay
        error="low-level stack"
        errorCode={ErrorCode.INTERNAL_ERROR}
      />
    );

    expect(screen.getByText("funny fallback message")).toBeInTheDocument();
    expect(screen.getByText(/Technical details: low-level stack/i)).toBeInTheDocument();
  });

  it("shows provided error for non-LLM errors", () => {
    render(
      <ErrorDisplay
        error="This URL is not valid"
        errorCode={ErrorCode.INVALID_URL}
      />
    );

    expect(screen.getByText("Invalid URL")).toBeInTheDocument();
    expect(screen.getByText("This URL is not valid")).toBeInTheDocument();
  });
});
