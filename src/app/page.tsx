"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import {
  useDisclosure,
  Card, CardBody, CardHeader, Divider,
  Tabs, Tab,
} from "@nextui-org/react";
import { Receipt, PiggyBank, RefreshCw, TrendingUp } from "lucide-react";

import { useExpenses } from "@/lib/useExpenses";
import { useCategories } from "@/lib/useCategories";
import { useFilterSort } from "@/lib/useFilterSort";
import { useBudgets } from "@/lib/useBudgets";
import { useRecurring, generateDueExpenses } from "@/lib/useRecurring";
import { useIncome } from "@/lib/useIncome";

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

import type { Expense, ChipColor } from "@/lib/types";

export default function HomePage() {
  // ── Data hooks ──────────────────────────────────────────────────────────────
  const {
    expenses, addExpense, deleteExpense, updateExpense,
    importExpenses, renameCategory: renameExpenseCategory, loaded: expensesLoaded,
  } = useExpenses();

  const { categories, addCategory, updateCategory, deleteCategory } = useCategories();

  const {
    filter, setFilter, sortField, sortDir, toggleSort,
    viewMode, setViewMode, filtered, resetFilters, activeFilterCount,
  } = useFilterSort(expenses);

  const { budgets, addBudget, updateBudget, deleteBudget, renameCategory: renameBudgetCategory } = useBudgets();

  const {
    recurring, loaded: recurringLoaded,
    addRecurring, updateRecurring, deleteRecurring, markGenerated,
    renameCategory: renameRecurringCategory,
  } = useRecurring();

  const { sources, monthlyIncome, addSource, updateSource, deleteSource } = useIncome();

  // ── Edit expense state ───────────────────────────────────────────────────────
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // ── Modals ───────────────────────────────────────────────────────────────────
  const addExpenseModal = useDisclosure();
  const addCategoryModal = useDisclosure();

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
          <ImportExportMenu expenses={expenses} onImport={importExpenses} />
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
          <Tab key="expenses" title={tabTitle("Expenses", Receipt)}>
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
                    {filtered.length} Expense{filtered.length !== 1 ? "s" : ""}
                    {activeFilterCount > 0 && (
                      <span className="text-default-400 font-normal text-sm ml-2">
                        (of {expenses.length})
                      </span>
                    )}
                  </h2>
                  <span className="font-bold text-default-900">
                    ${filtered.reduce((s, e) => s + e.amount, 0).toFixed(2)}
                  </span>
                </CardHeader>
                <Divider className="mt-4" />
                <CardBody className={viewMode === "list" ? "px-2 py-0" : "p-4"}>
                  {viewMode === "list" && (
                    <ListView
                      expenses={filtered} categories={categories}
                      onDelete={deleteExpense} onEdit={handleEdit}
                      loaded={expensesLoaded}
                      sortField={sortField} sortDir={sortDir} toggleSort={toggleSort}
                    />
                  )}
                  {viewMode === "category" && (
                    <CategoryGroupView
                      expenses={filtered} categories={categories}
                      onDelete={deleteExpense} onEdit={handleEdit}
                    />
                  )}
                  {viewMode === "monthly" && (
                    <MonthlyGroupView
                      expenses={filtered} categories={categories}
                      onDelete={deleteExpense} onEdit={handleEdit}
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
          <Tab key="budgets" title={tabTitle("Budgets", PiggyBank)}>
            <div className="pt-4">
              <BudgetsTab
                budgets={budgets} categories={categories} expenses={expenses}
                onAdd={addBudget} onUpdate={updateBudget} onDelete={deleteBudget}
              />
            </div>
          </Tab>

          {/* ── Recurring ── */}
          <Tab key="recurring" title={tabTitle("Recurring", RefreshCw)}>
            <div className="pt-4">
              <RecurringTab
                recurring={recurring} categories={categories}
                onAdd={addRecurring} onUpdate={updateRecurring} onDelete={deleteRecurring}
              />
            </div>
          </Tab>

          {/* ── Income ── */}
          <Tab key="income" title={tabTitle("Income", TrendingUp)}>
            <div className="pt-4">
              <IncomeTab
                sources={sources} monthlyIncome={monthlyIncome}
                onAdd={addSource} onUpdate={updateSource} onDelete={deleteSource}
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
