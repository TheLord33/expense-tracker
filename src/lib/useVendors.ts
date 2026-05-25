"use client";

import { useState, useEffect, useCallback } from "react";
import type { Vendor } from "./types";

const STORAGE_KEY = "folio-vendors";

export function useVendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setVendors(JSON.parse(stored));
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(vendors));
  }, [vendors, loaded]);

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

  const replaceVendors = useCallback((incoming: Vendor[]) => {
    setVendors(incoming);
  }, []);

  return { vendors, loaded, addVendor, updateVendor, deleteVendor, restoreVendor, replaceVendors };
}
