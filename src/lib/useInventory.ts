"use client";

import { useState, useEffect, useCallback } from "react";
import type { InventoryItem, StockMovement } from "./types";

export function useInventory(companyId: string) {
  const [items,     setItems]     = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loaded,    setLoaded]    = useState(false);

  useEffect(() => {
    setLoaded(false);
    try {
      const i = localStorage.getItem(`folio-${companyId}-inventory-items`);
      const m = localStorage.getItem(`folio-${companyId}-inventory-movements`);
      setItems(i ? JSON.parse(i) : []);
      setMovements(m ? JSON.parse(m) : []);
    } catch { /* ignore */ }
    setLoaded(true);
  }, [companyId]);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem(`folio-${companyId}-inventory-items`,     JSON.stringify(items));
      localStorage.setItem(`folio-${companyId}-inventory-movements`, JSON.stringify(movements));
    }
  }, [items, movements, loaded, companyId]);

  // ── Items ────────────────────────────────────────────────────────────────────

  const addItem = useCallback((item: Omit<InventoryItem, "id">) => {
    setItems((prev) => [...prev, { ...item, id: crypto.randomUUID() }]);
  }, []);

  const updateItem = useCallback((id: string, data: Partial<Omit<InventoryItem, "id">>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...data } : i)));
  }, []);

  const deleteItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setMovements((prev) => prev.filter((m) => m.itemId !== id));
  }, []);

  const restoreItem = useCallback((item: InventoryItem) => {
    setItems((prev) => [...prev.filter((i) => i.id !== item.id), item]);
  }, []);

  // ── Movements ────────────────────────────────────────────────────────────────

  const addMovement = useCallback((movement: Omit<StockMovement, "id">) => {
    setMovements((prev) => [...prev, { ...movement, id: crypto.randomUUID() }]);
  }, []);

  const deleteMovement = useCallback((id: string) => {
    setMovements((prev) => prev.filter((m) => m.id !== id));
  }, []);

  // ── Computed helpers ─────────────────────────────────────────────────────────

  const qtyOnHand = useCallback((itemId: string): number => {
    return movements
      .filter((m) => m.itemId === itemId)
      .reduce((sum, m) => {
        if (m.type === "purchase")    return sum + m.quantity;
        if (m.type === "consumption") return sum - m.quantity;
        return sum + m.quantity;
      }, 0);
  }, [movements]);

  const inventoryValue = useCallback((itemId: string): number => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return 0;
    return Math.max(0, qtyOnHand(itemId)) * item.costPerUnit;
  }, [items, qtyOnHand]);

  const totalInventoryValue = useCallback((): number => {
    return items.reduce((sum, item) => sum + inventoryValue(item.id), 0);
  }, [items, inventoryValue]);

  // ── Bulk restore ─────────────────────────────────────────────────────────────

  const replaceItems     = useCallback((incoming: InventoryItem[]) => setItems(incoming), []);
  const replaceMovements = useCallback((incoming: StockMovement[]) => setMovements(incoming), []);

  return {
    items, movements, loaded,
    addItem, updateItem, deleteItem, restoreItem,
    addMovement, deleteMovement,
    qtyOnHand, inventoryValue, totalInventoryValue,
    replaceItems, replaceMovements,
  };
}
