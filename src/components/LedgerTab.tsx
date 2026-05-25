"use client";

import { useState, useMemo, type FormEvent } from "react";
import {
  Card, CardBody, CardHeader, Divider,
  Button, Chip, Input, Select, SelectItem,
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  useDisclosure,
} from "@nextui-org/react";
import { BookOpen, List, Plus, Pencil, Trash2 } from "lucide-react";
import type { Account, AccountType, Bill, BillPayment, Expense, IncomeSource } from "@/lib/types";
import { deriveAllEntries, accountLedger } from "@/lib/ledger";
import { useLanguage, useCurrency } from "@/app/providers";

// ── Constants ─────────────────────────────────────────────────────────────────

const ACCOUNT_TYPES: AccountType[] = ["asset", "liability", "equity", "revenue", "expense"];

const TYPE_COLORS: Record<AccountType, "success" | "danger" | "secondary" | "primary" | "warning"> = {
  asset:     "success",
  liability: "danger",
  equity:    "secondary",
  revenue:   "primary",
  expense:   "warning",
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  expenses: Expense[];
  sources: IncomeSource[];
  accounts: Account[];
  bills?: Bill[];
  billPayments?: BillPayment[];
  onAddAccount: (a: Omit<Account, "id">) => void;
  onUpdateAccount: (id: string, data: Partial<Omit<Account, "id">>) => void;
  onDeleteAccount: (id: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LedgerTab({ expenses, sources, accounts, bills = [], billPayments = [], onAddAccount, onUpdateAccount, onDeleteAccount }: Props) {
  const { t, locale } = useLanguage();
  const { fmt } = useCurrency();

  const [view, setView] = useState<"accounts" | "ledger">("accounts");
  const [selectedId, setSelectedId] = useState<string>("");

  // Modal form state
  const modal = useDisclosure();
  const [editing, setEditing] = useState<Account | null>(null);
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<AccountType>("expense");
  const [formErr, setFormErr] = useState("");

  // Derived data
  const entries = useMemo(
    () => deriveAllEntries(expenses, sources, accounts, bills, billPayments),
    [expenses, sources, accounts, bills, billPayments]
  );

  const selectedAccount = accounts.find((a) => a.id === selectedId) ?? null;

  const ledgerRows = useMemo(
    () => (selectedAccount ? accountLedger(selectedId, entries, selectedAccount.type) : []),
    [selectedId, selectedAccount, entries]
  );

  const grouped = useMemo(() => {
    const g: Record<AccountType, Account[]> = { asset: [], liability: [], equity: [], revenue: [], expense: [] };
    for (const acc of accounts) g[acc.type].push(acc);
    return g;
  }, [accounts]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  function openAdd() {
    setEditing(null);
    setFormCode(""); setFormName(""); setFormType("expense"); setFormErr("");
    modal.onOpen();
  }

  function openEdit(acc: Account) {
    setEditing(acc);
    setFormCode(acc.code); setFormName(acc.name); setFormType(acc.type); setFormErr("");
    modal.onOpen();
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!formCode.trim()) { setFormErr(t("ledger.errorCodeRequired")); return; }
    if (!formName.trim()) { setFormErr(t("ledger.errorNameRequired")); return; }
    const dupe = accounts.some((a) => a.code === formCode.trim() && a.id !== editing?.id);
    if (dupe) { setFormErr(t("ledger.errorCodeExists")); return; }

    if (editing) {
      onUpdateAccount(editing.id, { code: formCode.trim(), name: formName.trim(), type: formType });
    } else {
      onAddAccount({ code: formCode.trim(), name: formName.trim(), type: formType });
    }
    modal.onClose();
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function typeLabel(type: AccountType) {
    const map: Record<AccountType, string> = {
      asset:     t("ledger.typeAsset"),
      liability: t("ledger.typeLiability"),
      equity:    t("ledger.typeEquity"),
      revenue:   t("ledger.typeRevenue"),
      expense:   t("ledger.typeExpense"),
    };
    return map[type];
  }

  function formatDate(iso: string) {
    const [y, m, d] = iso.split("-");
    return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString(
      locale, { month: "short", day: "numeric", year: "numeric" }
    );
  }

  function fmtAmt(n: number) {
    return n === 0 ? "—" : fmt(n);
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={view === "accounts" ? "solid" : "flat"}
            color={view === "accounts" ? "primary" : "default"}
            startContent={<BookOpen size={14} />}
            onPress={() => setView("accounts")}
          >
            {t("ledger.tabAccounts")}
          </Button>
          <Button
            size="sm"
            variant={view === "ledger" ? "solid" : "flat"}
            color={view === "ledger" ? "primary" : "default"}
            startContent={<List size={14} />}
            onPress={() => setView("ledger")}
          >
            {t("ledger.tabLedger")}
          </Button>
        </div>
        {view === "accounts" && (
          <Button size="sm" color="primary" startContent={<Plus size={14} />} onPress={openAdd}>
            {t("ledger.addAccount")}
          </Button>
        )}
      </div>

      {/* ── Chart of Accounts ── */}
      {view === "accounts" && (
        <div className="space-y-3">
          {ACCOUNT_TYPES.map((type) => {
            const accs = grouped[type];
            if (accs.length === 0) return null;
            return (
              <Card key={type} shadow="sm">
                <CardHeader className="px-5 pt-4 pb-2">
                  <Chip color={TYPE_COLORS[type]} variant="flat" size="sm" className="font-semibold uppercase tracking-wide text-xs">
                    {typeLabel(type)}
                  </Chip>
                </CardHeader>
                <Divider />
                <CardBody className="p-0">
                  <Table aria-label={typeLabel(type)} removeWrapper>
                    <TableHeader>
                      <TableColumn className="w-24">{t("ledger.code")}</TableColumn>
                      <TableColumn>{t("ledger.accountName")}</TableColumn>
                      <TableColumn className="w-24 text-right"> </TableColumn>
                    </TableHeader>
                    <TableBody>
                      {accs.map((acc) => (
                        <TableRow key={acc.id}>
                          <TableCell className="font-mono text-default-500 text-sm">{acc.code}</TableCell>
                          <TableCell>
                            <span className="font-medium">{acc.name}</span>
                            {acc.isBuiltin && (
                              <span className="ml-2 text-xs text-default-400">({t("ledger.builtIn")})</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {!acc.isBuiltin && (
                              <div className="flex justify-end gap-1">
                                <Button isIconOnly size="sm" variant="light" onPress={() => openEdit(acc)}>
                                  <Pencil size={13} />
                                </Button>
                                <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => onDeleteAccount(acc.id)}>
                                  <Trash2 size={13} />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── General Ledger ── */}
      {view === "ledger" && (
        <div className="space-y-4">
          <Card shadow="sm">
            <CardBody className="p-4">
              <Select
                label={t("ledger.selectAccount")}
                selectedKeys={selectedId ? [selectedId] : []}
                onSelectionChange={(keys) => setSelectedId([...keys][0] as string)}
              >
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} textValue={`${acc.code} – ${acc.name}`}>
                    <span className="font-mono text-default-500 mr-2">{acc.code}</span>
                    {acc.name}
                  </SelectItem>
                ))}
              </Select>
            </CardBody>
          </Card>

          {selectedAccount && (
            <Card shadow="sm">
              <CardHeader className="px-5 pt-4 pb-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Chip color={TYPE_COLORS[selectedAccount.type]} variant="flat" size="sm">
                    {typeLabel(selectedAccount.type)}
                  </Chip>
                  <span className="font-semibold text-default-800">
                    {selectedAccount.code} — {selectedAccount.name}
                  </span>
                </div>
                {ledgerRows.length > 0 && (
                  <span className={`font-bold text-lg ${ledgerRows[ledgerRows.length - 1].balance < 0 ? "text-danger" : "text-default-900"}`}>
                    {fmt(Math.abs(ledgerRows[ledgerRows.length - 1].balance))}
                  </span>
                )}
              </CardHeader>
              <Divider />
              <CardBody className="p-0">
                <Table aria-label="Ledger" removeWrapper>
                  <TableHeader>
                    <TableColumn className="w-32">{t("ledger.date")}</TableColumn>
                    <TableColumn>{t("ledger.description")}</TableColumn>
                    <TableColumn className="w-8 text-xs text-default-400 uppercase">Src</TableColumn>
                    <TableColumn className="text-right w-28">{t("ledger.debit")}</TableColumn>
                    <TableColumn className="text-right w-28">{t("ledger.credit")}</TableColumn>
                    <TableColumn className="text-right w-28">{t("ledger.balance")}</TableColumn>
                  </TableHeader>
                  <TableBody emptyContent={t("ledger.noTransactions")}>
                    {ledgerRows.map((row, i) => (
                      <TableRow key={`${row.entry.id}-${i}`}>
                        <TableCell className="text-default-500 text-sm whitespace-nowrap">
                          {formatDate(row.entry.date)}
                        </TableCell>
                        <TableCell className="text-sm">{row.entry.description}</TableCell>
                        <TableCell>
                          {row.entry.sourceType === "expense" && (
                            <span className="text-xs text-warning-600">{t("ledger.sourceExpense")[0]}</span>
                          )}
                          {row.entry.sourceType === "income" && (
                            <span className="text-xs text-primary-600">{t("ledger.sourceIncome")[0]}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-default-700">
                          {fmtAmt(row.debit)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-default-700">
                          {fmtAmt(row.credit)}
                        </TableCell>
                        <TableCell className={`text-right font-mono text-sm font-semibold ${row.balance < 0 ? "text-danger" : "text-default-900"}`}>
                          {fmt(Math.abs(row.balance))}
                          {row.balance < 0 && <span className="text-xs ml-0.5">Cr</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardBody>
            </Card>
          )}

          {!selectedAccount && (
            <Card shadow="none" className="border-2 border-dashed border-default-200">
              <CardBody className="py-16 text-center text-default-400">
                <p className="text-sm">{t("ledger.selectAccountHint")}</p>
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {/* ── Add / Edit Account Modal ── */}
      <Modal isOpen={modal.isOpen} onClose={modal.onClose} placement="center" size="sm">
        <ModalContent>
          <form onSubmit={handleSubmit}>
            <ModalHeader>{editing ? t("ledger.editAccount") : t("ledger.addAccount")}</ModalHeader>
            <ModalBody className="gap-4">
              <Input
                label={t("ledger.formCode")}
                placeholder="e.g. 6100"
                value={formCode}
                onValueChange={(v) => { setFormCode(v); setFormErr(""); }}
                isInvalid={!!formErr && !formName}
              />
              <Input
                label={t("ledger.formName")}
                placeholder="e.g. Utilities"
                value={formName}
                onValueChange={(v) => { setFormName(v); setFormErr(""); }}
                isInvalid={!!formErr}
                errorMessage={formErr}
              />
              <Select
                label={t("ledger.formType")}
                selectedKeys={[formType]}
                onSelectionChange={(keys) => setFormType([...keys][0] as AccountType)}
              >
                {ACCOUNT_TYPES.map((type) => (
                  <SelectItem key={type} textValue={typeLabel(type)}>
                    <Chip color={TYPE_COLORS[type]} variant="flat" size="sm">{typeLabel(type)}</Chip>
                  </SelectItem>
                ))}
              </Select>
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
