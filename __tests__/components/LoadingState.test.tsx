import { render, screen, act } from "@testing-library/react";
import LoadingState from "@/app/components/LoadingState/LoadingState";

describe("LoadingState", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("shows loading UI and elapsed seconds", () => {
    render(<LoadingState />);

    expect(screen.getByText(/Cooking up your recipe/i)).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(screen.getByText(/5s elapsed/i)).toBeInTheDocument();
  });

  it("shows almost-ready badge after 30 seconds", () => {
    render(<LoadingState />);

    act(() => {
      jest.advanceTimersByTime(31000);
    });

    expect(screen.getByText(/Almost ready!/i)).toBeInTheDocument();
  });
});
