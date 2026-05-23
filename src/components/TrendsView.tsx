"use client";

import { Card, CardBody, Chip } from "@nextui-org/react";
import { Expense, CategoryDef, CHIP_COLOR_HEX } from "@/lib/types";
import { useLanguage, useCurrency } from "@/app/providers";

interface Props {
  expenses: Expense[];
  categories: CategoryDef[];
}

export function TrendsView({ expenses, categories }: Props) {
  const { t, locale } = useLanguage();
  const { fmt, fmtCompact } = useCurrency();

  if (expenses.length === 0)
    return <p className="text-center text-default-400 py-8">{t("trends.noExpenses")}</p>;

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  const catData = categories
    .map((cat) => {
      const items = expenses.filter((e) => e.category === cat.name);
      return { cat, amount: items.reduce((s, e) => s + e.amount, 0), count: items.length };
    })
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const now = new Date();
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString(locale, { month: "short" });
    const amount = expenses.filter((e) => e.date.startsWith(key)).reduce((s, e) => s + e.amount, 0);
    return { label, amount, key };
  });

  const maxMonthly = Math.max(...monthlyData.map((m) => m.amount), 1);
  const BAR_MAX_PX = 96;

  const avgPerExpense = total / expenses.length;
  const maxExpense = Math.max(...expenses.map((e) => e.amount));
  const topCat = catData[0];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t("trends.avgPerExpense"),  value: fmt(avgPerExpense) },
          { label: t("trends.largestExpense"), value: fmt(maxExpense) },
          { label: t("trends.topCategory"),    value: topCat?.cat.name ?? "—" },
        ].map((s) => (
          <Card key={s.label} shadow="none" className="border border-default-200">
            <CardBody className="p-3 gap-0.5">
              <p className="text-xs text-default-400">{s.label}</p>
              <p className="text-lg font-bold text-default-900">{s.value}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card shadow="none" className="border border-default-200">
        <CardBody className="p-4 gap-4">
          <h3 className="font-semibold text-default-700 text-sm uppercase tracking-wide">
            {t("trends.spendingByCategory")}
          </h3>
          <div className="space-y-3">
            {catData.map(({ cat, amount, count }) => {
              const pct = total > 0 ? (amount / total) * 100 : 0;
              const barColor = CHIP_COLOR_HEX[cat.color] ?? CHIP_COLOR_HEX.default;
              return (
                <div key={cat.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Chip color={cat.color as never} variant="flat" size="sm">{cat.name}</Chip>
                      <span className="text-default-400 text-xs">
                        {count} {count !== 1 ? t("trends.items") : t("trends.item")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{fmt(amount)}</span>
                      <span className="text-default-400 text-xs w-10 text-right">{pct.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-default-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                  </div>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      <Card shadow="none" className="border border-default-200">
        <CardBody className="p-4 gap-4">
          <h3 className="font-semibold text-default-700 text-sm uppercase tracking-wide">
            {t("trends.monthlySpending")}
          </h3>
          <div className="flex items-end gap-3">
            {monthlyData.map(({ label, amount }) => {
              const barH = maxMonthly > 0 ? Math.max((amount / maxMonthly) * BAR_MAX_PX, amount > 0 ? 4 : 0) : 0;
              return (
                <div key={label} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-default-500 h-5 flex items-end">{amount > 0 ? fmtCompact(amount) : ""}</span>
                  <div className="w-full bg-primary rounded-t transition-all duration-500" style={{ height: `${barH}px` }} />
                  <span className="text-xs text-default-500">{label}</span>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
