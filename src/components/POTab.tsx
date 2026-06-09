"use client";

import { useState, useMemo, type FormEvent } from "react";
import {
  Card, CardBody, CardHeader, Divider,
  Button, Chip, Input, Select, SelectItem,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  useDisclosure,
} from "@nextui-org/react";
import { Plus, Trash2, ShoppingCart, CheckCircle, Send, XCircle, Package } from "lucide-react";
import type { Account, Bill, InventoryItem, PurchaseOrder, POLine, POStatus, StockMovement, Vendor } from "@/lib/types";
import { useLanguage, useCurrency } from "@/app/providers";

// ── Helpers ───────────────────────────────────────────────────────────────────

const todayISO = () => new Date().toISOString().split("T")[0];

function addDays(iso: string, n: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function fmtDate(iso: string, locale: string) {
  const [y, m, d] = iso.split("-");
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString(locale, {
    month: "short", day: "numeric", year: "numeric",
  });
}

const STATUS_ORDER: Record<POStatus, number> = { draft: 0, sent: 1, received: 3, cancelled: 4 };

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  vendors: Vendor[];
  inventoryItems: InventoryItem[];
  accounts: Account[];
  orders: PurchaseOrder[];
  maxCheckAmount?: number;
  onAddOrder: (po: Omit<PurchaseOrder, "id">) => void;
  onUpdateOrder: (id: string, data: Partial<Omit<PurchaseOrder, "id">>) => void;
  onDeleteOrder: (id: string) => void;
  poTotal: (po: PurchaseOrder) => number;
  onAddMovement: (m: Omit<StockMovement, "id">) => void;
  onAddBill: (b: Omit<Bill, "id">) => string;
}

// ── Blank line helper ─────────────────────────────────────────────────────────

function blankLine(): Omit<POLine, "id"> & { id: string } {
  return { id: crypto.randomUUID(), inventoryItemId: "", qty: 1, unitCost: 0 };
}

// ── Status display ────────────────────────────────────────────────────────────

type StatusColor = "default" | "primary" | "success" | "danger";

function statusColor(s: POStatus): StatusColor {
  if (s === "draft")     return "default";
  if (s === "sent")      return "primary";
  if (s === "received")  return "success";
  return "danger";
}

// ── Component ─────────────────────────────────────────────────────────────────

