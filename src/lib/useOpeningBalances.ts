"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "expense-tracker-opening-balances";

export function useOpeningBalances() {
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setBalances(JSON.parse(stored));
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(balances));
  }, [balances, loaded]);

  const setBalance = useCallback((accountId: string, amount: number) => {
    setBalances((prev) => ({ ...prev, [accountId]: amount }));
  }, []);

  const setAllBalances = useCallback((next: Record<string, number>) => {
    setBalances(next);
  }, []);

  return { balances, setBalance, setAllBalances, loaded };
}
