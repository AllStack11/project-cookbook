const STORAGE_KEY = "jtr-preferences";

export interface UserPreferences {
  viewMode?: "grid" | "list";
  servings?: number;
}

const defaults: UserPreferences = {
  viewMode: "list",
  servings: 4,
};

export function loadPreferences(): UserPreferences {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

export function savePreferences(prefs: Partial<UserPreferences>): void {
  if (typeof window === "undefined") return;
  try {
    const current = loadPreferences();
    const updated = { ...current, ...prefs };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // localStorage unavailable (private browsing, quota exceeded)
  }
}
