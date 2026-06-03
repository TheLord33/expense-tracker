"use client";

import { useState, useEffect, useCallback } from "react";
import type { CheckRecord } from "./types";

export function useChecks(companyId: string) {
  const [checks, setChecks] = useState<CheckRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    try {
      const raw = localStorage.getItem(`folio-${companyId}-checks`);
      setChecks(raw ? JSON.parse(raw) : []);
    } catch { /* ignore */ }
    setLoaded(true);
  }, [companyId]);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem(`folio-${companyId}-checks`, JSON.stringify(checks));
    }
  }, [checks, loaded, companyId]);

  const addChecks = useCallback((incoming: Omit<CheckRecord, "id">[]) => {
    setChecks((prev) => [
      ...prev,
      ...incoming.map((c) => ({ ...c, id: crypto.randomUUID() })),
    ]);
  }, []);

  const updateCheck = useCallback((id: string, data: Partial<Omit<CheckRecord, "id">>) => {
    setChecks((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
  }, []);

  const deleteCheck = useCallback((id: string) => {
    setChecks((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const replaceChecks = useCallback((incoming: CheckRecord[]) => {
    setChecks(incoming);
  }, []);

  return { checks, loaded, addChecks, updateCheck, deleteCheck, replaceChecks };
}
