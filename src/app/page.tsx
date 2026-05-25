"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import {
  useDisclosure,
  Card, CardBody, CardHeader, Divider,
  Tabs, Tab,
} from "@nextui-org/react";
import { Receipt, PiggyBank, RefreshCw, TrendingUp, BookOpen, BarChart2, Scale, ClipboardList, Wallet } from "lucide-react";

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

import type { Expense, ChipColor } from "@/lib/types";
import { useLanguage, useToast, useCurrency } from "@/app/providers";

export default function HomePage() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { fmt } = useCurrency();

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

  const { accounts, addAccount, updateAccount, deleteAccount, replaceCustomAccounts } = useAccounts();
  const { balances: openingBalances, setBalance: setOpeningBalance, setAllBalances } = useOpeningBalances();
  const { vendors, addVendor, updateVendor, deleteVendor } = useVendors();
  const { bills, billPayments, addBill, updateBill, deleteBill, addPayment, paidAmount, outstanding } = useBills();

  // ── Edit expense state ───────────────────────────────────────────────────────
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // ── Modals ───────────────────────────────────────────────────────────────────
  const addExpenseModal = useDisclosure();
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

  // ── Auto-generate recurring expenses (once per session after data loads) ─────
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

  // ── Tab title helper ─────────────────────────────────────────────────────────
  function tabTitle(label: string, Icon: React.ElementType) {
    return (
      <div className="flex items-center gap-2">
        <Icon size={15} />
        <span>{label}</span>
      </div>
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
      />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Summary */}
        <SummaryCards
          expenses={filtered}
          allExpenses={expenses}
          categories={categories}
          monthlyIncome={thisMonthIncome}
        />

        {/* Tabs */}
        <Tabs
          aria-label="Navigation"
          color="primary"
          variant="underlined"
          classNames={{
            tabList: "gap-6 w-full border-b border-default-200 pb-0 bg-transparent",
            cursor: "w-full bg-indigo-600",
            tab: "max-w-fit px-0 h-11",
            tabContent: "group-data-[selected=true]:text-indigo-600 font-medium",
          }}
        >
          {/* ── Expenses ── */}
          <Tab key="expenses" title={tabTitle(t("tabs.expenses"), Receipt)}>
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
          </Tab>

          {/* ── Budgets ── */}
          <Tab key="budgets" title={tabTitle(t("tabs.budgets"), PiggyBank)}>
            <div className="pt-4">
              <BudgetsTab
                budgets={budgets} categories={categories} expenses={expenses}
                onAdd={addBudget} onUpdate={updateBudget} onDelete={handleDeleteBudget}
              />
            </div>
          </Tab>

          {/* ── Recurring ── */}
          <Tab key="recurring" title={tabTitle(t("tabs.recurring"), RefreshCw)}>
            <div className="pt-4">
              <RecurringTab
                recurring={recurring} categories={categories}
                onAdd={addRecurring} onUpdate={updateRecurring} onDelete={handleDeleteRecurring}
              />
            </div>
          </Tab>

          {/* ── Income ── */}
          <Tab key="income" title={tabTitle(t("tabs.income"), TrendingUp)}>
            <div className="pt-4">
              <IncomeTab
                sources={sources} monthlyIncome={monthlyIncome}
                onAdd={addSource} onUpdate={updateSource} onDelete={handleDeleteIncome}
              />
            </div>
          </Tab>

          {/* ── Ledger ── */}
          <Tab key="ledger" title={tabTitle(t("tabs.ledger"), BookOpen)}>
            <div className="pt-4">
              <LedgerTab
                expenses={expenses}
                sources={sources}
                accounts={accounts}
                bills={bills}
                billPayments={billPayments}
                onAddAccount={addAccount}
                onUpdateAccount={updateAccount}
                onDeleteAccount={deleteAccount}
              />
            </div>
          </Tab>

          {/* ── P&L ── */}
          <Tab key="pnl" title={tabTitle(t("tabs.pnl"), BarChart2)}>
            <div className="pt-4">
              <PnLTab expenses={expenses} sources={sources} accounts={accounts} bills={bills} billPayments={billPayments} />
            </div>
          </Tab>

          {/* ── Balance Sheet ── */}
          <Tab key="balanceSheet" title={tabTitle(t("tabs.balanceSheet"), Scale)}>
            <div className="pt-4">
              <BalanceSheetTab
                expenses={expenses}
                sources={sources}
                accounts={accounts}
                bills={bills}
                billPayments={billPayments}
                openingBalances={openingBalances}
                onSetBalance={setOpeningBalance}
              />
            </div>
          </Tab>

          {/* ── Trial Balance ── */}
          <Tab key="trialBalance" title={tabTitle(t("tabs.trialBalance"), ClipboardList)}>
            <div className="pt-4">
              <TrialBalanceTab
                expenses={expenses}
                sources={sources}
                accounts={accounts}
                bills={bills}
                billPayments={billPayments}
              />
            </div>
          </Tab>

          {/* ── Accounts Payable ── */}
          <Tab key="ap" title={tabTitle(t("tabs.ap"), Wallet)}>
            <div className="pt-4">
              <APTab
                vendors={vendors}
                bills={bills}
                billPayments={billPayments}
                accounts={accounts}
                onAddVendor={addVendor}
                onUpdateVendor={updateVendor}
                onDeleteVendor={deleteVendor}
                onAddBill={addBill}
                onUpdateBill={updateBill}
                onDeleteBill={deleteBill}
                onAddPayment={addPayment}
                paidAmount={paidAmount}
                outstanding={outstanding}
              />
            </div>
          </Tab>
        </Tabs>
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
    </div>
  );
}
