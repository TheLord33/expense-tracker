"use client";

import { useDisclosure, Card, CardBody, CardHeader, Divider } from "@nextui-org/react";
import { useExpenses } from "@/lib/useExpenses";
import { useCategories } from "@/lib/useCategories";
import { useFilterSort } from "@/lib/useFilterSort";
import { AppHeader } from "@/components/AppHeader";
import { AddExpenseModal } from "@/components/AddExpenseModal";
import { AddCategoryModal } from "@/components/AddCategoryModal";
import { ImportExportMenu } from "@/components/ImportExportMenu";
import { FilterBar } from "@/components/FilterBar";
import { ListView } from "@/components/ListView";
import { CategoryGroupView } from "@/components/CategoryGroupView";
import { MonthlyGroupView } from "@/components/MonthlyGroupView";
import { TrendsView } from "@/components/TrendsView";
import { SummaryCards } from "@/components/SummaryCards";

export default function HomePage() {
  const { expenses, addExpense, deleteExpense, importExpenses, loaded } = useExpenses();
  const { categories, addCategory } = useCategories();
  const {
    filter,
    setFilter,
    sortField,
    sortDir,
    toggleSort,
    viewMode,
    setViewMode,
    filtered,
    resetFilters,
    activeFilterCount,
  } = useFilterSort(expenses);

  const addExpenseModal = useDisclosure();
  const addCategoryModal = useDisclosure();

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
      {/* Summary cards — show filtered total, but all-time context */}
      <SummaryCards
        expenses={filtered}
        allExpenses={expenses}
        categories={categories}
      />

      {/* Filter / sort / view bar */}
      <Card shadow="sm">
        <CardBody className="p-4">
          <FilterBar
            filter={filter}
            setFilter={setFilter}
            sortField={sortField}
            sortDir={sortDir}
            toggleSort={toggleSort}
            viewMode={viewMode}
            setViewMode={setViewMode}
            categories={categories}
            activeFilterCount={activeFilterCount}
            onReset={resetFilters}
          />
        </CardBody>
      </Card>

      {/* Expense view */}
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
              expenses={filtered}
              categories={categories}
              onDelete={deleteExpense}
              loaded={loaded}
              sortField={sortField}
              sortDir={sortDir}
              toggleSort={toggleSort}
            />
          )}
          {viewMode === "category" && (
            <CategoryGroupView
              expenses={filtered}
              categories={categories}
              onDelete={deleteExpense}
            />
          )}
          {viewMode === "monthly" && (
            <MonthlyGroupView
              expenses={filtered}
              categories={categories}
              onDelete={deleteExpense}
            />
          )}
          {viewMode === "trends" && (
            <TrendsView expenses={filtered} categories={categories} />
          )}
        </CardBody>
      </Card>

      <AddExpenseModal
        isOpen={addExpenseModal.isOpen}
        onClose={addExpenseModal.onClose}
        onAdd={addExpense}
        categories={categories}
      />
      <AddCategoryModal
        isOpen={addCategoryModal.isOpen}
        onClose={addCategoryModal.onClose}
        onAdd={addCategory}
        existingNames={categories.map((c) => c.name)}
      />
    </main>
    </div>
  );
}
