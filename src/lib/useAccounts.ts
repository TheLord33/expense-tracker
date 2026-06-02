"use client";

import { useState, useEffect, useCallback } from "react";
import { type Account, BUILTIN_ACCOUNTS } from "./types";

export function useAccounts(companyId: string) {
  const [customAccounts, setCustomAccounts] = useState<Account[]>([]);
  const [loaded,         setLoaded]         = useState(false);

  useEffect(() => {
    setLoaded(false);
    try {
      const stored = localStorage.getItem(`folio-${companyId}-accounts`);
      setCustomAccounts(stored ? JSON.parse(stored) : []);
    } catch { /* ignore */ }
    setLoaded(true);
  }, [companyId]);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem(`folio-${companyId}-accounts`, JSON.stringify(customAccounts));
    }
  }, [customAccounts, loaded, companyId]);

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

  const replaceCustomAccounts = useCallback((incoming: Account[]) => {
    setCustomAccounts(incoming.filter((a) => !a.isBuiltin));
  }, []);

  return { accounts, addAccount, updateAccount, deleteAccount, replaceCustomAccounts, loaded };
}
