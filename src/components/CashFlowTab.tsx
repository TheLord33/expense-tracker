"use client";

import { useState, useMemo } from "react";
import { Card, CardBody, CardHeader, Divider, Select, SelectItem, Input, Button } from "@nextui-org/react";
import { TrendingUp, TrendingDown, Download } from "lucide-react";
import type { Account, Bill, BillPayment, Expense, IncomeSource, InventoryItem, Invoice, InvoicePayment, StockMovement } from "@/lib/types";
import { deriveAllEntries, computeCashFlow } from "@/lib/ledger";
import { cashFlowToCSV, download } from "@/lib/importExport";
import { useLanguage, useCurrency } from "@/app/providers";

// ── Date range helpers (shared pattern with PnLTab) ───────────────────────────

type Preset = "thisMonth" | "lastMonth" | "thisQuarter" | "lastQuarter" | "thisYear" | "lastYear" | "allTime" | "custom";

function getDateRange(preset: Preset, customFrom: string, customTo: string): { from: string; to: string } {
  if (preset === "custom")  return { from: customFrom, to: customTo };
  if (preset === "allTime") return { from: "", to: "" };

  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
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
  openingBalances: Record<string, number>;
  bills?: Bill[];
  billPayments?: BillPayment[];
  inventoryItems?: InventoryItem[];
  inventoryMovements?: StockMovement[];
  invoices?: Invoice[];
  invoicePayments?: InvoicePayment[];
}

// ── Sub-components ────────────────────────────────────────────────────────────

function AdjustmentRow({ label, amount, fmt }: { label: string; amount: number; fmt: (n: number) => string }) {
  const isPositive = amount >= 0;
  return (
    <div className="flex justify-between text-sm pl-4">
      <span className="text-default-600">{label}</span>
      <span className={`font-medium ${isPositive ? "text-success-600" : "text-danger-600"}`}>
        {isPositive ? fmt(amount) : `(${fmt(Math.abs(amount))})`}
      </span>
    </div>
  );
}

