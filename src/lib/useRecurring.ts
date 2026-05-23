"use client";

import { useState, useEffect, useCallback } from "react";
import { RecurringExpense, RecurringFrequency, Expense } from "./types";

const STORAGE_KEY = "expense-tracker-recurring";

function advanceDate(date: string, frequency: RecurringFrequency): string {
  const d = new Date(date);
  switch (frequency) {
    case "daily":    d.setDate(d.getDate() + 1); break;
    case "weekly":   d.setDate(d.getDate() + 7); break;
    case "biweekly": d.setDate(d.getDate() + 14); break;
    case "monthly":  d.setMonth(d.getMonth() + 1); break;
    case "yearly":   d.setFullYear(d.getFullYear() + 1); break;
  }
  return d.toISOString().split("T")[0];
}

/** Returns all expense entries due from a rule up to `today`. */
export function generateDueExpenses(
  rule: RecurringExpense,
  today: string
): Omit<Expense, "id">[] {
  const results: Omit<Expense, "id">[] = [];

  // Start from the day after the last generated date, or the start date itself
  let current = rule.lastGenerated
    ? advanceDate(rule.lastGenerated, rule.frequency)
    : rule.startDate;

  let safety = 0;
  while (
    current <= today &&
    (!rule.endDate || current <= rule.endDate) &&
    safety < 732 // cap at 2 years of daily entries
  ) {
    results.push({
      date: current,
      description: rule.description,
      category: rule.category,
      amount: rule.amount,
      recurringId: rule.id,
    });
    current = advanceDate(current, rule.frequency);
    safety++;
  }

  return results;
}

export function useRecurring() {
  const [recurring, setRecurring] = useState<RecurringExpense[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setRecurring(JSON.parse(stored));
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(recurring));
  }, [recurring, loaded]);

  const addRecurring = useCallback(
    (rule: Omit<RecurringExpense, "id" | "lastGenerated">) => {
      setRecurring((prev) => [...prev, { ...rule, id: crypto.randomUUID() }]);
    },
    []
  );

  const updateRecurring = useCallback(
    (id: string, data: Partial<Omit<RecurringExpense, "id">>) => {
      setRecurring((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...data } : r))
      );
    },
    []
  );

  const deleteRecurring = useCallback((id: string) => {
    setRecurring((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const restoreRecurring = useCallback((rule: RecurringExpense) => {
    setRecurring((prev) => [...prev.filter((r) => r.id !== rule.id), rule]);
  }, []);

  const markGenerated = useCallback((id: string, date: string) => {
    setRecurring((prev) =>
      prev.map((r) => (r.id === id ? { ...r, lastGenerated: date } : r))
    );
  }, []);

  const renameCategory = useCallback((oldName: string, newName: string) => {
    setRecurring((prev) =>
      prev.map((r) => r.category === oldName ? { ...r, category: newName } : r)
    );
  }, []);

  return {
    recurring,
    loaded,
    addRecurring,
    updateRecurring,
    deleteRecurring,
    restoreRecurring,
    markGenerated,
    renameCategory,
  };
}
