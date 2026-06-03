"use client";

import { useState, useEffect, useCallback } from "react";
import type { Customer, Invoice, InvoicePayment, InvoiceLine } from "./types";

/** Pre-tax subtotal from line items (falls back to legacy .amount). */
export function invoiceSubtotal(inv: Invoice): number {
  if (inv.lines?.length) return inv.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  return inv.amount ?? 0;
}

/** Grand total (subtotal + tax). Returns negative for credit memos. */
export function invoiceTotal(inv: Invoice): number {
  const total = invoiceSubtotal(inv) + (inv.taxAmount ?? 0);
  return inv.type === "credit" ? -total : total;
}

/** Migrate a legacy flat-amount invoice to the line-items format. */
function migrateInvoice(raw: Record<string, unknown>): Invoice {
  const lines = raw.lines as InvoiceLine[] | undefined;
  if (!lines?.length && raw.amount != null) {
    return {
      id:               String(raw.id),
      customerId:       String(raw.customerId),
      invoiceNumber:    String(raw.invoiceNumber ?? ""),
      date:             String(raw.date),
      dueDate:          String(raw.dueDate),
      revenueAccountId: String(raw.revenueAccountId ?? "acc-4000"),
      lines: [{
        id:          crypto.randomUUID(),
        description: String(raw.description ?? ""),
        quantity:    1,
        unitPrice:   Number(raw.amount),
      }],
    };
  }
  return raw as unknown as Invoice;
}

export function useAR(companyId: string) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices,  setInvoices]  = useState<Invoice[]>([]);
  const [payments,  setPayments]  = useState<InvoicePayment[]>([]);
  const [loaded,    setLoaded]    = useState(false);

  useEffect(() => {
    setLoaded(false);
    try {
      const c = localStorage.getItem(`folio-${companyId}-customers`);
      const i = localStorage.getItem(`folio-${companyId}-invoices`);
      const p = localStorage.getItem(`folio-${companyId}-invoice-payments`);
      setCustomers(c ? JSON.parse(c) : []);
      setInvoices(i ? (JSON.parse(i) as Record<string, unknown>[]).map(migrateInvoice) : []);
      setPayments(p ? JSON.parse(p) : []);
    } catch { /* ignore */ }
    setLoaded(true);
  }, [companyId]);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem(`folio-${companyId}-customers`,        JSON.stringify(customers));
      localStorage.setItem(`folio-${companyId}-invoices`,         JSON.stringify(invoices));
      localStorage.setItem(`folio-${companyId}-invoice-payments`, JSON.stringify(payments));
    }
  }, [customers, invoices, payments, loaded, companyId]);

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

  const addPayment  = useCallback((p: Omit<InvoicePayment, "id">) =>
    setPayments((prev) => [...prev, { ...p, id: crypto.randomUUID() }]), []);

  const deletePayment = useCallback((id: string) =>
    setPayments((prev) => prev.filter((p) => p.id !== id)), []);

  // ── Computed helpers ─────────────────────────────────────────────────────────

  const collectedAmount = useCallback((invoiceId: string): number =>
    payments.filter((p) => p.invoiceId === invoiceId).reduce((s, p) => s + p.amount, 0),
  [payments]);

  const outstanding = useCallback((inv: Invoice): number => {
    const total = invoiceTotal(inv); // negative for credits
    const applied = collectedAmount(inv.id);
    // Credits return negative outstanding (unapplied credit balance)
    return inv.type === "credit"
      ? Math.min(0, total + applied)
      : Math.max(0, total - applied);
  }, [collectedAmount]);

  // ── Bulk restore ─────────────────────────────────────────────────────────────

  const replaceCustomers = useCallback((c: Customer[])      => setCustomers(c), []);
  const replaceInvoices  = useCallback((i: Invoice[])       => setInvoices(i),  []);
  const replacePayments  = useCallback((p: InvoicePayment[]) => setPayments(p),  []);

  return {
    customers, invoices, payments, loaded,
    addCustomer, updateCustomer, deleteCustomer,
    addInvoice, updateInvoice, deleteInvoice,
    addPayment, deletePayment,
    collectedAmount, outstanding,
    replaceCustomers, replaceInvoices, replacePayments,
  };
}
