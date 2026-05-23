"use client";

import { useMemo, useState } from "react";
import {
  Expense,
  FilterState,
  DEFAULT_FILTER,
  SortField,
  SortDir,
  ViewMode,
  DatePreset,
} from "./types";

function getDateBounds(
  preset: DatePreset,
  from: string,
  to: string
): [string | null, string | null] {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const pad = (n: number) => String(n).padStart(2, "0");

  switch (preset) {
    case "week": {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      return [d.toISOString().split("T")[0], today];
    }
    case "month":
      return [
        `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`,
        today,
      ];
    case "last-month": {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lmEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      return [lm.toISOString().split("T")[0], lmEnd.toISOString().split("T")[0]];
    }
    case "3months": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      return [d.toISOString().split("T")[0], today];
    }
    case "year":
      return [`${now.getFullYear()}-01-01`, today];
    case "custom":
      return [from || null, to || null];
    default:
      return [null, null];
  }
}

export function useFilterSort(expenses: Expense[]) {
  const [filter, setFilterState] = useState<FilterState>(DEFAULT_FILTER);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  function setFilter(partial: Partial<FilterState>) {
    setFilterState((prev) => ({ ...prev, ...partial }));
  }

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  function resetFilters() {
    setFilterState(DEFAULT_FILTER);
  }

  const filtered = useMemo(() => {
    let result = [...expenses];

    if (filter.search.trim()) {
      const q = filter.search.toLowerCase();
      result = result.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q)
      );
    }

    if (filter.categories.length > 0) {
      result = result.filter((e) => filter.categories.includes(e.category));
    }

    const [dateFrom, dateTo] = getDateBounds(
      filter.datePreset,
      filter.dateFrom,
      filter.dateTo
    );
    if (dateFrom) result = result.filter((e) => e.date >= dateFrom);
    if (dateTo) result = result.filter((e) => e.date <= dateTo);

    if (filter.amountMin)
      result = result.filter((e) => e.amount >= Number(filter.amountMin));
    if (filter.amountMax)
      result = result.filter((e) => e.amount <= Number(filter.amountMax));

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "date":
          cmp = a.date.localeCompare(b.date);
          break;
        case "amount":
          cmp = a.amount - b.amount;
          break;
        case "category":
          cmp = a.category.localeCompare(b.category);
          break;
        case "description":
          cmp = a.description.localeCompare(b.description);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [expenses, filter, sortField, sortDir]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filter.search.trim()) n++;
    if (filter.categories.length) n++;
    if (filter.datePreset !== "all") n++;
    if (filter.amountMin || filter.amountMax) n++;
    return n;
  }, [filter]);

  return {
    filter,
    setFilter,
    sortField,
    sortDir,
    toggleSort,
    viewMode,
    setViewMode,
    filtered,
    resetFilters,
    activeFilterCount,
  };
}
