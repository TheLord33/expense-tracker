"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { NextUIProvider } from "@nextui-org/react";
import { type Language, LANGUAGES, translate } from "@/lib/i18n";

// ── Theme ─────────────────────────────────────────────────────────────────────

type Theme = "light" | "dark";

const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void }>({
  theme: "light",
  toggleTheme: () => {},
});

export function useTheme() { return useContext(ThemeContext); }

// ── Language ──────────────────────────────────────────────────────────────────

type TFn = (key: string, vars?: Record<string, string | number>) => string;

const LanguageContext = createContext<{
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TFn;
  locale: string;
}>({
  language: "en",
  setLanguage: () => {},
  t: (key) => key,
  locale: "en-US",
});

export function useLanguage() { return useContext(LanguageContext); }

// ── Providers ─────────────────────────────────────────────────────────────────

export function Providers({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [language, setLanguageState] = useState<Language>("en");

  // Theme init
  useEffect(() => {
    const stored = localStorage.getItem("expense-tracker-theme") as Theme | null;
    if (stored === "dark" || stored === "light") setTheme(stored);
    else if (window.matchMedia("(prefers-color-scheme: dark)").matches) setTheme("dark");
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("light", theme === "light");
    localStorage.setItem("expense-tracker-theme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }

  // Language init
  useEffect(() => {
    const stored = localStorage.getItem("expense-tracker-language") as Language | null;
    if (stored && ["en", "es", "pt"].includes(stored)) setLanguageState(stored);
  }, []);

  function setLanguage(lang: Language) {
    setLanguageState(lang);
    localStorage.setItem("expense-tracker-language", lang);
  }

  const t = useCallback<TFn>(
    (key, vars) => translate(language, key, vars),
    [language]
  );

  const locale = LANGUAGES.find((l) => l.value === language)?.locale ?? "en-US";

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <LanguageContext.Provider value={{ language, setLanguage, t, locale }}>
        <NextUIProvider>{children}</NextUIProvider>
      </LanguageContext.Provider>
    </ThemeContext.Provider>
  );
}
