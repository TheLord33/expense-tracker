"use client";

import { useState, useEffect, useCallback } from "react";
import { type Account, BUILTIN_ACCOUNTS } from "./types";

const STORAGE_KEY = "expense-tracker-accounts";

export function useAccounts() {
  const [customAccounts, setCustomAccounts] = useState<Account[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setCustomAccounts(JSON.parse(stored));
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(customAccounts));
  }, [customAccounts, loaded]);

  const accounts: Account[] = [...BUILTIN_ACCOUNTS, ...customAccounts].sort((a, b) =>
    a.code.localeCompare(b.code)
  );

  const addAccount = useCallback((account: Omit<Account, "id">) => {
    setCustomAccounts((prev) => [...prev, { ...account, id: crypto.randomUUID() }]);
  }, []);

  const updateAccount = useCallback((id: string, data: Partial<Omit<Account, "id">>) => {
    setCustomAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...data } : a))
    );
  }, []);

  const deleteAccount = useCallback((id: string) => {
    setCustomAccounts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return { accounts, addAccount, updateAccount, deleteAccount, loaded };
}
