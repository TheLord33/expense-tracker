"use client";

import { useState, useEffect } from "react";
import { CategoryDef, ChipColor, BUILTIN_CATEGORIES } from "./types";

const STORAGE_KEY = "expense-tracker-categories";

export function useCategories() {
  const [custom, setCustom] = useState<CategoryDef[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setCustom(JSON.parse(stored));
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
  }, [custom, loaded]);

  const categories: CategoryDef[] = [...BUILTIN_CATEGORIES, ...custom];

  function addCategory(name: string, color: ChipColor) {
    setCustom((prev) => [...prev, { name, color, isBuiltin: false }]);
  }

  function deleteCategory(name: string) {
    setCustom((prev) => prev.filter((c) => c.name !== name));
  }

  function getCategoryColor(name: string): ChipColor {
    return categories.find((c) => c.name === name)?.color ?? "default";
  }

  return { categories, addCategory, deleteCategory, getCategoryColor };
}
