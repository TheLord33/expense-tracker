"use client";

import { useRef, useState } from "react";
import {
  Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, DropdownSection,
  Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
} from "@nextui-org/react";
import type { Account, Expense, CategoryDef } from "@/lib/types";
import { fromCSV, fromJSON, fromText, toFullBackupJSON, exportStorageBackup, importStorageBackup, download, type FullBackupResult } from "@/lib/importExport";
import { ExportModal } from "@/components/ExportModal";
import { CloudExportModal } from "@/components/CloudExportModal";
import { useLanguage, useCurrency } from "@/app/providers";

interface Props {
  expenses: Expense[];
  categories: CategoryDef[];
  accounts: Account[];
  openingBalances: Record<string, number>;
  onImport: (incoming: Omit<Expense, "id">[], replace: boolean) => void;
  onImportAccounts: (accounts: Account[]) => void;
  onImportOpeningBalances: (balances: Record<string, number>) => void;
}

type ImportFormat = "csv" | "json" | "txt";

const ACCEPT: Record<ImportFormat, string> = {
  csv: ".csv,text/csv",
  json: ".json,application/json",
  txt: ".txt,text/plain",
};

export function ImportExportMenu({ expenses, categories, accounts, openingBalances, onImport, onImportAccounts, onImportOpeningBalances }: Props) {
  const { t } = useLanguage();
  const { fmt } = useCurrency();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFormat, setPendingFormat]   = useState<ImportFormat | null>(null);
  const [importResult, setImportResult]     = useState<FullBackupResult | null>(null);
  const [showExport, setShowExport]         = useState(false);
  const [showCloud, setShowCloud]           = useState(false);
  const [v2RestoreErr, setV2RestoreErr]     = useState("");

  // ── Import ────────────────────────────────────────────────────────────

  function openFilePicker(fmt: ImportFormat) {
    setPendingFormat(fmt);
    if (fileInputRef.current) {
      fileInputRef.current.accept = ACCEPT[fmt];
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  }

  function handleFileChange(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (!file || !pendingFormat) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      // Detect v2 comprehensive backup before regular JSON parse
      if (pendingFormat === "json") {
        try {
          const probe = JSON.parse(content) as Record<string, unknown>;
          if (probe.type === "full-backup-v2") {
            const ok = importStorageBackup(content);
            if (ok) {
              window.location.reload();
            } else {
              setV2RestoreErr(t("importExport.v2RestoreError"));
            }
            return;
          }
        } catch { /* fall through to regular parse */ }
      }
      const bare = (r: { expenses: Omit<Expense, "id">[]; errors: string[] }): FullBackupResult =>
        ({ ...r, isFullBackup: false, customAccounts: [], openingBalances: {} });
      const parsed: FullBackupResult =
        pendingFormat === "csv"  ? bare(fromCSV(content)) :
        pendingFormat === "json" ? fromJSON(content) :
        bare(fromText(content));
      setImportResult(parsed);
    };
    reader.readAsText(file);
  }

  function handleConfirm(replace: boolean) {
    if (!importResult) return;
    onImport(importResult.expenses, replace);
    if (importResult.isFullBackup) {
      onImportAccounts(importResult.customAccounts);
      onImportOpeningBalances(importResult.openingBalances);
    }
    setImportResult(null);
    setPendingFormat(null);
  }

  function handleExportBackup() {
    const today = new Date().toISOString().split("T")[0];
    download(toFullBackupJSON(expenses, accounts, openingBalances), `folio-backup-${today}.json`, "application/json");
  }

  function handleExportFullBackup() {
    const today = new Date().toISOString().split("T")[0];
    download(exportStorageBackup(), `folio-full-backup-${today}.json`, "application/json");
  }

  function handleImportCancel() {
    setImportResult(null);
    setPendingFormat(null);
  }

  return (
    <>
      <Dropdown>
        <DropdownTrigger>
          <Button
            variant="bordered"
            size="sm"
            className="border-white/30 text-white hover:bg-white/10"
          >
            {t("importExport.button")}
          </Button>
        </DropdownTrigger>
        <DropdownMenu
          aria-label="Import and export options"
          disabledKeys={expenses.length === 0 ? ["export"] : []}
        >
          <DropdownSection title={t("importExport.exportSection")} showDivider>
            <DropdownItem key="export" onPress={() => setShowExport(true)}>
              {t("importExport.exportAction")}
            </DropdownItem>
            <DropdownItem key="backup" onPress={handleExportBackup}>
              {t("importExport.exportBackup")}
            </DropdownItem>
            <DropdownItem key="backup-full" onPress={handleExportFullBackup}>
              {t("importExport.exportFullBackup")}
            </DropdownItem>
            <DropdownItem key="cloud" onPress={() => setShowCloud(true)}>
              {t("cloudExport.title")} ✦
            </DropdownItem>
          </DropdownSection>
          <DropdownSection title={t("importExport.importSection")}>
            <DropdownItem key="import-csv"  onPress={() => openFilePicker("csv")}>{t("importExport.importCsv")}</DropdownItem>
            <DropdownItem key="import-json" onPress={() => openFilePicker("json")}>{t("importExport.importJson")}</DropdownItem>
            <DropdownItem key="import-txt"  onPress={() => openFilePicker("txt")}>{t("importExport.importTxt")}</DropdownItem>
          </DropdownSection>
        </DropdownMenu>
      </Dropdown>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />

      {/* v2 restore error */}
      {v2RestoreErr && (
        <Modal isOpen onClose={() => setV2RestoreErr("")} placement="center" size="sm">
          <ModalContent>
            <ModalHeader>{t("importExport.importTitle", { format: "JSON" })}</ModalHeader>
            <ModalBody><p className="text-sm text-danger-600">{v2RestoreErr}</p></ModalBody>
            <ModalFooter><Button onPress={() => setV2RestoreErr("")}>{t("close")}</Button></ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {/* Export modal */}
      <ExportModal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        expenses={expenses}
        categories={categories}
      />

      {/* Cloud export modal */}
      <CloudExportModal
        isOpen={showCloud}
        onClose={() => setShowCloud(false)}
        expenses={expenses}
        categories={categories}
      />

      {/* Import confirmation modal */}
      {importResult && (
        <Modal isOpen onClose={handleImportCancel} placement="center">
          <ModalContent>
            <ModalHeader>{t("importExport.importTitle", { format: pendingFormat?.toUpperCase() ?? "" })}</ModalHeader>
            <ModalBody className="gap-3">
              {importResult.isFullBackup && (
                <div className="bg-primary-50 border border-primary-200 rounded-lg px-4 py-3 text-sm text-primary-700">
                  {t("importExport.fullBackupDetected", {
                    accounts: importResult.customAccounts.length,
                  })}
                </div>
              )}
              {importResult.expenses.length > 0 && (
                <div className="bg-success-50 border border-success-200 rounded-lg px-4 py-3 text-sm text-success-700">
                  <strong>{importResult.expenses.length}</strong>{" "}
                  {importResult.expenses.length !== 1
                    ? t("importExport.validCountPlural", { count: importResult.expenses.length })
                    : t("importExport.validCount", { count: importResult.expenses.length })}
                </div>
              )}
              {importResult.errors.length > 0 && (
                <div className="bg-warning-50 border border-warning-200 rounded-lg px-4 py-3 text-sm text-warning-700 space-y-1">
                  <p className="font-semibold">
                    {importResult.expenses.length === 0
                      ? t("importExport.cannotParse")
                      : importResult.errors.length !== 1
                        ? t("importExport.rowsSkippedPlural", { count: importResult.errors.length })
                        : t("importExport.rowsSkipped", { count: importResult.errors.length })}
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 max-h-32 overflow-y-auto">
                    {importResult.errors.map((err, i) => (
                      <li key={i} className="font-mono text-xs whitespace-pre-wrap">{err}</li>
                    ))}
                  </ul>
                </div>
              )}
              {importResult.expenses.length > 0 && expenses.length > 0 && (
                <p className="text-sm text-default-500">
                  {expenses.length !== 1
                    ? t("importExport.currentCountPlural", { count: expenses.length })
                    : t("importExport.currentCount", { count: expenses.length })}
                </p>
              )}
              {importResult.expenses.length > 0 && (
                <div className="border border-default-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-default-50">
                      <tr>
                        {[t("addExpense.date"), t("addExpense.description"), t("addExpense.category"), t("addExpense.amount")].map((h) => (
                          <th key={h} className="px-3 py-2 text-left font-semibold text-default-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importResult.expenses.slice(0, 5).map((e, i) => (
                        <tr key={i} className="border-t border-default-100">
                          <td className="px-3 py-1.5 text-default-500">{e.date}</td>
                          <td className="px-3 py-1.5 max-w-32 truncate">{e.description}</td>
                          <td className="px-3 py-1.5">{e.category}</td>
                          <td className="px-3 py-1.5 font-medium">{fmt(e.amount)}</td>
                        </tr>
                      ))}
                      {importResult.expenses.length > 5 && (
                        <tr className="border-t border-default-100">
                          <td colSpan={4} className="px-3 py-1.5 text-default-400 text-center">
                            {t("exportModal.andMore", { count: importResult.expenses.length - 5 })}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </ModalBody>
            <ModalFooter className="flex-col gap-2">
              {importResult.expenses.length > 0 ? (
                <>
                  <Button color="primary" fullWidth onPress={() => handleConfirm(false)}>
                    {t("importExport.addToExisting")}
                  </Button>
                  {expenses.length > 0 && (
                    <Button color="danger" variant="flat" fullWidth onPress={() => handleConfirm(true)}>
                      {t("importExport.replaceAll", { count: expenses.length })}
                    </Button>
                  )}
                  <Button variant="light" fullWidth onPress={handleImportCancel}>{t("cancel")}</Button>
                </>
              ) : (
                <Button fullWidth onPress={handleImportCancel}>{t("close")}</Button>
              )}
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </>
  );
}
