"use client";

import { useState, useEffect, useCallback } from "react";
import type { Bill, BillPayment } from "./types";

const BILLS_KEY    = "folio-bills";
const PAYMENTS_KEY = "folio-bill-payments";

export function useBills() {
  const [bills, setBills]             = useState<Bill[]>([]);
  const [billPayments, setBillPayments] = useState<BillPayment[]>([]);
  const [loaded, setLoaded]           = useState(false);

  useEffect(() => {
    try {
      const b = localStorage.getItem(BILLS_KEY);
      const p = localStorage.getItem(PAYMENTS_KEY);
      if (b) setBills(JSON.parse(b));
      if (p) setBillPayments(JSON.parse(p));
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem(BILLS_KEY,    JSON.stringify(bills));
      localStorage.setItem(PAYMENTS_KEY, JSON.stringify(billPayments));
    }
  }, [bills, billPayments, loaded]);

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

  // ── Bulk restore (for backup import) ─────────────────────────────────────────

  const replaceBills = useCallback((incoming: Bill[]) => {
    setBills(incoming);
  }, []);

  const replaceBillPayments = useCallback((incoming: BillPayment[]) => {
    setBillPayments(incoming);
  }, []);

  return {
    bills, billPayments, loaded,
    addBill, updateBill, deleteBill, restoreBill,
    addPayment, deletePayment,
    paidAmount, outstanding,
    replaceBills, replaceBillPayments,
  };
}
