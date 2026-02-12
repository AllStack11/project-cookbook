import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InputForm from "@/app/components/InputForm/InputForm";

describe("InputForm", () => {
  it("submits URL input and trims whitespace", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();

    render(<InputForm onSubmit={onSubmit} isLoading={false} />);

    const input = screen.getByLabelText("Recipe URL");
    await user.type(input, "  https://example.com/recipe  ");
    await user.click(screen.getByRole("button", { name: /extract recipe/i }));

    expect(onSubmit).toHaveBeenCalledWith({ url: "https://example.com/recipe" });
  });

  it("shows URL validation error for empty submit", async () => {
    const user = userEvent.setup();
    render(<InputForm onSubmit={jest.fn()} isLoading={false} />);

    await user.click(screen.getByRole("button", { name: /extract recipe/i }));

    expect(screen.getByText("Please enter a URL")).toBeInTheDocument();
  });

  it("switches to text mode and submits text", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();

    render(<InputForm onSubmit={onSubmit} isLoading={false} />);

    await user.click(screen.getByRole("button", { name: /paste text/i }));

    const textarea = screen.getByLabelText("Recipe text");
    await user.type(textarea, "  mix flour and water  ");
    await user.click(screen.getByRole("button", { name: /extract recipe/i }));

    expect(onSubmit).toHaveBeenCalledWith({ text: "mix flour and water" });
  });

  it("disables submit while loading", () => {
    render(<InputForm onSubmit={jest.fn()} isLoading={true} />);

    const button = screen.getByRole("button", { name: /extracting recipe/i });
    expect(button).toBeDisabled();
  });
});
