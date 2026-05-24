"use client";

import { useState, useMemo } from "react";
import { Card, CardBody, CardHeader, Divider, Select, SelectItem, Input, Button } from "@nextui-org/react";
import { TrendingUp, TrendingDown, Download } from "lucide-react";
import type { Account, Expense, IncomeSource } from "@/lib/types";
import { deriveAllEntries, computePnL } from "@/lib/ledger";
import { pnlToCSV, download, downloadBlob } from "@/lib/importExport";
import { generatePnLPDF } from "@/lib/exportPDF";
import { useLanguage, useCurrency } from "@/app/providers";

// ── Date range helpers ────────────────────────────────────────────────────────

type Preset = "thisMonth" | "lastMonth" | "thisQuarter" | "lastQuarter" | "thisYear" | "lastYear" | "allTime" | "custom";

function getDateRange(preset: Preset, customFrom: string, customTo: string): { from: string; to: string } {
  if (preset === "custom")  return { from: customFrom, to: customTo };
  if (preset === "allTime") return { from: "", to: "" };

  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-indexed
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = (yr: number, mo: number) => new Date(yr, mo + 1, 0).getDate();

  switch (preset) {
    case "thisMonth":
      return { from: `${y}-${pad(m + 1)}-01`, to: `${y}-${pad(m + 1)}-${lastDay(y, m)}` };
    case "lastMonth": {
      const lm = m === 0 ? 11 : m - 1;
      const ly = m === 0 ? y - 1 : y;
      return { from: `${ly}-${pad(lm + 1)}-01`, to: `${ly}-${pad(lm + 1)}-${lastDay(ly, lm)}` };
    }
    case "thisQuarter": {
      const qs = Math.floor(m / 3) * 3;
      const qe = qs + 2;
      return { from: `${y}-${pad(qs + 1)}-01`, to: `${y}-${pad(qe + 1)}-${lastDay(y, qe)}` };
    }
    case "lastQuarter": {
      const q = Math.floor(m / 3);
      const lq = q === 0 ? 3 : q - 1;
      const lqy = q === 0 ? y - 1 : y;
      const lqs = lq * 3;
      const lqe = lqs + 2;
      return { from: `${lqy}-${pad(lqs + 1)}-01`, to: `${lqy}-${pad(lqe + 1)}-${lastDay(lqy, lqe)}` };
    }
    case "thisYear":  return { from: `${y}-01-01`, to: `${y}-12-31` };
    case "lastYear":  return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` };
    default:          return { from: "", to: "" };
  }
}

function formatPeriodLabel(from: string, to: string, locale: string): string {
  if (!from && !to) return "All time";
  const fmt = (iso: string) => {
    const [y, m, d] = iso.split("-");
    return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString(locale, {
      month: "short", day: "numeric", year: "numeric",
    });
  };
  if (from === to) return fmt(from);
  return `${fmt(from)} – ${fmt(to)}`;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  expenses: Expense[];
  sources: IncomeSource[];
  accounts: Account[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PnLTab({ expenses, sources, accounts }: Props) {
  const { t, locale } = useLanguage();
  const { fmt } = useCurrency();

  const [preset, setPreset] = useState<Preset>("thisMonth");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const PRESETS: { key: Preset; label: string }[] = [
    { key: "thisMonth",    label: t("pnl.presets.thisMonth")    },
    { key: "lastMonth",    label: t("pnl.presets.lastMonth")    },
    { key: "thisQuarter",  label: t("pnl.presets.thisQuarter")  },
    { key: "lastQuarter",  label: t("pnl.presets.lastQuarter")  },
    { key: "thisYear",     label: t("pnl.presets.thisYear")     },
    { key: "lastYear",     label: t("pnl.presets.lastYear")     },
    { key: "allTime",      label: t("pnl.presets.allTime")      },
    { key: "custom",       label: t("pnl.presets.custom")       },
  ];

  const { from, to } = getDateRange(preset, customFrom, customTo);

  const entries = useMemo(
    () => deriveAllEntries(expenses, sources, accounts),
    [expenses, sources, accounts]
  );

  const report = useMemo(
    () => computePnL(accounts, entries, from, to),
    [accounts, entries, from, to]
  );

  const hasData = report.totalRevenue > 0 || report.totalExpenses > 0;
  const isProfit = report.netIncome >= 0;
  const periodLabel = formatPeriodLabel(from, to, locale);
  const today = new Date().toISOString().split("T")[0];

  function handleExportCSV() {
    download(pnlToCSV(report, periodLabel), `pnl-report-${today}.csv`, "text/csv");
  }

  async function handleExportPDF() {
    const blob = await generatePnLPDF(report, periodLabel, fmt);
    downloadBlob(blob, `pnl-report-${today}.pdf`);
  }

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <Card shadow="sm">
        <CardBody className="p-4 gap-3">
          <Select
            label={t("pnl.period")}
            selectedKeys={[preset]}
            onSelectionChange={(keys) => setPreset([...keys][0] as Preset)}
          >
            {PRESETS.map((p) => (
              <SelectItem key={p.key} textValue={p.label}>{p.label}</SelectItem>
            ))}
          </Select>

          {preset === "custom" && (
            <div className="flex gap-3">
              <Input
                type="date"
                label={t("from")}
                value={customFrom}
                onValueChange={setCustomFrom}
                size="sm"
              />
              <Input
                type="date"
                label={t("to")}
                value={customTo}
                onValueChange={setCustomTo}
                size="sm"
              />
            </div>
          )}
        </CardBody>
      </Card>

      {/* Report */}
      <Card shadow="sm">
        <CardHeader className="px-6 pt-5 pb-3 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-default-900">{t("pnl.title")}</h2>
            <p className="text-sm text-default-400">{periodLabel}</p>
          </div>
          {hasData && (
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="flat" startContent={<Download size={13} />} onPress={handleExportCSV}>CSV</Button>
              <Button size="sm" variant="flat" startContent={<Download size={13} />} onPress={handleExportPDF}>PDF</Button>
            </div>
          )}
        </CardHeader>
        <Divider />

        {!hasData ? (
          <CardBody className="py-16 text-center text-default-400">
            <p className="text-sm">{t("pnl.noData")}</p>
          </CardBody>
        ) : (
          <CardBody className="px-6 py-4 space-y-6">

            {/* Revenue */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-default-400 mb-3">
                {t("pnl.revenue")}
              </p>
              <div className="space-y-2">
                {report.revenue.map((row) => (
                  <div key={row.account.id} className="flex justify-between text-sm">
                    <span className="text-default-700">
                      <span className="font-mono text-default-400 mr-2 text-xs">{row.account.code}</span>
                      {row.account.name}
                    </span>
                    <span className="font-medium text-default-800">{fmt(row.amount)}</span>
                  </div>
                ))}
                {report.revenue.length === 0 && (
                  <p className="text-sm text-default-400 italic">—</p>
                )}
              </div>
              <Divider className="my-3" />
              <div className="flex justify-between font-semibold text-sm">
                <span>{t("pnl.totalRevenue")}</span>
                <span className="text-success-600">{fmt(report.totalRevenue)}</span>
              </div>
            </div>

            {/* Expenses */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-default-400 mb-3">
                {t("pnl.expenses")}
              </p>
              <div className="space-y-2">
                {report.expenses.map((row) => (
                  <div key={row.account.id} className="flex justify-between text-sm">
                    <span className="text-default-700">
                      <span className="font-mono text-default-400 mr-2 text-xs">{row.account.code}</span>
                      {row.account.name}
                    </span>
                    <span className="font-medium text-default-800">{fmt(row.amount)}</span>
                  </div>
                ))}
                {report.expenses.length === 0 && (
                  <p className="text-sm text-default-400 italic">—</p>
                )}
              </div>
              <Divider className="my-3" />
              <div className="flex justify-between font-semibold text-sm">
                <span>{t("pnl.totalExpenses")}</span>
                <span className="text-danger-600">{fmt(report.totalExpenses)}</span>
              </div>
            </div>

            {/* Net Income */}
            <div className={`rounded-xl px-4 py-4 flex items-center justify-between ${
              isProfit ? "bg-success-50 dark:bg-success-900/20" : "bg-danger-50 dark:bg-danger-900/20"
            }`}>
              <div className="flex items-center gap-2">
                {isProfit
                  ? <TrendingUp size={18} className="text-success-600" />
                  : <TrendingDown size={18} className="text-danger-600" />
                }
                <span className={`font-bold text-base ${isProfit ? "text-success-700 dark:text-success-400" : "text-danger-700 dark:text-danger-400"}`}>
                  {isProfit ? t("pnl.netIncome") : t("pnl.netLoss")}
                </span>
              </div>
              <span className={`font-bold text-xl ${isProfit ? "text-success-700 dark:text-success-400" : "text-danger-700 dark:text-danger-400"}`}>
                {fmt(Math.abs(report.netIncome))}
              </span>
            </div>

          </CardBody>
        )}
      </Card>
    </div>
  );
}
