"use client";

import { Card, CardBody } from "@nextui-org/react";
import { DollarSign, CalendarDays, Receipt, Trophy } from "lucide-react";
import { Expense, CategoryDef } from "@/lib/types";

interface Props {
  expenses: Expense[];
  allExpenses: Expense[];
  categories: CategoryDef[];
}

const CARD_STYLES = [
  {
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    Icon: DollarSign,
  },
  {
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
    Icon: CalendarDays,
  },
  {
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    Icon: Receipt,
  },
  {
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    Icon: Trophy,
  },
];

export function SummaryCards({ expenses, allExpenses, categories }: Props) {
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthlyTotal = allExpenses
    .filter((e) => e.date.startsWith(thisMonth))
    .reduce((s, e) => s + e.amount, 0);

  const topCat = categories.reduce<{ name: string; amt: number }>(
    (best, cat) => {
      const amt = allExpenses
        .filter((e) => e.category === cat.name)
        .reduce((s, e) => s + e.amount, 0);
      return amt > best.amt ? { name: cat.name, amt } : best;
    },
    { name: "", amt: 0 }
  );

  const isFiltered = expenses.length !== allExpenses.length;

  const stats = [
    {
      label: isFiltered ? "Filtered Total" : "Total Spent",
      value: `$${total.toFixed(2)}`,
      sub: isFiltered
        ? `${expenses.length} of ${allExpenses.length} expenses`
        : "all time",
    },
    {
      label: "This Month",
      value: `$${monthlyTotal.toFixed(2)}`,
      sub: new Date().toLocaleString("default", {
        month: "long",
        year: "numeric",
      }),
    },
    {
      label: "Transactions",
      value: String(allExpenses.length),
      sub: "total recorded",
    },
    {
      label: "Top Category",
      value: topCat.name || "—",
      sub: topCat.name ? `$${topCat.amt.toFixed(2)} all time` : "no data",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((s, i) => {
        const { iconBg, iconColor, Icon } = CARD_STYLES[i];
        return (
          <Card key={s.label} shadow="sm" className="border border-default-100">
            <CardBody className="gap-3 p-4">
              <div className={`${iconBg} ${iconColor} rounded-lg p-2 w-fit`}>
                <Icon size={18} strokeWidth={2} />
              </div>
              <div>
                <p className="text-2xl font-bold text-default-900 leading-tight">
                  {s.value}
                </p>
                <p className="text-xs font-medium text-default-500 mt-0.5">
                  {s.label}
                </p>
                <p className="text-xs text-default-400">{s.sub}</p>
              </div>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}
