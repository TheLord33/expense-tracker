"use client";

import { useState, useEffect, useCallback } from "react";
import { IncomeSource, IncomeFrequency } from "./types";

const STORAGE_KEY = "expense-tracker-income";

/** Convert a per-period amount to its monthly equivalent. */
export function toMonthly(amount: number, frequency: IncomeFrequency): number {
  switch (frequency) {
    case "weekly":   return (amount * 52) / 12;
    case "biweekly": return (amount * 26) / 12;
    case "monthly":  return amount;
    case "yearly":   return amount / 12;
    case "one-time": return 0; // handled separately per-month
  }
}

export function useIncome() {
  const [sources, setSources] = useState<IncomeSource[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setSources(JSON.parse(stored));
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(sources));
  }, [sources, loaded]);

  const addSource = useCallback((source: Omit<IncomeSource, "id">) => {
    setSources((prev) => [...prev, { ...source, id: crypto.randomUUID() }]);
  }, []);

  const updateSource = useCallback(
    (id: string, data: Partial<Omit<IncomeSource, "id">>) => {
      setSources((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...data } : s))
      );
    },
    []
  );

  const deleteSource = useCallback((id: string) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
  }, []);

  /** Total monthly-equivalent income for a given YYYY-MM month string (defaults to current). */
  function monthlyIncome(month?: string): number {
    const m = month ?? new Date().toISOString().slice(0, 7);
    return sources.reduce((sum, s) => {
      if (s.startDate.slice(0, 7) > m) return sum;
      if (s.endDate && s.endDate.slice(0, 7) < m) return sum;
      if (s.frequency === "one-time") {
        return s.startDate.slice(0, 7) === m ? sum + s.amount : sum;
      }
      return sum + toMonthly(s.amount, s.frequency);
    }, 0);
  }

  return { sources, loaded, addSource, updateSource, deleteSource, monthlyIncome };
}
