"use client";

import { useState, useEffect, useCallback } from "react";
import type { Vendor } from "./types";

export function useVendors(companyId: string) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loaded,  setLoaded]  = useState(false);

  useEffect(() => {
    setLoaded(false);
    try {
      const stored = localStorage.getItem(`folio-${companyId}-vendors`);
      setVendors(stored ? JSON.parse(stored) : []);
    } catch { /* ignore */ }
    setLoaded(true);
  }, [companyId]);

  useEffect(() => {
    if (loaded) localStorage.setItem(`folio-${companyId}-vendors`, JSON.stringify(vendors));
  }, [vendors, loaded, companyId]);

  const addVendor = useCallback((vendor: Omit<Vendor, "id">) => {
    setVendors((prev) => [...prev, { ...vendor, id: crypto.randomUUID() }]);
  }, []);

  const updateVendor = useCallback((id: string, data: Partial<Omit<Vendor, "id">>) => {
    setVendors((prev) => prev.map((v) => (v.id === id ? { ...v, ...data } : v)));
  }, []);

  const deleteVendor = useCallback((id: string) => {
    setVendors((prev) => prev.filter((v) => v.id !== id));
  }, []);

  const restoreVendor = useCallback((vendor: Vendor) => {
    setVendors((prev) => [...prev.filter((v) => v.id !== vendor.id), vendor]);
  }, []);

  const replaceVendors = useCallback((incoming: Vendor[]) => setVendors(incoming), []);

  return { vendors, loaded, addVendor, updateVendor, deleteVendor, restoreVendor, replaceVendors };
}