export function POTab({
  vendors, inventoryItems, accounts, orders, maxCheckAmount,
  onAddOrder, onUpdateOrder, onDeleteOrder, poTotal,
  onAddMovement, onAddBill,
}: Props) {
  const { t, locale } = useLanguage();
  const { fmt } = useCurrency();

  const today = todayISO();

  const AP_ACCOUNT_ID = "acc-2000";
  const INV_ACCOUNT_ID = "acc-1200";

  // ── PO form modal ─────────────────────────────────────────────────────────

  const poModal = useDisclosure();
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);

  type LineForm = { id: string; inventoryItemId: string; qty: string; unitCost: string };

  const BLANK_FORM = { vendorId: "", poNumber: "", date: today, expectedDate: "", notes: "" };
  const [pf, setPf] = useState(BLANK_FORM);
  const [lines, setLines] = useState<LineForm[]>([{ ...blankLine(), qty: "1", unitCost: "0" }]);
  const [pErr, setPErr] = useState<Record<string, string>>({});

  function openAdd() {
    setEditingPO(null);
    const nextNum = String(orders.length + 1).padStart(4, "0");
    setPf({ ...BLANK_FORM, poNumber: `PO-${nextNum}` });
    setLines([{ id: crypto.randomUUID(), inventoryItemId: "", qty: "1", unitCost: "0" }]);
    setPErr({});
    poModal.onOpen();
  }

  function openEdit(po: PurchaseOrder) {
    setEditingPO(po);
    setPf({
      vendorId: po.vendorId, poNumber: po.poNumber,
      date: po.date, expectedDate: po.expectedDate ?? "", notes: po.notes ?? "",
    });
    setLines(po.lines.map((l) => ({ id: l.id, inventoryItemId: l.inventoryItemId, qty: String(l.qty), unitCost: String(l.unitCost) })));
    setPErr({});
    poModal.onOpen();
  }

  function addLine() {
    setLines((prev) => [...prev, { id: crypto.randomUUID(), inventoryItemId: "", qty: "1", unitCost: "0" }]);
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  function setLineField(id: string, field: keyof LineForm, value: string) {
    setLines((prev) => prev.map((l) => {
      if (l.id !== id) return l;
      const updated = { ...l, [field]: value };
      if (field === "inventoryItemId") {
        const item = inventoryItems.find((i) => i.id === value);
        if (item) updated.unitCost = String(item.costPerUnit);
      }
      return updated;
    }));
  }

  function validatePO() {
    const errs: Record<string, string> = {};
    if (!pf.vendorId)   errs.vendorId = t("po.errorVendor");
    if (!pf.date)       errs.date = t("po.errorDate");
    if (lines.length === 0) errs.lines = t("po.errorNoLines");
    lines.forEach((l, i) => {
      if (!l.inventoryItemId)                 errs[`item-${i}`] = t("po.errorItem");
      if (isNaN(Number(l.qty)) || Number(l.qty) <= 0) errs[`qty-${i}`] = t("po.errorQty");
      if (isNaN(Number(l.unitCost)) || Number(l.unitCost) < 0) errs[`cost-${i}`] = t("po.errorCost");
    });
    setPErr(errs);
    return Object.keys(errs).length === 0;
  }

  function handlePOSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validatePO()) return;
    const data: Omit<PurchaseOrder, "id"> = {
      vendorId: pf.vendorId,
      poNumber: pf.poNumber.trim(),
      date: pf.date,
      expectedDate: pf.expectedDate || undefined,
      notes: pf.notes.trim() || undefined,
      status: editingPO?.status ?? "draft",
      lines: lines.map((l) => ({ id: l.id, inventoryItemId: l.inventoryItemId, qty: Number(l.qty), unitCost: Number(l.unitCost) })),
      billId: editingPO?.billId,
    };
    if (editingPO) onUpdateOrder(editingPO.id, data);
    else           onAddOrder(data);
    poModal.onClose();
  }

  // ── Receive confirm modal ─────────────────────────────────────────────────

  const receiveModal = useDisclosure();
  const [receivingPO, setReceivingPO] = useState<PurchaseOrder | null>(null);
  const [receiving, setReceiving] = useState(false);
  const [vendorInvNum, setVendorInvNum] = useState("");
  const [receiveQtys, setReceiveQtys] = useState<Record<string, string>>({});

  function openReceive(po: PurchaseOrder) {
    setReceivingPO(po);
    setVendorInvNum("");
    const qtys: Record<string, string> = {};
    for (const l of po.lines) qtys[l.id] = String(l.qty);
    setReceiveQtys(qtys);
    receiveModal.onOpen();
  }

  // ── Remainder PO modal ────────────────────────────────────────────────────

  type RemainderLine = { id: string; inventoryItemId: string; qty: number; unitCost: number };
  const remainderModal = useDisclosure();
  const [remainderPO, setRemainderPO] = useState<PurchaseOrder | null>(null);
  const [remainderLines, setRemainderLines] = useState<RemainderLine[]>([]);

  function handleCreateRemainderPO() {
    if (!remainderPO) return;
    const nextNum = String(orders.length + 1).padStart(4, "0");
    onAddOrder({
      vendorId: remainderPO.vendorId,
      poNumber: `PO-${nextNum}`,
      date: today,
      status: "draft",
      lines: remainderLines.map((l) => ({ id: crypto.randomUUID(), inventoryItemId: l.inventoryItemId, qty: l.qty, unitCost: l.unitCost })),
      notes: `Remainder from ${remainderPO.poNumber}`,
    });
    remainderModal.onClose();
  }

  function handleReceive() {
    if (!receivingPO) return;
    setReceiving(true);

    const receivedLines = receivingPO.lines.map((l) => ({
      ...l,
      receivedQty: Math.min(Math.max(Number(receiveQtys[l.id] ?? l.qty) || 0, 0), l.qty),
    }));

    const receivedTotal = receivedLines.reduce((s, l) => s + l.receivedQty * l.unitCost, 0);
    const hasPartial    = receivedLines.some((l) => l.receivedQty < l.qty);

    for (const rLine of receivedLines) {
      if (rLine.receivedQty <= 0) continue;
      const item = inventoryItems.find((i) => i.id === rLine.inventoryItemId);
      if (!item) continue;
      onAddMovement({
        itemId: rLine.inventoryItemId,
        date: today,
        type: "purchase",
        quantity: rLine.receivedQty,
        unitCost: rLine.unitCost,
        note: `PO ${receivingPO.poNumber}${hasPartial ? " (partial)" : ""}`,
        counterAccountId: AP_ACCOUNT_ID,
      });
    }

    // Create a tracking-only AP bill (fromPOId skips duplicate GL entry)
    const vendor = vendors.find((v) => v.id === receivingPO.vendorId);
    const billId = onAddBill({
      vendorId: receivingPO.vendorId,
      billNumber: receivingPO.poNumber,
      vendorInvoiceNumber: vendorInvNum.trim() || undefined,
      date: today,
      dueDate: addDays(today, 30),
      amount: receivedTotal,
      description: `Received PO ${receivingPO.poNumber}${vendor ? ` — ${vendor.name}` : ""}${hasPartial ? " (partial)" : ""}`,
      expenseAccountId: INV_ACCOUNT_ID,
      fromPOId: receivingPO.id,
    });

    onUpdateOrder(receivingPO.id, { status: "received", billId });
    setReceiving(false);
    receiveModal.onClose();

    if (hasPartial) {
      const remaining: RemainderLine[] = receivedLines
        .filter((l) => l.receivedQty < l.qty)
        .map((l) => ({ id: l.id, inventoryItemId: l.inventoryItemId, qty: l.qty - l.receivedQty, unitCost: l.unitCost }));
      setRemainderLines(remaining);
      setRemainderPO(receivingPO);
      remainderModal.onOpen();
    }
  }

  // ── Sorted orders ─────────────────────────────────────────────────────────

  const sortedOrders = useMemo(
    () => [...orders].sort((a, b) => {
      const diff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (diff !== 0) return diff;
      return b.date.localeCompare(a.date);
    }),
    [orders]
  );

  function statusLabel(s: POStatus) {
    if (s === "draft")    return t("po.statusDraft");
    if (s === "sent")     return t("po.statusSent");
    if (s === "received") return t("po.statusReceived");
    return t("po.statusCancelled");
  }

  // ── Grand total for form ──────────────────────────────────────────────────

  const formTotal  = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.unitCost) || 0), 0);
  const exceedsMax = maxCheckAmount != null && maxCheckAmount > 0 && formTotal > maxCheckAmount;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-default-900">{t("po.title")}</h2>
        <Button size="sm" color="primary" startContent={<Plus size={14} />} onPress={openAdd}>
          {t("po.addPO")}
        </Button>
      </div>

      {/* PO list */}
      <Card shadow="sm">
        {sortedOrders.length === 0 ? (
          <CardBody className="py-16 text-center space-y-2">
            <ShoppingCart className="mx-auto text-default-300" size={32} />
            <p className="font-medium text-default-500">{t("po.noPOs")}</p>
            <p className="text-sm text-default-400">{t("po.noPOsSub")}</p>
          </CardBody>
        ) : (
          <CardBody className="px-0 py-0">
            {sortedOrders.map((po, idx) => {
              const vendor = vendors.find((v) => v.id === po.vendorId);
              const total  = poTotal(po);
              const isOpen = po.status === "draft" || po.status === "sent";
              return (
                <div key={po.id} className={`px-6 py-4 ${idx < sortedOrders.length - 1 ? "border-b border-default-100" : ""} ${!isOpen ? "opacity-60" : ""}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-default-900 text-sm font-mono">#{po.poNumber}</span>
                        <span className="text-sm text-default-600">{vendor?.name ?? "—"}</span>
                        <Chip size="sm" variant="flat" color={statusColor(po.status)}>{statusLabel(po.status)}</Chip>
                      </div>
                      <div className="flex gap-4 mt-1 text-xs text-default-400 flex-wrap">
                        <span>{t("po.date")}: {fmtDate(po.date, locale)}</span>
                        {po.expectedDate && <span>{t("po.expectedDate").replace(" (optional)", "")}: {fmtDate(po.expectedDate, locale)}</span>}
                        <span>{po.lines.length} {po.lines.length === 1 ? t("po.item") : t("po.lineItems")}</span>
                      </div>
                      {po.notes && <p className="text-xs text-default-400 mt-0.5 truncate">{po.notes}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-default-900 text-sm">{fmt(total)}</p>
                      {po.status === "received" && (
                        <p className="text-xs text-success-600 flex items-center justify-end gap-0.5 mt-0.5">
                          <CheckCircle size={11} />{t("po.statusReceived")}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3 flex-wrap">
                    {po.status === "draft" && (
                      <Button size="sm" variant="flat" startContent={<Send size={13} />}
                        onPress={() => onUpdateOrder(po.id, { status: "sent" })}>
                        {t("po.markSent")}
                      </Button>
                    )}
                    {(po.status === "draft" || po.status === "sent") && (
                      <Button size="sm" color="success" variant="flat" startContent={<Package size={13} />}
                        onPress={() => openReceive(po)}>
                        {t("po.receive")}
                      </Button>
                    )}
                    {isOpen && (
                      <Button size="sm" variant="flat" onPress={() => openEdit(po)}>
                        {t("po.editPO")}
                      </Button>
                    )}
                    {isOpen && (
                      <Button size="sm" variant="flat" color="danger" startContent={<XCircle size={13} />}
                        onPress={() => onUpdateOrder(po.id, { status: "cancelled" })}>
                        {t("po.cancelPO")}
                      </Button>
                    )}
                    {(po.status === "cancelled" || po.status === "received") && (
                      <Button size="sm" variant="flat" color="danger" isIconOnly
                        onPress={() => onDeleteOrder(po.id)}>
                        <Trash2 size={13} />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardBody>
        )}
      </Card>

      {/* ── PO Form Modal ── */}
      <Modal isOpen={poModal.isOpen} onClose={poModal.onClose} placement="center"
        scrollBehavior="inside" size="2xl"
        classNames={{ base: "max-h-[90vh]", body: "overflow-y-auto" }}>
        <ModalContent>
          <form onSubmit={handlePOSubmit}>
            <ModalHeader>{editingPO ? t("po.editPO") : t("po.addPO")}</ModalHeader>
            <ModalBody className="gap-4">
              {/* Header fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select
                  label={t("po.vendor")}
                  selectedKeys={pf.vendorId ? [pf.vendorId] : []}
                  onSelectionChange={(k) => setPf((p) => ({ ...p, vendorId: [...k][0] as string }))}
                  isInvalid={!!pErr.vendorId} errorMessage={pErr.vendorId}
                >
                  {vendors.map((v) => <SelectItem key={v.id} textValue={v.name}>{v.name}</SelectItem>)}
                </Select>
                <Input label={t("po.poNumber")} value={pf.poNumber}
                  onValueChange={(v) => setPf((p) => ({ ...p, poNumber: v }))} />
                <Input type="date" label={t("po.date")} value={pf.date}
                  onValueChange={(v) => setPf((p) => ({ ...p, date: v }))}
                  isInvalid={!!pErr.date} errorMessage={pErr.date} />
                <Input type="date" label={t("po.expectedDate")} value={pf.expectedDate}
                  onValueChange={(v) => setPf((p) => ({ ...p, expectedDate: v }))} />
              </div>

              {/* Line items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-default-700">{t("po.lineItems")}</p>
                  <Button size="sm" variant="flat" color="primary" startContent={<Plus size={13} />} onPress={addLine}>
                    {t("po.addLine")}
                  </Button>
                </div>
                {pErr.lines && <p className="text-tiny text-danger mb-2">{pErr.lines}</p>}

                <div className="space-y-2">
                  {/* Column headers */}
                  <div className="grid grid-cols-[1fr_80px_90px_32px] gap-2 text-xs text-default-400 px-1">
                    <span>{t("po.item")}</span>
                    <span>{t("po.qty")}</span>
                    <span>{t("po.unitCost")}</span>
                    <span></span>
                  </div>
                  {lines.map((line, idx) => (
                    <div key={line.id} className="grid grid-cols-[1fr_80px_90px_32px] gap-2 items-start">
                      <Select
                        size="sm"
                        placeholder={t("po.selectItem")}
                        selectedKeys={line.inventoryItemId ? [line.inventoryItemId] : []}
                        onSelectionChange={(k) => setLineField(line.id, "inventoryItemId", [...k][0] as string)}
                        isInvalid={!!pErr[`item-${idx}`]}
                      >
                        {inventoryItems.map((item) => (
                          <SelectItem key={item.id} textValue={`${item.sku} ${item.name}`}>
                            <span className="font-mono text-xs text-default-400 mr-1">{item.sku}</span>{item.name}
                          </SelectItem>
                        ))}
                      </Select>
                      <Input
                        size="sm"
                        type="number" min="1" step="1"
                        value={line.qty}
                        onValueChange={(v) => setLineField(line.id, "qty", v)}
                        isInvalid={!!pErr[`qty-${idx}`]}
                      />
                      <Input
                        size="sm"
                        type="number" min="0" step="0.01"
                        value={line.unitCost}
                        onValueChange={(v) => setLineField(line.id, "unitCost", v)}
                        isInvalid={!!pErr[`cost-${idx}`]}
                      />
                      <Button size="sm" isIconOnly variant="flat" color="danger" onPress={() => removeLine(line.id)}>
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Grand total */}
                <div className="flex flex-col items-end mt-3 pt-3 border-t border-default-100 gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-default-700">{t("po.grandTotal")}:</span>
                    <span className={`text-sm font-bold ${exceedsMax ? "text-danger-600" : "text-indigo-600"}`}>{fmt(formTotal)}</span>
                  </div>
                  {exceedsMax && maxCheckAmount != null && (
                    <p className="text-xs text-danger-600">
                      {t("po.maxAmountWarning").replace("{max}", fmt(maxCheckAmount))}
                    </p>
                  )}
                </div>
              </div>

              <Input label={t("po.notes")} value={pf.notes}
                onValueChange={(v) => setPf((p) => ({ ...p, notes: v }))} />
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={poModal.onClose}>{t("cancel")}</Button>
              <Button color="primary" type="submit" isDisabled={exceedsMax}>{editingPO ? t("save") : t("add")}</Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* ── Receive Confirm Modal ── */}
      {receivingPO && (
        <Modal isOpen={receiveModal.isOpen} onClose={receiveModal.onClose} placement="center" size="md" scrollBehavior="inside">
          <ModalContent>
            <ModalHeader>{t("po.confirmReceiveTitle")}</ModalHeader>
            <ModalBody className="gap-3">
              <div className="bg-default-50 rounded-xl px-4 py-3 space-y-1 text-sm">
                <p className="font-semibold text-default-800">#{receivingPO.poNumber}</p>
                <p className="text-default-500">{vendors.find((v) => v.id === receivingPO.vendorId)?.name}</p>
              </div>

              {/* Per-line qty received */}
              <div>
                <p className="text-xs font-medium text-default-500 mb-1.5">{t("po.qtyReceived")}</p>
                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_80px_80px] gap-2 text-xs text-default-400 px-1">
                    <span>{t("po.item")}</span>
                    <span className="text-right">{t("po.ordered")}</span>
                    <span className="text-right">{t("po.receiving")}</span>
                  </div>
                  {receivingPO.lines.map((line) => {
                    const item = inventoryItems.find((i) => i.id === line.inventoryItemId);
                    return (
                      <div key={line.id} className="grid grid-cols-[1fr_80px_80px] gap-2 items-center">
                        <span className="text-sm text-default-700 truncate">{item?.name ?? line.inventoryItemId}</span>
                        <span className="text-sm text-default-400 text-right tabular-nums">{line.qty}</span>
                        <input
                          type="number" min="0" max={line.qty} step="1"
                          className="text-sm text-right bg-default-100 border border-default-200 rounded-lg px-2 py-1 focus:outline-none focus:border-primary w-full"
                          value={receiveQtys[line.id] ?? line.qty}
                          onChange={(e) => setReceiveQtys((prev) => ({ ...prev, [line.id]: e.target.value }))}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <Input
                label={t("po.vendorInvoiceNumber")}
                placeholder="optional"
                value={vendorInvNum}
                onValueChange={setVendorInvNum}
                size="sm"
              />
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={receiveModal.onClose}>{t("cancel")}</Button>
              <Button color="success" isLoading={receiving} onPress={handleReceive}>
                {t("po.receive")}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {/* ── Remainder PO Modal ── */}
      {remainderPO && (
        <Modal isOpen={remainderModal.isOpen} onClose={remainderModal.onClose} placement="center">
          <ModalContent>
            <ModalHeader>{t("po.remainderTitle")}</ModalHeader>
            <ModalBody className="gap-3">
              <p className="text-sm text-default-600">{t("po.remainderBody")}</p>
              <div className="bg-default-50 rounded-xl px-4 py-3 space-y-1.5">
                {remainderLines.map((l) => {
                  const item = inventoryItems.find((i) => i.id === l.inventoryItemId);
                  return (
                    <div key={l.id} className="flex justify-between text-sm">
                      <span className="text-default-700">{item?.name ?? l.inventoryItemId}</span>
                      <span className="text-default-500 tabular-nums">{t("po.qty")}: {l.qty}</span>
                    </div>
                  );
                })}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={remainderModal.onClose}>{t("po.remainderSkip")}</Button>
              <Button color="primary" onPress={handleCreateRemainderPO}>{t("po.remainderCreate")}</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </div>
  );
}