function SectionTotal({ label, amount, fmt }: { label: string; amount: number; fmt: (n: number) => string }) {
  const isPositive = amount >= 0;
  return (
    <div className="flex justify-between font-semibold text-sm">
      <span>{label}</span>
      <span className={isPositive ? "text-success-600" : "text-danger-600"}>
        {isPositive ? fmt(amount) : `(${fmt(Math.abs(amount))})`}
      </span>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CashFlowTab({
  expenses, sources, accounts, openingBalances,
  bills = [], billPayments = [],
  inventoryItems = [], inventoryMovements = [],
  invoices = [], invoicePayments = [],
}: Props) {
  const { t, locale } = useLanguage();
  const { fmt } = useCurrency();

  const [preset, setPreset] = useState<Preset>("thisMonth");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo]   = useState("");

  const PRESETS: { key: Preset; label: string }[] = [
    { key: "thisMonth",   label: t("pnl.presets.thisMonth")   },
    { key: "lastMonth",   label: t("pnl.presets.lastMonth")   },
    { key: "thisQuarter", label: t("pnl.presets.thisQuarter") },
    { key: "lastQuarter", label: t("pnl.presets.lastQuarter") },
    { key: "thisYear",    label: t("pnl.presets.thisYear")    },
    { key: "lastYear",    label: t("pnl.presets.lastYear")    },
    { key: "allTime",     label: t("pnl.presets.allTime")     },
    { key: "custom",      label: t("pnl.presets.custom")      },
  ];

  const { from, to } = getDateRange(preset, customFrom, customTo);

  const entries = useMemo(
    () => deriveAllEntries(expenses, sources, accounts, bills, billPayments, inventoryItems, inventoryMovements, invoices, invoicePayments),
    [expenses, sources, accounts, bills, billPayments, inventoryItems, inventoryMovements, invoices, invoicePayments]
  );

  const report = useMemo(
    () => computeCashFlow(accounts, entries, openingBalances, from, to),
    [accounts, entries, openingBalances, from, to]
  );

  const periodLabel = formatPeriodLabel(from, to, locale);
  const today       = new Date().toISOString().split("T")[0];
  const hasData     = Math.abs(report.netIncome) > 0 || Math.abs(report.changeInAR) > 0 ||
                      Math.abs(report.changeInAP) > 0 || Math.abs(report.changeInInventory) > 0 ||
                      report.equityChanges.length > 0;
  const netPositive = report.netChange >= 0;

  function handleExportCSV() {
    download(cashFlowToCSV(report, periodLabel), `cash-flow-${today}.csv`, "text/csv");
  }

  return (
    <div className="space-y-4">

      {/* Period selector */}
      <Card shadow="sm">
        <CardBody className="p-4 gap-3">
          <Select
            label={t("cashFlow.period")}
            selectedKeys={[preset]}
            onSelectionChange={(keys) => setPreset([...keys][0] as Preset)}
          >
            {PRESETS.map((p) => (
              <SelectItem key={p.key} textValue={p.label}>{p.label}</SelectItem>
            ))}
          </Select>

          {preset === "custom" && (
            <div className="flex gap-3">
              <Input type="date" label={t("from")} value={customFrom} onValueChange={setCustomFrom} size="sm" />
              <Input type="date" label={t("to")}   value={customTo}   onValueChange={setCustomTo}   size="sm" />
            </div>
          )}
        </CardBody>
      </Card>

      {/* Report */}
      <Card shadow="sm">
        <CardHeader className="px-6 pt-5 pb-3 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-default-900">{t("cashFlow.title")}</h2>
            <p className="text-sm text-default-400">{periodLabel} · {t("cashFlow.method")}</p>
          </div>
          {hasData && (
            <Button size="sm" variant="flat" startContent={<Download size={13} />} onPress={handleExportCSV}>
              CSV
            </Button>
          )}
        </CardHeader>
        <Divider />

        {!hasData ? (
          <CardBody className="py-16 text-center text-default-400">
            <p className="text-sm">{t("cashFlow.noData")}</p>
          </CardBody>
        ) : (
          <CardBody className="px-6 py-4 space-y-6">

            {/* Operating Activities */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-default-400 mb-3">
                {t("cashFlow.operating")}
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-default-700">{t("cashFlow.netIncome")}</span>
                  <span className={`font-medium ${report.netIncome >= 0 ? "text-default-800" : "text-danger-600"}`}>
                    {report.netIncome >= 0 ? fmt(report.netIncome) : `(${fmt(Math.abs(report.netIncome))})`}
                  </span>
                </div>
                <AdjustmentRow label={t("cashFlow.changeInAR")}        amount={report.changeInAR}        fmt={fmt} />
                <AdjustmentRow label={t("cashFlow.changeInAP")}        amount={report.changeInAP}        fmt={fmt} />
                <AdjustmentRow label={t("cashFlow.changeInInventory")} amount={report.changeInInventory} fmt={fmt} />
              </div>
              <Divider className="my-3" />
              <SectionTotal label={t("cashFlow.netOperating")} amount={report.netOperating} fmt={fmt} />
            </div>

            {/* Financing Activities */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-default-400 mb-3">
                {t("cashFlow.financing")}
              </p>
              {report.equityChanges.length === 0 ? (
                <p className="text-sm text-default-400 italic pl-4">{t("cashFlow.noEquityChanges")}</p>
              ) : (
                <div className="space-y-2">
                  {report.equityChanges.map((ec) => (
                    <AdjustmentRow key={ec.account.id} label={ec.account.name} amount={ec.amount} fmt={fmt} />
                  ))}
                </div>
              )}
              <Divider className="my-3" />
              <SectionTotal label={t("cashFlow.netFinancing")} amount={report.netFinancing} fmt={fmt} />
            </div>

            {/* Net Change Summary */}
            <div className={`rounded-xl px-4 py-4 flex items-center justify-between ${
              netPositive ? "bg-success-50 dark:bg-success-900/20" : "bg-danger-50 dark:bg-danger-900/20"
            }`}>
              <div className="flex items-center gap-2">
                {netPositive
                  ? <TrendingUp size={18} className="text-success-600" />
                  : <TrendingDown size={18} className="text-danger-600" />
                }
                <span className={`font-bold text-base ${netPositive ? "text-success-700 dark:text-success-400" : "text-danger-700 dark:text-danger-400"}`}>
                  {t("cashFlow.netChange")}
                </span>
              </div>
              <span className={`font-bold text-xl ${netPositive ? "text-success-700 dark:text-success-400" : "text-danger-700 dark:text-danger-400"}`}>
                {netPositive ? fmt(report.netChange) : `(${fmt(Math.abs(report.netChange))})`}
              </span>
            </div>

            {/* Cash Balance Reconciliation */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-default-600">{t("cashFlow.beginCash")}</span>
                <span className="font-medium text-default-800">{fmt(report.beginCash)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold border-t border-default-200 pt-2">
                <span className="text-default-800">{t("cashFlow.endCash")}</span>
                <span className={report.endCash >= 0 ? "text-default-900" : "text-danger-600"}>
                  {report.endCash >= 0 ? fmt(report.endCash) : `(${fmt(Math.abs(report.endCash))})`}
                </span>
              </div>
            </div>

          </CardBody>
        )}
      </Card>
    </div>
  );
}
