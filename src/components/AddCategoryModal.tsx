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
  Chip,
} from "@nextui-org/react";
import {
  ChipColor,
  CHIP_COLORS,
  CHIP_COLOR_LABELS,
} from "@/lib/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, color: ChipColor) => void;
  existingNames: string[];
}

export function AddCategoryModal({ isOpen, onClose, onAdd, existingNames }: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<ChipColor>("primary");
  const [nameError, setNameError] = useState("");

  function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError("Name is required");
      return;
    }
    if (existingNames.map((n) => n.toLowerCase()).includes(trimmed.toLowerCase())) {
      setNameError("Category already exists");
      return;
    }
    onAdd(trimmed, color);
    handleClose();
  }

  function handleClose() {
    setName("");
    setColor("primary");
    setNameError("");
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} placement="center" size="sm">
      <ModalContent>
        <form onSubmit={handleSubmit}>
          <ModalHeader>Add Category</ModalHeader>
          <ModalBody className="gap-4">
            <Input
              label="Category Name"
              placeholder="e.g. Subscriptions"
              value={name}
              onValueChange={(v) => {
                setName(v);
                setNameError("");
              }}
              isInvalid={!!nameError}
              errorMessage={nameError}
            />
            <div>
              <p className="text-sm text-default-600 mb-2">Color</p>
              <div className="flex flex-wrap gap-2">
                {CHIP_COLORS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setColor(c)}
                    className={`rounded-full transition-all ${
                      color === c
                        ? "ring-2 ring-offset-2 ring-foreground scale-110"
                        : "opacity-70 hover:opacity-100"
                    }`}
                  >
                    <Chip color={c} variant="flat" size="sm">
                      {CHIP_COLOR_LABELS[c]}
                    </Chip>
                  </button>
                ))}
              </div>
            </div>
            {name.trim() && (
              <div>
                <p className="text-xs text-default-400 mb-1">Preview</p>
                <Chip color={color} variant="flat">
                  {name.trim()}
                </Chip>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={handleClose}>
              Cancel
            </Button>
            <Button color="primary" type="submit">
              Add Category
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
