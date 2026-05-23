"use client";

import { useRef, useState } from "react";
import {
  Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, DropdownSection,
  Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
} from "@nextui-org/react";
import { Expense, CategoryDef } from "@/lib/types";
import { fromCSV, fromJSON, fromText, ImportResult } from "@/lib/importExport";
import { ExportModal } from "@/components/ExportModal";

interface Props {
  expenses: Expense[];
  categories: CategoryDef[];
  onImport: (incoming: Omit<Expense, "id">[], replace: boolean) => void;
}

type ImportFormat = "csv" | "json" | "txt";

const ACCEPT: Record<ImportFormat, string> = {
  csv: ".csv,text/csv",
  json: ".json,application/json",
  txt: ".txt,text/plain",
};

export function ImportExportMenu({ expenses, categories, onImport }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFormat, setPendingFormat] = useState<ImportFormat | null>(null);
  const [importResult, setImportResult]   = useState<ImportResult | null>(null);
  const [showExport, setShowExport]       = useState(false);

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
      const parsed =
        pendingFormat === "csv"  ? fromCSV(content) :
        pendingFormat === "json" ? fromJSON(content) :
        fromText(content);
      setImportResult(parsed);
    };
    reader.readAsText(file);
  }

  function handleConfirm(replace: boolean) {
    if (importResult) onImport(importResult.expenses, replace);
    setImportResult(null);
    setPendingFormat(null);
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
            Import / Export
          </Button>
        </DropdownTrigger>
        <DropdownMenu
          aria-label="Import and export options"
          disabledKeys={expenses.length === 0 ? ["export"] : []}
        >
          <DropdownSection title="Export" showDivider>
            <DropdownItem key="export" onPress={() => setShowExport(true)}>
              Export expenses…
            </DropdownItem>
          </DropdownSection>
          <DropdownSection title="Import">
            <DropdownItem key="import-csv"  onPress={() => openFilePicker("csv")}>CSV (.csv)</DropdownItem>
            <DropdownItem key="import-json" onPress={() => openFilePicker("json")}>JSON (.json)</DropdownItem>
            <DropdownItem key="import-txt"  onPress={() => openFilePicker("txt")}>Text (.txt)</DropdownItem>
          </DropdownSection>
        </DropdownMenu>
      </Dropdown>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />

      {/* Export modal */}
      <ExportModal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        expenses={expenses}
        categories={categories}
      />

      {/* Import confirmation modal */}
      {importResult && (
        <Modal isOpen onClose={handleImportCancel} placement="center">
          <ModalContent>
            <ModalHeader>Import {pendingFormat?.toUpperCase()} Preview</ModalHeader>
            <ModalBody className="gap-3">
              {importResult.expenses.length > 0 && (
                <div className="bg-success-50 border border-success-200 rounded-lg px-4 py-3 text-sm text-success-700">
                  <strong>{importResult.expenses.length}</strong> valid expense
                  {importResult.expenses.length !== 1 ? "s" : ""} ready to import.
                </div>
              )}
              {importResult.errors.length > 0 && (
                <div className="bg-warning-50 border border-warning-200 rounded-lg px-4 py-3 text-sm text-warning-700 space-y-1">
                  <p className="font-semibold">
                    {importResult.expenses.length === 0
                      ? "Could not parse file:"
                      : `${importResult.errors.length} row${importResult.errors.length !== 1 ? "s" : ""} skipped:`}
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
                  You currently have <strong>{expenses.length}</strong> expense
                  {expenses.length !== 1 ? "s" : ""}. Choose how to handle the import:
                </p>
              )}
              {importResult.expenses.length > 0 && (
                <div className="border border-default-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-default-50">
                      <tr>
                        {["Date", "Description", "Category", "Amount"].map((h) => (
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
                          <td className="px-3 py-1.5 font-medium">${e.amount.toFixed(2)}</td>
                        </tr>
                      ))}
                      {importResult.expenses.length > 5 && (
                        <tr className="border-t border-default-100">
                          <td colSpan={4} className="px-3 py-1.5 text-default-400 text-center">
                            … and {importResult.expenses.length - 5} more
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
                    Add to existing expenses
                  </Button>
                  {expenses.length > 0 && (
                    <Button color="danger" variant="flat" fullWidth onPress={() => handleConfirm(true)}>
                      Replace all ({expenses.length} will be deleted)
                    </Button>
                  )}
                  <Button variant="light" fullWidth onPress={handleImportCancel}>Cancel</Button>
                </>
              ) : (
                <Button fullWidth onPress={handleImportCancel}>Close</Button>
              )}
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </>
  );
}
