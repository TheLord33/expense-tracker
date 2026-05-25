"use client";

import { useState, useMemo, type FormEvent } from "react";
import {
  Card, CardBody, CardHeader, Divider,
  Button, Chip, Input,
  Select, SelectItem,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  useDisclosure,
} from "@nextui-org/react";
import { Plus, Pencil, Trash2, BadgeDollarSign, CheckCircle, Download, Settings } from "lucide-react";
import type { Account, CompanyProfile, Customer, Invoice, InvoicePayment } from "@/lib/types";
import { generateInvoicePDF } from "@/lib/exportPDF";
import { downloadBlob } from "@/lib/importExport";
import { useLanguage, useCurrency } from "@/app/providers";

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
  if (collected >= inv.amount - 0.01) return "paid";
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

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  customers: Customer[];
  invoices: Invoice[];
  invoicePayments: InvoicePayment[];
  accounts: Account[];
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
  const [editingInv,   setEditingInv]   = useState<Invoice | null>(null);
  const [fCustomer,    setFCustomer]    = useState("");
  const [fInvNum,      setFInvNum]      = useState("");
  const [fDate,        setFDate]        = useState(today);
  const [fDue,         setFDue]         = useState(today);
  const [fAmount,      setFAmount]      = useState("");
  const [fDesc,        setFDesc]        = useState("");
  const [fRevAcct,     setFRevAcct]     = useState("acc-4000");
  const [fInvErr,      setFInvErr]      = useState("");

  // ── Payment form ─────────────────────────────────────────────────────────────
  const payModal = useDisclosure();
  const [payInvoice,   setPayInvoice]   = useState<Invoice | null>(null);
  const [payDate,      setPayDate]      = useState(today);
  const [payAmt,       setPayAmt]       = useState("");
  const [payNote,      setPayNote]      = useState("");
  const [payErr,       setPayErr]       = useState("");

  // ── Customer form ─────────────────────────────────────────────────────────────
  const custModal = useDisclosure();
  const [editingCust,  setEditingCust]  = useState<Customer | null>(null);
  const [fCustName,    setFCustName]    = useState("");
  const [fCustAddress, setFCustAddress] = useState("");
  const [fCustEmail,   setFCustEmail]   = useState("");
  const [fCustPhone,   setFCustPhone]   = useState("");
  const [fCustErr,     setFCustErr]     = useState("");

  // ── Company profile modal ─────────────────────────────────────────────────────
  const bizModal = useDisclosure();
  const [fBizName,    setFBizName]    = useState("");
  const [fBizAddress, setFBizAddress] = useState("");
  const [fBizEmail,   setFBizEmail]   = useState("");
  const [fBizPhone,   setFBizPhone]   = useState("");
  const [fBizWebsite, setFBizWebsite] = useState("");
  const [fBizTaxId,   setFBizTaxId]   = useState("");

  // ── Derived ──────────────────────────────────────────────────────────────────

  const revenueAccounts = useMemo(
    () => accounts.filter((a) => a.type === "revenue"),
    [accounts]
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

  // Aging buckets (outstanding only)
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

  // ── Invoice form handlers ─────────────────────────────────────────────────────

  function openAddInvoice() {
    setEditingInv(null);
    setFCustomer(""); setFInvNum(""); setFDate(today); setFDue(today);
    setFAmount(""); setFDesc(""); setFRevAcct("acc-4000"); setFInvErr("");
    invModal.onOpen();
  }

  function openEditInvoice(inv: Invoice) {
    setEditingInv(inv);
    setFCustomer(inv.customerId); setFInvNum(inv.invoiceNumber);
    setFDate(inv.date); setFDue(inv.dueDate);
    setFAmount(String(inv.amount)); setFDesc(inv.description);
    setFRevAcct(inv.revenueAccountId); setFInvErr("");
    invModal.onOpen();
  }

  function handleInvSubmit(e: FormEvent) {
    e.preventDefault();
    if (!fCustomer)     { setFInvErr(t("ar.errorCustomer")); return; }
    if (!fDate)         { setFInvErr(t("ar.errorDate"));     return; }
    if (!fDue)          { setFInvErr(t("ar.errorDueDate"));  return; }
    if (!fDesc.trim())  { setFInvErr(t("ar.errorDesc"));     return; }
    if (!fRevAcct)      { setFInvErr(t("ar.errorAccount"));  return; }
    const amt = parseFloat(fAmount);
    if (isNaN(amt) || amt <= 0) { setFInvErr(t("ar.errorAmount")); return; }

    const data: Omit<Invoice, "id"> = {
      customerId: fCustomer, invoiceNumber: fInvNum.trim() || `INV-${Date.now()}`,
      date: fDate, dueDate: fDue, amount: amt, description: fDesc.trim(),
      revenueAccountId: fRevAcct,
    };
    if (editingInv) onUpdateInvoice(editingInv.id, data);
    else            onAddInvoice(data);
    invModal.onClose();
  }

  // ── Payment form handlers ─────────────────────────────────────────────────────

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

  // ── Customer form handlers ────────────────────────────────────────────────────

  function openAddCustomer() {
    setEditingCust(null);
    setFCustName(""); setFCustAddress(""); setFCustEmail(""); setFCustPhone(""); setFCustErr("");
    custModal.onOpen();
  }

  function openEditCustomer(c: Customer) {
    setEditingCust(c);
    setFCustName(c.name); setFCustAddress(c.address ?? "");
    setFCustEmail(c.email ?? ""); setFCustPhone(c.phone ?? ""); setFCustErr("");
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
    };
    if (editingCust) onUpdateCustomer(editingCust.id, data);
    else             onAddCustomer(data);
    custModal.onClose();
  }

  // ── Company profile handlers ──────────────────────────────────────────────────

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

  // ── Render helpers ────────────────────────────────────────────────────────────

  function statusChip(inv: Invoice) {
    const status = invoiceStatus(inv, collectedAmount(inv.id), today);
    const map = {
      paid:      { label: t("ar.statusPaid"),     color: "success"  as const },
      overdue:   { label: t("ar.statusOverdue"),   color: "danger"   as const },
      "due-soon":{ label: t("ar.statusDueSoon"),   color: "warning"  as const },
      unpaid:    { label: t("ar.statusUnpaid"),     color: "default"  as const },
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
            <Button size="sm" color="primary" startContent={<Plus size={14} />} onPress={openAddInvoice}>
              {t("ar.addInvoice")}
            </Button>
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
                const owed = outstanding(inv);
                const status = invoiceStatus(inv, collectedAmount(inv.id), today);
                return (
                  <Card key={inv.id} shadow="sm">
                    <CardBody className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-default-900 text-sm">
                              {t("ar.invoiceNumber")}{inv.invoiceNumber}
                            </span>
                            {statusChip(inv)}
                          </div>
                          <p className="text-xs text-default-500 mt-0.5">{inv.description}</p>
                          <p className="text-xs text-default-400 mt-0.5">
                            {customerName(inv.customerId)} · {t("ar.dueDate")}: {fmtDate(inv.dueDate, locale)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-default-900">{fmt(inv.amount)}</p>
                          {owed > 0.01 && (
                            <p className="text-xs text-danger-600 font-medium">
                              {t("ar.outstanding")}: {fmt(owed)}
                            </p>
                          )}
                          {status === "paid" && (
                            <p className="text-xs text-success-600 flex items-center justify-end gap-0.5">
                              <CheckCircle size={11} />{t("ar.statusPaid")}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1.5 mt-3 justify-end">
                        {status !== "paid" && (
                          <Button size="sm" color="success" variant="flat" onPress={() => openPayment(inv)}>
                            {t("ar.recordPayment")}
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
                        {(c.email || c.phone) && (
                          <p className="text-xs text-default-400 mt-0.5">
                            {[c.email, c.phone].filter(Boolean).join(" · ")}
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
      <Modal isOpen={invModal.isOpen} onClose={invModal.onClose} placement="center" size="md">
        <ModalContent>
          <form onSubmit={handleInvSubmit}>
            <ModalHeader>{editingInv ? t("ar.editInvoice") : t("ar.addInvoice")}</ModalHeader>
            <ModalBody className="gap-3">
              <div className="flex gap-3">
                <Input
                  label={t("ar.invoiceNumber")}
                  placeholder="INV-001"
                  value={fInvNum}
                  onValueChange={(v) => { setFInvNum(v); setFInvErr(""); }}
                  size="sm"
                  className="w-36"
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
              <div className="flex gap-3">
                <Input
                  type="date" label={t("ar.invoiceDate")}
                  value={fDate} onValueChange={(v) => { setFDate(v); setFInvErr(""); }}
                  size="sm" className="flex-1"
                />
                <Input
                  type="date" label={t("ar.dueDate")}
                  value={fDue} onValueChange={(v) => { setFDue(v); setFInvErr(""); }}
                  size="sm" className="flex-1"
                />
              </div>
              <Input
                label={t("ar.description")}
                placeholder={t("ar.descPlaceholder")}
                value={fDesc}
                onValueChange={(v) => { setFDesc(v); setFInvErr(""); }}
                size="sm"
              />
              <div className="flex gap-3">
                <Input
                  label={t("ar.amount")}
                  type="number" min="0" step="0.01"
                  value={fAmount}
                  onValueChange={(v) => { setFAmount(v); setFInvErr(""); }}
                  size="sm"
                  className="flex-1"
                />
                <Select
                  label={t("ar.revenueAccount")}
                  selectedKeys={fRevAcct ? [fRevAcct] : []}
                  onSelectionChange={(keys) => { setFRevAcct([...keys][0] as string); setFInvErr(""); }}
                  size="sm"
                  className="flex-1"
                  isInvalid={!!fInvErr}
                  errorMessage={fInvErr}
                >
                  {revenueAccounts.map((a) => (
                    <SelectItem key={a.id} textValue={`${a.code} ${a.name}`}>
                      <span className="font-mono text-default-500 mr-1 text-xs">{a.code}</span>{a.name}
                    </SelectItem>
                  ))}
                </Select>
              </div>
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
                    {t("ar.invoiceNumber")}{payInvoice.invoiceNumber} — {payInvoice.description}
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
              <Input
                label={t("ar.payNote")} value={payNote} onValueChange={setPayNote} size="sm"
              />
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
                label={t("ar.customerPhone")}
                value={fCustPhone} onValueChange={setFCustPhone} size="sm"
              />
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={custModal.onClose}>{t("cancel")}</Button>
              <Button color="primary" type="submit">{editingCust ? t("save") : t("add")}</Button>
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
              <Input
                label={t("ar.businessName")}
                placeholder="Acme Inc."
                value={fBizName}
                onValueChange={setFBizName}
                size="sm"
              />
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
                <Input
                  label={t("ar.businessEmail")} type="email"
                  value={fBizEmail} onValueChange={setFBizEmail}
                  size="sm" className="flex-1"
                />
                <Input
                  label={t("ar.businessPhone")}
                  value={fBizPhone} onValueChange={setFBizPhone}
                  size="sm" className="flex-1"
                />
              </div>
              <div className="flex gap-3">
                <Input
                  label={t("ar.businessWebsite")}
                  value={fBizWebsite} onValueChange={setFBizWebsite}
                  size="sm" className="flex-1"
                />
                <Input
                  label={t("ar.businessTaxId")}
                  value={fBizTaxId} onValueChange={setFBizTaxId}
                  size="sm" className="flex-1"
                />
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
