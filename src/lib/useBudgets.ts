"use client";

import { useState, useEffect, useCallback } from "react";
import { Budget } from "./types";

const STORAGE_KEY = "expense-tracker-budgets";

export function useBudgets() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setBudgets(JSON.parse(stored));
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(budgets));
  }, [budgets, loaded]);

  const addBudget = useCallback((category: string, monthlyLimit: number) => {
    setBudgets((prev) => [
      ...prev,
      { id: crypto.randomUUID(), category, monthlyLimit },
    ]);
  }, []);

  const updateBudget = useCallback((id: string, monthlyLimit: number) => {
    setBudgets((prev) =>
      prev.map((b) => (b.id === id ? { ...b, monthlyLimit } : b))
    );
  }, []);

  const deleteBudget = useCallback((id: string) => {
    setBudgets((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const restoreBudget = useCallback((budget: Budget) => {
    setBudgets((prev) => [...prev.filter((b) => b.id !== budget.id), budget]);
  }, []);

  const renameCategory = useCallback((oldName: string, newName: string) => {
    setBudgets((prev) =>
      prev.map((b) => b.category === oldName ? { ...b, category: newName } : b)
    );
  }, []);

  return { budgets, addBudget, updateBudget, deleteBudget, restoreBudget, renameCategory };
}
