"use client";

import { useState, useMemo } from "react";
import {
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Button, Input, Chip, Divider,
} from "@nextui-org/react";
import { Download } from "lucide-react";
import { Expense, CategoryDef } from "@/lib/types";
import { toCSV, toJSON, toText, download } from "@/lib/importExport";

type Format = "csv" | "json" | "txt" | "pdf";

const FORMATS: { value: Format; label: string; ext: string; mime: string }[] = [
  { value: "csv",  label: "CSV",  ext: "csv",  mime: "text/csv" },
  { value: "json", label: "JSON", ext: "json", mime: "application/json" },
  { value: "txt",  label: "Text", ext: "txt",  mime: "text/plain" },
  { value: "pdf",  label: "PDF",  ext: "pdf",  mime: "application/pdf" },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  expenses: Expense[];
  categories: CategoryDef[];
}

function today() {
  return new Date().toISOString().split("T")[0];
}

export function ExportModal({ isOpen, onClose, expenses, categories }: Props) {
  const [format, setFormat]           = useState<Format>("csv");
  const [filename, setFilename]       = useState(`expenses-${today()}`);
  const [dateFrom, setDateFrom]       = useState("");
  const [dateTo, setDateTo]           = useState("");
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      if (dateFrom && e.date < dateFrom) return false;
      if (dateTo   && e.date > dateTo)   return false;
      if (selectedCats.length > 0 && !selectedCats.includes(e.category)) return false;
      return true;
    });
  }, [expenses, dateFrom, dateTo, selectedCats]);

  const total = filtered.reduce((s, e) => s + e.amount, 0);

  function toggleCat(name: string) {
    setSelectedCats((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  }

  function handleClose() {
    setFormat("csv");
    setFilename(`expenses-${today()}`);
    setDateFrom("");
    setDateTo("");
    setSelectedCats([]);
    setIsExporting(false);
    onClose();
  }

  async function handleExport() {
    if (filtered.length === 0) return;
    setIsExporting(true);
    try {
      const fmt = FORMATS.find((f) => f.value === format)!;
      const name = `${filename.trim() || `expenses-${today()}`}.${fmt.ext}`;

      if (format === "pdf") {
        const { generatePDF } = await import("@/lib/exportPDF");
        const blob = await generatePDF(filtered);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const content =
          format === "csv"  ? toCSV(filtered) :
          format === "json" ? toJSON(filtered) :
          toText(filtered);
        download(content, name, fmt.mime);
      }
      handleClose();
    } finally {
      setIsExporting(false);
    }
  }

  const fmt = FORMATS.find((f) => f.value === format)!;
  const hasResults = filtered.length > 0;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} placement="center" size="lg" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>Export Expenses</ModalHeader>
        <ModalBody className="gap-5">

          {/* Format */}
          <div>
            <p className="text-sm font-medium text-default-700 mb-2">Format</p>
            <div className="flex gap-2 flex-wrap">
              {FORMATS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFormat(f.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                    format === f.value
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-default-50 dark:bg-gray-800 text-default-700 border-default-200 dark:border-gray-600 hover:bg-default-100 dark:hover:bg-gray-700"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Filename */}
          <Input
            label="Filename"
            value={filename}
            onValueChange={setFilename}
            endContent={
              <span className="text-default-400 text-sm shrink-0">.{fmt.ext}</span>
            }
          />

          <Divider />

          {/* Date range */}
          <div>
            <p className="text-sm font-medium text-default-700 mb-2">Date Range</p>
            <div className="grid grid-cols-2 gap-3">
              <Input label="From" type="date" size="sm" value={dateFrom} onValueChange={setDateFrom} />
              <Input label="To"   type="date" size="sm" value={dateTo}   onValueChange={setDateTo}   />
            </div>
          </div>

          {/* Category filter */}
          <div>
            <p className="text-sm font-medium text-default-700 mb-2">
              Categories
              <span className="text-default-400 font-normal ml-1">
                {selectedCats.length === 0 ? "— all" : `— ${selectedCats.length} selected`}
              </span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => {
                const active = selectedCats.includes(cat.name);
                return (
                  <Chip
                    key={cat.name}
                    color={active ? (cat.color as never) : "default"}
                    variant={active ? "solid" : "flat"}
                    className="cursor-pointer select-none"
                    onClick={() => toggleCat(cat.name)}
                  >
                    {cat.name}
                  </Chip>
                );
              })}
            </div>
          </div>

          <Divider />

          {/* Summary */}
          <div className={`rounded-lg px-4 py-3 ${
            hasResults
              ? "bg-primary-50 dark:bg-indigo-900/20"
              : "bg-warning-50 dark:bg-warning-900/20"
          }`}>
            {hasResults ? (
              <div className="flex items-center justify-between">
                <p className="text-sm text-primary-700 dark:text-indigo-300">
                  <span className="font-bold">{filtered.length}</span>{" "}
                  record{filtered.length !== 1 ? "s" : ""} will be exported
                  {filtered.length < expenses.length && (
                    <span className="text-default-500 dark:text-default-400">
                      {" "}(of {expenses.length} total)
                    </span>
                  )}
                </p>
                <p className="text-sm font-bold text-primary-700 dark:text-indigo-300">
                  ${total.toFixed(2)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-warning-700 dark:text-warning-400 font-medium">
                No expenses match the selected filters.
              </p>
            )}
          </div>

          {/* Preview table */}
          {hasResults && (
            <div>
              <p className="text-xs font-semibold text-default-500 uppercase tracking-wider mb-2">
                Preview
              </p>
              <div className="border border-default-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-default-50 dark:bg-gray-800">
                    <tr>
                      {["Date", "Description", "Category", "Amount"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-default-500">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, 5).map((e, i) => (
                      <tr key={i} className="border-t border-default-100 dark:border-gray-700">
                        <td className="px-3 py-1.5 text-default-500">{e.date}</td>
                        <td className="px-3 py-1.5 max-w-[120px] truncate">{e.description}</td>
                        <td className="px-3 py-1.5">{e.category}</td>
                        <td className="px-3 py-1.5 font-medium">${e.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                    {filtered.length > 5 && (
                      <tr className="border-t border-default-100 dark:border-gray-700">
                        <td colSpan={4} className="px-3 py-1.5 text-default-400 text-center italic">
                          … and {filtered.length - 5} more
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <Button variant="flat" onPress={handleClose} isDisabled={isExporting}>
            Cancel
          </Button>
          <Button
            color="primary"
            startContent={!isExporting ? <Download size={14} /> : undefined}
            onPress={handleExport}
            isDisabled={!hasResults}
            isLoading={isExporting}
          >
            {isExporting
              ? "Exporting…"
              : `Export ${filtered.length} Record${filtered.length !== 1 ? "s" : ""}`}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
