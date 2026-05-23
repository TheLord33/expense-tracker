"use client";

import { useState, useEffect, FormEvent } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, Select, SelectItem } from "@nextui-org/react";
import { Expense, CategoryDef } from "@/lib/types";
import { useLanguage } from "@/app/providers";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (expense: Omit<Expense, "id">) => void;
  onUpdate?: (id: string, expense: Omit<Expense, "id">) => void;
  editingExpense?: Expense | null;
  categories: CategoryDef[];
}

export function AddExpenseModal({ isOpen, onClose, onAdd, onUpdate, editingExpense, categories }: Props) {
  const { t } = useLanguage();
  const today = new Date().toISOString().split("T")[0];
  const isEditing = !!editingExpense;

  const [amount, setAmount]           = useState("");
  const [category, setCategory]       = useState(categories[0]?.name ?? "Other");
  const [description, setDescription] = useState("");
  const [date, setDate]               = useState(today);
  const [errors, setErrors]           = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingExpense) {
      setAmount(String(editingExpense.amount));
      setCategory(editingExpense.category);
      setDescription(editingExpense.description);
      setDate(editingExpense.date);
      setErrors({});
    }
  }, [editingExpense]);

  function validate() {
    const e: Record<string, string> = {};
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) e.amount = t("addExpense.errorAmount");
    if (!description.trim()) e.description = t("addExpense.errorDescription");
    if (!date) e.date = t("addExpense.errorDate");
    return e;
  }

  function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    const data: Omit<Expense, "id"> = {
      amount: parseFloat(Number(amount).toFixed(2)),
      category,
      description: description.trim(),
      date,
      ...(editingExpense?.recurringId ? { recurringId: editingExpense.recurringId } : {}),
    };
    if (isEditing && editingExpense && onUpdate) onUpdate(editingExpense.id, data);
    else onAdd(data);
    handleClose();
  }

  function handleClose() {
    setAmount("");
    setCategory(categories[0]?.name ?? "Other");
    setDescription("");
    setDate(today);
    setErrors({});
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} placement="center">
      <ModalContent>
        <form onSubmit={handleSubmit}>
          <ModalHeader>{isEditing ? t("addExpense.titleEdit") : t("addExpense.titleAdd")}</ModalHeader>
          <ModalBody className="gap-4">
            <Input
              label={t("addExpense.amount")}
              type="number" min="0.01" step="0.01" placeholder="0.00"
              value={amount} onValueChange={setAmount}
              isInvalid={!!errors.amount} errorMessage={errors.amount}
              startContent={<span className="text-default-400 text-sm">$</span>}
            />
            <Select
              label={t("addExpense.category")}
              selectedKeys={[category]}
              onSelectionChange={(keys) => setCategory([...keys][0] as string)}
            >
              {categories.map((c) => <SelectItem key={c.name}>{c.name}</SelectItem>)}
            </Select>
            <Input
              label={t("addExpense.description")}
              placeholder={t("addExpense.descriptionPlaceholder")}
              value={description} onValueChange={setDescription}
              isInvalid={!!errors.description} errorMessage={errors.description}
            />
            <Input
              label={t("addExpense.date")}
              type="date" value={date} onValueChange={setDate}
              isInvalid={!!errors.date} errorMessage={errors.date}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={handleClose}>{t("cancel")}</Button>
            <Button color="primary" type="submit">
              {isEditing ? t("addExpense.saveChanges") : t("addExpense.add")}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
