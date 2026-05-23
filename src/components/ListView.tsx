"use client";

import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Button,
  Spinner,
} from "@nextui-org/react";
import { Pencil } from "lucide-react";
import { Expense, SortField, SortDir, CategoryDef } from "@/lib/types";

interface Props {
  expenses: Expense[];
  categories: CategoryDef[];
  onDelete: (id: string) => void;
  onEdit: (expense: Expense) => void;
  loaded: boolean;
  sortField: SortField;
  sortDir: SortDir;
  toggleSort: (f: SortField) => void;
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric" }
  );
}

function ColHeader({
  field,
  label,
  sortField,
  sortDir,
  toggleSort,
  className = "",
}: {
  field: SortField;
  label: string;
  sortField: SortField;
  sortDir: SortDir;
  toggleSort: (f: SortField) => void;
  className?: string;
}) {
  const active = sortField === field;
  return (
    <button
      className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
        active ? "text-primary" : "text-default-500 hover:text-default-800"
      } ${className}`}
      onClick={() => toggleSort(field)}
    >
      {label}
      <span className="text-[10px]">{active ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}</span>
    </button>
  );
}

export function ListView({
  expenses,
  categories,
  onDelete,
  onEdit,
  loaded,
  sortField,
  sortDir,
  toggleSort,
}: Props) {
  if (!loaded)
    return (
      <div className="flex justify-center py-12">
        <Spinner label="Loading…" />
      </div>
    );

  function chipColor(name: string) {
    return (categories.find((c) => c.name === name)?.color ?? "default") as never;
  }

  return (
    <Table aria-label="Expenses" removeWrapper>
      <TableHeader>
        <TableColumn>
          <ColHeader field="date" label="Date" sortField={sortField} sortDir={sortDir} toggleSort={toggleSort} />
        </TableColumn>
        <TableColumn>
          <ColHeader field="description" label="Description" sortField={sortField} sortDir={sortDir} toggleSort={toggleSort} />
        </TableColumn>
        <TableColumn>
          <ColHeader field="category" label="Category" sortField={sortField} sortDir={sortDir} toggleSort={toggleSort} />
        </TableColumn>
        <TableColumn className="text-right">
          <ColHeader field="amount" label="Amount" sortField={sortField} sortDir={sortDir} toggleSort={toggleSort} className="justify-end" />
        </TableColumn>
        <TableColumn> </TableColumn>
      </TableHeader>
      <TableBody emptyContent="No expenses match your filters.">
        {expenses.map((e) => (
          <TableRow key={e.id}>
            <TableCell className="text-default-500 text-sm whitespace-nowrap">
              {formatDate(e.date)}
            </TableCell>
            <TableCell>{e.description}</TableCell>
            <TableCell>
              <Chip color={chipColor(e.category)} variant="flat" size="sm">
                {e.category}
              </Chip>
            </TableCell>
            <TableCell className="text-right font-semibold">
              ${e.amount.toFixed(2)}
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Button
                  isIconOnly size="sm" variant="light"
                  aria-label="Edit"
                  onPress={() => onEdit(e)}
                >
                  <Pencil size={13} />
                </Button>
                <Button
                  isIconOnly size="sm" variant="light" color="danger"
                  aria-label="Delete"
                  onPress={() => onDelete(e.id)}
                >
                  ✕
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
