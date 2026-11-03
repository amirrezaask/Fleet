import { useCallback, useState } from "react";

export type Theme = "system" | "light" | "dark";

const KEY = "factory-theme";
const ORDER: readonly Theme[] = ["system", "light", "dark"];

function stored(): Theme {
  try {
    const value = localStorage.getItem(KEY);

    return ORDER.find((theme) => theme === value) ?? "system";
  } catch {
    return "system";
  }
}

// "system" follows prefers-color-scheme; the others pin data-theme on <html> (read by styles.css).
export interface ThemeControls {
  readonly theme: Theme;
  readonly cycle: () => void;
}

export function useTheme(): ThemeControls {
  const [theme, setTheme] = useState<Theme>(stored);

  const cycle = useCallback(() => {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length] ?? "system";

    setTheme(next);

    if (next === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = next;

    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Storage can be blocked; the choice then lasts for this visit only.
    }
  }, [theme]);

  return { theme, cycle };
}
