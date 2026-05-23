"use client";

import { useState, FormEvent } from "react";
import {
  Card, CardBody, Button, Input, Chip, Select, SelectItem,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure,
} from "@nextui-org/react";
import { Plus, Pencil, Trash2, RefreshCw } from "lucide-react";
import {
  RecurringExpense, CategoryDef,
  RECURRING_FREQUENCIES, RecurringFrequency,
} from "@/lib/types";

interface Props {
  recurring: RecurringExpense[];
  categories: CategoryDef[];
  onAdd: (rule: Omit<RecurringExpense, "id" | "lastGenerated">) => void;
  onUpdate: (id: string, data: Partial<Omit<RecurringExpense, "id">>) => void;
  onDelete: (id: string) => void;
}

function nextDue(rule: RecurringExpense): string {
  if (!rule.lastGenerated) return rule.startDate;
  const d = new Date(rule.lastGenerated);
  switch (rule.frequency) {
    case "daily":    d.setDate(d.getDate() + 1); break;
    case "weekly":   d.setDate(d.getDate() + 7); break;
    case "biweekly": d.setDate(d.getDate() + 14); break;
    case "monthly":  d.setMonth(d.getMonth() + 1); break;
    case "yearly":   d.setFullYear(d.getFullYear() + 1); break;
  }
  return d.toISOString().split("T")[0];
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString(
    "en-US", { month: "short", day: "numeric", year: "numeric" }
  );
}

const BLANK = {
  description: "", category: "", amount: "",
  frequency: "monthly" as RecurringFrequency,
  startDate: new Date().toISOString().split("T")[0],
  endDate: "",
};

export function RecurringTab({ recurring, categories, onAdd, onUpdate, onDelete }: Props) {
  const modal = useDisclosure();
  const [editing, setEditing] = useState<RecurringExpense | null>(null);
  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const today = new Date().toISOString().split("T")[0];

  function openAdd() {
    setEditing(null);
    setForm({ ...BLANK, category: categories[0]?.name ?? "" });
    setErrors({});
    modal.onOpen();
  }

  function openEdit(rule: RecurringExpense) {
    setEditing(rule);
    setForm({
      description: rule.description,
      category: rule.category,
      amount: String(rule.amount),
      frequency: rule.frequency,
      startDate: rule.startDate,
      endDate: rule.endDate ?? "",
    });
    setErrors({});
    modal.onOpen();
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.description.trim()) e.description = "Required";
    if (!form.category) e.category = "Required";
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0)
      e.amount = "Enter a valid amount";
    if (!form.startDate) e.startDate = "Required";
    return e;
  }

  function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    const data = {
      description: form.description.trim(),
      category: form.category,
      amount: parseFloat(Number(form.amount).toFixed(2)),
      frequency: form.frequency,
      startDate: form.startDate,
      ...(form.endDate ? { endDate: form.endDate } : {}),
    };
    editing ? onUpdate(editing.id, data) : onAdd(data);
    modal.onClose();
  }

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => { const n = { ...e }; delete n[field]; return n; });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-default-800">Recurring Expenses</h2>
          <p className="text-sm text-default-400">Auto-generated on each app load when due</p>
        </div>
        <Button size="sm" color="primary" startContent={<Plus size={14} />} onPress={openAdd}>
          Add Recurring
        </Button>
      </div>

      {recurring.length === 0 ? (
        <Card shadow="none" className="border-2 border-dashed border-default-200">
          <CardBody className="py-16 text-center text-default-400">
            <p className="font-medium text-default-500">No recurring expenses</p>
            <p className="text-sm mt-1">Add subscriptions, rent, or any expense that repeats on a schedule</p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-2">
          {recurring.map((rule) => {
            const cat = categories.find((c) => c.name === rule.category);
            const due = nextDue(rule);
            const expired = !!(rule.endDate && rule.endDate < today);
            const freqLabel = RECURRING_FREQUENCIES.find((f) => f.value === rule.frequency)?.label;

            return (
              <Card key={rule.id} shadow="sm" className={`border border-default-100 ${expired ? "opacity-60" : ""}`}>
                <CardBody className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-indigo-50 dark:bg-indigo-900/40 rounded-lg p-2 shrink-0">
                      <RefreshCw size={16} className="text-indigo-500 dark:text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-default-900">{rule.description}</span>
                        <Chip color={(cat?.color ?? "default") as never} variant="flat" size="sm">
                          {rule.category}
                        </Chip>
                        {expired && <Chip color="default" variant="flat" size="sm">Expired</Chip>}
                      </div>
                      <div className="flex gap-4 mt-1 text-sm text-default-500 flex-wrap">
                        <span className="font-semibold text-default-900">${rule.amount.toFixed(2)}</span>
                        <span>{freqLabel}</span>
                        <span>Started {fmtDate(rule.startDate)}</span>
                        {rule.endDate && <span>Ends {fmtDate(rule.endDate)}</span>}
                      </div>
                      <p className="text-xs mt-1 text-default-400">
                        {expired
                          ? `Expired ${fmtDate(rule.endDate!)}`
                          : `Next: ${fmtDate(due)}${rule.lastGenerated ? ` · Last: ${fmtDate(rule.lastGenerated)}` : ""}`}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button isIconOnly size="sm" variant="light" onPress={() => openEdit(rule)}>
                        <Pencil size={13} />
                      </Button>
                      <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => onDelete(rule.id)}>
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <Modal isOpen={modal.isOpen} onClose={modal.onClose} placement="center">
        <ModalContent>
          <form onSubmit={handleSubmit}>
            <ModalHeader>{editing ? "Edit Recurring Expense" : "Add Recurring Expense"}</ModalHeader>
            <ModalBody className="gap-3">
              <Input
                label="Description"
                placeholder="e.g. Netflix, Rent, Gym"
                value={form.description}
                onValueChange={(v) => set("description", v)}
                isInvalid={!!errors.description}
                errorMessage={errors.description}
              />
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Category"
                  selectedKeys={form.category ? [form.category] : []}
                  onSelectionChange={(keys) => set("category", [...keys][0] as string)}
                  isInvalid={!!errors.category}
                  errorMessage={errors.category}
                >
                  {categories.map((c) => <SelectItem key={c.name}>{c.name}</SelectItem>)}
                </Select>
                <Input
                  label="Amount"
                  type="number" min="0.01" step="0.01"
                  value={form.amount}
                  onValueChange={(v) => set("amount", v)}
                  isInvalid={!!errors.amount}
                  errorMessage={errors.amount}
                  startContent={<span className="text-default-400 text-sm">$</span>}
                />
              </div>
              <Select
                label="Frequency"
                selectedKeys={[form.frequency]}
                onSelectionChange={(keys) => set("frequency", [...keys][0] as string)}
              >
                {RECURRING_FREQUENCIES.map((f) => (
                  <SelectItem key={f.value}>{f.label}</SelectItem>
                ))}
              </Select>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Start Date" type="date"
                  value={form.startDate}
                  onValueChange={(v) => set("startDate", v)}
                  isInvalid={!!errors.startDate}
                  errorMessage={errors.startDate}
                />
                <Input
                  label="End Date (optional)" type="date"
                  value={form.endDate}
                  onValueChange={(v) => set("endDate", v)}
                />
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={modal.onClose}>Cancel</Button>
              <Button color="primary" type="submit">{editing ? "Save" : "Add"}</Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </div>
  );
}
