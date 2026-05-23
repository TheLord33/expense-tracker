"use client";

import { Card, CardBody } from "@nextui-org/react";
import { DollarSign, CalendarDays, Receipt, Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Expense, CategoryDef } from "@/lib/types";

interface Props {
  expenses: Expense[];
  allExpenses: Expense[];
  categories: CategoryDef[];
  monthlyIncome: number;
}

const CARD_STYLES = [
  {
    iconBg: "bg-blue-100 dark:bg-blue-900/40",
    iconColor: "text-blue-600 dark:text-blue-400",
    Icon: DollarSign,
  },
  {
    iconBg: "bg-violet-100 dark:bg-violet-900/40",
    iconColor: "text-violet-600 dark:text-violet-400",
    Icon: CalendarDays,
  },
  {
    iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    Icon: Receipt,
  },
  {
    iconBg: "bg-amber-100 dark:bg-amber-900/40",
    iconColor: "text-amber-600 dark:text-amber-400",
    Icon: Trophy,
  },
];

export function SummaryCards({ expenses, allExpenses, categories, monthlyIncome }: Props) {
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

  const thisMonthExpenses = allExpenses
    .filter((e) => e.date.startsWith(thisMonth))
    .reduce((s, e) => s + e.amount, 0);
  const net = monthlyIncome - thisMonthExpenses;
  const NetIcon = net > 0 ? TrendingUp : net < 0 ? TrendingDown : Minus;

  return (
    <div className="space-y-4">
    {monthlyIncome > 0 && (
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Monthly Income", value: `$${monthlyIncome.toFixed(2)}`, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/30" },
          { label: "Monthly Expenses", value: `$${thisMonthExpenses.toFixed(2)}`, color: "text-red-500 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/30" },
          {
            label: "Net Income",
            value: `${net >= 0 ? "+" : ""}$${net.toFixed(2)}`,
            color: net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400",
            bg: net >= 0 ? "bg-emerald-50 dark:bg-emerald-900/30" : "bg-red-50 dark:bg-red-900/30",
          },
        ].map((s) => (
          <Card key={s.label} shadow="sm" className="border border-default-100">
            <CardBody className="gap-2 p-4 flex-row items-center">
              <div className={`${s.bg} ${s.color} rounded-lg p-2 shrink-0`}>
                <NetIcon size={18} strokeWidth={2} />
              </div>
              <div>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-default-500">{s.label}</p>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    )}
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
    </div>
  );
}
