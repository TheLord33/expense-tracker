"use client";

import { useState, useEffect, useCallback } from "react";
import type { PurchaseOrder } from "./types";

export function usePurchaseOrders(companyId: string) {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    try {
      const raw = localStorage.getItem(`folio-${companyId}-purchase-orders`);
      setOrders(raw ? JSON.parse(raw) : []);
    } catch { /* ignore */ }
    setLoaded(true);
  }, [companyId]);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem(`folio-${companyId}-purchase-orders`, JSON.stringify(orders));
    }
  }, [orders, loaded, companyId]);

  const addOrder = useCallback((po: Omit<PurchaseOrder, "id">) => {
    setOrders((prev) => [...prev, { ...po, id: crypto.randomUUID() }]);
  }, []);

  const updateOrder = useCallback((id: string, data: Partial<Omit<PurchaseOrder, "id">>) => {
    setOrders((prev) => prev.map((po) => (po.id === id ? { ...po, ...data } : po)));
  }, []);

  const deleteOrder = useCallback((id: string) => {
    setOrders((prev) => prev.filter((po) => po.id !== id));
  }, []);

  const replaceOrders = useCallback((incoming: PurchaseOrder[]) => setOrders(incoming), []);

  const poTotal = useCallback(
    (po: PurchaseOrder) => po.lines.reduce((s, l) => s + l.qty * l.unitCost, 0),
    []
  );

  return { orders, loaded, addOrder, updateOrder, deleteOrder, replaceOrders, poTotal };
}
