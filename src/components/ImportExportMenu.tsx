"use client";

import { useRef, useState } from "react";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSection,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@nextui-org/react";
import { Expense } from "@/lib/types";
import {
  toCSV,
  toJSON,
  toText,
  download,
  fromCSV,
  fromJSON,
  fromText,
  ImportResult,
} from "@/lib/importExport";

interface Props {
  expenses: Expense[];
  onImport: (incoming: Omit<Expense, "id">[], replace: boolean) => void;
}

type Format = "csv" | "json" | "txt";

const MIME: Record<Format, string> = {
  csv: "text/csv",
  json: "application/json",
  txt: "text/plain",
};

const ACCEPT: Record<Format, string> = {
  csv: ".csv,text/csv",
  json: ".json,application/json",
  txt: ".txt,text/plain",
};

function stamp() {
  return new Date().toISOString().split("T")[0];
}

export function ImportExportMenu({ expenses, onImport }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFormat, setPendingFormat] = useState<Format | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  // ── Export ────────────────────────────────────────────────────────────

  function handleExport(fmt: Format) {
    const name = `expenses-${stamp()}.${fmt}`;
    const content =
      fmt === "csv" ? toCSV(expenses) :
      fmt === "json" ? toJSON(expenses) :
      toText(expenses);
    download(content, name, MIME[fmt]);
  }

  // ── Import ────────────────────────────────────────────────────────────

  function openFilePicker(fmt: Format) {
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
        pendingFormat === "csv" ? fromCSV(content) :
        pendingFormat === "json" ? fromJSON(content) :
        fromText(content);
      setResult(parsed);
    };
    reader.readAsText(file);
  }

  function handleConfirm(replace: boolean) {
    if (result) onImport(result.expenses, replace);
    setResult(null);
    setPendingFormat(null);
  }

  function handleCancel() {
    setResult(null);
    setPendingFormat(null);
  }

  const hasExpenses = expenses.length > 0;

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
        <DropdownMenu aria-label="Import and export options" disabledKeys={hasExpenses ? [] : ["export-csv", "export-json", "export-txt"]}>
          <DropdownSection title="Export" showDivider>
            <DropdownItem key="export-csv" onPress={() => handleExport("csv")}>
              CSV (.csv)
            </DropdownItem>
            <DropdownItem key="export-json" onPress={() => handleExport("json")}>
              JSON (.json)
            </DropdownItem>
            <DropdownItem key="export-txt" onPress={() => handleExport("txt")}>
              Text (.txt)
            </DropdownItem>
          </DropdownSection>
          <DropdownSection title="Import">
            <DropdownItem key="import-csv" onPress={() => openFilePicker("csv")}>
              CSV (.csv)
            </DropdownItem>
            <DropdownItem key="import-json" onPress={() => openFilePicker("json")}>
              JSON (.json)
            </DropdownItem>
            <DropdownItem key="import-txt" onPress={() => openFilePicker("txt")}>
              Text (.txt)
            </DropdownItem>
          </DropdownSection>
        </DropdownMenu>
      </Dropdown>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Import confirmation modal */}
      {result && (
        <Modal isOpen onClose={handleCancel} placement="center">
          <ModalContent>
            <ModalHeader>
              Import{" "}
              {pendingFormat?.toUpperCase()} Preview
            </ModalHeader>
            <ModalBody className="gap-3">
              {result.expenses.length > 0 && (
                <div className="bg-success-50 border border-success-200 rounded-lg px-4 py-3 text-sm text-success-700">
                  <strong>{result.expenses.length}</strong> valid expense
                  {result.expenses.length !== 1 ? "s" : ""} ready to import.
                </div>
              )}

              {result.errors.length > 0 && (
                <div className="bg-warning-50 border border-warning-200 rounded-lg px-4 py-3 text-sm text-warning-700 space-y-1">
                  <p className="font-semibold">
                    {result.expenses.length === 0 ? "Could not parse file:" : `${result.errors.length} row${result.errors.length !== 1 ? "s" : ""} skipped:`}
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 max-h-32 overflow-y-auto">
                    {result.errors.map((err, i) => (
                      <li key={i} className="font-mono text-xs whitespace-pre-wrap">{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.expenses.length > 0 && expenses.length > 0 && (
                <p className="text-sm text-default-500">
                  You currently have <strong>{expenses.length}</strong> expense
                  {expenses.length !== 1 ? "s" : ""}. Choose how to handle the
                  import:
                </p>
              )}

              {/* Preview table — first 5 rows */}
              {result.expenses.length > 0 && (
                <div className="border border-default-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-default-50">
                      <tr>
                        {["Date", "Description", "Category", "Amount"].map((h) => (
                          <th key={h} className="px-3 py-2 text-left font-semibold text-default-500">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.expenses.slice(0, 5).map((e, i) => (
                        <tr key={i} className="border-t border-default-100">
                          <td className="px-3 py-1.5 text-default-500">{e.date}</td>
                          <td className="px-3 py-1.5 max-w-32 truncate">{e.description}</td>
                          <td className="px-3 py-1.5">{e.category}</td>
                          <td className="px-3 py-1.5 font-medium">${e.amount.toFixed(2)}</td>
                        </tr>
                      ))}
                      {result.expenses.length > 5 && (
                        <tr className="border-t border-default-100">
                          <td colSpan={4} className="px-3 py-1.5 text-default-400 text-center">
                            … and {result.expenses.length - 5} more
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </ModalBody>
            <ModalFooter className="flex-col gap-2">
              {result.expenses.length > 0 ? (
                <>
                  <Button
                    color="primary"
                    fullWidth
                    onPress={() => handleConfirm(false)}
                  >
                    Add to existing expenses
                  </Button>
                  {expenses.length > 0 && (
                    <Button
                      color="danger"
                      variant="flat"
                      fullWidth
                      onPress={() => handleConfirm(true)}
                    >
                      Replace all ({expenses.length} will be deleted)
                    </Button>
                  )}
                  <Button variant="light" fullWidth onPress={handleCancel}>
                    Cancel
                  </Button>
                </>
              ) : (
                <Button fullWidth onPress={handleCancel}>
                  Close
                </Button>
              )}
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </>
  );
}
