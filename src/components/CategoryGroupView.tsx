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

export function CategoryGroupView({ expenses, categories, onDelete, onEdit }: Props) {
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

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  const groups = categories
    .map((cat) => ({
      cat,
      items: expenses.filter((e) => e.category === cat.name),
    }))
    .filter((g) => g.items.length > 0)
    .sort(
      (a, b) =>
        b.items.reduce((s, e) => s + e.amount, 0) -
        a.items.reduce((s, e) => s + e.amount, 0)
    );

  // Any expense whose category isn't in the known list
  const knownNames = new Set(categories.map((c) => c.name));
  const uncategorized = expenses.filter((e) => !knownNames.has(e.category));
  if (uncategorized.length)
    groups.push({
      cat: { name: "Uncategorized", color: "default" },
      items: uncategorized,
    });

  return (
    <div className="space-y-2">
      {groups.map(({ cat, items }) => {
        const groupTotal = items.reduce((s, e) => s + e.amount, 0);
        const pct = total > 0 ? (groupTotal / total) * 100 : 0;

        return (
          <details
            key={cat.name}
            className="bg-white rounded-xl border border-default-200 overflow-hidden"
            open
          >
            <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-default-50 list-none">
              <Chip color={cat.color as never} variant="flat" size="sm">
                {cat.name}
              </Chip>
              <span className="text-default-400 text-xs">
                {items.length} {items.length !== 1 ? t("trends.items") : t("trends.item")}
              </span>
              <div className="flex-1 mx-1">
                <div className="h-1.5 bg-default-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <span className="font-semibold text-sm">
                ${groupTotal.toFixed(2)}
              </span>
              <span className="text-default-400 text-xs w-12 text-right">
                {pct.toFixed(1)}%
              </span>
            </summary>
            <div className="border-t border-default-100">
              {[...items]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center px-4 py-2.5 hover:bg-default-50 border-b border-default-50 last:border-b-0"
                  >
                    <span className="text-default-400 text-xs w-16 shrink-0">
                      {fmtDate(e.date)}
                    </span>
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
