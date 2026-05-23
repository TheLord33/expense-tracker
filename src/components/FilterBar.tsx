"use client";

import { useState } from "react";
import {
  Input,
  Button,
  Chip,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@nextui-org/react";
import {
  FilterState,
  DatePreset,
  SortField,
  SortDir,
  ViewMode,
  CategoryDef,
} from "@/lib/types";

interface Props {
  filter: FilterState;
  setFilter: (p: Partial<FilterState>) => void;
  sortField: SortField;
  sortDir: SortDir;
  toggleSort: (f: SortField) => void;
  viewMode: ViewMode;
  setViewMode: (m: ViewMode) => void;
  categories: CategoryDef[];
  activeFilterCount: number;
  onReset: () => void;
}

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "week", label: "Last 7 days" },
  { value: "month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "3months", label: "Last 3 months" },
  { value: "year", label: "This year" },
  { value: "custom", label: "Custom range" },
];

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "date", label: "Date" },
  { value: "amount", label: "Amount" },
  { value: "category", label: "Category" },
  { value: "description", label: "Description" },
];

const VIEW_MODES: { value: ViewMode; label: string; icon: string }[] = [
  { value: "list", label: "List", icon: "☰" },
  { value: "category", label: "By Category", icon: "⊞" },
  { value: "monthly", label: "By Month", icon: "▦" },
  { value: "trends", label: "Trends", icon: "▮" },
];

export function FilterBar({
  filter,
  setFilter,
  sortField,
  sortDir,
  toggleSort,
  viewMode,
  setViewMode,
  categories,
  activeFilterCount,
  onReset,
}: Props) {
  const [showFilters, setShowFilters] = useState(false);

  function toggleCategory(name: string) {
    const cats = filter.categories.includes(name)
      ? filter.categories.filter((c) => c !== name)
      : [...filter.categories, name];
    setFilter({ categories: cats });
  }

  return (
    <div className="space-y-3">
      {/* Top row */}
      <div className="flex gap-2 items-center flex-wrap">
        <Input
          className="flex-1 min-w-48"
          placeholder="Search by description or category…"
          value={filter.search}
          onValueChange={(v) => setFilter({ search: v })}
          isClearable
          onClear={() => setFilter({ search: "" })}
          size="sm"
        />

        <Dropdown>
          <DropdownTrigger>
            <Button size="sm" variant="flat">
              Sort: {SORT_OPTIONS.find((s) => s.value === sortField)?.label}{" "}
              {sortDir === "asc" ? "↑" : "↓"}
            </Button>
          </DropdownTrigger>
          <DropdownMenu aria-label="Sort options">
            {SORT_OPTIONS.map((opt) => (
              <DropdownItem
                key={opt.value}
                onPress={() => toggleSort(opt.value)}
                endContent={
                  sortField === opt.value
                    ? sortDir === "asc"
                      ? "↑"
                      : "↓"
                    : undefined
                }
              >
                {opt.label}
              </DropdownItem>
            ))}
          </DropdownMenu>
        </Dropdown>

        {/* View mode toggle */}
        <div className="flex rounded-lg border border-default-200 overflow-hidden shrink-0">
          {VIEW_MODES.map((mode) => (
            <button
              key={mode.value}
              onClick={() => setViewMode(mode.value)}
              title={mode.label}
              className={`px-2.5 py-1.5 text-sm transition-colors ${
                viewMode === mode.value
                  ? "bg-primary text-white"
                  : "bg-white text-default-500 hover:bg-default-100"
              }`}
            >
              {mode.icon}
            </button>
          ))}
        </div>

        <Button
          size="sm"
          variant={showFilters ? "solid" : "flat"}
          color={activeFilterCount > 0 ? "primary" : "default"}
          onPress={() => setShowFilters((s) => !s)}
        >
          Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </Button>

        {activeFilterCount > 0 && (
          <Button size="sm" variant="light" color="danger" onPress={onReset}>
            Clear all
          </Button>
        )}
      </div>

      {/* Expanded filter panel */}
      {showFilters && (
        <div className="bg-default-50 rounded-xl p-4 space-y-4 border border-default-200">
          {/* Categories */}
          <div>
            <p className="text-xs font-semibold text-default-500 uppercase tracking-wider mb-2">
              Category
            </p>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => {
                const active = filter.categories.includes(cat.name);
                return (
                  <Chip
                    key={cat.name}
                    color={active ? cat.color : "default"}
                    variant={active ? "solid" : "flat"}
                    className="cursor-pointer select-none"
                    onClick={() => toggleCategory(cat.name)}
                  >
                    {cat.name}
                  </Chip>
                );
              })}
            </div>
          </div>

          {/* Date range */}
          <div>
            <p className="text-xs font-semibold text-default-500 uppercase tracking-wider mb-2">
              Date Range
            </p>
            <div className="flex flex-wrap gap-1.5">
              {DATE_PRESETS.map((p) => (
                <Chip
                  key={p.value}
                  color={filter.datePreset === p.value ? "primary" : "default"}
                  variant={filter.datePreset === p.value ? "solid" : "flat"}
                  className="cursor-pointer select-none"
                  onClick={() => setFilter({ datePreset: p.value })}
                >
                  {p.label}
                </Chip>
              ))}
            </div>
            {filter.datePreset === "custom" && (
              <div className="flex gap-2 mt-3">
                <Input
                  size="sm"
                  type="date"
                  label="From"
                  value={filter.dateFrom}
                  onValueChange={(v) => setFilter({ dateFrom: v })}
                />
                <Input
                  size="sm"
                  type="date"
                  label="To"
                  value={filter.dateTo}
                  onValueChange={(v) => setFilter({ dateTo: v })}
                />
              </div>
            )}
          </div>

          {/* Amount range */}
          <div>
            <p className="text-xs font-semibold text-default-500 uppercase tracking-wider mb-2">
              Amount Range
            </p>
            <div className="flex gap-2">
              <Input
                size="sm"
                type="number"
                min="0"
                step="0.01"
                placeholder="Min"
                value={filter.amountMin}
                onValueChange={(v) => setFilter({ amountMin: v })}
                startContent={
                  <span className="text-default-400 text-xs">$</span>
                }
              />
              <Input
                size="sm"
                type="number"
                min="0"
                step="0.01"
                placeholder="Max"
                value={filter.amountMax}
                onValueChange={(v) => setFilter({ amountMax: v })}
                startContent={
                  <span className="text-default-400 text-xs">$</span>
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
