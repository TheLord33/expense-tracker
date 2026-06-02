"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import {
  useDisclosure,
  Card, CardBody, CardHeader, Divider,
  Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, DropdownSection,
  Button, Input,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
} from "@nextui-org/react";
import {
  Receipt, PiggyBank, RefreshCw, TrendingUp,
  BookOpen, BarChart2, Scale, ClipboardList, Wallet, Package, BadgeDollarSign,
  Banknote, Calculator, Building2, ChevronDown, ShoppingCart, ListChecks, Pencil, Trash2, Lock,
} from "lucide-react";

import { useExpenses } from "@/lib/useExpenses";
import { useCategories } from "@/lib/useCategories";
import { useFilterSort } from "@/lib/useFilterSort";
import { useBudgets } from "@/lib/useBudgets";
import { useRecurring, generateDueExpenses } from "@/lib/useRecurring";
import { useIncome } from "@/lib/useIncome";
import { useAccounts } from "@/lib/useAccounts";
import { useOpeningBalances } from "@/lib/useOpeningBalances";
import { useVendors } from "@/lib/useVendors";
import { useBills } from "@/lib/useBills";
import { useInventory } from "@/lib/useInventory";
import { useAR } from "@/lib/useAR";
import { useCompanies } from "@/lib/useCompanies";
import { useChecks } from "@/lib/useChecks";
import { usePurchaseOrders } from "@/lib/usePurchaseOrders";
import type { Budget, RecurringExpense, IncomeSource } from "@/lib/types";

import { AppHeader } from "@/components/AppHeader";
import { AddExpenseModal } from "@/components/AddExpenseModal";
import { ManageCategoriesModal } from "@/components/ManageCategoriesModal";
import { ImportExportMenu } from "@/components/ImportExportMenu";
import { FilterBar } from "@/components/FilterBar";
import { ListView } from "@/components/ListView";
import { CategoryGroupView } from "@/components/CategoryGroupView";
import { MonthlyGroupView } from "@/components/MonthlyGroupView";
import { TrendsView } from "@/components/TrendsView";
import { SummaryCards } from "@/components/SummaryCards";
import { BudgetsTab } from "@/components/BudgetsTab";
import { RecurringTab } from "@/components/RecurringTab";
import { IncomeTab } from "@/components/IncomeTab";
import { LedgerTab } from "@/components/LedgerTab";
import { PnLTab } from "@/components/PnLTab";
import { BalanceSheetTab } from "@/components/BalanceSheetTab";
import { TrialBalanceTab } from "@/components/TrialBalanceTab";
import { APTab } from "@/components/APTab";
import { InventoryTab } from "@/components/InventoryTab";
import { ARTab } from "@/components/ARTab";
import { CashFlowTab } from "@/components/CashFlowTab";
import { FinCalcTab } from "@/components/FinCalcTab";
import { POTab } from "@/components/POTab";
import { CheckRecTab } from "@/components/CheckRecTab";
import { LoginGate } from "@/components/LoginGate";
import { useAuth } from "@/lib/useAuth";

import type { Expense, ChipColor } from "@/lib/types";
import { useLanguage, useToast, useCurrency } from "@/app/providers";

// ── Types ─────────────────────────────────────────────────────────────────────

type PersonalTab      = "expenses" | "budgets" | "recurring" | "income" | "finCalc";
type AccountingModule = "ledger" | "pnl" | "balanceSheet" | "trialBalance" | "cashFlow" | "ap" | "inventory" | "ar" | "po" | "checkRec";
type ActiveTab        = PersonalTab | "accounting";

