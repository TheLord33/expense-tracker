"use client";

import { useState, useEffect, useCallback } from "react";
import type { Company } from "./types";

const COMPANIES_KEY    = "folio-companies";
const ACTIVE_KEY       = "folio-active-company";
const LEGACY_PROFILE   = "folio-company-profile";

function migrateToMultiCompany(id: string) {
  const pairs: [string, string][] = [
    ["folio-bills",                      `folio-${id}-bills`],
    ["folio-bill-payments",              `folio-${id}-bill-payments`],
    ["folio-vendors",                    `folio-${id}-vendors`],
    ["folio-inventory-items",            `folio-${id}-inventory-items`],
    ["folio-inventory-movements",        `folio-${id}-inventory-movements`],
    ["folio-purchase-orders",            `folio-${id}-purchase-orders`],
    ["folio-customers",                  `folio-${id}-customers`],
    ["folio-invoices",                   `folio-${id}-invoices`],
    ["folio-invoice-payments",           `folio-${id}-invoice-payments`],
    ["expense-tracker-accounts",         `folio-${id}-accounts`],
    ["expense-tracker-opening-balances", `folio-${id}-opening-balances`],
  ];
  for (const [oldKey, newKey] of pairs) {
    try {
      const data = localStorage.getItem(oldKey);
      if (data && !localStorage.getItem(newKey)) localStorage.setItem(newKey, data);
    } catch { /* ignore */ }
  }
}

export function useCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeId,  setActiveId]  = useState<string>("");
  const [loaded,    setLoaded]    = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(COMPANIES_KEY);
      let list: Company[] = raw ? JSON.parse(raw) : [];

      if (list.length === 0) {
        const id      = crypto.randomUUID();
        const legacy  = localStorage.getItem(LEGACY_PROFILE);
        const company: Company = legacy
          ? { ...JSON.parse(legacy), id }
          : { id, name: "My Company" };
        migrateToMultiCompany(id);
        list = [company];
        localStorage.setItem(COMPANIES_KEY, JSON.stringify(list));
      }

      const storedActive = localStorage.getItem(ACTIVE_KEY);
      const validActive  = storedActive && list.some((c) => c.id === storedActive)
        ? storedActive
        : list[0].id;

      setCompanies(list);
      setActiveId(validActive);
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(COMPANIES_KEY, JSON.stringify(companies));
  }, [companies, loaded]);

  useEffect(() => {
    if (activeId) localStorage.setItem(ACTIVE_KEY, activeId);
  }, [activeId]);

  const addCompany = useCallback((data: Omit<Company, "id">): string => {
    const id = crypto.randomUUID();
    setCompanies((prev) => [...prev, { ...data, id }]);
    return id;
  }, []);

  const updateCompany = useCallback((id: string, data: Partial<Omit<Company, "id">>) => {
    setCompanies((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
  }, []);

  const deleteCompany = useCallback((id: string) => {
    setCompanies((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (next.length === 0) return prev; // can't delete last company
      setActiveId((cur) => (cur === id ? next[0].id : cur));
      return next;
    });
  }, []);

  const setActiveCompany = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const activeCompany = companies.find((c) => c.id === activeId) ?? companies[0] ?? null;

  return {
    companies, activeId, activeCompany, loaded,
    addCompany, updateCompany, deleteCompany, setActiveCompany,
  };
}
