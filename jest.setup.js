import "@testing-library/jest-dom";

// Mock fetch for Node environments in Jest
if (typeof fetch === "undefined") {
  global.fetch = jest.fn();
}