// ── Component ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { fmt } = useCurrency();

  const { isAuthenticated, hasCredentials, loaded: authLoaded, login, setup, logout } = useAuth();

  // ── Navigation state ─────────────────────────────────────────────────────────
  const [activeTab,    setActiveTab]    = useState<ActiveTab>("expenses");
  const [acctModule,   setAcctModule]   = useState<AccountingModule>("ledger");

  function openAcct(mod: AccountingModule) {
    setAcctModule(mod);
    setActiveTab("accounting");
  }

  // ── Data hooks ──────────────────────────────────────────────────────────────
  const {
    expenses, addExpense, deleteExpense, restoreExpense, updateExpense,
    importExpenses, renameCategory: renameExpenseCategory, loaded: expensesLoaded,
  } = useExpenses();

  const { categories, addCategory, updateCategory, deleteCategory } = useCategories();

  const {
    filter, setFilter, sortField, sortDir, toggleSort,
    viewMode, setViewMode, filtered, resetFilters, activeFilterCount,
  } = useFilterSort(expenses);

  const { budgets, addBudget, updateBudget, deleteBudget, restoreBudget, renameCategory: renameBudgetCategory } = useBudgets();

  const {
    recurring, loaded: recurringLoaded,
    addRecurring, updateRecurring, deleteRecurring, restoreRecurring, markGenerated,
    renameCategory: renameRecurringCategory,
  } = useRecurring();

  const { sources, monthlyIncome, addSource, updateSource, deleteSource, restoreSource } = useIncome();

  const {
    companies, activeId, activeCompany, loaded: companiesLoaded,
    addCompany, updateCompany, deleteCompany, setActiveCompany,
  } = useCompanies();

  const { accounts, addAccount, updateAccount, deleteAccount, replaceCustomAccounts } = useAccounts(activeId);
  const { balances: openingBalances, setBalance: setOpeningBalance, setAllBalances } = useOpeningBalances(activeId);
  const { vendors, addVendor, updateVendor, deleteVendor } = useVendors(activeId);
  const { bills, billPayments, addBill, updateBill, deleteBill, addPayment, paidAmount, outstanding } = useBills(activeId);
  const { items: inventoryItems, movements: inventoryMovements, addItem, updateItem, deleteItem, addMovement, deleteMovement, qtyOnHand, inventoryValue, totalInventoryValue } = useInventory(activeId);
  const { customers, invoices, payments: invoicePayments, addCustomer, updateCustomer, deleteCustomer, addInvoice, updateInvoice, deleteInvoice, addPayment: addInvoicePayment, collectedAmount, outstanding: invoiceOutstanding } = useAR(activeId);
  const { checks, addChecks, updateCheck } = useChecks(activeId);
  const { orders: purchaseOrders, addOrder, updateOrder, deleteOrder, poTotal } = usePurchaseOrders(activeId);

  // ── Company modal state ───────────────────────────────────────────────────────
  const companyModal = useDisclosure();
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [cName,     setCName]     = useState("");
  const [cAddr,     setCAddr]     = useState("");
  const [cEmail,    setCEmail]    = useState("");
  const [cPhone,    setCPhone]    = useState("");
  const [cWebsite,  setCWebsite]  = useState("");
  const [cTaxId,    setCTaxId]    = useState("");
  const [cMaxCheck, setCMaxCheck] = useState("");

  function openAddCompany() {
    setEditingCompanyId(null);
    setCName(""); setCAddr(""); setCEmail(""); setCPhone(""); setCWebsite(""); setCTaxId(""); setCMaxCheck("");
    companyModal.onOpen();
  }

  function openEditCompany(id: string) {
    const c = companies.find((x) => x.id === id);
    if (!c) return;
    setEditingCompanyId(id);
    setCName(c.name); setCAddr(c.address ?? ""); setCEmail(c.email ?? "");
    setCPhone(c.phone ?? ""); setCWebsite(c.website ?? ""); setCTaxId(c.taxId ?? "");
    setCMaxCheck(c.maxCheckAmount != null ? String(c.maxCheckAmount) : "");
    companyModal.onOpen();
  }

  function handleCompanySubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = {
      name: cName.trim(),
      address: cAddr.trim() || undefined,
      email: cEmail.trim() || undefined,
      phone: cPhone.trim() || undefined,
      website: cWebsite.trim() || undefined,
      taxId: cTaxId.trim() || undefined,
      maxCheckAmount: cMaxCheck ? parseFloat(cMaxCheck) : undefined,
    };
    if (editingCompanyId) {
      updateCompany(editingCompanyId, data);
    } else {
      const newId = addCompany(data);
      setActiveCompany(newId);
    }
    companyModal.onClose();
  }

  function handleDeleteCompany(id: string) {
    if (companies.length <= 1) return;
    deleteCompany(id);
  }

  // ── Edit expense state ───────────────────────────────────────────────────────
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // ── Modals ───────────────────────────────────────────────────────────────────
  const addExpenseModal  = useDisclosure();
  const addCategoryModal = useDisclosure();

  // ── Keyboard shortcut: N → open add expense modal ──────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.target as HTMLElement).isContentEditable) return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setEditingExpense(null);
        addExpenseModal.onOpen();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [addExpenseModal]);

  // ── Auto-generate recurring expenses ─────────────────────────────────────────
  const processedRuleIds = useRef(new Set<string>());
  useEffect(() => {
    if (!expensesLoaded || !recurringLoaded) return;
    const today = new Date().toISOString().split("T")[0];
    for (const rule of recurring) {
      if (processedRuleIds.current.has(rule.id)) continue;
      processedRuleIds.current.add(rule.id);
      const due = generateDueExpenses(rule, today);
      if (due.length > 0) {
        importExpenses(due, false);
        markGenerated(rule.id, due[due.length - 1].date);
      }
    }
  }, [recurring, expensesLoaded, recurringLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ─────────────────────────────────────────────────────────────────
  function handleUpdateCategory(oldName: string, newName: string, color: ChipColor) {
    updateCategory(oldName, newName, color);
    if (oldName !== newName) {
      renameExpenseCategory(oldName, newName);
      renameBudgetCategory(oldName, newName);
      renameRecurringCategory(oldName, newName);
    }
  }

  function handleEdit(expense: Expense) {
    setEditingExpense(expense);
    addExpenseModal.onOpen();
  }

  function handleExpenseModalClose() {
    setEditingExpense(null);
    addExpenseModal.onClose();
  }

  function handleDeleteExpense(id: string) {
    const expense = expenses.find((e) => e.id === id);
    deleteExpense(id);
    if (expense) showToast(t("toast.expenseDeleted"), () => restoreExpense(expense));
  }

  function handleDeleteBudget(id: string) {
    const budget = budgets.find((b) => b.id === id);
    deleteBudget(id);
    if (budget) showToast(t("toast.budgetDeleted"), () => restoreBudget(budget as Budget));
  }

  function handleDeleteRecurring(id: string) {
    const rule = recurring.find((r) => r.id === id);
    deleteRecurring(id);
    if (rule) showToast(t("toast.recurringDeleted"), () => restoreRecurring(rule as RecurringExpense));
  }

  function handleDeleteIncome(id: string) {
    const source = sources.find((s) => s.id === id);
    deleteSource(id);
    if (source) showToast(t("toast.incomeDeleted"), () => restoreSource(source as IncomeSource));
  }

  const thisMonthIncome = monthlyIncome();

  // ── Tab styling ───────────────────────────────────────────────────────────────
  const tabCls = (active: boolean) =>
    [
      "flex items-center gap-1.5 h-11 px-0 border-b-2 -mb-px text-sm font-medium shrink-0",
      "transition-colors bg-transparent cursor-pointer outline-none whitespace-nowrap",
      active
        ? "text-indigo-600 border-indigo-600"
        : "text-default-500 border-transparent hover:text-default-800",
    ].join(" ");

  // ── Accounting modules definition ─────────────────────────────────────────────
  const REPORTS: { key: AccountingModule; label: string; icon: React.ElementType }[] = [
    { key: "ledger",       label: t("tabs.ledger"),       icon: BookOpen      },
    { key: "pnl",          label: t("tabs.pnl"),          icon: BarChart2     },
    { key: "balanceSheet", label: t("tabs.balanceSheet"), icon: Scale         },
    { key: "trialBalance", label: t("tabs.trialBalance"), icon: ClipboardList },
    { key: "cashFlow",     label: t("tabs.cashFlow"),     icon: Banknote      },
  ];

  const MODULES: { key: AccountingModule; label: string; icon: React.ElementType }[] = [
    { key: "ap",        label: t("tabs.ap"),        icon: Wallet          },
    { key: "inventory", label: t("tabs.inventory"), icon: Package         },
    { key: "ar",        label: t("tabs.ar"),        icon: BadgeDollarSign },
    { key: "po",        label: t("tabs.po"),        icon: ShoppingCart    },
    { key: "checkRec",  label: t("tabs.checkRec"),  icon: ListChecks      },
  ];

  const ALL_ACCT = [...REPORTS, ...MODULES];

  const isAccounting = activeTab === "accounting";

  // ── Sub-nav pill style ────────────────────────────────────────────────────────
  const pillCls = (active: boolean) =>
    [
      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer whitespace-nowrap",
      active ? "bg-indigo-600 text-white" : "bg-default-100 text-default-600 hover:bg-default-200",
    ].join(" ");

  if (!authLoaded) return null;

  if (!isAuthenticated) {
    return (
      <LoginGate
        hasCredentials={!!hasCredentials}
        onLogin={login}
        onSetup={setup}
      />
    );
  }

  return (
    <div className="min-h-screen">
      <AppHeader
        onAddExpense={addExpenseModal.onOpen}
        onAddCategory={addCategoryModal.onOpen}
        importExportSlot={
          <ImportExportMenu
            expenses={expenses}
            categories={categories}
            accounts={accounts}
            openingBalances={openingBalances}
            onImport={importExpenses}
            onImportAccounts={replaceCustomAccounts}
            onImportOpeningBalances={setAllBalances}
          />
        }
        lockSlot={
          <Button
            isIconOnly
            size="sm"
            variant="light"
            className="text-white hover:bg-white/10"
            onPress={logout}
            title={t("auth.logout")}
            aria-label={t("auth.logout")}
          >
            <Lock size={15} />
          </Button>
        }
      />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Summary */}
        <SummaryCards
          expenses={filtered}
          allExpenses={expenses}
          categories={categories}
          monthlyIncome={thisMonthIncome}
        />

        {/* ── Tab bar ── */}
        <div className="border-b border-default-200 overflow-x-auto scrollbar-hide">
          <div className="flex gap-5 flex-nowrap items-end pb-0">

            {/* Personal tabs */}
            <button className={tabCls(activeTab === "expenses")} onClick={() => setActiveTab("expenses")}>
              <Receipt size={15} />{t("tabs.expenses")}
            </button>
            <button className={tabCls(activeTab === "budgets")} onClick={() => setActiveTab("budgets")}>
              <PiggyBank size={15} />{t("tabs.budgets")}
            </button>
            <button className={tabCls(activeTab === "recurring")} onClick={() => setActiveTab("recurring")}>
              <RefreshCw size={15} />{t("tabs.recurring")}
            </button>
            <button className={tabCls(activeTab === "income")} onClick={() => setActiveTab("income")}>
              <TrendingUp size={15} />{t("tabs.income")}
            </button>
            <button className={tabCls(activeTab === "finCalc")} onClick={() => setActiveTab("finCalc")}>
              <Calculator size={15} />{t("tabs.finCalc")}
            </button>

            {/* Accounting dropdown */}
            <Dropdown>
              <DropdownTrigger>
                <Button
                  variant="light"
                  disableRipple
                  className={[
                    "h-11 px-0 rounded-none border-b-2 -mb-px min-w-0 gap-1.5 text-sm font-medium",
                    "data-[hover=true]:bg-transparent",
                    isAccounting
                      ? "text-indigo-600 border-indigo-600"
                      : "text-default-500 border-transparent data-[hover=true]:text-default-800",
                  ].join(" ")}
                >
                  <Building2 size={15} />
                  {t("tabs.accounting")}
                  <ChevronDown size={12} />
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label="Accounting modules"
                selectionMode="single"
                selectedKeys={isAccounting ? new Set([acctModule]) : new Set()}
                onAction={(key) => openAcct(key as AccountingModule)}
              >
                <DropdownSection title="Reports" showDivider>
                  {REPORTS.map(({ key, label, icon: Icon }) => (
                    <DropdownItem key={key} startContent={<Icon size={14} />}>{label}</DropdownItem>
                  ))}
                </DropdownSection>
                <DropdownSection title="Modules">
                  {MODULES.map(({ key, label, icon: Icon }) => (
                    <DropdownItem key={key} startContent={<Icon size={14} />}>{label}</DropdownItem>
                  ))}
                </DropdownSection>
              </DropdownMenu>
            </Dropdown>

          </div>
        </div>

        {/* ── Content ── */}

        {/* Expenses */}
        {activeTab === "expenses" && (
          <div className="space-y-4 pt-4">
            <Card shadow="sm">
              <CardBody className="p-4">
                <FilterBar
                  filter={filter} setFilter={setFilter}
                  sortField={sortField} sortDir={sortDir} toggleSort={toggleSort}
                  viewMode={viewMode} setViewMode={setViewMode}
                  categories={categories}
                  activeFilterCount={activeFilterCount}
                  onReset={resetFilters}
                />
              </CardBody>
            </Card>

            <Card shadow="sm">
              <CardHeader className="px-6 pt-5 pb-0 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-default-800">
                  {filtered.length !== 1
                    ? t("expenseList.countPlural", { count: filtered.length })
                    : t("expenseList.count", { count: filtered.length })}
                  {activeFilterCount > 0 && (
                    <span className="text-default-400 font-normal text-sm ml-2">
                      {t("expenseList.ofTotal", { total: expenses.length })}
                    </span>
                  )}
                </h2>
                <span className="font-bold text-default-900">
                  {fmt(filtered.reduce((s, e) => s + e.amount, 0))}
                </span>
              </CardHeader>
              <Divider className="mt-4" />
              <CardBody className={viewMode === "list" ? "px-2 py-0" : "p-4"}>
                {viewMode === "list" && (
                  <ListView
                    expenses={filtered} categories={categories}
                    onDelete={handleDeleteExpense} onEdit={handleEdit}
                    loaded={expensesLoaded}
                    sortField={sortField} sortDir={sortDir} toggleSort={toggleSort}
                  />
                )}
                {viewMode === "category" && (
                  <CategoryGroupView
                    expenses={filtered} categories={categories}
                    onDelete={handleDeleteExpense} onEdit={handleEdit}
                  />
                )}
                {viewMode === "monthly" && (
                  <MonthlyGroupView
                    expenses={filtered} categories={categories}
                    onDelete={handleDeleteExpense} onEdit={handleEdit}
                  />
                )}
                {viewMode === "trends" && (
                  <TrendsView expenses={filtered} categories={categories} />
                )}
              </CardBody>
            </Card>
          </div>
        )}

        {/* Budgets */}
        {activeTab === "budgets" && (
          <div className="pt-4">
            <BudgetsTab
              budgets={budgets} categories={categories} expenses={expenses}
              onAdd={addBudget} onUpdate={updateBudget} onDelete={handleDeleteBudget}
            />
          </div>
        )}

        {/* Recurring */}
        {activeTab === "recurring" && (
          <div className="pt-4">
            <RecurringTab
              recurring={recurring} categories={categories}
              onAdd={addRecurring} onUpdate={updateRecurring} onDelete={handleDeleteRecurring}
            />
          </div>
        )}

        {/* Income */}
        {activeTab === "income" && (
          <div className="pt-4">
            <IncomeTab
              sources={sources} monthlyIncome={monthlyIncome}
              onAdd={addSource} onUpdate={updateSource} onDelete={handleDeleteIncome}
            />
          </div>
        )}

        {/* Finance Calculator */}
        {activeTab === "finCalc" && (
          <div className="pt-4">
            <FinCalcTab />
          </div>
        )}

        {/* ── Accounting area ── */}
        {activeTab === "accounting" && (
          <div className="space-y-4">
            {/* Company switcher */}
            {companiesLoaded && (
              <div className="flex items-center gap-2 pt-3">
                <Dropdown>
                  <DropdownTrigger>
                    <Button
                      variant="flat" size="sm"
                      startContent={<Building2 size={13} />}
                      endContent={<ChevronDown size={11} />}
                      className="h-8 text-xs font-medium"
                    >
                      {activeCompany?.name ?? "—"}
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu aria-label={t("companies.label")} onAction={(key) => {
                    if (key === "__add__") { openAddCompany(); return; }
                    setActiveCompany(String(key));
                  }}>
                    {[
                      ...companies.map((c) => (
                        <DropdownItem key={c.id} className={c.id === activeId ? "text-indigo-600" : ""}>{c.name}</DropdownItem>
                      )),
                      <DropdownItem key="__add__" startContent={<Building2 size={13} />}>{t("companies.add")}</DropdownItem>,
                    ]}
                  </DropdownMenu>
                </Dropdown>
                <Button size="sm" variant="light" isIconOnly className="h-8 w-8" onPress={() => openEditCompany(activeId)}>
                  <Pencil size={13} />
                </Button>
                {companies.length > 1 && (
                  <Button size="sm" variant="light" isIconOnly className="h-8 w-8 text-danger-400" onPress={() => handleDeleteCompany(activeId)}>
                    <Trash2 size={13} />
                  </Button>
                )}
              </div>
            )}

            {/* Sub-nav */}
            <div className="space-y-2">
              <div className="flex gap-2 flex-wrap">
                {REPORTS.map(({ key, label, icon: Icon }) => (
                  <button key={key} className={pillCls(acctModule === key)} onClick={() => setAcctModule(key)}>
                    <Icon size={13} />{label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 flex-wrap">
                {MODULES.map(({ key, label, icon: Icon }) => (
                  <button key={key} className={pillCls(acctModule === key)} onClick={() => setAcctModule(key)}>
                    <Icon size={13} />{label}
                  </button>
                ))}
              </div>
            </div>

            {/* Module content */}
            {acctModule === "ledger" && (
              <LedgerTab
                expenses={expenses} sources={sources} accounts={accounts}
                bills={bills} billPayments={billPayments}
                inventoryItems={inventoryItems} inventoryMovements={inventoryMovements}
                invoices={invoices} invoicePayments={invoicePayments}
                onAddAccount={addAccount} onUpdateAccount={updateAccount} onDeleteAccount={deleteAccount}
              />
            )}

            {acctModule === "pnl" && (
              <PnLTab
                expenses={expenses} sources={sources} accounts={accounts}
                bills={bills} billPayments={billPayments}
                inventoryItems={inventoryItems} inventoryMovements={inventoryMovements}
                invoices={invoices} invoicePayments={invoicePayments}
              />
            )}

            {acctModule === "balanceSheet" && (
              <BalanceSheetTab
                expenses={expenses} sources={sources} accounts={accounts}
                bills={bills} billPayments={billPayments}
                inventoryItems={inventoryItems} inventoryMovements={inventoryMovements}
                invoices={invoices} invoicePayments={invoicePayments}
                openingBalances={openingBalances}
                onSetBalance={setOpeningBalance}
              />
            )}

            {acctModule === "trialBalance" && (
              <TrialBalanceTab
                expenses={expenses} sources={sources} accounts={accounts}
                bills={bills} billPayments={billPayments}
                inventoryItems={inventoryItems} inventoryMovements={inventoryMovements}
                invoices={invoices} invoicePayments={invoicePayments}
              />
            )}

            {acctModule === "cashFlow" && (
              <CashFlowTab
                expenses={expenses} sources={sources} accounts={accounts}
                openingBalances={openingBalances}
                bills={bills} billPayments={billPayments}
                inventoryItems={inventoryItems} inventoryMovements={inventoryMovements}
                invoices={invoices} invoicePayments={invoicePayments}
              />
            )}

            {acctModule === "ap" && (
              <APTab
                vendors={vendors} bills={bills} billPayments={billPayments}
                accounts={accounts} company={activeCompany}
                maxCheckAmount={activeCompany?.maxCheckAmount}
                onAddVendor={addVendor} onUpdateVendor={updateVendor} onDeleteVendor={deleteVendor}
                onAddBill={addBill} onUpdateBill={updateBill} onDeleteBill={deleteBill}
                onAddPayment={addPayment} onAddChecks={addChecks}
                paidAmount={paidAmount} outstanding={outstanding}
              />
            )}

            {acctModule === "inventory" && (
              <InventoryTab
                accounts={accounts}
                items={inventoryItems} movements={inventoryMovements}
                invoices={invoices}
                qtyOnHand={qtyOnHand} inventoryValue={inventoryValue}
                totalInventoryValue={totalInventoryValue}
                onAddItem={addItem} onUpdateItem={updateItem} onDeleteItem={deleteItem}
                onAddMovement={addMovement} onDeleteMovement={deleteMovement}
              />
            )}

            {acctModule === "ar" && (
              <ARTab
                customers={customers} invoices={invoices} invoicePayments={invoicePayments}
                accounts={accounts} inventoryItems={inventoryItems} company={activeCompany}
                onUpdateCompany={(data) => updateCompany(activeId, data)}
                onAddCustomer={addCustomer} onUpdateCustomer={updateCustomer} onDeleteCustomer={deleteCustomer}
                onAddInvoice={addInvoice} onUpdateInvoice={updateInvoice} onDeleteInvoice={deleteInvoice}
                onAddPayment={addInvoicePayment}
                collectedAmount={collectedAmount} outstanding={invoiceOutstanding}
              />
            )}

            {acctModule === "po" && (
              <POTab
                vendors={vendors}
                inventoryItems={inventoryItems}
                accounts={accounts}
                orders={purchaseOrders}
                maxCheckAmount={activeCompany?.maxCheckAmount}
                onAddOrder={addOrder}
                onUpdateOrder={updateOrder}
                onDeleteOrder={deleteOrder}
                poTotal={poTotal}
                onAddMovement={addMovement}
                onAddBill={addBill}
              />
            )}

            {acctModule === "checkRec" && (
              <CheckRecTab checks={checks} onUpdateCheck={updateCheck} />
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      <AddExpenseModal
        isOpen={addExpenseModal.isOpen}
        onClose={handleExpenseModalClose}
        onAdd={addExpense}
        onUpdate={updateExpense}
        editingExpense={editingExpense}
        categories={categories}
      />
      <ManageCategoriesModal
        isOpen={addCategoryModal.isOpen}
        onClose={addCategoryModal.onClose}
        categories={categories}
        onAdd={addCategory}
        onUpdate={handleUpdateCategory}
        onDelete={deleteCategory}
      />

      {/* Company add/edit modal */}
      <Modal isOpen={companyModal.isOpen} onClose={companyModal.onClose} placement="center">
        <ModalContent>
          <form onSubmit={handleCompanySubmit}>
            <ModalHeader>
              {editingCompanyId ? t("companies.edit") : t("companies.add")}
            </ModalHeader>
            <ModalBody className="gap-3">
              <Input
                label={t("ar.businessName")}
                value={cName}
                onValueChange={setCName}
                isRequired
                autoFocus
              />
              <textarea
                className="w-full rounded-xl border border-default-200 bg-default-100 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
                rows={2}
                placeholder={t("ar.businessAddress")}
                value={cAddr}
                onChange={(e) => setCAddr(e.target.value)}
              />
              <Input label={t("ar.businessEmail")}   value={cEmail}   onValueChange={setCEmail}   />
              <Input label={t("ar.businessPhone")}   value={cPhone}   onValueChange={setCPhone}   />
              <Input label={t("ar.businessWebsite")} value={cWebsite} onValueChange={setCWebsite} />
              <Input label={t("ar.businessTaxId")}   value={cTaxId}   onValueChange={setCTaxId}   />
              <Input
                type="number" min="0" step="0.01"
                label={t("companies.maxCheckAmount")}
                description={t("companies.maxCheckAmountHint")}
                value={cMaxCheck}
                onValueChange={setCMaxCheck}
              />
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={companyModal.onClose}>{t("cancel")}</Button>
              <Button color="primary" type="submit">{t("save")}</Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </div>
  );
}
