"use client";

import { useState, useEffect, useCallback } from "react";

export function useOpeningBalances(companyId: string) {
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [loaded,   setLoaded]   = useState(false);

  useEffect(() => {
    setLoaded(false);
    try {
      const stored = localStorage.getItem(`folio-${companyId}-opening-balances`);
      setBalances(stored ? JSON.parse(stored) : {});
    } catch { /* ignore */ }
    setLoaded(true);
  }, [companyId]);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem(`folio-${companyId}-opening-balances`, JSON.stringify(balances));
    }
  }, [balances, loaded, companyId]);

  const setBalance = useCallback((accountId: string, amount: number) => {
    setBalances((prev) => ({ ...prev, [accountId]: amount }));
  }, []);

  const setAllBalances = useCallback((next: Record<string, number>) => {
    setBalances(next);
  }, []);

  return { balances, setBalance, setAllBalances, loaded };
}
