"use client";

import { useState, useMemo, type FormEvent } from "react";
import {
  Card, CardBody, CardHeader, Divider,
  Button, Chip, Input,
  Select, SelectItem,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  useDisclosure,
} from "@nextui-org/react";
import { Plus, Pencil, Trash2, Wallet, CheckCircle, Printer } from "lucide-react";
import type { Account, Bill, BillPayment, CheckRecord, CompanyProfile, Vendor } from "@/lib/types";
import { printChecksPDF } from "@/lib/exportPDF";
import { useLanguage, useCurrency } from "@/app/providers";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string, locale: string) {
  const [y, m, d] = iso.split("-");
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString(
    locale, { month: "short", day: "numeric", year: "numeric" }
  );
}

function billStatus(
  bill: Bill,
  paid: number,
  today: string
): "paid" | "overdue" | "due-soon" | "unpaid" {
  if (paid >= bill.amount - 0.01) return "paid";
  if (bill.dueDate < today) return "overdue";
  const days = Math.round((new Date(bill.dueDate).getTime() - new Date(today).getTime()) / 86400000);
  if (days <= 7) return "due-soon";
  return "unpaid";
}

function agingBucket(dueDate: string, today: string): "current" | "1-30" | "31-60" | "61-90" | "90+" {
  if (dueDate >= today) return "current";
  const days = Math.round((new Date(today).getTime() - new Date(dueDate).getTime()) / 86400000);
  if (days <= 30) return "1-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

const todayISO = () => new Date().toISOString().split("T")[0];

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  vendors: Vendor[];
  bills: Bill[];
  billPayments: BillPayment[];
  accounts: Account[];
  company?: CompanyProfile | null;
  maxCheckAmount?: number;
  onAddVendor: (v: Omit<Vendor, "id">) => void;
  onUpdateVendor: (id: string, data: Partial<Omit<Vendor, "id">>) => void;
  onDeleteVendor: (id: string) => void;
  onAddBill: (b: Omit<Bill, "id">) => void;
  onUpdateBill: (id: string, data: Partial<Omit<Bill, "id">>) => void;
  onDeleteBill: (id: string) => void;
  onAddPayment: (p: Omit<BillPayment, "id">) => void;
  onAddChecks: (checks: Omit<CheckRecord, "id">[]) => void;
  paidAmount: (billId: string) => number;
  outstanding: (bill: Bill) => number;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function APTab({
  vendors, bills, billPayments, accounts, company, maxCheckAmount,
  onAddVendor, onUpdateVendor, onDeleteVendor,
  onAddBill, onUpdateBill, onDeleteBill,
  onAddPayment, onAddChecks, paidAmount, outstanding,
}: Props) {
  const { t, locale } = useLanguage();
  const { fmt } = useCurrency();

  const today = todayISO();
  const [view, setView] = useState<"bills" | "vendors" | "aging">("bills");

  // ── Check selection ───────────────────────────────────────────────────────
  const [selectedBills, setSelectedBills] = useState<Set<string>>(new Set());
  const checkModal = useDisclosure();
  const [checkDate, setCheckDate] = useState(today);
  const [startingCheck, setStartingCheck] = useState("1001");
  const [printing, setPrinting] = useState(false);

  function toggleBillSelect(id: string) {
    setSelectedBills((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openPrintModal() {
    setCheckDate(today);
    checkModal.onOpen();
  }

  async function handlePrintChecks() {
    if (exceedsMax) return;
    setPrinting(true);
    try {
      const selected = sortedBills.filter((b) => selectedBills.has(b.id));
      const checks = selected.map((bill, idx) => ({
        checkNumber: String(Number(startingCheck) + idx),
        date: checkDate,
        payee: vendors.find((v) => v.id === bill.vendorId)?.name ?? "Unknown",
        amount: outstanding(bill),
        memo: bill.billNumber ? `Bill #${bill.billNumber} — ${bill.description}` : bill.description,
      }));
      const blob = await printChecksPDF(checks, company ?? null, fmt);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `checks-${checkDate}.pdf`; a.click();
      URL.revokeObjectURL(url);
      onAddChecks(
        checks.map((c, idx) => ({
          ...c,
          billId: selected[idx].id,
          status: "outstanding" as const,
        }))
      );
      setSelectedBills(new Set());
      checkModal.onClose();
    } finally {
      setPrinting(false);
    }
  }

  // ── Expense accounts (for the bill form selector) ──────────────────────────
  const expenseAccounts = useMemo(
    () => accounts.filter((a) => a.type === "expense"),
    [accounts]
  );

  // ── Bill form ────────────────────────────────────────────────────────────────
  const billModal = useDisclosure();
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const BLANK_BILL = {
    vendorId: "", billNumber: "", date: today, dueDate: "",
    amount: "", description: "", expenseAccountId: "",
  };
  const [bf, setBf] = useState(BLANK_BILL);
  const [bErr, setBErr] = useState<Record<string, string>>({});

  function openAddBill() {
    setEditingBill(null);
    setBf({ ...BLANK_BILL, vendorId: vendors[0]?.id ?? "", expenseAccountId: expenseAccounts[0]?.id ?? "" });
    setBErr({});
    billModal.onOpen();
  }

  function openEditBill(bill: Bill) {
    setEditingBill(bill);
    setBf({
      vendorId: bill.vendorId, billNumber: bill.billNumber,
      date: bill.date, dueDate: bill.dueDate,
      amount: String(bill.amount), description: bill.description,
      expenseAccountId: bill.expenseAccountId,
    });
    setBErr({});
    billModal.onOpen();
  }

  function validateBill() {
    const errs: Record<string, string> = {};
    if (!bf.vendorId)                                   errs.vendorId = t("ap.errorVendor");
    if (!bf.date)                                       errs.date = t("ap.errorDate");
    if (!bf.dueDate)                                    errs.dueDate = t("ap.errorDueDate");
    if (!bf.description.trim())                         errs.description = t("ap.errorDesc");
    if (!bf.expenseAccountId)                           errs.expenseAccountId = t("ap.errorAccount");
    const amt = parseFloat(bf.amount);
    if (isNaN(amt) || amt <= 0)                         errs.amount = t("ap.errorAmount");
    setBErr(errs);
    return Object.keys(errs).length === 0;
  }

  function handleBillSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validateBill()) return;
    const data = {
      vendorId: bf.vendorId, billNumber: bf.billNumber,
      date: bf.date, dueDate: bf.dueDate,
      amount: parseFloat(parseFloat(bf.amount).toFixed(2)),
      description: bf.description.trim(),
      expenseAccountId: bf.expenseAccountId,
    };
    if (editingBill) onUpdateBill(editingBill.id, data);
    else             onAddBill(data);
    billModal.onClose();
  }

  // ── Payment form ─────────────────────────────────────────────────────────────
  const payModal = useDisclosure();
  const [payingBill, setPayingBill] = useState<Bill | null>(null);
  const [payDate, setPayDate]       = useState(today);
  const [payAmt, setPayAmt]         = useState("");
  const [payNote, setPayNote]       = useState("");
  const [payErr, setPayErr]         = useState<Record<string, string>>({});

  function openPay(bill: Bill) {
    setPayingBill(bill);
    setPayDate(today);
    setPayAmt(outstanding(bill).toFixed(2));
    setPayNote("");
    setPayErr({});
    payModal.onOpen();
  }

  function handlePaySubmit(e: FormEvent) {
    e.preventDefault();
    if (!payingBill) return;
    const errs: Record<string, string> = {};
    const amt = parseFloat(payAmt);
    if (isNaN(amt) || amt <= 0)              errs.payAmt = t("ap.errorPayAmount");
    else if (amt > outstanding(payingBill) + 0.01) errs.payAmt = t("ap.errorPayExceeds");
    setPayErr(errs);
    if (Object.keys(errs).length > 0) return;
    onAddPayment({ billId: payingBill.id, date: payDate, amount: parseFloat(amt.toFixed(2)), note: payNote.trim() || undefined });
    payModal.onClose();
  }

  // ── Vendor form ──────────────────────────────────────────────────────────────
  const vendorModal = useDisclosure();
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const BLANK_VENDOR = { name: "", email: "", phone: "" };
  const [vf, setVf] = useState(BLANK_VENDOR);
  const [vErr, setVErr] = useState<Record<string, string>>({});

  function openAddVendor() {
    setEditingVendor(null);
    setVf(BLANK_VENDOR);
    setVErr({});
    vendorModal.onOpen();
  }

  function openEditVendor(vendor: Vendor) {
    setEditingVendor(vendor);
    setVf({ name: vendor.name, email: vendor.email ?? "", phone: vendor.phone ?? "" });
    setVErr({});
    vendorModal.onOpen();
  }

  function handleVendorSubmit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!vf.name.trim()) errs.name = t("ap.errorVendor");
    setVErr(errs);
    if (Object.keys(errs).length > 0) return;
    const data = { name: vf.name.trim(), email: vf.email.trim() || undefined, phone: vf.phone.trim() || undefined };
    if (editingVendor) onUpdateVendor(editingVendor.id, data);
    else               onAddVendor(data);
    vendorModal.onClose();
  }

  // ── Status helpers ────────────────────────────────────────────────────────────

  function statusLabel(status: ReturnType<typeof billStatus>) {
    if (status === "paid")      return t("ap.statusPaid");
    if (status === "overdue")   return t("ap.statusOverdue");
    if (status === "due-soon")  return t("ap.statusDueSoon");
    return t("ap.statusUnpaid");
  }

  function statusColor(status: ReturnType<typeof billStatus>): "success" | "danger" | "warning" | "default" {
    if (status === "paid")     return "success";
    if (status === "overdue")  return "danger";
    if (status === "due-soon") return "warning";
    return "default";
  }

  // ── Aging computation ─────────────────────────────────────────────────────────

  const AGING_BUCKETS = ["current", "1-30", "31-60", "61-90", "90+"] as const;

  const agingData = useMemo(() => {
    const buckets: Record<string, { amount: number; count: number }> = {};
    for (const key of AGING_BUCKETS) buckets[key] = { amount: 0, count: 0 };

    for (const bill of bills) {
      const owed = outstanding(bill);
      if (owed < 0.01) continue;
      const bucket = agingBucket(bill.dueDate, today);
      buckets[bucket].amount += owed;
      buckets[bucket].count  += 1;
    }
    return buckets;
  }, [bills, outstanding, today]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalOutstanding = AGING_BUCKETS.reduce((s, k) => s + agingData[k].amount, 0);

  function agingBucketLabel(k: string): string {
    if (k === "current") return t("ap.current");
    if (k === "1-30")    return t("ap.days1_30");
    if (k === "31-60")   return t("ap.days31_60");
    if (k === "61-90")   return t("ap.days61_90");
    return t("ap.days90plus");
  }

  function agingBucketColor(k: string): "success" | "warning" | "danger" | "default" {
    if (k === "current") return "success";
    if (k === "1-30")    return "warning";
    return "danger";
  }

  const dateLabel = new Date(`${today}T00:00:00`).toLocaleDateString(locale, {
    month: "long", day: "numeric", year: "numeric",
  });

  // ── Render ────────────────────────────────────────────────────────────────────

  const sortedBills = useMemo(
    () => [...bills].sort((a, b) => {
      // unpaid + overdue first, then by due date
      const sa = billStatus(a, paidAmount(a.id), today);
      const sb = billStatus(b, paidAmount(b.id), today);
      const order: Record<string, number> = { overdue: 0, "due-soon": 1, unpaid: 2, paid: 3 };
      const diff = (order[sa] ?? 4) - (order[sb] ?? 4);
      if (diff !== 0) return diff;
      return a.dueDate.localeCompare(b.dueDate);
    }),
    [bills, paidAmount, today] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const selectedTotal = useMemo(
    () => sortedBills.filter((b) => selectedBills.has(b.id)).reduce((s, b) => s + outstanding(b), 0),
    [sortedBills, selectedBills, outstanding] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const exceedsMax = maxCheckAmount != null && maxCheckAmount > 0 && selectedTotal > maxCheckAmount;

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(["bills", "vendors", "aging"] as const).map((v) => (
            <Button
              key={v}
              size="sm"
              variant={view === v ? "solid" : "flat"}
              color={view === v ? "primary" : "default"}
              onPress={() => setView(v)}
            >
              {v === "bills" ? t("ap.tabBills") : v === "vendors" ? t("ap.tabVendors") : t("ap.tabAging")}
            </Button>
          ))}
        </div>
        {view === "bills" && (
          <div className="flex gap-2 items-center">
            {selectedBills.size > 0 && (
              <Button size="sm" color="secondary" variant="flat" startContent={<Printer size={14} />}
                onPress={openPrintModal}>
                {selectedBills.size === 1
                  ? t("ap.checksSelected").replace("{count}", "1")
                  : t("ap.checksSelectedPlural").replace("{count}", String(selectedBills.size))}
              </Button>
            )}
            <Button size="sm" color="primary" startContent={<Plus size={14} />} onPress={openAddBill}>
              {t("ap.addBill")}
            </Button>
          </div>
        )}
        {view === "vendors" && (
          <Button size="sm" color="primary" startContent={<Plus size={14} />} onPress={openAddVendor}>
            {t("ap.addVendor")}
          </Button>
        )}
      </div>

      {/* ── Bills ── */}
      {view === "bills" && (
        <Card shadow="sm">
          <CardHeader className="px-6 pt-5 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-default-900">{t("ap.title")}</h2>
              {totalOutstanding > 0 && (
                <p className="text-sm text-default-400">{t("ap.outstanding")}: <span className="font-semibold text-danger-600">{fmt(totalOutstanding)}</span></p>
              )}
            </div>
          </CardHeader>
          <Divider />
          {sortedBills.length === 0 ? (
            <CardBody className="py-16 text-center space-y-2">
              <Wallet className="mx-auto text-default-300" size={32} />
              <p className="font-medium text-default-500">{t("ap.noBills")}</p>
              <p className="text-sm text-default-400">{t("ap.noBillsSub")}</p>
            </CardBody>
          ) : (
            <CardBody className="px-0 py-0">
              {sortedBills.map((bill, i) => {
                const vendor     = vendors.find((v) => v.id === bill.vendorId);
                const paid       = paidAmount(bill.id);
                const owed       = outstanding(bill);
                const status     = billStatus(bill, paid, today);
                const isPaid     = status === "paid";
                const canSelect  = !isPaid && owed > 0.005;
                return (
                  <div key={bill.id} className={`px-6 py-4 ${i < sortedBills.length - 1 ? "border-b border-default-100" : ""} ${isPaid ? "opacity-60" : ""}`}>
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        className={`mt-1.5 w-4 h-4 rounded accent-indigo-600 shrink-0 ${canSelect ? "cursor-pointer" : "opacity-0 pointer-events-none"}`}
                        checked={selectedBills.has(bill.id)}
                        onChange={() => canSelect && toggleBillSelect(bill.id)}
                      />
                    <div className="flex flex-1 items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-default-900 text-sm">{vendor?.name ?? "—"}</span>
                          {bill.billNumber && (
                            <span className="font-mono text-xs text-default-400">#{bill.billNumber}</span>
                          )}
                          <Chip size="sm" variant="flat" color={statusColor(status)}>{statusLabel(status)}</Chip>
                        </div>
                        <p className="text-sm text-default-600 mt-0.5 truncate">{bill.description}</p>
                        <div className="flex gap-4 mt-1 text-xs text-default-400">
                          <span>{t("ap.billDate")}: {fmtDate(bill.date, locale)}</span>
                          <span>{t("ap.dueDate")}: {fmtDate(bill.dueDate, locale)}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-default-900 text-sm">{fmt(bill.amount)}</p>
                        {!isPaid && owed < bill.amount && (
                          <p className="text-xs text-default-400">{t("ap.outstanding")}: <span className="font-medium text-danger-600">{fmt(owed)}</span></p>
                        )}
                        {isPaid && (
                          <p className="text-xs text-success-600 flex items-center justify-end gap-0.5 mt-0.5">
                            <CheckCircle size={11} />{t("ap.statusPaid")}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      {!isPaid && (
                        <Button size="sm" color="primary" variant="flat" onPress={() => openPay(bill)}>
                          {t("ap.recordPayment")}
                        </Button>
                      )}
                      <Button size="sm" variant="flat" isIconOnly onPress={() => openEditBill(bill)}>
                        <Pencil size={13} />
                      </Button>
                      <Button size="sm" variant="flat" color="danger" isIconOnly onPress={() => onDeleteBill(bill.id)}>
                        <Trash2 size={13} />
                      </Button>
                    </div>
                    </div>
                    </div>
                );
              })}
            </CardBody>
          )}
        </Card>
      )}

      {/* ── Vendors ── */}
      {view === "vendors" && (
        <Card shadow="sm">
          <CardHeader className="px-6 pt-5 pb-3">
            <h2 className="text-lg font-bold text-default-900">{t("ap.tabVendors")}</h2>
          </CardHeader>
          <Divider />
          {vendors.length === 0 ? (
            <CardBody className="py-16 text-center space-y-2">
              <p className="font-medium text-default-500">{t("ap.noVendors")}</p>
              <p className="text-sm text-default-400">{t("ap.noVendorsSub")}</p>
            </CardBody>
          ) : (
            <CardBody className="px-0 py-0">
              {vendors.map((vendor, i) => {
                const vendorBillCount = bills.filter((b) => b.vendorId === vendor.id).length;
                return (
                  <div key={vendor.id} className={`px-6 py-4 flex items-center justify-between ${i < vendors.length - 1 ? "border-b border-default-100" : ""}`}>
                    <div>
                      <p className="font-semibold text-default-900 text-sm">{vendor.name}</p>
                      <div className="flex gap-3 text-xs text-default-400 mt-0.5">
                        {vendor.email && <span>{vendor.email}</span>}
                        {vendor.phone && <span>{vendor.phone}</span>}
                        <span>{vendorBillCount} {vendorBillCount === 1 ? t("ap.bill") : t("ap.bills")}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="flat" isIconOnly onPress={() => openEditVendor(vendor)}>
                        <Pencil size={13} />
                      </Button>
                      <Button size="sm" variant="flat" color="danger" isIconOnly onPress={() => onDeleteVendor(vendor.id)}>
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardBody>
          )}
        </Card>
      )}

      {/* ── Aging ── */}
      {view === "aging" && (
        <Card shadow="sm">
          <CardHeader className="px-6 pt-5 pb-3 flex-col items-start gap-0.5">
            <h2 className="text-lg font-bold text-default-900">{t("ap.agingTitle")}</h2>
            <p className="text-sm text-default-400">{t("ap.agingAsOf", { date: dateLabel })}</p>
          </CardHeader>
          <Divider />
          <CardBody className="px-6 py-5 space-y-3">
            {totalOutstanding < 0.01 ? (
              <p className="text-center text-sm text-default-400 py-8">{t("ap.noOutstanding")}</p>
            ) : (
              <>
                {AGING_BUCKETS.map((bucket) => {
                  const { amount, count } = agingData[bucket];
                  return (
                    <div key={bucket} className="flex items-center justify-between py-2 border-b border-default-100 last:border-0">
                      <div className="flex items-center gap-3">
                        <Chip size="sm" variant="flat" color={agingBucketColor(bucket)}>{agingBucketLabel(bucket)}</Chip>
                        <span className="text-sm text-default-500">{count} {count === 1 ? t("ap.bill") : t("ap.bills")}</span>
                      </div>
                      <span className={`font-semibold text-sm ${amount > 0 ? "text-danger-600" : "text-default-400"}`}>
                        {amount > 0 ? fmt(amount) : "—"}
                      </span>
                    </div>
                  );
                })}
                <Divider />
                <div className="flex items-center justify-between font-bold">
                  <span className="text-default-900">{t("ap.totalOutstanding")}</span>
                  <span className="text-danger-600 text-lg">{fmt(totalOutstanding)}</span>
                </div>
              </>
            )}
          </CardBody>
        </Card>
      )}

      {/* ── Print Checks Modal ── */}
      <Modal isOpen={checkModal.isOpen} onClose={checkModal.onClose} placement="center">
        <ModalContent>
          <ModalHeader className="flex items-center gap-2">
            <Printer size={16} />{t("ap.printChecks")}
          </ModalHeader>
          <ModalBody className="gap-3">
            <div className="bg-default-50 rounded-xl px-4 py-3 text-sm space-y-1">
              <p className="text-default-600">
                {selectedBills.size === 1
                  ? t("ap.checksSelected").replace("{count}", "1")
                  : t("ap.checksSelectedPlural").replace("{count}", String(selectedBills.size))}
              </p>
              <p className={`font-semibold ${exceedsMax ? "text-danger-600" : "text-default-800"}`}>
                {t("ap.totalSelected").replace("{total}", fmt(selectedTotal))}
              </p>
              {exceedsMax && maxCheckAmount != null && (
                <p className="text-xs text-danger-600">
                  {t("ap.maxCheckWarning")
                    .replace("{total}", fmt(selectedTotal))
                    .replace("{max}", fmt(maxCheckAmount))}
                </p>
              )}
            </div>
            <Input type="date" label={t("ap.checkDate")} value={checkDate} onValueChange={setCheckDate} />
            <Input label={t("ap.startingCheck")} value={startingCheck}
              onValueChange={(v) => setStartingCheck(v.replace(/\D/g, ""))} />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={checkModal.onClose}>{t("cancel")}</Button>
            <Button color="primary" isLoading={printing} isDisabled={exceedsMax}
              startContent={<Printer size={14} />} onPress={handlePrintChecks}>
              {t("ap.printDownload")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ── Bill Modal ── */}
      <Modal isOpen={billModal.isOpen} onClose={billModal.onClose} placement="center" scrollBehavior="inside"
        classNames={{ base: "max-h-[90vh]", body: "overflow-y-auto" }}>
        <ModalContent>
          <form onSubmit={handleBillSubmit}>
            <ModalHeader>{editingBill ? t("ap.editBill") : t("ap.addBill")}</ModalHeader>
            <ModalBody className="gap-3">
              <Select
                label={t("ap.vendor")}
                placeholder={t("ap.selectVendor")}
                selectedKeys={bf.vendorId ? [bf.vendorId] : []}
                onSelectionChange={(k) => setBf((p) => ({ ...p, vendorId: [...k][0] as string }))}
                isInvalid={!!bErr.vendorId} errorMessage={bErr.vendorId}
              >
                {vendors.map((v) => <SelectItem key={v.id} textValue={v.name}>{v.name}</SelectItem>)}
              </Select>
              <Input label={t("ap.billNumber")} value={bf.billNumber}
                onValueChange={(v) => setBf((p) => ({ ...p, billNumber: v }))} />
              <div className="flex gap-3">
                <Input type="date" label={t("ap.billDate")} value={bf.date}
                  onValueChange={(v) => setBf((p) => ({ ...p, date: v }))}
                  isInvalid={!!bErr.date} errorMessage={bErr.date} />
                <Input type="date" label={t("ap.dueDate")} value={bf.dueDate}
                  onValueChange={(v) => setBf((p) => ({ ...p, dueDate: v }))}
                  isInvalid={!!bErr.dueDate} errorMessage={bErr.dueDate} />
              </div>
              <Input label={t("ap.description")} placeholder={t("ap.descPlaceholder")}
                value={bf.description} onValueChange={(v) => setBf((p) => ({ ...p, description: v }))}
                isInvalid={!!bErr.description} errorMessage={bErr.description} />
              <Input type="number" min="0.01" step="0.01" label={t("ap.amount")}
                value={bf.amount} onValueChange={(v) => setBf((p) => ({ ...p, amount: v }))}
                isInvalid={!!bErr.amount} errorMessage={bErr.amount} />
              <Select
                label={t("ap.expenseAccount")}
                selectedKeys={bf.expenseAccountId ? [bf.expenseAccountId] : []}
                onSelectionChange={(k) => setBf((p) => ({ ...p, expenseAccountId: [...k][0] as string }))}
                isInvalid={!!bErr.expenseAccountId} errorMessage={bErr.expenseAccountId}
              >
                {expenseAccounts.map((a) => (
                  <SelectItem key={a.id} textValue={`${a.code} ${a.name}`}>
                    <span className="font-mono text-default-400 mr-2 text-xs">{a.code}</span>{a.name}
                  </SelectItem>
                ))}
              </Select>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={billModal.onClose}>{t("cancel")}</Button>
              <Button color="primary" type="submit">{editingBill ? t("save") : t("add")}</Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* ── Payment Modal ── */}
      {payingBill && (
        <Modal isOpen={payModal.isOpen} onClose={payModal.onClose} placement="center">
          <ModalContent>
            <form onSubmit={handlePaySubmit}>
              <ModalHeader>{t("ap.recordPayment")}</ModalHeader>
              <ModalBody className="gap-3">
                <div className="bg-default-50 rounded-xl px-4 py-3 text-sm space-y-1">
                  <p className="font-semibold text-default-800">{vendors.find((v) => v.id === payingBill.vendorId)?.name}</p>
                  {payingBill.billNumber && <p className="text-default-500">#{payingBill.billNumber} — {payingBill.description}</p>}
                  <p className="text-default-500">{t("ap.outstanding")}: <span className="font-bold text-danger-600">{fmt(outstanding(payingBill))}</span></p>
                </div>
                <Input type="date" label={t("ap.payDate")} value={payDate} onValueChange={setPayDate} />
                <Input type="number" min="0.01" step="0.01" label={t("ap.payAmount")}
                  value={payAmt} onValueChange={setPayAmt}
                  isInvalid={!!payErr.payAmt} errorMessage={payErr.payAmt} />
                <Input label={t("ap.payNote")} value={payNote} onValueChange={setPayNote} />
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={payModal.onClose}>{t("cancel")}</Button>
                <Button color="primary" type="submit">{t("ap.recordPayment")}</Button>
              </ModalFooter>
            </form>
          </ModalContent>
        </Modal>
      )}

      {/* ── Vendor Modal ── */}
      <Modal isOpen={vendorModal.isOpen} onClose={vendorModal.onClose} placement="center">
        <ModalContent>
          <form onSubmit={handleVendorSubmit}>
            <ModalHeader>{editingVendor ? t("ap.editVendor") : t("ap.addVendor")}</ModalHeader>
            <ModalBody className="gap-3">
              <Input label={t("ap.vendorName")} placeholder={t("ap.vendorNamePlaceholder")}
                value={vf.name} onValueChange={(v) => setVf((p) => ({ ...p, name: v }))}
                isInvalid={!!vErr.name} errorMessage={vErr.name} />
              <Input label={t("ap.vendorEmail")} type="email"
                value={vf.email} onValueChange={(v) => setVf((p) => ({ ...p, email: v }))} />
              <Input label={t("ap.vendorPhone")}
                value={vf.phone} onValueChange={(v) => setVf((p) => ({ ...p, phone: v }))} />
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={vendorModal.onClose}>{t("cancel")}</Button>
              <Button color="primary" type="submit">{editingVendor ? t("save") : t("add")}</Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </div>
  );
}
