"use client";

import { useState, useEffect, useCallback } from "react";
import type { Customer, Invoice, InvoicePayment } from "./types";

const CUSTOMERS_KEY = "folio-customers";
const INVOICES_KEY  = "folio-invoices";
const PAYMENTS_KEY  = "folio-invoice-payments";

export function useAR() {
  const [customers, setCustomers]   = useState<Customer[]>([]);
  const [invoices,  setInvoices]    = useState<Invoice[]>([]);
  const [payments,  setPayments]    = useState<InvoicePayment[]>([]);
  const [loaded,    setLoaded]      = useState(false);

  useEffect(() => {
    try {
      const c = localStorage.getItem(CUSTOMERS_KEY);
      const i = localStorage.getItem(INVOICES_KEY);
      const p = localStorage.getItem(PAYMENTS_KEY);
      if (c) setCustomers(JSON.parse(c));
      if (i) setInvoices(JSON.parse(i));
      if (p) setPayments(JSON.parse(p));
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
      localStorage.setItem(INVOICES_KEY,  JSON.stringify(invoices));
      localStorage.setItem(PAYMENTS_KEY,  JSON.stringify(payments));
    }
  }, [customers, invoices, payments, loaded]);

  // ── Customers ────────────────────────────────────────────────────────────────

  const addCustomer    = useCallback((c: Omit<Customer, "id">) =>
    setCustomers((prev) => [...prev, { ...c, id: crypto.randomUUID() }]), []);

  const updateCustomer = useCallback((id: string, data: Partial<Omit<Customer, "id">>) =>
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c))), []);

  const deleteCustomer = useCallback((id: string) =>
    setCustomers((prev) => prev.filter((c) => c.id !== id)), []);

  // ── Invoices ─────────────────────────────────────────────────────────────────

  const addInvoice    = useCallback((inv: Omit<Invoice, "id">) =>
    setInvoices((prev) => [...prev, { ...inv, id: crypto.randomUUID() }]), []);

  const updateInvoice = useCallback((id: string, data: Partial<Omit<Invoice, "id">>) =>
    setInvoices((prev) => prev.map((i) => (i.id === id ? { ...i, ...data } : i))), []);

  const deleteInvoice = useCallback((id: string) => {
    setInvoices((prev) => prev.filter((i) => i.id !== id));
    setPayments((prev) => prev.filter((p) => p.invoiceId !== id));
  }, []);

  // ── Payments ─────────────────────────────────────────────────────────────────

  const addPayment    = useCallback((p: Omit<InvoicePayment, "id">) =>
    setPayments((prev) => [...prev, { ...p, id: crypto.randomUUID() }]), []);

  const deletePayment = useCallback((id: string) =>
    setPayments((prev) => prev.filter((p) => p.id !== id)), []);

  // ── Computed helpers ─────────────────────────────────────────────────────────

  const collectedAmount = useCallback((invoiceId: string): number =>
    payments.filter((p) => p.invoiceId === invoiceId).reduce((s, p) => s + p.amount, 0),
  [payments]);

  const outstanding = useCallback((inv: Invoice): number =>
    Math.max(0, inv.amount - collectedAmount(inv.id)),
  [collectedAmount]);

  // ── Bulk restore ─────────────────────────────────────────────────────────────

  const replaceCustomers = useCallback((c: Customer[]) => setCustomers(c), []);
  const replaceInvoices  = useCallback((i: Invoice[]) => setInvoices(i), []);
  const replacePayments  = useCallback((p: InvoicePayment[]) => setPayments(p), []);

  return {
    customers, invoices, payments, loaded,
    addCustomer, updateCustomer, deleteCustomer,
    addInvoice, updateInvoice, deleteInvoice,
    addPayment, deletePayment,
    collectedAmount, outstanding,
    replaceCustomers, replaceInvoices, replacePayments,
  };
}
