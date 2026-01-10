import { formatMinutes } from "../../lib/utils/timeFormatter";

describe("timeFormatter", () => {
  describe("formatMinutes", () => {
    it("should return an empty string for undefined, null, or zero", () => {
      expect(formatMinutes(undefined)).toBe("");
      expect(formatMinutes(null as any)).toBe("");
      expect(formatMinutes(0)).toBe("");
      expect(formatMinutes(-10)).toBe("");
    });

    it("should format minutes only when less than 60", () => {
      expect(formatMinutes(45)).toBe("45m");
      expect(formatMinutes(5)).toBe("5m");
    });

    it("should format hours only when exactly a multiple of 60", () => {
      expect(formatMinutes(60)).toBe("1h");
      expect(formatMinutes(120)).toBe("2h");
    });

    it("should format both hours and minutes when not a multiple of 60 and greater than 60", () => {
      expect(formatMinutes(75)).toBe("1h 15m");
      expect(formatMinutes(130)).toBe("2h 10m");
    });
  });
});
