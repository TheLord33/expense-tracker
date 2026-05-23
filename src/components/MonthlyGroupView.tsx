"use client";

import { Chip, Button } from "@nextui-org/react";
import { Pencil } from "lucide-react";
import { Expense, CategoryDef } from "@/lib/types";
import { useLanguage } from "@/app/providers";

interface Props {
  expenses: Expense[];
  categories: CategoryDef[];
  onDelete: (id: string) => void;
  onEdit: (expense: Expense) => void;
}

export function MonthlyGroupView({ expenses, categories, onDelete, onEdit }: Props) {
  const { t, locale } = useLanguage();

  function fmtDate(iso: string) {
    const [y, m, d] = iso.split("-");
    return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString(
      locale, { month: "short", day: "numeric" }
    );
  }

  if (expenses.length === 0)
    return (
      <p className="text-center text-default-400 py-8">
        {t("expenseList.empty")}
      </p>
    );

  function chipColor(name: string) {
    return (
      categories.find((c) => c.name === name)?.color ?? "default"
    ) as never;
  }

  // Group by YYYY-MM
  const monthMap = new Map<string, Expense[]>();
  for (const e of expenses) {
    const key = e.date.slice(0, 7);
    if (!monthMap.has(key)) monthMap.set(key, []);
    monthMap.get(key)!.push(e);
  }

  const months = [...monthMap.entries()].sort((a, b) =>
    b[0].localeCompare(a[0])
  );

  const maxTotal = Math.max(
    ...months.map(([, items]) => items.reduce((s, e) => s + e.amount, 0))
  );

  return (
    <div className="space-y-2">
      {months.map(([key, items]) => {
        const [year, month] = key.split("-");
        const label = new Date(
          Number(year),
          Number(month) - 1
        ).toLocaleString(locale, { month: "long", year: "numeric" });
        const monthTotal = items.reduce((s, e) => s + e.amount, 0);
        const pct = maxTotal > 0 ? (monthTotal / maxTotal) * 100 : 0;
        const sorted = [...items].sort((a, b) => b.date.localeCompare(a.date));

        return (
          <details
            key={key}
            className="bg-white rounded-xl border border-default-200 overflow-hidden"
            open
          >
            <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-default-50 list-none">
              <span className="font-semibold text-default-800 min-w-36 text-sm">
                {label}
              </span>
              <div className="flex-1 mx-1">
                <div className="h-1.5 bg-default-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-secondary rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <span className="text-default-400 text-xs">
                {items.length !== 1
                  ? t("expenseList.countPlural", { count: items.length })
                  : t("expenseList.count", { count: items.length })}
              </span>
              <span className="font-semibold text-sm">
                ${monthTotal.toFixed(2)}
              </span>
            </summary>
            <div className="border-t border-default-100">
              {sorted.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center px-4 py-2.5 hover:bg-default-50 border-b border-default-50 last:border-b-0"
                >
                  <span className="text-default-400 text-xs w-14 shrink-0">
                    {fmtDate(e.date)}
                  </span>
                  <Chip
                    color={chipColor(e.category)}
                    variant="flat"
                    size="sm"
                    className="mr-2 shrink-0"
                  >
                    {e.category}
                  </Chip>
                  <span className="flex-1 text-sm">{e.description}</span>
                  <span className="font-medium text-sm">
                    ${e.amount.toFixed(2)}
                  </span>
                  <div className="flex gap-1 ml-2 shrink-0">
                    <Button isIconOnly size="sm" variant="light" onPress={() => onEdit(e)}>
                      <Pencil size={12} />
                    </Button>
                    <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => onDelete(e.id)}>
                      ✕
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}
