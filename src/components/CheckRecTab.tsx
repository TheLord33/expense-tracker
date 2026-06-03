"use client";

import { useState, useMemo, type FormEvent } from "react";
import {
  Card, CardBody, CardHeader, Divider,
  Button, Chip, Input,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  useDisclosure,
} from "@nextui-org/react";
import { ListChecks, RotateCcw, Trash2, XCircle } from "lucide-react";
import type { CheckRecord } from "@/lib/types";
import { useLanguage, useCurrency } from "@/app/providers";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string, locale: string) {
  const [y, m, d] = iso.split("-");
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString(
    locale, { month: "short", day: "numeric", year: "numeric" }
  );
}

const todayISO = () => new Date().toISOString().split("T")[0];

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  checks: CheckRecord[];
  onUpdateCheck: (id: string, data: Partial<Omit<CheckRecord, "id">>) => void;
  onDeleteCheck: (id: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CheckRecTab({ checks, onUpdateCheck, onDeleteCheck }: Props) {
  const { t, locale } = useLanguage();
  const { fmt } = useCurrency();

  const [view, setView] = useState<"outstanding" | "cleared" | "voided">("outstanding");
  const [bankBalance, setBankBalance] = useState("");

  // ── Clear modal ──────────────────────────────────────────────────────────────
  const clearModal = useDisclosure();
  const [clearingCheck, setClearingCheck] = useState<CheckRecord | null>(null);
  const [clearedDate, setClearedDate] = useState(todayISO());

  function openClear(c: CheckRecord) {
    setClearingCheck(c);
    setClearedDate(todayISO());
    clearModal.onOpen();
  }

  function handleClear(e: FormEvent) {
    e.preventDefault();
    if (!clearingCheck) return;
    onUpdateCheck(clearingCheck.id, { status: "cleared", clearedDate });
    clearModal.onClose();
  }

  function handleVoid(id: string) {
    onUpdateCheck(id, { status: "voided", clearedDate: undefined });
  }

  function handleReopen(id: string) {
    onUpdateCheck(id, { status: "outstanding", clearedDate: undefined });
  }

  // ── Computed values ──────────────────────────────────────────────────────────
  const outstanding = useMemo(
    () => checks.filter((c) => c.status === "outstanding"),
    [checks]
  );
  const cleared = useMemo(
    () => checks.filter((c) => c.status === "cleared"),
    [checks]
  );
  const voided = useMemo(
    () => checks.filter((c) => c.status === "voided"),
    [checks]
  );

  const outstandingTotal = outstanding.reduce((s, c) => s + c.amount, 0);
  const bank = parseFloat(bankBalance) || 0;
  const adjusted = bank - outstandingTotal;

  const viewChecks =
    view === "outstanding" ? outstanding :
    view === "cleared"     ? cleared     : voided;

  // ── Status chip ──────────────────────────────────────────────────────────────
  function statusColor(status: CheckRecord["status"]): "warning" | "success" | "danger" {
    if (status === "outstanding") return "warning";
    if (status === "cleared")     return "success";
    return "danger";
  }

  function statusLabel(status: CheckRecord["status"]) {
    if (status === "outstanding") return t("checkRec.outstanding");
    if (status === "cleared")     return t("checkRec.cleared");
    return t("checkRec.voided");
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Reconciliation summary */}
      <Card shadow="sm">
        <CardHeader className="px-6 pt-5 pb-3">
          <h2 className="text-lg font-bold text-default-900">{t("checkRec.title")}</h2>
        </CardHeader>
        <Divider />
        <CardBody className="px-6 py-5 space-y-3">
          <Input
            type="number"
            min="0"
            step="0.01"
            label={t("checkRec.bankBalance")}
            value={bankBalance}
            onValueChange={setBankBalance}
            placeholder="0.00"
          />
          <div className="rounded-xl bg-default-50 px-4 py-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-default-600">{t("checkRec.bankBalance")}</span>
              <span className="font-semibold">{fmt(bank)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-default-600">{t("checkRec.outstandingTotal")}</span>
              <span className="font-semibold text-danger-600">({fmt(outstandingTotal)})</span>
            </div>
            <Divider />
            <div className="flex justify-between font-bold">
              <span className="text-default-900">{t("checkRec.adjustedBalance")}</span>
              <span className={adjusted >= 0 ? "text-success-700" : "text-danger-600"}>
                {fmt(adjusted)}
              </span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Check register */}
      <div className="flex gap-2">
        {(["outstanding", "cleared", "voided"] as const).map((v) => (
          <Button
            key={v}
            size="sm"
            variant={view === v ? "solid" : "flat"}
            color={view === v ? "primary" : "default"}
            onPress={() => setView(v)}
          >
            {v === "outstanding" ? t("checkRec.outstanding") :
             v === "cleared"     ? t("checkRec.cleared")     : t("checkRec.voided")}
            {v === "outstanding" && outstanding.length > 0 && (
              <span className="ml-1 text-xs opacity-70">({outstanding.length})</span>
            )}
          </Button>
        ))}
      </div>

      <Card shadow="sm">
        {viewChecks.length === 0 ? (
          <CardBody className="py-16 text-center space-y-2">
            <ListChecks className="mx-auto text-default-300" size={32} />
            <p className="font-medium text-default-500">{t("checkRec.noChecks")}</p>
            <p className="text-sm text-default-400">{t("checkRec.noChecksSub")}</p>
          </CardBody>
        ) : (
          <CardBody className="px-0 py-0">
            {/* Column headers */}
            <div className="grid grid-cols-[70px_1fr_120px_80px_auto] gap-3 px-6 py-2 text-xs font-medium text-default-400 border-b border-default-100 bg-default-50">
              <span>{t("checkRec.checkNo")}</span>
              <span>{t("checkRec.payee")}</span>
              <span>{t("checkRec.date")}</span>
              <span className="text-right">{t("checkRec.amount")}</span>
              <span></span>
            </div>
            {viewChecks.map((c, i) => (
              <div
                key={c.id}
                className={`grid grid-cols-[70px_1fr_120px_80px_auto] gap-3 items-center px-6 py-3 ${i < viewChecks.length - 1 ? "border-b border-default-100" : ""}`}
              >
                <span className="font-mono text-xs text-default-600">#{c.checkNumber}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-default-900 truncate">{c.payee}</p>
                  {c.memo && <p className="text-xs text-default-400 truncate">{c.memo}</p>}
                </div>
                <div>
                  <p className="text-xs text-default-500">{fmtDate(c.date, locale)}</p>
                  {c.clearedDate && (
                    <p className="text-xs text-success-600">{fmtDate(c.clearedDate, locale)}</p>
                  )}
                </div>
                <span className="text-sm font-semibold text-right">{fmt(c.amount)}</span>
                <div className="flex gap-1.5 items-center justify-end">
                  <Chip size="sm" variant="flat" color={statusColor(c.status)}>
                    {statusLabel(c.status)}
                  </Chip>
                  {c.status === "outstanding" && (
                    <>
                      <Button size="sm" variant="flat" color="success" onPress={() => openClear(c)}>
                        {t("checkRec.markCleared")}
                      </Button>
                      <Button size="sm" variant="flat" color="danger" isIconOnly onPress={() => handleVoid(c.id)}>
                        <XCircle size={13} />
                      </Button>
                    </>
                  )}
                  {(c.status === "cleared" || c.status === "voided") && (
                    <Button size="sm" variant="flat" isIconOnly onPress={() => handleReopen(c.id)}>
                      <RotateCcw size={13} />
                    </Button>
                  )}
                  <Button size="sm" variant="flat" color="danger" isIconOnly
                    title="Delete check record"
                    onPress={() => onDeleteCheck(c.id)}>
                    <Trash2 size={13} />
                  </Button>
                </div>
              </div>
            ))}
          </CardBody>
        )}
      </Card>

      {/* ── Mark Cleared Modal ── */}
      {clearingCheck && (
        <Modal isOpen={clearModal.isOpen} onClose={clearModal.onClose} placement="center">
          <ModalContent>
            <form onSubmit={handleClear}>
              <ModalHeader>{t("checkRec.markCleared")}</ModalHeader>
              <ModalBody className="gap-3">
                <div className="bg-default-50 rounded-xl px-4 py-3 text-sm space-y-1">
                  <p className="font-semibold text-default-800">#{clearingCheck.checkNumber} — {clearingCheck.payee}</p>
                  <p className="text-default-500">{fmt(clearingCheck.amount)}</p>
                </div>
                <Input
                  type="date"
                  label={t("checkRec.clearedDateLabel")}
                  value={clearedDate}
                  onChange={(e) => setClearedDate(e.target.value)}
                  isRequired
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={clearModal.onClose}>{t("cancel")}</Button>
                <Button color="success" type="submit">{t("checkRec.markCleared")}</Button>
              </ModalFooter>
            </form>
          </ModalContent>
        </Modal>
      )}
    </div>
  );
}
