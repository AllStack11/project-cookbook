import { loadPreferences, savePreferences } from "@/lib/utils/preferences";

describe("preferences", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns defaults when no preferences are saved", () => {
    expect(loadPreferences()).toEqual({ viewMode: "list", servings: 4 });
  });

  it("loads saved preferences and merges defaults", () => {
    localStorage.setItem("jtr-preferences", JSON.stringify({ viewMode: "grid" }));

    expect(loadPreferences()).toEqual({ viewMode: "grid", servings: 4 });
  });

  it("returns defaults for invalid JSON", () => {
    localStorage.setItem("jtr-preferences", "{invalid-json");

    expect(loadPreferences()).toEqual({ viewMode: "list", servings: 4 });
  });

  it("saves and merges updates", () => {
    savePreferences({ viewMode: "grid" });
    savePreferences({ servings: 2 });

    const raw = localStorage.getItem("jtr-preferences");
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!)).toEqual({ viewMode: "grid", servings: 2 });
  });
});
