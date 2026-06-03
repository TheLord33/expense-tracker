"use client";

import { useState, useMemo, type FormEvent } from "react";
import {
  Card, CardBody, CardHeader, Divider,
  Button, Chip, Input,
  Select, SelectItem,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  useDisclosure,
} from "@nextui-org/react";
import { Plus, Pencil, Trash2, BadgeDollarSign, CheckCircle, Download, Settings, X, FileText } from "lucide-react";
import type { Account, CompanyProfile, Customer, InventoryItem, Invoice, InvoiceLine, InvoicePayment } from "@/lib/types";
import { invoiceTotal } from "@/lib/useAR";
import { generateInvoicePDF, generateStatementPDF } from "@/lib/exportPDF";
import { downloadBlob } from "@/lib/importExport";
import { useLanguage, useCurrency } from "@/app/providers";
import { formatPhone, PAYMENT_TERMS } from "@/lib/formatPhone";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string, locale: string) {
  const [y, m, d] = iso.split("-");
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString(
    locale, { month: "short", day: "numeric", year: "numeric" }
  );
}

function invoiceStatus(
  inv: Invoice,
  collected: number,
  today: string
): "paid" | "overdue" | "due-soon" | "unpaid" {
  const total = Math.abs(invoiceTotal(inv)); // use absolute value so credits work the same way
  if (collected >= total - 0.01) return "paid";
  if (inv.dueDate < today) return "overdue";
  const days = Math.round((new Date(inv.dueDate).getTime() - new Date(today).getTime()) / 86400000);
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

type FormLine = { id: string; inventoryItemId: string; description: string; qty: string; unitPrice: string };
const blankLine = (): FormLine => ({ id: crypto.randomUUID(), inventoryItemId: "", description: "", qty: "1", unitPrice: "" });

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  customers: Customer[];
  invoices: Invoice[];
  invoicePayments: InvoicePayment[];
  accounts: Account[];
  inventoryItems?: InventoryItem[];
  company: CompanyProfile;
  onUpdateCompany: (data: Partial<CompanyProfile>) => void;
  onAddCustomer: (c: Omit<Customer, "id">) => void;
  onUpdateCustomer: (id: string, data: Partial<Omit<Customer, "id">>) => void;
  onDeleteCustomer: (id: string) => void;
  onAddInvoice: (i: Omit<Invoice, "id">) => void;
  onUpdateInvoice: (id: string, data: Partial<Omit<Invoice, "id">>) => void;
  onDeleteInvoice: (id: string) => void;
  onAddPayment: (p: Omit<InvoicePayment, "id">) => void;
  collectedAmount: (invoiceId: string) => number;
  outstanding: (inv: Invoice) => number;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ARTab({
  customers, invoices, invoicePayments, accounts,
  inventoryItems = [],
  company, onUpdateCompany,
  onAddCustomer, onUpdateCustomer, onDeleteCustomer,
  onAddInvoice, onUpdateInvoice, onDeleteInvoice,
  onAddPayment, collectedAmount, outstanding,
}: Props) {
  const { t, locale } = useLanguage();
  const { fmt } = useCurrency();

  const [view, setView] = useState<"invoices" | "customers" | "aging">("invoices");
  const today = todayISO();

  async function handleDownloadPDF(inv: Invoice) {
    const customer = customers.find((c) => c.id === inv.customerId);
    const pmts = invoicePayments.filter((p) => p.invoiceId === inv.id);
    const blob = await generateInvoicePDF(inv, customer, pmts, company, fmt, locale);
    downloadBlob(blob, `invoice-${inv.invoiceNumber || inv.id}.pdf`);
  }

  // ── Invoice form ─────────────────────────────────────────────────────────────
  const invModal = useDisclosure();
  const [editingInv, setEditingInv] = useState<Invoice | null>(null);
  const [fCustomer,  setFCustomer]  = useState("");
  const [fInvNum,    setFInvNum]    = useState("");
  const [fDate,      setFDate]      = useState(today);
  const [fDue,       setFDue]       = useState(today);
  const [fRevAcct,   setFRevAcct]   = useState("acc-4000");
  const [fLines,     setFLines]     = useState<FormLine[]>([blankLine()]);
  const [fInvErr,    setFInvErr]    = useState("");

  function addFormLine() { setFLines((p) => [...p, blankLine()]); }
  function removeFormLine(id: string) { setFLines((p) => p.filter((l) => l.id !== id)); }
  function updateFormLine(id: string, field: keyof FormLine, value: string) {
    setFLines((prev) => prev.map((l) => {
      if (l.id !== id) return l;
      const updated = { ...l, [field]: value };
      if (field === "inventoryItemId" && value) {
        const item = inventoryItems.find((i) => i.id === value);
        if (item) updated.description = item.name;
      }
      return updated;
    }));
  }

  const formTotal = fLines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.unitPrice) || 0), 0);

  function nextInvNumber(prefix: "I" | "C"): string {
    const max = invoices
      .filter((inv) => inv.invoiceNumber?.startsWith(prefix))
      .reduce((m, inv) => {
        const n = parseInt(inv.invoiceNumber.slice(1), 10);
        return isNaN(n) ? m : Math.max(m, n);
      }, 0);
    return `${prefix}${String(max + 1).padStart(6, "0")}`;
  }

  function openAddInvoice() {
    setEditingInv(null);
    setFInvNum(nextInvNumber("I"));
    setFCustomer(""); setFDate(today); setFDue(today);
    setFRevAcct("acc-4000"); setFLines([blankLine()]); setFInvErr("");
    invModal.onOpen();
  }

  function openAddCredit() {
    setEditingInv(null);
    setFInvNum(nextInvNumber("C"));
    setFCustomer(""); setFDate(today); setFDue(today);
    setFRevAcct("acc-4000"); setFLines([blankLine()]); setFInvErr("");
    invModal.onOpen();
  }

  function openEditInvoice(inv: Invoice) {
    setEditingInv(inv);
    setFCustomer(inv.customerId); setFInvNum(inv.invoiceNumber);
    setFDate(inv.date); setFDue(inv.dueDate);
    setFRevAcct(inv.revenueAccountId); setFInvErr("");
    setFLines(
      inv.lines?.length
        ? inv.lines.map((l) => ({
            id: l.id,
            inventoryItemId: l.inventoryItemId ?? "",
            description: l.description,
            qty: String(l.quantity),
            unitPrice: String(l.unitPrice),
          }))
        : [blankLine()]
    );
    invModal.onOpen();
  }

  function handleInvSubmit(e: FormEvent) {
    e.preventDefault();
    if (!fCustomer)           { setFInvErr(t("ar.errorCustomer")); return; }
    if (!fDate)               { setFInvErr(t("ar.errorDate"));     return; }
    if (!fDue)                { setFInvErr(t("ar.errorDueDate"));  return; }
    if (!fRevAcct)            { setFInvErr(t("ar.errorAccount"));  return; }
    if (fLines.length === 0)  { setFInvErr(t("ar.errorNoLines"));  return; }
    for (const l of fLines) {
      if (!l.description.trim()) { setFInvErr(t("ar.errorLineDesc"));  return; }
      if (!(Number(l.qty) > 0))  { setFInvErr(t("ar.errorLineQty"));   return; }
      if (!(Number(l.unitPrice) >= 0)) { setFInvErr(t("ar.errorLinePrice")); return; }
    }

    const lines: InvoiceLine[] = fLines.map((l) => ({
      id:              l.id,
      description:     l.description.trim(),
      quantity:        Number(l.qty),
      unitPrice:       Number(l.unitPrice),
      inventoryItemId: l.inventoryItemId || undefined,
    }));
    const num = fInvNum.trim() || nextInvNumber("I");
    const data: Omit<Invoice, "id"> = {
      customerId:       fCustomer,
      invoiceNumber:    num,
      type:             num.startsWith("C") ? "credit" : "invoice",
      date:             fDate,
      dueDate:          fDue,
      lines,
      revenueAccountId: fRevAcct,
    };
    if (editingInv) onUpdateInvoice(editingInv.id, data);
    else            onAddInvoice(data);
    invModal.onClose();
  }

  // ── Payment form ─────────────────────────────────────────────────────────────
  const payModal = useDisclosure();
  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null);
  const [payDate,    setPayDate]    = useState(today);
  const [payAmt,     setPayAmt]     = useState("");
  const [payNote,    setPayNote]    = useState("");
  const [payErr,     setPayErr]     = useState("");

  function openPayment(inv: Invoice) {
    setPayInvoice(inv);
    setPayDate(today); setPayAmt(""); setPayNote(""); setPayErr("");
    payModal.onOpen();
  }

  function handlePaySubmit(e: FormEvent) {
    e.preventDefault();
    if (!payInvoice) return;
    const amt = parseFloat(payAmt);
    if (isNaN(amt) || amt <= 0) { setPayErr(t("ar.errorPayAmount")); return; }
    if (amt > outstanding(payInvoice) + 0.01) { setPayErr(t("ar.errorPayExceeds")); return; }
    onAddPayment({ invoiceId: payInvoice.id, date: payDate, amount: amt, note: payNote.trim() || undefined });
    payModal.onClose();
  }

  // ── Customer form ─────────────────────────────────────────────────────────────
  const custModal = useDisclosure();
  const [editingCust,  setEditingCust]  = useState<Customer | null>(null);
  const [fCustName,    setFCustName]    = useState("");
  const [fCustAddress, setFCustAddress] = useState("");
  const [fCustEmail,   setFCustEmail]   = useState("");
  const [fCustPhone,   setFCustPhone]   = useState("");
  const [fCustTerms,   setFCustTerms]   = useState("");
  const [fCustErr,     setFCustErr]     = useState("");

  function openAddCustomer() {
    setEditingCust(null);
    setFCustName(""); setFCustAddress(""); setFCustEmail(""); setFCustPhone(""); setFCustTerms(""); setFCustErr("");
    custModal.onOpen();
  }

  function openEditCustomer(c: Customer) {
    setEditingCust(c);
    setFCustName(c.name); setFCustAddress(c.address ?? "");
    setFCustEmail(c.email ?? ""); setFCustPhone(c.phone ?? ""); setFCustTerms(c.terms ?? ""); setFCustErr("");
    custModal.onOpen();
  }

  function handleCustSubmit(e: FormEvent) {
    e.preventDefault();
    if (!fCustName.trim()) { setFCustErr(t("ar.errorCustomer")); return; }
    const data: Omit<Customer, "id"> = {
      name: fCustName.trim(),
      address: fCustAddress.trim() || undefined,
      email: fCustEmail.trim() || undefined,
      phone: fCustPhone.trim() || undefined,
      terms: fCustTerms.trim() || undefined,
    };
    if (editingCust) onUpdateCustomer(editingCust.id, data);
    else             onAddCustomer(data);
    custModal.onClose();
  }

  // ── Statement modal ───────────────────────────────────────────────────────────
  const stmtModal = useDisclosure();
  const [stmtCustomer,  setStmtCustomer]  = useState<Customer | null>(null);
  const [stmtFrom,      setStmtFrom]      = useState("");
  const [stmtTo,        setStmtTo]        = useState(today);
  const [stmtAllTime,   setStmtAllTime]   = useState(true);
  const [stmtLoading,   setStmtLoading]   = useState(false);

  function openStatement(c: Customer) {
    setStmtCustomer(c);
    setStmtFrom(""); setStmtTo(today); setStmtAllTime(true);
    stmtModal.onOpen();
  }

  async function handleStatementDownload(e: FormEvent) {
    e.preventDefault();
    if (!stmtCustomer) return;
    setStmtLoading(true);
    try {
      const custInvoices = invoices.filter((i) => i.customerId === stmtCustomer.id);
      const custPayments = invoicePayments.filter((p) =>
        custInvoices.some((i) => i.id === p.invoiceId)
      );
      const from = stmtAllTime ? undefined : stmtFrom || undefined;
      const to   = stmtAllTime ? undefined : stmtTo   || undefined;
      const blob = await generateStatementPDF(stmtCustomer, custInvoices, custPayments, company, fmt, locale, from, to);
      downloadBlob(blob, `statement-${stmtCustomer.name.replace(/\s+/g, "-")}.pdf`);
    } finally {
      setStmtLoading(false);
      stmtModal.onClose();
    }
  }

  // ── Company profile modal ─────────────────────────────────────────────────────
  const bizModal = useDisclosure();
  const [fBizName,    setFBizName]    = useState("");
  const [fBizAddress, setFBizAddress] = useState("");
  const [fBizEmail,   setFBizEmail]   = useState("");
  const [fBizPhone,   setFBizPhone]   = useState("");
  const [fBizWebsite, setFBizWebsite] = useState("");
  const [fBizTaxId,   setFBizTaxId]   = useState("");

  function openBizModal() {
    setFBizName(company.name ?? "");
    setFBizAddress(company.address ?? "");
    setFBizEmail(company.email ?? "");
    setFBizPhone(company.phone ?? "");
    setFBizWebsite(company.website ?? "");
    setFBizTaxId(company.taxId ?? "");
    bizModal.onOpen();
  }

  function handleBizSubmit(e: FormEvent) {
    e.preventDefault();
    onUpdateCompany({
      name:    fBizName.trim(),
      address: fBizAddress.trim() || undefined,
      email:   fBizEmail.trim()   || undefined,
      phone:   fBizPhone.trim()   || undefined,
      website: fBizWebsite.trim() || undefined,
      taxId:   fBizTaxId.trim()   || undefined,
    });
    bizModal.onClose();
  }

  // ── Derived ──────────────────────────────────────────────────────────────────

  const revenueAccounts = useMemo(
    () => accounts.filter((a) => a.type === "revenue"),
    [accounts]
  );

  const activeInventoryItems = useMemo(
    () => inventoryItems.filter((i) => !("isDeleted" in i && (i as Record<string, unknown>).isDeleted)),
    [inventoryItems]
  );

  const sortedInvoices = useMemo(() => {
    const STATUS_ORDER = { overdue: 0, "due-soon": 1, unpaid: 2, paid: 3 };
    return [...invoices].sort((a, b) => {
      const sa = invoiceStatus(a, collectedAmount(a.id), today);
      const sb = invoiceStatus(b, collectedAmount(b.id), today);
      if (STATUS_ORDER[sa] !== STATUS_ORDER[sb]) return STATUS_ORDER[sa] - STATUS_ORDER[sb];
      return a.dueDate.localeCompare(b.dueDate);
    });
  }, [invoices, collectedAmount, today]);

  const aging = useMemo(() => {
    const buckets: Record<string, number> = { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
    for (const inv of invoices) {
      const owed = outstanding(inv);
      if (owed < 0.01) continue;
      buckets[agingBucket(inv.dueDate, today)] += owed;
    }
    return buckets;
  }, [invoices, outstanding, today]);

  const totalOutstanding = useMemo(
    () => invoices.reduce((s, inv) => s + outstanding(inv), 0),
    [invoices, outstanding]
  );

  // ── Render helpers ────────────────────────────────────────────────────────────

  function statusChip(inv: Invoice) {
    const status = invoiceStatus(inv, collectedAmount(inv.id), today);
    const map = {
      paid:       { label: t("ar.statusPaid"),    color: "success"  as const },
      overdue:    { label: t("ar.statusOverdue"),  color: "danger"   as const },
      "due-soon": { label: t("ar.statusDueSoon"),  color: "warning"  as const },
      unpaid:     { label: t("ar.statusUnpaid"),   color: "default"  as const },
    };
    return <Chip size="sm" variant="flat" color={map[status].color}>{map[status].label}</Chip>;
  }

  function customerName(id: string) {
    return customers.find((c) => c.id === id)?.name ?? "—";
  }

  const AGING_LABELS: { key: string; label: string }[] = [
    { key: "current", label: t("ar.current")    },
    { key: "1-30",    label: t("ar.days1_30")   },
    { key: "31-60",   label: t("ar.days31_60")  },
    { key: "61-90",   label: t("ar.days61_90")  },
    { key: "90+",     label: t("ar.days90plus") },
  ];

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button size="sm" variant={view === "invoices"  ? "solid" : "flat"} color={view === "invoices"  ? "primary" : "default"} onPress={() => setView("invoices")}>
            {t("ar.tabInvoices")}
          </Button>
          <Button size="sm" variant={view === "customers" ? "solid" : "flat"} color={view === "customers" ? "primary" : "default"} onPress={() => setView("customers")}>
            {t("ar.tabCustomers")}
          </Button>
          <Button size="sm" variant={view === "aging"     ? "solid" : "flat"} color={view === "aging"     ? "primary" : "default"} onPress={() => setView("aging")}>
            {t("ar.tabAging")}
          </Button>
        </div>
        <div className="flex gap-2">
          <Button isIconOnly size="sm" variant="flat" title={t("ar.businessProfile")} onPress={openBizModal}>
            <Settings size={14} />
          </Button>
          {view === "invoices" && (
            <>
              <Button size="sm" color="primary" startContent={<Plus size={14} />} onPress={openAddInvoice}>
                {t("ar.addInvoice")}
              </Button>
              <Button size="sm" variant="flat" color="success" startContent={<Plus size={14} />} onPress={openAddCredit}>
                Credit Memo
              </Button>
            </>
          )}
          {view === "customers" && (
            <Button size="sm" color="primary" startContent={<Plus size={14} />} onPress={openAddCustomer}>
              {t("ar.addCustomer")}
            </Button>
          )}
        </div>
      </div>

      {/* ── Invoices ── */}
      {view === "invoices" && (
        <>
          {sortedInvoices.length === 0 ? (
            <Card shadow="none" className="border-2 border-dashed border-default-200">
              <CardBody className="py-16 text-center text-default-400">
                <BadgeDollarSign size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">{t("ar.noInvoices")}</p>
                <p className="text-xs mt-1">{t("ar.noInvoicesSub")}</p>
              </CardBody>
            </Card>
          ) : (
            <div className="space-y-2">
              {sortedInvoices.map((inv) => {
                const total = invoiceTotal(inv);
                const owed  = outstanding(inv);
                const status = invoiceStatus(inv, collectedAmount(inv.id), today);
                const firstLine = inv.lines?.[0];
                const lineDesc = firstLine
                  ? (inv.lines.length > 1 ? `${firstLine.description} +${inv.lines.length - 1}` : firstLine.description)
                  : (inv.description ?? "");
                const isCredit = inv.type === "credit";
                const absTotal = Math.abs(total);
                const absOwed  = Math.abs(owed);
                return (
                  <Card key={inv.id} shadow="sm"
                    className={isCredit ? "border border-success-200 bg-success-50/30" : ""}>
                    <CardBody className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isCredit && (
                              <span className="text-xs font-bold text-success-700 uppercase tracking-wide">Credit Memo</span>
                            )}
                            <span className="font-semibold text-default-900 text-sm">
                              {t("ar.invoiceNumber")}{inv.invoiceNumber}
                            </span>
                            {statusChip(inv)}
                          </div>
                          <p className="text-xs text-default-500 mt-0.5">{lineDesc}</p>
                          <p className="text-xs text-default-400 mt-0.5">
                            {customerName(inv.customerId)} · {t("ar.dueDate")}: {fmtDate(inv.dueDate, locale)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-sm font-bold ${isCredit ? "text-success-700" : "text-default-900"}`}>
                            {isCredit ? `(${fmt(absTotal)})` : fmt(total)}
                          </p>
                          {absOwed > 0.01 && (
                            <p className={`text-xs font-medium ${isCredit ? "text-success-600" : "text-danger-600"}`}>
                              {isCredit ? "Unapplied" : t("ar.outstanding")}: {isCredit ? `(${fmt(absOwed)})` : fmt(absOwed)}
                            </p>
                          )}
                          {status === "paid" && (
                            <p className="text-xs text-success-600 flex items-center justify-end gap-0.5">
                              <CheckCircle size={11} />{isCredit ? "Applied" : t("ar.statusPaid")}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1.5 mt-3 justify-end">
                        {status !== "paid" && (
                          <Button size="sm" color="success" variant="flat" onPress={() => openPayment(inv)}>
                            {isCredit ? "Apply Credit" : t("ar.recordPayment")}
                          </Button>
                        )}
                        <Button isIconOnly size="sm" variant="light" title="Download PDF" onPress={() => handleDownloadPDF(inv)}>
                          <Download size={13} />
                        </Button>
                        <Button isIconOnly size="sm" variant="light" onPress={() => openEditInvoice(inv)}>
                          <Pencil size={13} />
                        </Button>
                        <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => onDeleteInvoice(inv.id)}>
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Customers ── */}
      {view === "customers" && (
        <>
          {customers.length === 0 ? (
            <Card shadow="none" className="border-2 border-dashed border-default-200">
              <CardBody className="py-16 text-center text-default-400">
                <p className="text-sm font-medium">{t("ar.noCustomers")}</p>
                <p className="text-xs mt-1">{t("ar.noCustomersSub")}</p>
              </CardBody>
            </Card>
          ) : (
            <div className="space-y-2">
              {customers.map((c) => {
                const custInvoices = invoices.filter((i) => i.customerId === c.id);
                const custOwed = custInvoices.reduce((s, i) => s + outstanding(i), 0);
                return (
                  <Card key={c.id} shadow="sm">
                    <CardBody className="px-5 py-3 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-default-900">{c.name}</p>
                        {c.address && (
                          <p className="text-xs text-default-400 mt-0.5 whitespace-pre-line">{c.address}</p>
                        )}
                        {(c.email || c.phone || c.terms) && (
                          <p className="text-xs text-default-400 mt-0.5">
                            {[c.email, c.phone, c.terms].filter(Boolean).join(" · ")}
                          </p>
                        )}
                        <p className="text-xs text-default-400 mt-0.5">
                          {custInvoices.length} {custInvoices.length === 1 ? t("ar.invoice") : t("ar.invoices")}
                          {custOwed > 0.01 && (
                            <span className="text-danger-600 font-medium ml-2">
                              {fmt(custOwed)} {t("ar.outstanding")}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" variant="flat" startContent={<FileText size={12} />} onPress={() => openStatement(c)}>
                          {t("ar.statement")}
                        </Button>
                        <Button isIconOnly size="sm" variant="light" onPress={() => openEditCustomer(c)}>
                          <Pencil size={13} />
                        </Button>
                        <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => onDeleteCustomer(c.id)}>
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Aging ── */}
      {view === "aging" && (
        <Card shadow="sm">
          <CardHeader className="px-6 pt-5 pb-3 flex-col items-start gap-0.5">
            <h2 className="text-lg font-bold text-default-900">{t("ar.agingTitle")}</h2>
            <p className="text-sm text-default-400">{t("ar.agingAsOf", { date: fmtDate(today, locale) })}</p>
          </CardHeader>
          <Divider />
          <CardBody className="px-6 py-5 space-y-3">
            {totalOutstanding < 0.01 ? (
              <p className="text-sm text-default-400 text-center py-8">{t("ar.noOutstanding")}</p>
            ) : (
              <>
                {AGING_LABELS.map(({ key, label }) => {
                  const amount = aging[key];
                  const pct = totalOutstanding > 0 ? (amount / totalOutstanding) * 100 : 0;
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className={`font-medium ${key !== "current" && amount > 0 ? "text-danger-700" : "text-default-700"}`}>
                          {label}
                        </span>
                        <span className="font-semibold tabular-nums text-default-900">
                          {amount > 0 ? fmt(amount) : "—"}
                        </span>
                      </div>
                      {amount > 0 && (
                        <div className="h-1.5 rounded-full bg-default-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${key === "current" ? "bg-success-500" : key === "1-30" ? "bg-warning-400" : "bg-danger-500"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
                <Divider className="my-2" />
                <div className="flex justify-between font-bold text-sm">
                  <span>{t("ar.totalOutstanding")}</span>
                  <span className="text-danger-600">{fmt(totalOutstanding)}</span>
                </div>
              </>
            )}
          </CardBody>
        </Card>
      )}

      {/* ── Invoice Add/Edit Modal ── */}
      <Modal isOpen={invModal.isOpen} onClose={invModal.onClose} placement="center" size="2xl" scrollBehavior="inside">
        <ModalContent>
          <form onSubmit={handleInvSubmit}>
            <ModalHeader>
              {editingInv
                ? (editingInv.type === "credit" ? "Edit Credit Memo" : t("ar.editInvoice"))
                : (fInvNum.startsWith("C") ? "New Credit Memo" : t("ar.addInvoice"))}
            </ModalHeader>
            <ModalBody className="gap-3">
              {/* Customer + Invoice # */}
              <div className="flex gap-3">
                <Input
                  label={fInvNum.startsWith("C") ? "Credit Memo #" : t("ar.invoiceNumber")}
                  value={fInvNum}
                  isReadOnly
                  size="sm"
                  className="w-36"
                  classNames={{ input: "text-default-500 cursor-default" }}
                />
                <Select
                  label={t("ar.customer")}
                  placeholder={t("ar.selectCustomer")}
                  selectedKeys={fCustomer ? [fCustomer] : []}
                  onSelectionChange={(keys) => { setFCustomer([...keys][0] as string); setFInvErr(""); }}
                  size="sm"
                  className="flex-1"
                >
                  {customers.map((c) => (
                    <SelectItem key={c.id} textValue={c.name}>{c.name}</SelectItem>
                  ))}
                </Select>
              </div>

              {/* Dates + Revenue Account */}
              <div className="flex gap-3">
                <Input type="date" label={t("ar.invoiceDate")} value={fDate}
                  onValueChange={(v) => { setFDate(v); setFInvErr(""); }} size="sm" className="flex-1" />
                <Input type="date" label={t("ar.dueDate")} value={fDue}
                  onValueChange={(v) => { setFDue(v); setFInvErr(""); }} size="sm" className="flex-1" />
                <Select
                  label={t("ar.revenueAccount")}
                  selectedKeys={fRevAcct ? [fRevAcct] : []}
                  onSelectionChange={(keys) => { setFRevAcct([...keys][0] as string); setFInvErr(""); }}
                  size="sm" className="flex-1"
                >
                  {revenueAccounts.map((a) => (
                    <SelectItem key={a.id} textValue={`${a.code} ${a.name}`}>
                      <span className="font-mono text-default-500 mr-1 text-xs">{a.code}</span>{a.name}
                    </SelectItem>
                  ))}
                </Select>
              </div>

              {/* Line items */}
              <div>
                <p className="text-xs font-medium text-default-500 mb-1.5">{t("ar.lineItems")}</p>
                <div className="border border-default-200 rounded-xl overflow-hidden">
                  {/* Column headers */}
                  <div className={`grid gap-1 px-3 py-2 bg-default-50 text-xs font-medium text-default-500 border-b border-default-200 ${activeInventoryItems.length > 0 ? "grid-cols-[1fr_56px_80px_64px_24px]" : "grid-cols-[1fr_56px_80px_64px_24px]"}`}>
                    <span>{t("ar.lineDescription")}</span>
                    <span className="text-right">{t("ar.lineQty")}</span>
                    <span className="text-right">{t("ar.lineUnitPrice")}</span>
                    <span className="text-right">{t("ar.lineTotal")}</span>
                    <span></span>
                  </div>

                  {fLines.map((line, idx) => (
                    <div
                      key={line.id}
                      className={`grid grid-cols-[1fr_56px_80px_64px_24px] gap-1 px-3 py-2 items-start ${idx < fLines.length - 1 ? "border-b border-default-100" : ""}`}
                    >
                      <div className="space-y-1">
                        {activeInventoryItems.length > 0 && (
                          <select
                            className="w-full text-xs text-default-500 bg-default-50 border border-default-200 rounded-lg px-2 py-1 focus:outline-none focus:border-primary"
                            value={line.inventoryItemId}
                            onChange={(e) => { updateFormLine(line.id, "inventoryItemId", e.target.value); setFInvErr(""); }}
                          >
                            <option value="">{t("ar.linkInventory")}</option>
                            {activeInventoryItems.map((i) => (
                              <option key={i.id} value={i.id}>{i.name} [{i.sku}]</option>
                            ))}
                          </select>
                        )}
                        <input
                          className="w-full text-sm bg-transparent border border-default-200 rounded-lg px-2 py-1 focus:outline-none focus:border-primary placeholder-default-300"
                          placeholder={t("ar.lineDescription")}
                          value={line.description}
                          onChange={(e) => { updateFormLine(line.id, "description", e.target.value); setFInvErr(""); }}
                        />
                      </div>
                      <input
                        className="text-sm text-right bg-transparent border border-default-200 rounded-lg px-2 py-1 focus:outline-none focus:border-primary w-full"
                        type="number" min="0.001" step="any"
                        value={line.qty}
                        onChange={(e) => { updateFormLine(line.id, "qty", e.target.value); setFInvErr(""); }}
                      />
                      <input
                        className="text-sm text-right bg-transparent border border-default-200 rounded-lg px-2 py-1 focus:outline-none focus:border-primary w-full"
                        type="number" min="0" step="0.01"
                        value={line.unitPrice}
                        onChange={(e) => { updateFormLine(line.id, "unitPrice", e.target.value); setFInvErr(""); }}
                      />
                      <span className="text-xs font-medium text-right text-default-700 tabular-nums pt-1.5">
                        {fmt((Number(line.qty) || 0) * (Number(line.unitPrice) || 0))}
                      </span>
                      <button
                        type="button"
                        className="text-default-300 hover:text-danger-500 transition-colors pt-1.5 ml-auto"
                        onClick={() => removeFormLine(line.id)}
                        disabled={fLines.length <= 1}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}

                  {/* Grand total row */}
                  <div className="flex justify-end items-center gap-3 px-3 py-2 bg-default-50 border-t border-default-200">
                    <span className="text-xs font-semibold text-default-600">{t("ar.grandTotal")}:</span>
                    <span className="text-sm font-bold text-indigo-600 tabular-nums">{fmt(formTotal)}</span>
                  </div>
                </div>

                <Button
                  size="sm" variant="flat" startContent={<Plus size={12} />}
                  className="mt-2"
                  onPress={addFormLine}
                  type="button"
                >
                  {t("ar.addLine")}
                </Button>
              </div>

              {fInvErr && <p className="text-xs text-danger-600">{fInvErr}</p>}
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={invModal.onClose}>{t("cancel")}</Button>
              <Button color="primary" type="submit">{editingInv ? t("save") : t("add")}</Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* ── Payment Modal ── */}
      <Modal isOpen={payModal.isOpen} onClose={payModal.onClose} placement="center" size="sm">
        <ModalContent>
          <form onSubmit={handlePaySubmit}>
            <ModalHeader>{t("ar.recordPayment")}</ModalHeader>
            <ModalBody className="gap-3">
              {payInvoice && (
                <div className="rounded-lg bg-default-50 px-4 py-3 text-sm">
                  <p className="font-medium text-default-800">
                    {t("ar.invoiceNumber")}{payInvoice.invoiceNumber}
                  </p>
                  <p className="text-default-500 text-xs mt-0.5">
                    {t("ar.outstanding")}: {fmt(outstanding(payInvoice))}
                  </p>
                </div>
              )}
              <Input
                type="date" label={t("ar.payDate")}
                value={payDate} onValueChange={(v) => { setPayDate(v); setPayErr(""); }}
                size="sm"
              />
              <Input
                label={t("ar.payAmount")} type="number" min="0" step="0.01"
                value={payAmt}
                onValueChange={(v) => { setPayAmt(v); setPayErr(""); }}
                isInvalid={!!payErr} errorMessage={payErr}
                size="sm"
              />
              <Input label={t("ar.payNote")} value={payNote} onValueChange={setPayNote} size="sm" />
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={payModal.onClose}>{t("cancel")}</Button>
              <Button color="primary" type="submit">{t("add")}</Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* ── Customer Add/Edit Modal ── */}
      <Modal isOpen={custModal.isOpen} onClose={custModal.onClose} placement="center" size="sm">
        <ModalContent>
          <form onSubmit={handleCustSubmit}>
            <ModalHeader>{editingCust ? t("ar.editCustomer") : t("ar.addCustomer")}</ModalHeader>
            <ModalBody className="gap-3">
              <Input
                label={t("ar.customerName")}
                placeholder={t("ar.customerNamePlaceholder")}
                value={fCustName}
                onValueChange={(v) => { setFCustName(v); setFCustErr(""); }}
                isInvalid={!!fCustErr} errorMessage={fCustErr}
                size="sm"
              />
              <textarea
                placeholder={t("ar.customerAddress")}
                value={fCustAddress}
                onChange={(e) => setFCustAddress(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-default-200 bg-default-100 px-3 py-2 text-sm text-default-800 placeholder-default-400 focus:outline-none focus:border-primary resize-none"
              />
              <Input
                label={t("ar.customerEmail")} type="email"
                value={fCustEmail} onValueChange={setFCustEmail} size="sm"
              />
              <Input
                label={t("ar.customerPhone")} placeholder="(555) 000-0000"
                value={fCustPhone} onValueChange={(v) => setFCustPhone(formatPhone(v))} size="sm"
              />
              <Select
                label={t("ar.customerTerms")}
                placeholder="—"
                size="sm"
                selectedKeys={fCustTerms ? new Set([fCustTerms]) : new Set()}
                onSelectionChange={(keys) => setFCustTerms([...keys][0] as string ?? "")}
              >
                {PAYMENT_TERMS.map((term) => <SelectItem key={term}>{term}</SelectItem>)}
              </Select>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={custModal.onClose}>{t("cancel")}</Button>
              <Button color="primary" type="submit">{editingCust ? t("save") : t("add")}</Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* ── Statement Modal ── */}
      <Modal isOpen={stmtModal.isOpen} onClose={stmtModal.onClose} placement="center" size="sm">
        <ModalContent>
          <form onSubmit={handleStatementDownload}>
            <ModalHeader>
              {t("ar.statementTitle")} — {stmtCustomer?.name}
            </ModalHeader>
            <ModalBody className="gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={stmtAllTime}
                  onChange={(e) => setStmtAllTime(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-default-700">{t("ar.allTime")}</span>
              </label>
              {!stmtAllTime && (
                <div className="flex gap-3">
                  <Input type="date" label={t("from")} value={stmtFrom}
                    onValueChange={setStmtFrom} size="sm" className="flex-1" />
                  <Input type="date" label={t("to")} value={stmtTo}
                    onValueChange={setStmtTo} size="sm" className="flex-1" />
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={stmtModal.onClose}>{t("cancel")}</Button>
              <Button color="primary" type="submit" isLoading={stmtLoading}
                startContent={!stmtLoading ? <Download size={14} /> : undefined}>
                {t("ar.statement")} PDF
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* ── Business Profile Modal ── */}
      <Modal isOpen={bizModal.isOpen} onClose={bizModal.onClose} placement="center" size="md">
        <ModalContent>
          <form onSubmit={handleBizSubmit}>
            <ModalHeader>{t("ar.businessProfile")}</ModalHeader>
            <ModalBody className="gap-3">
              <p className="text-xs text-default-400">{t("ar.businessProfileHint")}</p>
              <Input label={t("ar.businessName")} placeholder="Acme Inc."
                value={fBizName} onValueChange={setFBizName} size="sm" />
              <div>
                <p className="text-xs text-default-500 mb-1 ml-1">{t("ar.businessAddress")}</p>
                <textarea
                  placeholder={"123 Main St\nNew York, NY 10001\nUSA"}
                  value={fBizAddress}
                  onChange={(e) => setFBizAddress(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-default-200 bg-default-100 px-3 py-2 text-sm text-default-800 placeholder-default-400 focus:outline-none focus:border-primary resize-none"
                />
              </div>
              <div className="flex gap-3">
                <Input label={t("ar.businessEmail")} type="email"
                  value={fBizEmail} onValueChange={setFBizEmail} size="sm" className="flex-1" />
                <Input label={t("ar.businessPhone")} placeholder="(555) 000-0000"
                  value={fBizPhone} onValueChange={(v) => setFBizPhone(formatPhone(v))} size="sm" className="flex-1" />
              </div>
              <div className="flex gap-3">
                <Input label={t("ar.businessWebsite")}
                  value={fBizWebsite} onValueChange={setFBizWebsite} size="sm" className="flex-1" />
                <Input label={t("ar.businessTaxId")}
                  value={fBizTaxId} onValueChange={setFBizTaxId} size="sm" className="flex-1" />
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={bizModal.onClose}>{t("cancel")}</Button>
              <Button color="primary" type="submit">{t("ar.saveProfile")}</Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </div>
  );
}
