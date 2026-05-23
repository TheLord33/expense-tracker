"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { NextUIProvider } from "@nextui-org/react";
import { type Language, LANGUAGES, translate } from "@/lib/i18n";
import { type Currency, CURRENCIES, DEFAULT_CURRENCY, formatAmount, formatAmountCompact } from "@/lib/currencies";

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

// ── Currency ──────────────────────────────────────────────────────────────────

const CurrencyContext = createContext<{
  currency: Currency;
  setCurrency: (c: Currency) => void;
  fmt: (amount: number) => string;
  fmtCompact: (amount: number) => string;
}>({
  currency: DEFAULT_CURRENCY,
  setCurrency: () => {},
  fmt: (n) => `$${n.toFixed(2)}`,
  fmtCompact: (n) => `$${n.toFixed(2)}`,
});

export function useCurrency() { return useContext(CurrencyContext); }

// ── Toast ─────────────────────────────────────────────────────────────────────

interface Toast {
  id: string;
  message: string;
  undoFn?: () => void;
}

const ToastContext = createContext<{ showToast: (message: string, undoFn?: () => void) => void }>({
  showToast: () => {},
});

export function useToast() { return useContext(ToastContext); }

// ── Providers ─────────────────────────────────────────────────────────────────

export function Providers({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [language, setLanguageState] = useState<Language>("en");
  const [currency, setCurrencyState] = useState<Currency>(DEFAULT_CURRENCY);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timerRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

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

  // Currency init
  useEffect(() => {
    const stored = localStorage.getItem("expense-tracker-currency");
    if (stored) {
      const found = CURRENCIES.find((c) => c.code === stored);
      if (found) setCurrencyState(found);
    }
  }, []);

  function setCurrency(c: Currency) {
    setCurrencyState(c);
    localStorage.setItem("expense-tracker-currency", c.code);
  }

  const fmt = useCallback((amount: number) => formatAmount(amount, currency), [currency]);
  const fmtCompact = useCallback((amount: number) => formatAmountCompact(amount, currency), [currency]);

  // Language init
  useEffect(() => {
    const stored = localStorage.getItem("expense-tracker-language") as Language | null;
    if (stored && ["en", "es", "pt", "fr", "de", "it", "ja"].includes(stored)) setLanguageState(stored);
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

  const dismissToast = useCallback((id: string) => {
    clearTimeout(timerRefs.current.get(id));
    timerRefs.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, undoFn?: () => void) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, undoFn }]);
    const timer = setTimeout(() => dismissToast(id), 5000);
    timerRefs.current.set(id, timer);
  }, [dismissToast]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <LanguageContext.Provider value={{ language, setLanguage, t, locale }}>
        <CurrencyContext.Provider value={{ currency, setCurrency, fmt, fmtCompact }}>
        <ToastContext.Provider value={{ showToast }}>
          <NextUIProvider>{children}</NextUIProvider>
          {/* Toast stack */}
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none">
            {toasts.map((toast) => (
              <div
                key={toast.id}
                className="pointer-events-auto flex items-center gap-3 bg-gray-900 dark:bg-gray-800 text-white text-sm px-4 py-3 rounded-xl shadow-2xl animate-fade-in"
              >
                <span>{toast.message}</span>
                {toast.undoFn && (
                  <button
                    className="font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                    onClick={() => {
                      toast.undoFn?.();
                      dismissToast(toast.id);
                    }}
                  >
                    {t("toast.undo")}
                  </button>
                )}
                <button
                  className="ml-1 text-gray-400 hover:text-white transition-colors text-base leading-none"
                  onClick={() => dismissToast(toast.id)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </ToastContext.Provider>
        </CurrencyContext.Provider>
      </LanguageContext.Provider>
    </ThemeContext.Provider>
  );
}
