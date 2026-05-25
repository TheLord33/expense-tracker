"use client";

import { useState, useMemo } from "react";
import { Card, CardBody, CardHeader, Divider, Button, Input, Chip } from "@nextui-org/react";
import { CheckCircle, AlertCircle, Download } from "lucide-react";
import type { Account, Bill, BillPayment, Expense, IncomeSource, InventoryItem, StockMovement } from "@/lib/types";
import { deriveAllEntries, trialBalance } from "@/lib/ledger";
import { trialBalanceToCSV, download, downloadBlob } from "@/lib/importExport";
import { generateTrialBalancePDF } from "@/lib/exportPDF";
import { useLanguage, useCurrency } from "@/app/providers";

interface Props {
  expenses: Expense[];
  sources: IncomeSource[];
  accounts: Account[];
  bills?: Bill[];
  billPayments?: BillPayment[];
  inventoryItems?: InventoryItem[];
  inventoryMovements?: StockMovement[];
}

export function TrialBalanceTab({ expenses, sources, accounts, bills = [], billPayments = [], inventoryItems = [], inventoryMovements = [] }: Props) {
  const { t, locale } = useLanguage();
  const { fmt } = useCurrency();

  const todayISO = new Date().toISOString().split("T")[0];
  const [asOf, setAsOf] = useState(todayISO);

  const entries = useMemo(
    () => deriveAllEntries(expenses, sources, accounts, bills, billPayments, inventoryItems, inventoryMovements).filter((e) => e.date <= asOf),
    [expenses, sources, accounts, bills, billPayments, inventoryItems, inventoryMovements, asOf]
  );

  const rows = useMemo(() => trialBalance(accounts, entries), [accounts, entries]);

  const totalDebit  = rows.reduce((s, r) => s + r.totalDebit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.totalCredit, 0);
  const isBalanced  = Math.abs(totalDebit - totalCredit) < 0.01;

  const dateLabel = new Date(`${asOf}T00:00:00`).toLocaleDateString(locale, {
    month: "long", day: "numeric", year: "numeric",
  });

  function typeLabel(type: string): string {
    switch (type) {
      case "asset":     return t("ledger.typeAsset");
      case "liability": return t("ledger.typeLiability");
      case "equity":    return t("ledger.typeEquity");
      case "revenue":   return t("ledger.typeRevenue");
      case "expense":   return t("ledger.typeExpense");
      default:          return type;
    }
  }

  function typeColor(type: string): "success" | "danger" | "secondary" | "primary" | "warning" {
    switch (type) {
      case "asset":     return "success";
      case "liability": return "danger";
      case "equity":    return "secondary";
      case "revenue":   return "primary";
      case "expense":   return "warning";
      default:          return "primary";
    }
  }

  function handleExportCSV() {
    download(trialBalanceToCSV(rows, dateLabel, totalDebit, totalCredit), `trial-balance-${asOf}.csv`, "text/csv");
  }

  async function handleExportPDF() {
    const blob = await generateTrialBalancePDF(rows, dateLabel, fmt, totalDebit, totalCredit);
    downloadBlob(blob, `trial-balance-${asOf}.pdf`);
  }

  return (
    <div className="space-y-4">
      {/* Date picker */}
      <Card shadow="sm">
        <CardBody className="p-4">
          <Input
            type="date"
            label={t("trialBalance.asOfLabel")}
            value={asOf}
            onValueChange={setAsOf}
            max={todayISO}
            size="sm"
            className="max-w-xs"
          />
        </CardBody>
      </Card>

      {/* Report */}
      <Card shadow="sm">
        <CardHeader className="px-6 pt-5 pb-3 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-default-900">{t("trialBalance.title")}</h2>
            <p className="text-sm text-default-400">{t("trialBalance.asOf", { date: dateLabel })}</p>
          </div>
          {rows.length > 0 && (
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="flat" startContent={<Download size={13} />} onPress={handleExportCSV}>CSV</Button>
              <Button size="sm" variant="flat" startContent={<Download size={13} />} onPress={handleExportPDF}>PDF</Button>
            </div>
          )}
        </CardHeader>
        <Divider />

        {rows.length === 0 ? (
          <CardBody className="py-16 text-center text-default-400">
            <p className="text-sm">{t("trialBalance.noData")}</p>
          </CardBody>
        ) : (
          <CardBody className="px-0 py-0">
            {/* Table header */}
            <div className="grid grid-cols-[3rem_1fr_6rem_6rem] px-6 py-2 bg-default-50 border-b border-default-200 text-xs font-semibold uppercase tracking-wide text-default-500">
              <span>{t("trialBalance.code")}</span>
              <span>{t("trialBalance.account")}</span>
              <span className="text-right">{t("trialBalance.debit")}</span>
              <span className="text-right">{t("trialBalance.credit")}</span>
            </div>

            {/* Account rows */}
            {rows.map((row) => (
              <div
                key={row.account.id}
                className="grid grid-cols-[3rem_1fr_6rem_6rem] px-6 py-2.5 border-b border-default-100 text-sm hover:bg-default-50"
              >
                <span className="font-mono text-xs text-default-400 pt-0.5">{row.account.code}</span>
                <span className="text-default-800 flex items-center gap-2">
                  {row.account.name}
                  <Chip size="sm" variant="flat" color={typeColor(row.account.type)} className="shrink-0">
                    {typeLabel(row.account.type)}
                  </Chip>
                </span>
                <span className={`text-right font-medium tabular-nums ${row.totalDebit > 0 ? "text-default-800" : "text-default-300"}`}>
                  {row.totalDebit > 0 ? fmt(row.totalDebit) : "—"}
                </span>
                <span className={`text-right font-medium tabular-nums ${row.totalCredit > 0 ? "text-default-800" : "text-default-300"}`}>
                  {row.totalCredit > 0 ? fmt(row.totalCredit) : "—"}
                </span>
              </div>
            ))}

            {/* Totals row */}
            <div className="grid grid-cols-[3rem_1fr_6rem_6rem] px-6 py-3 bg-default-50 border-t-2 border-default-300 text-sm font-bold">
              <span />
              <span className="text-default-700">{t("trialBalance.totals")}</span>
              <span className="text-right tabular-nums text-default-900">{fmt(totalDebit)}</span>
              <span className="text-right tabular-nums text-default-900">{fmt(totalCredit)}</span>
            </div>

            {/* Balance check */}
            <div className={`mx-6 my-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${
              isBalanced
                ? "bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-400"
                : "bg-warning-50 dark:bg-warning-900/20 text-warning-700 dark:text-warning-400"
            }`}>
              {isBalanced
                ? <><CheckCircle size={16} />{t("trialBalance.balanced")}</>
                : <><AlertCircle size={16} />{t("trialBalance.outOfBalance", { amount: fmt(Math.abs(totalDebit - totalCredit)) })}</>
              }
            </div>
          </CardBody>
        )}
      </Card>
    </div>
  );
}
