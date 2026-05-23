"use client";

import { useState, FormEvent } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Select,
  SelectItem,
} from "@nextui-org/react";
import { CategoryDef } from "@/lib/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (expense: { amount: number; category: string; description: string; date: string }) => void;
  categories: CategoryDef[];
}

export function AddExpenseModal({ isOpen, onClose, onAdd, categories }: Props) {
  const today = new Date().toISOString().split("T")[0];
  const defaultCategory = categories[0]?.name ?? "Other";

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(defaultCategory);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(today);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0)
      e.amount = "Enter a valid positive amount";
    if (!description.trim()) e.description = "Description is required";
    if (!date) e.date = "Date is required";
    return e;
  }

  function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    onAdd({
      amount: parseFloat(Number(amount).toFixed(2)),
      category,
      description: description.trim(),
      date,
    });
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
          <ModalHeader>Add Expense</ModalHeader>
          <ModalBody className="gap-4">
            <Input
              label="Amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onValueChange={setAmount}
              isInvalid={!!errors.amount}
              errorMessage={errors.amount}
              startContent={
                <span className="text-default-400 text-sm">$</span>
              }
            />
            <Select
              label="Category"
              selectedKeys={[category]}
              onSelectionChange={(keys) =>
                setCategory([...keys][0] as string)
              }
            >
              {categories.map((c) => (
                <SelectItem key={c.name}>{c.name}</SelectItem>
              ))}
            </Select>
            <Input
              label="Description"
              placeholder="What did you spend on?"
              value={description}
              onValueChange={setDescription}
              isInvalid={!!errors.description}
              errorMessage={errors.description}
            />
            <Input
              label="Date"
              type="date"
              value={date}
              onValueChange={setDate}
              isInvalid={!!errors.date}
              errorMessage={errors.date}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={handleClose}>
              Cancel
            </Button>
            <Button color="primary" type="submit">
              Add
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
