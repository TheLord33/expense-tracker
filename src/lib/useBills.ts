"use client";

import { useState, useEffect, useCallback } from "react";
import type { Bill, BillPayment } from "./types";

export function useBills(companyId: string) {
  const [bills,        setBills]        = useState<Bill[]>([]);
  const [billPayments, setBillPayments] = useState<BillPayment[]>([]);
  const [loaded,       setLoaded]       = useState(false);

  useEffect(() => {
    setLoaded(false);
    try {
      const b = localStorage.getItem(`folio-${companyId}-bills`);
      const p = localStorage.getItem(`folio-${companyId}-bill-payments`);
      setBills(b ? JSON.parse(b) : []);
      setBillPayments(p ? JSON.parse(p) : []);
    } catch { /* ignore */ }
    setLoaded(true);
  }, [companyId]);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem(`folio-${companyId}-bills`,         JSON.stringify(bills));
      localStorage.setItem(`folio-${companyId}-bill-payments`, JSON.stringify(billPayments));
    }
  }, [bills, billPayments, loaded, companyId]);

  // ── Bills ────────────────────────────────────────────────────────────────────

  const addBill = useCallback((bill: Omit<Bill, "id">): string => {
    const id = crypto.randomUUID();
    setBills((prev) => [...prev, { ...bill, id }]);
    return id;
  }, []);

  const updateBill = useCallback((id: string, data: Partial<Omit<Bill, "id">>) => {
    setBills((prev) => prev.map((b) => (b.id === id ? { ...b, ...data } : b)));
  }, []);

  const deleteBill = useCallback((id: string) => {
    setBills((prev) => prev.filter((b) => b.id !== id));
    setBillPayments((prev) => prev.filter((p) => p.billId !== id));
  }, []);

  const restoreBill = useCallback((bill: Bill) => {
    setBills((prev) => [...prev.filter((b) => b.id !== bill.id), bill]);
  }, []);

  // ── Payments ─────────────────────────────────────────────────────────────────

  const addPayment = useCallback((payment: Omit<BillPayment, "id">) => {
    setBillPayments((prev) => [...prev, { ...payment, id: crypto.randomUUID() }]);
  }, []);

  const deletePayment = useCallback((id: string) => {
    setBillPayments((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // ── Computed helpers ─────────────────────────────────────────────────────────

  const paidAmount = useCallback(
    (billId: string) => billPayments.filter((p) => p.billId === billId).reduce((s, p) => s + p.amount, 0),
    [billPayments]
  );

  const outstanding = useCallback(
    (bill: Bill) => Math.max(0, bill.amount - paidAmount(bill.id)),
    [paidAmount]
  );

  // ── Bulk restore ─────────────────────────────────────────────────────────────

  const replaceBills        = useCallback((incoming: Bill[])        => setBills(incoming), []);
  const replaceBillPayments = useCallback((incoming: BillPayment[]) => setBillPayments(incoming), []);

  return {
    bills, billPayments, loaded,
    addBill, updateBill, deleteBill, restoreBill,
    addPayment, deletePayment,
    paidAmount, outstanding,
    replaceBills, replaceBillPayments,
  };
}
