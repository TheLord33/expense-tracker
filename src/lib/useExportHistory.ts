"use client";

import { useState, useCallback } from "react";
import { ExportRecord } from "@/lib/types";

const KEY = "expense-tracker-export-history";

function load(): ExportRecord[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); }
  catch { return []; }
}

function persist(records: ExportRecord[]) {
  localStorage.setItem(KEY, JSON.stringify(records));
}

export function useExportHistory() {
  const [history, setHistory] = useState<ExportRecord[]>(load);

  const addRecord = useCallback((record: Omit<ExportRecord, "id" | "timestamp">) => {
    const full: ExportRecord = {
      ...record,
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      timestamp: new Date().toISOString(),
    };
    setHistory((prev) => {
      const next = [full, ...prev].slice(0, 50);
      persist(next);
      return next;
    });
    return full;
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    persist([]);
  }, []);

  return { history, addRecord, clearHistory };
}
