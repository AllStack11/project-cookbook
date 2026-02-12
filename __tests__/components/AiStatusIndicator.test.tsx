import { render, screen, waitFor } from "@testing-library/react";
import AiStatusIndicator from "@/app/components/AiStatusIndicator";

describe("AiStatusIndicator", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("shows online status when health endpoint returns online", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({ status: "online" }),
    } as any);

    render(<AiStatusIndicator />);

    await waitFor(() => {
      expect(screen.getByText("AI-Powered Extraction")).toBeInTheDocument();
    });
  });

  it("shows offline status on fetch failure", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("network"));

    render(<AiStatusIndicator />);

    await waitFor(() => {
      expect(screen.getByText("AI Offline")).toBeInTheDocument();
    });
  });
});
