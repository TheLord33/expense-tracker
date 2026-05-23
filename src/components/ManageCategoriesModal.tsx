"use client";

import { useState, FormEvent } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, Chip, Divider } from "@nextui-org/react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { CategoryDef, ChipColor, CHIP_COLORS } from "@/lib/types";
import { useLanguage } from "@/app/providers";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryDef[];
  onAdd: (name: string, color: ChipColor) => void;
  onUpdate: (oldName: string, newName: string, color: ChipColor) => void;
  onDelete: (name: string) => void;
}

const BLANK = { name: "", color: "primary" as ChipColor };

export function ManageCategoriesModal({ isOpen, onClose, categories, onAdd, onUpdate, onDelete }: Props) {
  const { t } = useLanguage();
  const [editing, setEditing]   = useState<CategoryDef | null>(null);
  const [form, setForm]         = useState(BLANK);
  const [nameError, setNameError] = useState("");

  function openEdit(cat: CategoryDef) {
    setEditing(cat);
    setForm({ name: cat.name, color: cat.color });
    setNameError("");
  }

  function cancelEdit() {
    setEditing(null);
    setForm(BLANK);
    setNameError("");
  }

  function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    const trimmed = form.name.trim();
    if (!trimmed) { setNameError(t("manageCategories.errorRequired")); return; }
    const others = categories.filter((c) => editing ? c.name !== editing.name : true);
    if (others.map((c) => c.name.toLowerCase()).includes(trimmed.toLowerCase())) {
      setNameError(t("manageCategories.errorExists"));
      return;
    }
    if (editing) onUpdate(editing.name, trimmed, form.color);
    else onAdd(trimmed, form.color);
    cancelEdit();
  }

  function handleDelete(name: string) {
    onDelete(name);
    if (editing?.name === name) cancelEdit();
  }

  function handleClose() {
    cancelEdit();
    onClose();
  }

  function setField(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    if (field === "name") setNameError("");
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} placement="center" size="md">
      <ModalContent>
        <ModalHeader>{t("manageCategories.title")}</ModalHeader>
        <ModalBody className="gap-4">
          <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
            {categories.map((cat) => (
              <div key={cat.name} className="flex items-center gap-2 py-0.5">
                <div className="flex-1 min-w-0">
                  <Chip color={cat.color} variant="flat" size="sm">{cat.name}</Chip>
                </div>
                {cat.isBuiltin ? (
                  <span className="text-xs text-default-400 shrink-0">{t("manageCategories.builtIn")}</span>
                ) : (
                  <div className="flex gap-1 shrink-0">
                    <Button isIconOnly size="sm" variant="light" onPress={() => openEdit(cat)}>
                      <Pencil size={13} />
                    </Button>
                    <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(cat.name)}>
                      <Trash2 size={13} />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <Divider />

          <form id="cat-form" onSubmit={handleSubmit} className="space-y-3">
            <p className="text-sm font-medium text-default-700">
              {editing
                ? t("manageCategories.formTitleEdit", { name: editing.name })
                : t("manageCategories.formTitleAdd")}
            </p>
            <Input
              label={t("manageCategories.name")}
              placeholder={t("manageCategories.namePlaceholder")}
              value={form.name}
              onValueChange={(v) => setField("name", v)}
              isInvalid={!!nameError}
              errorMessage={nameError}
            />
            <div>
              <p className="text-sm text-default-600 mb-2">{t("manageCategories.color")}</p>
              <div className="flex flex-wrap gap-2">
                {CHIP_COLORS.map((c) => (
                  <button
                    type="button" key={c}
                    onClick={() => setField("color", c)}
                    className={`rounded-full transition-all ${
                      form.color === c ? "ring-2 ring-offset-2 ring-foreground scale-110" : "opacity-70 hover:opacity-100"
                    }`}
                  >
                    <Chip color={c} variant="flat" size="sm">{t(`colors.${c}`)}</Chip>
                  </button>
                ))}
              </div>
            </div>
            {form.name.trim() && (
              <div>
                <p className="text-xs text-default-400 mb-1">{t("manageCategories.preview")}</p>
                <Chip color={form.color} variant="flat">{form.name.trim()}</Chip>
              </div>
            )}
          </form>
        </ModalBody>

        <ModalFooter className="flex justify-between">
          {editing ? (
            <Button variant="flat" onPress={cancelEdit}>{t("manageCategories.cancelEdit")}</Button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <Button variant="flat" onPress={handleClose}>{t("close")}</Button>
            <Button color="primary" type="submit" form="cat-form" startContent={editing ? undefined : <Plus size={14} />}>
              {editing ? t("save") : t("add")}
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
