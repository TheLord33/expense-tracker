"use client";

import { useState, useEffect, useCallback } from "react";
import type { PayRun } from "./types";

export function usePayRuns(companyId: string) {
  const [payRuns, setPayRuns] = useState<PayRun[]>([]);
  const [loaded,  setLoaded]  = useState(false);

  useEffect(() => {
    setLoaded(false);
    try {
      const raw = localStorage.getItem(`folio-${companyId}-pay-runs`);
      setPayRuns(raw ? JSON.parse(raw) : []);
    } catch { /* ignore */ }
    setLoaded(true);
  }, [companyId]);

  useEffect(() => {
    if (loaded) localStorage.setItem(`folio-${companyId}-pay-runs`, JSON.stringify(payRuns));
  }, [payRuns, loaded, companyId]);

  const addPayRun = useCallback((r: Omit<PayRun, "id" | "createdAt">) => {
    setPayRuns((prev) => [
      ...prev,
      { ...r, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
    ]);
  }, []);

  const updatePayRun = useCallback((id: string, data: Partial<Omit<PayRun, "id">>) => {
    setPayRuns((prev) => prev.map((r) => r.id === id ? { ...r, ...data } : r));
  }, []);

  const deletePayRun = useCallback((id: string) => {
    setPayRuns((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return { payRuns, loaded, addPayRun, updatePayRun, deletePayRun };
}
