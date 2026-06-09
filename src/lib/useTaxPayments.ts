"use client";

import { useState, useEffect, useCallback } from "react";
import type { TaxPayment } from "./types";

export function useTaxPayments(companyId: string) {
  const [taxPayments, setTaxPayments] = useState<TaxPayment[]>([]);
  const [loaded,      setLoaded]      = useState(false);

  useEffect(() => {
    setLoaded(false);
    try {
      const raw = localStorage.getItem(`folio-${companyId}-tax-payments`);
      setTaxPayments(raw ? JSON.parse(raw) : []);
    } catch { /* ignore */ }
    setLoaded(true);
  }, [companyId]);

  useEffect(() => {
    if (loaded) localStorage.setItem(`folio-${companyId}-tax-payments`, JSON.stringify(taxPayments));
  }, [taxPayments, loaded, companyId]);

  const addTaxPayment = useCallback((p: Omit<TaxPayment, "id">) => {
    setTaxPayments((prev) => [...prev, { ...p, id: crypto.randomUUID() }]);
  }, []);

  const deleteTaxPayment = useCallback((id: string) => {
    setTaxPayments((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return { taxPayments, loaded, addTaxPayment, deleteTaxPayment };
}
