"use client";

import { useState } from "react";
import type React from "react";
import { Input, Button, Chip, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@nextui-org/react";
import { Search, List, LayoutGrid, CalendarDays, TrendingUp, ArrowUpDown, SlidersHorizontal, X } from "lucide-react";
import { FilterState, DatePreset, SortField, SortDir, ViewMode, CategoryDef } from "@/lib/types";
import { useLanguage } from "@/app/providers";

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

export function FilterBar({
  filter, setFilter, sortField, sortDir, toggleSort,
  viewMode, setViewMode, categories, activeFilterCount, onReset,
}: Props) {
  const { t } = useLanguage();
  const [showFilters, setShowFilters] = useState(false);

  const DATE_PRESETS: { value: DatePreset; label: string }[] = [
    { value: "all",        label: t("filter.presets.all")         },
    { value: "week",       label: t("filter.presets.week")        },
    { value: "month",      label: t("filter.presets.month")       },
    { value: "last-month", label: t("filter.presets.lastMonth")   },
    { value: "3months",    label: t("filter.presets.threeMonths") },
    { value: "year",       label: t("filter.presets.year")        },
    { value: "custom",     label: t("filter.presets.custom")      },
  ];

  const SORT_OPTIONS: { value: SortField; label: string }[] = [
    { value: "date",        label: t("filter.sort.date")        },
    { value: "amount",      label: t("filter.sort.amount")      },
    { value: "category",    label: t("filter.sort.category")    },
    { value: "description", label: t("filter.sort.description") },
  ];

  const VIEW_MODES: { value: ViewMode; label: string; Icon: React.ElementType }[] = [
    { value: "list",     label: t("filter.view.list"),     Icon: List        },
    { value: "category", label: t("filter.view.category"), Icon: LayoutGrid  },
    { value: "monthly",  label: t("filter.view.monthly"),  Icon: CalendarDays},
    { value: "trends",   label: t("filter.view.trends"),   Icon: TrendingUp  },
  ];

  function toggleCategory(name: string) {
    const cats = filter.categories.includes(name)
      ? filter.categories.filter((c) => c !== name)
      : [...filter.categories, name];
    setFilter({ categories: cats });
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center flex-wrap">
        <Input
          className="flex-1 min-w-48"
          placeholder={t("filter.searchPlaceholder")}
          value={filter.search}
          onValueChange={(v) => setFilter({ search: v })}
          isClearable
          onClear={() => setFilter({ search: "" })}
          size="sm"
          startContent={<Search size={14} className="text-default-400 shrink-0" />}
        />

        <Dropdown>
          <DropdownTrigger>
            <Button size="sm" variant="flat" startContent={<ArrowUpDown size={14} />}>
              {SORT_OPTIONS.find((s) => s.value === sortField)?.label}{" "}
              {sortDir === "asc" ? "↑" : "↓"}
            </Button>
          </DropdownTrigger>
          <DropdownMenu aria-label="Sort options">
            {SORT_OPTIONS.map((opt) => (
              <DropdownItem
                key={opt.value}
                onPress={() => toggleSort(opt.value)}
                endContent={sortField === opt.value ? (sortDir === "asc" ? "↑" : "↓") : undefined}
              >
                {opt.label}
              </DropdownItem>
            ))}
          </DropdownMenu>
        </Dropdown>

        <div className="flex rounded-xl border border-default-200 overflow-hidden shrink-0 shadow-sm">
          {VIEW_MODES.map(({ value, label, Icon }) => (
            <button
              key={value}
              onClick={() => setViewMode(value)}
              title={label}
              className={`px-3 py-2 transition-colors flex items-center gap-1.5 text-xs font-medium ${
                viewMode === value
                  ? "bg-indigo-600 text-white"
                  : "bg-white dark:bg-gray-800 text-default-500 hover:bg-default-50 dark:hover:bg-gray-700"
              }`}
            >
              <Icon size={13} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        <Button
          size="sm"
          variant={showFilters ? "solid" : "flat"}
          color={activeFilterCount > 0 ? "primary" : "default"}
          startContent={<SlidersHorizontal size={14} />}
          onPress={() => setShowFilters((s) => !s)}
        >
          {activeFilterCount > 0
            ? t("filter.filtersActive", { count: activeFilterCount })
            : t("filter.filters")}
        </Button>

        {activeFilterCount > 0 && (
          <Button size="sm" variant="light" color="danger" startContent={<X size={14} />} onPress={onReset}>
            {t("filter.clear")}
          </Button>
        )}
      </div>

      {showFilters && (
        <div className="bg-default-50 rounded-xl p-4 space-y-4 border border-default-200">
          <div>
            <p className="text-xs font-semibold text-default-500 uppercase tracking-wider mb-2">
              {t("filter.categorySection")}
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

          <div>
            <p className="text-xs font-semibold text-default-500 uppercase tracking-wider mb-2">
              {t("filter.dateSection")}
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
                <Input size="sm" type="date" label={t("filter.from" as never) ?? t("from")} value={filter.dateFrom} onValueChange={(v) => setFilter({ dateFrom: v })} />
                <Input size="sm" type="date" label={t("filter.to" as never) ?? t("to")} value={filter.dateTo} onValueChange={(v) => setFilter({ dateTo: v })} />
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-default-500 uppercase tracking-wider mb-2">
              {t("filter.amountSection")}
            </p>
            <div className="flex gap-2">
              <Input size="sm" type="number" min="0" step="0.01" placeholder={t("filter.min")} value={filter.amountMin} onValueChange={(v) => setFilter({ amountMin: v })} startContent={<span className="text-default-400 text-xs">$</span>} />
              <Input size="sm" type="number" min="0" step="0.01" placeholder={t("filter.max")} value={filter.amountMax} onValueChange={(v) => setFilter({ amountMax: v })} startContent={<span className="text-default-400 text-xs">$</span>} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
