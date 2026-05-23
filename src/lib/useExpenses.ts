"use client";

import { useState, useEffect, useCallback } from "react";
import { Expense } from "./types";
import { SAMPLE_EXPENSES } from "./sampleData";

const STORAGE_KEY = "expense-tracker-data";

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setExpenses(JSON.parse(stored));
      } else {
        // First visit — seed with sample data
        const seeded = SAMPLE_EXPENSES.map((e) => ({
          ...e,
          id: crypto.randomUUID(),
        }));
        setExpenses(seeded);
      }
    } catch {
      // ignore corrupt storage
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  }, [expenses, loaded]);

  const addExpense = useCallback((expense: Omit<Expense, "id">) => {
    setExpenses((prev) => [
      { ...expense, id: crypto.randomUUID() },
      ...prev,
    ]);
  }, []);

  const deleteExpense = useCallback((id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const restoreExpense = useCallback((expense: Expense) => {
    setExpenses((prev) => [expense, ...prev.filter((e) => e.id !== expense.id)]);
  }, []);

  const updateExpense = useCallback(
    (id: string, data: Omit<Expense, "id">) => {
      setExpenses((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...data } : e))
      );
    },
    []
  );

  const importExpenses = useCallback(
    (incoming: Omit<Expense, "id">[], replace: boolean) => {
      const stamped = incoming.map((e) => ({ ...e, id: crypto.randomUUID() }));
      setExpenses((prev) => (replace ? stamped : [...stamped, ...prev]));
    },
    []
  );

  const renameCategory = useCallback((oldName: string, newName: string) => {
    setExpenses((prev) =>
      prev.map((e) => e.category === oldName ? { ...e, category: newName } : e)
    );
  }, []);

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return { expenses, addExpense, deleteExpense, restoreExpense, updateExpense, importExpenses, renameCategory, total, loaded };
}
