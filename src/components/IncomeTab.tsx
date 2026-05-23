"use client";

import { useState, FormEvent } from "react";
import {
  Card, CardBody, Button, Input, Select, SelectItem,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure,
} from "@nextui-org/react";
import { Plus, Pencil, Trash2, TrendingUp } from "lucide-react";
import { IncomeSource, IncomeFrequency, INCOME_FREQUENCIES } from "@/lib/types";
import { toMonthly } from "@/lib/useIncome";
import { useLanguage } from "@/app/providers";

interface Props {
  sources: IncomeSource[];
  monthlyIncome: (month?: string) => number;
  onAdd: (source: Omit<IncomeSource, "id">) => void;
  onUpdate: (id: string, data: Partial<Omit<IncomeSource, "id">>) => void;
  onDelete: (id: string) => void;
}

function fmtDate(iso: string, locale: string) {
  const [y, m, d] = iso.split("-");
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString(
    locale, { month: "short", day: "numeric", year: "numeric" }
  );
}

const BLANK = {
  name: "", amount: "",
  frequency: "monthly" as IncomeFrequency,
  startDate: new Date().toISOString().split("T")[0],
  endDate: "",
};

export function IncomeTab({ sources, monthlyIncome, onAdd, onUpdate, onDelete }: Props) {
  const { t, locale } = useLanguage();
  const modal = useDisclosure();
  const [editing, setEditing] = useState<IncomeSource | null>(null);
  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const today = new Date().toISOString().split("T")[0];

  const totalMonthly = monthlyIncome();
  const month = new Date().toLocaleString(locale, { month: "long", year: "numeric" });

  function openAdd() {
    setEditing(null);
    setForm({ ...BLANK, startDate: today });
    setErrors({});
    modal.onOpen();
  }

  function openEdit(s: IncomeSource) {
    setEditing(s);
    setForm({ name: s.name, amount: String(s.amount), frequency: s.frequency, startDate: s.startDate, endDate: s.endDate ?? "" });
    setErrors({});
    modal.onOpen();
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = t("income.errorRequired");
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) e.amount = t("income.errorAmount");
    if (!form.startDate) e.startDate = t("income.errorRequired");
    return e;
  }

  function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    const data: Omit<IncomeSource, "id"> = {
      name: form.name.trim(),
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
          <h2 className="text-lg font-semibold text-default-800">{t("income.title")}</h2>
          <p className="text-sm text-default-400">
            {t("income.monthSummary", { month, amount: `$${totalMonthly.toFixed(2)}` })}
          </p>
        </div>
        <Button size="sm" color="primary" startContent={<Plus size={14} />} onPress={openAdd}>
          {t("income.add")}
        </Button>
      </div>

      {sources.length === 0 ? (
        <Card shadow="none" className="border-2 border-dashed border-default-200">
          <CardBody className="py-16 text-center text-default-400">
            <p className="font-medium text-default-500">{t("income.empty")}</p>
            <p className="text-sm mt-1">{t("income.emptySub")}</p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-2">
          {sources.map((source) => {
            const monthly = toMonthly(source.amount, source.frequency);
            const freqLabel = t(`frequencies.${source.frequency === "one-time" ? "oneTime" : source.frequency}`);
            const active = source.startDate <= today && (!source.endDate || source.endDate >= today);

            return (
              <Card key={source.id} shadow="sm" className={`border border-default-100 ${!active ? "opacity-60" : ""}`}>
                <CardBody className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-50 dark:bg-emerald-900/40 rounded-lg p-2 shrink-0">
                      <TrendingUp size={16} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-default-900">{source.name}</span>
                        {!active && <span className="text-xs text-default-400">({t("income.inactive")})</span>}
                      </div>
                      <div className="flex gap-4 mt-0.5 text-sm text-default-500 flex-wrap">
                        <span className="font-semibold text-emerald-600">${source.amount.toFixed(2)}</span>
                        <span>{freqLabel}</span>
                        {source.frequency !== "monthly" && source.frequency !== "one-time" && (
                          <span className="text-default-400">{t("income.approxMonthly", { amount: `$${monthly.toFixed(2)}` })}</span>
                        )}
                        <span>{t("income.since")} {fmtDate(source.startDate, locale)}</span>
                        {source.endDate && <span>{t("income.until")} {fmtDate(source.endDate, locale)}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0 mr-2">
                      {source.frequency !== "one-time" && (
                        <>
                          <p className="font-bold text-emerald-600">${monthly.toFixed(2)}</p>
                          <p className="text-xs text-default-400">{t("income.perMonth")}</p>
                        </>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button isIconOnly size="sm" variant="light" onPress={() => openEdit(source)}>
                        <Pencil size={13} />
                      </Button>
                      <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => onDelete(source.id)}>
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
            <ModalHeader>{editing ? t("income.titleEdit") : t("income.titleAdd")}</ModalHeader>
            <ModalBody className="gap-3">
              <Input
                label={t("income.name")}
                placeholder={t("income.namePlaceholder")}
                value={form.name}
                onValueChange={(v) => set("name", v)}
                isInvalid={!!errors.name}
                errorMessage={errors.name}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label={t("income.amount")}
                  type="number" min="0.01" step="0.01"
                  value={form.amount}
                  onValueChange={(v) => set("amount", v)}
                  isInvalid={!!errors.amount}
                  errorMessage={errors.amount}
                  startContent={<span className="text-default-400 text-sm">$</span>}
                />
                <Select
                  label={t("income.frequency")}
                  selectedKeys={[form.frequency]}
                  onSelectionChange={(keys) => set("frequency", [...keys][0] as string)}
                >
                  {INCOME_FREQUENCIES.map((f) => (
                    <SelectItem key={f.value} textValue={t(`frequencies.${f.value === "one-time" ? "oneTime" : f.value}`)}>
                      {t(`frequencies.${f.value === "one-time" ? "oneTime" : f.value}`)}
                    </SelectItem>
                  ))}
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label={t("income.startDate")} type="date"
                  value={form.startDate}
                  onValueChange={(v) => set("startDate", v)}
                  isInvalid={!!errors.startDate}
                  errorMessage={errors.startDate}
                />
                <Input
                  label={t("income.endDate")} type="date"
                  value={form.endDate}
                  onValueChange={(v) => set("endDate", v)}
                />
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={modal.onClose}>{t("cancel")}</Button>
              <Button color="primary" type="submit">{editing ? t("save") : t("add")}</Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </div>
  );
}
