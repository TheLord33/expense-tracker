"use client";

import { useState, useEffect, useCallback } from "react";
import type { PurchaseOrder } from "./types";

const PO_KEY = "folio-purchase-orders";

export function usePurchaseOrders() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PO_KEY);
      if (raw) setOrders(JSON.parse(raw));
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(PO_KEY, JSON.stringify(orders));
  }, [orders, loaded]);

  const addOrder = useCallback((po: Omit<PurchaseOrder, "id">) => {
    setOrders((prev) => [...prev, { ...po, id: crypto.randomUUID() }]);
  }, []);

  const updateOrder = useCallback((id: string, data: Partial<Omit<PurchaseOrder, "id">>) => {
    setOrders((prev) => prev.map((po) => (po.id === id ? { ...po, ...data } : po)));
  }, []);

  const deleteOrder = useCallback((id: string) => {
    setOrders((prev) => prev.filter((po) => po.id !== id));
  }, []);

  const replaceOrders = useCallback((incoming: PurchaseOrder[]) => {
    setOrders(incoming);
  }, []);

  const poTotal = useCallback(
    (po: PurchaseOrder) => po.lines.reduce((s, l) => s + l.qty * l.unitCost, 0),
    []
  );

  return { orders, loaded, addOrder, updateOrder, deleteOrder, replaceOrders, poTotal };
}
