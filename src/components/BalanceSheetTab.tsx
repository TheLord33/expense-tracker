"use client";

import { useState, useMemo } from "react";
import { Card, CardBody, CardHeader, Divider, Button, Input, Chip } from "@nextui-org/react";
import { Scale, Settings, CheckCircle, AlertCircle, Download } from "lucide-react";
import type { Account, Bill, BillPayment, Expense, IncomeSource, InventoryItem, StockMovement } from "@/lib/types";
import { deriveAllEntries, computeBalanceSheet, type BalanceSheetRow } from "@/lib/ledger";
import { balanceSheetToCSV, download, downloadBlob } from "@/lib/importExport";
import { generateBalanceSheetPDF } from "@/lib/exportPDF";
import { useLanguage, useCurrency } from "@/app/providers";

const BS_TYPES = ["asset", "liability", "equity"] as const;
type BSType = typeof BS_TYPES[number];

interface Props {
  expenses: Expense[];
  sources: IncomeSource[];
  accounts: Account[];
  bills?: Bill[];
  billPayments?: BillPayment[];
  inventoryItems?: InventoryItem[];
  inventoryMovements?: StockMovement[];
  openingBalances: Record<string, number>;
  onSetBalance: (id: string, amount: number) => void;
}

export function BalanceSheetTab({ expenses, sources, accounts, bills = [], billPayments = [], inventoryItems = [], inventoryMovements = [], openingBalances, onSetBalance }: Props) {
  const { t, locale } = useLanguage();
  const { fmt } = useCurrency();

  const [view, setView] = useState<"report" | "setup">("report");
  // Draft state for the opening balances editor
  const [draft, setDraft] = useState<Record<string, string>>({});

  const entries = useMemo(
    () => deriveAllEntries(expenses, sources, accounts, bills, billPayments, inventoryItems, inventoryMovements),
    [expenses, sources, accounts, bills, billPayments, inventoryItems, inventoryMovements]
  );

  const report = useMemo(
    () => computeBalanceSheet(accounts, entries, openingBalances),
    [accounts, entries, openingBalances]
  );

  const bsAccounts = accounts.filter((a) => BS_TYPES.includes(a.type as BSType));
  const isBalanced = Math.abs(report.difference) < 0.01;
  const today = new Date().toLocaleDateString(locale, { month: "long", day: "numeric", year: "numeric" });
  const todayISO = new Date().toISOString().split("T")[0];

  function handleExportCSV() {
    download(balanceSheetToCSV(report, today), `balance-sheet-${todayISO}.csv`, "text/csv");
  }

  async function handleExportPDF() {
    const blob = await generateBalanceSheetPDF(report, today, fmt);
    downloadBlob(blob, `balance-sheet-${todayISO}.pdf`);
  }

  // ── Opening Balances editor ──────────────────────────────────────────────────

  function openSetup() {
    const init: Record<string, string> = {};
    for (const acc of bsAccounts) {
      const val = openingBalances[acc.id];
      init[acc.id] = val ? String(val) : "";
    }
    setDraft(init);
    setView("setup");
  }

  function handleSave() {
    for (const acc of bsAccounts) {
      const raw = draft[acc.id] ?? "";
      const num = parseFloat(raw);
      onSetBalance(acc.id, isNaN(num) ? 0 : num);
    }
    setView("report");
  }

  // ── Section helpers ──────────────────────────────────────────────────────────

  function typeColor(type: BSType): "success" | "danger" | "secondary" {
    return type === "asset" ? "success" : type === "liability" ? "danger" : "secondary";
  }

  function sectionLabel(type: BSType) {
    if (type === "asset")     return t("balanceSheet.assets");
    if (type === "liability") return t("balanceSheet.liabilities");
    return t("balanceSheet.equity");
  }

  function sectionRows(type: BSType): BalanceSheetRow[] {
    if (type === "asset")     return report.assets;
    if (type === "liability") return report.liabilities;
    return report.equity;
  }

  function sectionTotal(type: BSType): number {
    if (type === "asset")     return report.totalAssets;
    if (type === "liability") return report.totalLiabilities;
    // equity total includes retained earnings
    return report.totalEquity;
  }

  function sectionTotalLabel(type: BSType) {
    if (type === "asset")     return t("balanceSheet.totalAssets");
    if (type === "liability") return t("balanceSheet.totalLiabilities");
    return t("balanceSheet.totalEquity");
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={view === "report" ? "solid" : "flat"}
            color={view === "report" ? "primary" : "default"}
            startContent={<Scale size={14} />}
            onPress={() => setView("report")}
          >
            {t("balanceSheet.tabReport")}
          </Button>
          <Button
            size="sm"
            variant={view === "setup" ? "solid" : "flat"}
            color={view === "setup" ? "primary" : "default"}
            startContent={<Settings size={14} />}
            onPress={openSetup}
          >
            {t("balanceSheet.tabSetup")}
          </Button>
        </div>
        {view === "report" && (
          <div className="flex gap-2">
            <Button size="sm" variant="flat" startContent={<Download size={13} />} onPress={handleExportCSV}>CSV</Button>
            <Button size="sm" variant="flat" startContent={<Download size={13} />} onPress={handleExportPDF}>PDF</Button>
          </div>
        )}
      </div>

      {/* ── Report ── */}
      {view === "report" && (
        <Card shadow="sm">
          <CardHeader className="px-6 pt-5 pb-3 flex-col items-start gap-0.5">
            <h2 className="text-lg font-bold text-default-900">{t("balanceSheet.title")}</h2>
            <p className="text-sm text-default-400">{t("balanceSheet.asOf", { date: today })}</p>
          </CardHeader>
          <Divider />
          <CardBody className="px-6 py-5 space-y-6">

            {/* Assets, Liabilities, Equity sections */}
            {BS_TYPES.map((type) => (
              <div key={type}>
                <p className="text-xs font-bold uppercase tracking-widest mb-3">
                  <Chip color={typeColor(type)} variant="flat" size="sm">{sectionLabel(type)}</Chip>
                </p>
                <div className="space-y-2">
                  {sectionRows(type).map((row) => (
                    <div key={row.account.id} className="flex justify-between text-sm">
                      <span className="text-default-700">
                        <span className="font-mono text-default-400 mr-2 text-xs">{row.account.code}</span>
                        {row.account.name}
                      </span>
                      <span className={`font-medium ${row.totalBalance < 0 ? "text-danger" : "text-default-800"}`}>
                        {fmt(row.totalBalance)}
                      </span>
                    </div>
                  ))}

                  {/* Retained Earnings line — equity section only */}
                  {type === "equity" && (
                    <div className="flex justify-between text-sm">
                      <span className="text-default-700 italic">
                        {t("balanceSheet.retainedEarnings")}
                      </span>
                      <span className={`font-medium ${report.retainedEarnings < 0 ? "text-danger" : "text-default-800"}`}>
                        {fmt(report.retainedEarnings)}
                      </span>
                    </div>
                  )}
                </div>
                <Divider className="my-3" />
                <div className="flex justify-between font-semibold text-sm">
                  <span>{sectionTotalLabel(type)}</span>
                  <span className={`${type === "asset" ? "text-success-600" : type === "liability" ? "text-danger-600" : "text-secondary-600"}`}>
                    {fmt(sectionTotal(type))}
                  </span>
                </div>
              </div>
            ))}

            <Divider />

            {/* Total Liabilities + Equity */}
            <div className="flex justify-between font-bold text-base">
              <span>{t("balanceSheet.totalLiabEquity")}</span>
              <span>{fmt(report.totalLiabilities + report.totalEquity)}</span>
            </div>

            {/* Balance check */}
            <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${
              isBalanced
                ? "bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-400"
                : "bg-warning-50 dark:bg-warning-900/20 text-warning-700 dark:text-warning-400"
            }`}>
              {isBalanced
                ? <><CheckCircle size={16} />{t("balanceSheet.balanced")}</>
                : <><AlertCircle size={16} />{t("balanceSheet.outOfBalance", { amount: fmt(Math.abs(report.difference)) })}</>
              }
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── Opening Balances Setup ── */}
      {view === "setup" && (
        <Card shadow="sm">
          <CardHeader className="px-6 pt-5 pb-2 flex-col items-start gap-1">
            <h2 className="text-base font-semibold text-default-800">{t("balanceSheet.tabSetup")}</h2>
            <p className="text-sm text-default-400">{t("balanceSheet.openingBalanceHint")}</p>
          </CardHeader>
          <Divider />
          <CardBody className="px-6 py-5 space-y-5">
            {BS_TYPES.map((type) => {
              const accs = bsAccounts.filter((a) => a.type === type);
              if (accs.length === 0) return null;
              return (
                <div key={type}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-3">
                    <Chip color={typeColor(type)} variant="flat" size="sm">{sectionLabel(type)}</Chip>
                  </p>
                  <div className="space-y-3">
                    {accs.map((acc) => (
                      <div key={acc.id} className="flex items-center gap-3">
                        <span className="font-mono text-xs text-default-400 w-12 shrink-0">{acc.code}</span>
                        <span className="text-sm text-default-700 flex-1">{acc.name}</span>
                        <div className="w-36 shrink-0">
                          <Input
                            size="sm"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={draft[acc.id] ?? ""}
                            onValueChange={(v) => setDraft((prev) => ({ ...prev, [acc.id]: v }))}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="flat" onPress={() => setView("report")}>{t("cancel")}</Button>
              <Button color="primary" onPress={handleSave}>{t("balanceSheet.saveBalances")}</Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
