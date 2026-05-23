"use client";

import { useState, FormEvent } from "react";
import {
  Card, CardBody, Button, Input, Chip, Progress,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  useDisclosure, Select, SelectItem,
} from "@nextui-org/react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Budget, CategoryDef, Expense } from "@/lib/types";

interface Props {
  budgets: Budget[];
  categories: CategoryDef[];
  expenses: Expense[];
  onAdd: (category: string, limit: number) => void;
  onUpdate: (id: string, limit: number) => void;
  onDelete: (id: string) => void;
}

function monthSpend(expenses: Expense[], category: string): number {
  const month = new Date().toISOString().slice(0, 7);
  return expenses
    .filter((e) => e.category === category && e.date.startsWith(month))
    .reduce((s, e) => s + e.amount, 0);
}

export function BudgetsTab({ budgets, categories, expenses, onAdd, onUpdate, onDelete }: Props) {
  const modal = useDisclosure();
  const [editing, setEditing] = useState<Budget | null>(null);
  const [selectedCat, setSelectedCat] = useState("");
  const [limitStr, setLimitStr] = useState("");
  const [err, setErr] = useState("");

  const budgeted = new Set(budgets.map((b) => b.category));
  const available = categories.filter((c) => !budgeted.has(c.name));

  function openAdd() {
    setEditing(null);
    setSelectedCat(available[0]?.name ?? "");
    setLimitStr("");
    setErr("");
    modal.onOpen();
  }

  function openEdit(b: Budget) {
    setEditing(b);
    setSelectedCat(b.category);
    setLimitStr(String(b.monthlyLimit));
    setErr("");
    modal.onOpen();
  }

  function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    const limit = parseFloat(limitStr);
    if (!selectedCat) { setErr("Select a category"); return; }
    if (isNaN(limit) || limit <= 0) { setErr("Enter a valid amount"); return; }
    editing ? onUpdate(editing.id, limit) : onAdd(selectedCat, limit);
    modal.onClose();
  }

  const month = new Date().toLocaleString("default", { month: "long", year: "numeric" });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-default-800">Monthly Budgets</h2>
          <p className="text-sm text-default-400">{month}</p>
        </div>
        <Button
          size="sm" color="primary"
          startContent={<Plus size={14} />}
          onPress={openAdd}
          isDisabled={available.length === 0}
        >
          Add Budget
        </Button>
      </div>

      {budgets.length === 0 ? (
        <Card shadow="none" className="border-2 border-dashed border-default-200">
          <CardBody className="py-16 text-center text-default-400">
            <p className="font-medium text-default-500">No budgets set yet</p>
            <p className="text-sm mt-1">Set monthly spending limits per category to track your goals</p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {budgets.map((budget) => {
            const spent = monthSpend(expenses, budget.category);
            const pct = Math.min((spent / budget.monthlyLimit) * 100, 100);
            const over = spent > budget.monthlyLimit;
            const warn = !over && pct >= 80;
            const remaining = budget.monthlyLimit - spent;
            const cat = categories.find((c) => c.name === budget.category);

            return (
              <Card key={budget.id} shadow="sm" className="border border-default-100">
                <CardBody className="p-4 gap-3">
                  <div className="flex items-center justify-between">
                    <Chip color={(cat?.color ?? "default") as never} variant="flat" size="sm">
                      {budget.category}
                    </Chip>
                    <div className="flex gap-1">
                      <Button isIconOnly size="sm" variant="light" onPress={() => openEdit(budget)}>
                        <Pencil size={13} />
                      </Button>
                      <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => onDelete(budget.id)}>
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>

                  <Progress
                    value={pct}
                    color={over ? "danger" : warn ? "warning" : "success"}
                    size="sm"
                  />

                  <div className="flex justify-between text-sm">
                    <span className={over ? "text-danger font-semibold" : "text-default-700"}>
                      ${spent.toFixed(2)} spent
                    </span>
                    <span className="text-default-400">of ${budget.monthlyLimit.toFixed(2)}</span>
                  </div>

                  <p className={`text-xs font-medium ${over ? "text-danger" : warn ? "text-warning" : "text-success"}`}>
                    {over
                      ? `$${Math.abs(remaining).toFixed(2)} over budget`
                      : `$${remaining.toFixed(2)} remaining`}
                  </p>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <Modal isOpen={modal.isOpen} onClose={modal.onClose} placement="center" size="sm">
        <ModalContent>
          <form onSubmit={handleSubmit}>
            <ModalHeader>{editing ? "Edit Budget" : "Add Budget"}</ModalHeader>
            <ModalBody className="gap-4">
              {editing ? (
                <p className="text-default-600 text-sm">
                  Category: <strong>{editing.category}</strong>
                </p>
              ) : (
                <Select
                  label="Category"
                  selectedKeys={selectedCat ? [selectedCat] : []}
                  onSelectionChange={(keys) => setSelectedCat([...keys][0] as string)}
                >
                  {available.map((c) => (
                    <SelectItem key={c.name}>{c.name}</SelectItem>
                  ))}
                </Select>
              )}
              <Input
                label="Monthly Limit"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={limitStr}
                onValueChange={(v) => { setLimitStr(v); setErr(""); }}
                startContent={<span className="text-default-400 text-sm">$</span>}
                isInvalid={!!err}
                errorMessage={err}
              />
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={modal.onClose}>Cancel</Button>
              <Button color="primary" type="submit">{editing ? "Save" : "Add Budget"}</Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </div>
  );
}
