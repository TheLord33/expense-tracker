"use client";

import { useState, useMemo, type FormEvent } from "react";
import {
  Card, CardBody, CardHeader, Divider,
  Button, Chip, Input, Select, SelectItem,
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  useDisclosure,
} from "@nextui-org/react";
import { Package, ArrowDownToLine, ArrowUpFromLine, SlidersHorizontal, Plus, Pencil, Trash2, AlertTriangle, TrendingUp } from "lucide-react";
import type { Account, InventoryItem, Invoice, MovementType, StockMovement } from "@/lib/types";
import { useLanguage, useCurrency } from "@/app/providers";

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  accounts: Account[];
  items: InventoryItem[];
  movements: StockMovement[];
  invoices?: Invoice[];
  qtyOnHand: (itemId: string) => number;
  inventoryValue: (itemId: string) => number;
  totalInventoryValue: () => number;
  onAddItem: (item: Omit<InventoryItem, "id">) => void;
  onUpdateItem: (id: string, data: Partial<Omit<InventoryItem, "id">>) => void;
  onDeleteItem: (id: string) => void;
  onAddMovement: (movement: Omit<StockMovement, "id">) => void;
  onDeleteMovement: (id: string) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const DEFAULT_INVENTORY_ACCOUNT = "acc-1200";
const DEFAULT_COGS_ACCOUNT      = "acc-5000";
const DEFAULT_CASH_ACCOUNT      = "acc-1000";

// ── Component ─────────────────────────────────────────────────────────────────

export function InventoryTab({
  accounts, items, movements, invoices = [],
  qtyOnHand, inventoryValue, totalInventoryValue,
  onAddItem, onUpdateItem, onDeleteItem,
  onAddMovement, onDeleteMovement,
}: Props) {
  const { t, locale } = useLanguage();
  const { fmt } = useCurrency();

  const [view, setView] = useState<"items" | "movements" | "summary" | "profitability">("items");

  // ── Item modal ───────────────────────────────────────────────────────────────
  const itemModal = useDisclosure();
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [fSku,           setFSku]           = useState("");
  const [fName,          setFName]          = useState("");
  const [fDesc,          setFDesc]          = useState("");
  const [fUnit,          setFUnit]          = useState("");
  const [fCost,          setFCost]          = useState("");
  const [fReorder,       setFReorder]       = useState("");
  const [fInvAcct,       setFInvAcct]       = useState(DEFAULT_INVENTORY_ACCOUNT);
  const [fCogsAcct,      setFCogsAcct]      = useState(DEFAULT_COGS_ACCOUNT);
  const [fItemErr,       setFItemErr]       = useState("");

  // ── Movement modal ───────────────────────────────────────────────────────────
  const movModal = useDisclosure();
  const [movType,        setMovType]        = useState<MovementType>("purchase");
  const [movItemId,      setMovItemId]      = useState("");
  const [movDate,        setMovDate]        = useState(new Date().toISOString().split("T")[0]);
  const [movQty,         setMovQty]         = useState("");
  const [movUnitCost,    setMovUnitCost]    = useState("");
  const [movNote,        setMovNote]        = useState("");
  const [movCounter,     setMovCounter]     = useState(DEFAULT_CASH_ACCOUNT);
  const [movErr,         setMovErr]         = useState("");

  // ── Derived ──────────────────────────────────────────────────────────────────

  const assetAccounts   = useMemo(() => accounts.filter((a) => a.type === "asset"),   [accounts]);
  const expenseAccounts = useMemo(() => accounts.filter((a) => a.type === "expense"), [accounts]);
  const allAccounts     = useMemo(() => accounts, [accounts]);

  const sortedMovements = useMemo(
    () => [...movements].sort((a, b) => b.date.localeCompare(a.date)),
    [movements]
  );

  const lowStockItems = useMemo(
    () => items.filter((item) => qtyOnHand(item.id) < item.reorderPoint),
    [items, qtyOnHand]
  );

  interface ProfitRow {
    item: InventoryItem;
    unitsSold: number;
    revenue: number;
    cogs: number;
    grossProfit: number;
    margin: number | null;
  }

  const profitabilityRows = useMemo((): ProfitRow[] => {
    return items
      .map((item) => {
        let unitsSold = 0;
        let revenue   = 0;
        for (const inv of invoices) {
          for (const line of inv.lines ?? []) {
            if (line.inventoryItemId === item.id) {
              unitsSold += line.quantity;
              revenue   += line.quantity * line.unitPrice;
            }
          }
        }
        const cogs        = unitsSold * item.costPerUnit;
        const grossProfit = revenue - cogs;
        const margin      = revenue > 0 ? (grossProfit / revenue) * 100 : null;
        return { item, unitsSold, revenue, cogs, grossProfit, margin };
      })
      .filter((r) => r.unitsSold > 0)
      .sort((a, b) => b.grossProfit - a.grossProfit);
  }, [items, invoices]);

  // ── Item form ────────────────────────────────────────────────────────────────

  function openAddItem() {
    setEditingItem(null);
    setFSku(""); setFName(""); setFDesc(""); setFUnit("");
    setFCost(""); setFReorder("0");
    setFInvAcct(DEFAULT_INVENTORY_ACCOUNT);
    setFCogsAcct(DEFAULT_COGS_ACCOUNT);
    setFItemErr("");
    itemModal.onOpen();
  }

  function openEditItem(item: InventoryItem) {
    setEditingItem(item);
    setFSku(item.sku); setFName(item.name); setFDesc(item.description ?? "");
    setFUnit(item.unit); setFCost(String(item.costPerUnit));
    setFReorder(String(item.reorderPoint));
    setFInvAcct(item.inventoryAccountId);
    setFCogsAcct(item.cogsAccountId);
    setFItemErr("");
    itemModal.onOpen();
  }

  function handleItemSubmit(e: FormEvent) {
    e.preventDefault();
    if (!fSku.trim())  { setFItemErr(t("inventory.errorSku"));  return; }
    const dupeSku = items.some((i) => i.sku === fSku.trim() && i.id !== editingItem?.id);
    if (dupeSku)       { setFItemErr(t("inventory.errorSkuExists")); return; }
    if (!fName.trim()) { setFItemErr(t("inventory.errorName")); return; }
    if (!fUnit.trim()) { setFItemErr(t("inventory.errorUnit")); return; }
    const cost = parseFloat(fCost);
    if (isNaN(cost) || cost < 0) { setFItemErr(t("inventory.errorCost")); return; }

    const data: Omit<InventoryItem, "id"> = {
      sku: fSku.trim(), name: fName.trim(),
      description: fDesc.trim() || undefined,
      unit: fUnit.trim(), costPerUnit: cost,
      reorderPoint: Math.max(0, parseFloat(fReorder) || 0),
      inventoryAccountId: fInvAcct,
      cogsAccountId: fCogsAcct,
    };

    if (editingItem) {
      onUpdateItem(editingItem.id, data);
    } else {
      onAddItem(data);
    }
    itemModal.onClose();
  }

  // ── Movement form ────────────────────────────────────────────────────────────

  function openAddMovement(type: MovementType = "purchase", itemId = "") {
    setMovType(type);
    setMovItemId(itemId);
    setMovDate(new Date().toISOString().split("T")[0]);
    setMovQty(""); setMovNote(""); setMovErr("");

    // Pre-fill unit cost from item
    const item = items.find((i) => i.id === itemId);
    setMovUnitCost(item ? String(item.costPerUnit) : "");

    // Pre-fill counter account by movement type
    if (type === "purchase")    setMovCounter(DEFAULT_CASH_ACCOUNT);
    if (type === "consumption") setMovCounter(DEFAULT_COGS_ACCOUNT);
    if (type === "adjustment")  setMovCounter(DEFAULT_INVENTORY_ACCOUNT);

    movModal.onOpen();
  }

  function handleMovementItemChange(id: string) {
    setMovItemId(id);
    const item = items.find((i) => i.id === id);
    if (item) setMovUnitCost(String(item.costPerUnit));
  }

  function handleMovSubmit(e: FormEvent) {
    e.preventDefault();
    if (!movItemId)    { setMovErr(t("inventory.errorItem"));    return; }
    if (!movDate)      { setMovErr(t("inventory.errorDate"));    return; }
    if (!movCounter)   { setMovErr(t("inventory.errorCounter")); return; }

    const qty  = parseFloat(movQty);
    const cost = parseFloat(movUnitCost);
    if (isNaN(qty) || qty === 0)     { setMovErr(t("inventory.errorQty"));  return; }
    if (isNaN(cost) || cost < 0)     { setMovErr(t("inventory.errorCost")); return; }

    onAddMovement({
      itemId: movItemId, date: movDate, type: movType,
      quantity: qty, unitCost: cost,
      note: movNote.trim() || undefined,
      counterAccountId: movCounter,
    });
    movModal.onClose();
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function accountName(id: string) {
    const a = accounts.find((acc) => acc.id === id);
    return a ? `${a.code} ${a.name}` : id;
  }

  function itemName(id: string) {
    return items.find((i) => i.id === id)?.name ?? id;
  }

  function movTypeLabel(type: MovementType) {
    if (type === "purchase")    return t("inventory.typePurchase");
    if (type === "consumption") return t("inventory.typeConsumption");
    return t("inventory.typeAdjustment");
  }

  function movTypeColor(type: MovementType): "success" | "danger" | "warning" {
    if (type === "purchase")    return "success";
    if (type === "consumption") return "danger";
    return "warning";
  }

  function formatDate(iso: string) {
    const [y, m, d] = iso.split("-");
    return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString(
      locale, { month: "short", day: "numeric", year: "numeric" }
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={view === "items" ? "solid" : "flat"}
            color={view === "items" ? "primary" : "default"}
            startContent={<Package size={14} />}
            onPress={() => setView("items")}
          >
            {t("inventory.tabItems")}
          </Button>
          <Button
            size="sm"
            variant={view === "movements" ? "solid" : "flat"}
            color={view === "movements" ? "primary" : "default"}
            startContent={<ArrowDownToLine size={14} />}
            onPress={() => setView("movements")}
          >
            {t("inventory.tabMovements")}
          </Button>
          <Button
            size="sm"
            variant={view === "summary" ? "solid" : "flat"}
            color={view === "summary" ? "primary" : "default"}
            startContent={<SlidersHorizontal size={14} />}
            onPress={() => setView("summary")}
          >
            {t("inventory.tabSummary")}
          </Button>
          <Button
            size="sm"
            variant={view === "profitability" ? "solid" : "flat"}
            color={view === "profitability" ? "success" : "default"}
            startContent={<TrendingUp size={14} />}
            onPress={() => setView("profitability")}
          >
            {t("inventory.tabProfitability")}
          </Button>
        </div>
        {view === "items" && (
          <Button size="sm" color="primary" startContent={<Plus size={14} />} onPress={openAddItem}>
            {t("inventory.addItem")}
          </Button>
        )}
        {view === "movements" && (
          <Button size="sm" color="primary" startContent={<Plus size={14} />} onPress={() => openAddMovement("purchase")}>
            {t("inventory.addMovement")}
          </Button>
        )}
      </div>

      {/* ── Items list ── */}
      {view === "items" && (
        <>
          {items.length === 0 ? (
            <Card shadow="none" className="border-2 border-dashed border-default-200">
              <CardBody className="py-16 text-center text-default-400">
                <Package size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">{t("inventory.noItems")}</p>
                <p className="text-xs mt-1">{t("inventory.noItemsSub")}</p>
              </CardBody>
            </Card>
          ) : (
            <Card shadow="sm">
              <CardBody className="p-0">
                <Table aria-label={t("inventory.tabItems")} removeWrapper>
                  <TableHeader>
                    <TableColumn className="w-24">{t("inventory.sku")}</TableColumn>
                    <TableColumn>{t("inventory.name")}</TableColumn>
                    <TableColumn className="text-right w-20">{t("inventory.qtyOnHand")}</TableColumn>
                    <TableColumn className="text-right w-28">{t("inventory.totalValue")}</TableColumn>
                    <TableColumn className="w-32 text-right"> </TableColumn>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => {
                      const qty   = qtyOnHand(item.id);
                      const value = inventoryValue(item.id);
                      const isLow = qty < item.reorderPoint;
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-xs text-default-500">{item.sku}</TableCell>
                          <TableCell>
                            <div>
                              <span className="font-medium text-default-900">{item.name}</span>
                              {isLow && (
                                <span className="ml-2 inline-flex items-center gap-0.5 text-xs text-warning-600">
                                  <AlertTriangle size={11} />{t("inventory.lowStock")}
                                </span>
                              )}
                              {item.description && (
                                <p className="text-xs text-default-400 mt-0.5">{item.description}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className={`text-right font-mono text-sm ${isLow ? "text-warning-600 font-semibold" : "text-default-700"}`}>
                            {qty} {item.unit}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm text-default-700">
                            {fmt(value)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button isIconOnly size="sm" variant="light" color="success" title={t("inventory.receiveStock")}
                                onPress={() => openAddMovement("purchase", item.id)}>
                                <ArrowDownToLine size={13} />
                              </Button>
                              <Button isIconOnly size="sm" variant="light" color="danger" title={t("inventory.useStock")}
                                onPress={() => openAddMovement("consumption", item.id)}>
                                <ArrowUpFromLine size={13} />
                              </Button>
                              <Button isIconOnly size="sm" variant="light" onPress={() => openEditItem(item)}>
                                <Pencil size={13} />
                              </Button>
                              <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => onDeleteItem(item.id)}>
                                <Trash2 size={13} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardBody>
            </Card>
          )}
        </>
      )}

      {/* ── Movements log ── */}
      {view === "movements" && (
        <>
          {sortedMovements.length === 0 ? (
            <Card shadow="none" className="border-2 border-dashed border-default-200">
              <CardBody className="py-16 text-center text-default-400">
                <p className="text-sm">{t("inventory.noMovements")}</p>
              </CardBody>
            </Card>
          ) : (
            <Card shadow="sm">
              <CardBody className="p-0">
                <Table aria-label={t("inventory.tabMovements")} removeWrapper>
                  <TableHeader>
                    <TableColumn className="w-32">{t("inventory.movementDate")}</TableColumn>
                    <TableColumn>{t("inventory.movementItem")}</TableColumn>
                    <TableColumn className="w-28">{t("inventory.movementType")}</TableColumn>
                    <TableColumn className="text-right w-24">{t("inventory.movementQty")}</TableColumn>
                    <TableColumn className="text-right w-24">{t("inventory.movementUnitCost")}</TableColumn>
                    <TableColumn className="w-8"> </TableColumn>
                  </TableHeader>
                  <TableBody>
                    {sortedMovements.map((mov) => {
                      const item = items.find((i) => i.id === mov.itemId);
                      const displayQty = mov.type === "adjustment" && mov.quantity > 0
                        ? `+${mov.quantity}` : `${mov.quantity}`;
                      return (
                        <TableRow key={mov.id}>
                          <TableCell className="text-default-500 text-sm whitespace-nowrap">
                            {formatDate(mov.date)}
                          </TableCell>
                          <TableCell>
                            <div>
                              <span className="text-sm font-medium text-default-800">{itemName(mov.itemId)}</span>
                              {mov.note && <p className="text-xs text-default-400">{mov.note}</p>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Chip size="sm" variant="flat" color={movTypeColor(mov.type)}>
                              {movTypeLabel(mov.type)}
                            </Chip>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm text-default-700">
                            {displayQty} {item?.unit ?? ""}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm text-default-700">
                            {fmt(mov.unitCost)}
                          </TableCell>
                          <TableCell>
                            <Button isIconOnly size="sm" variant="light" color="danger"
                              onPress={() => onDeleteMovement(mov.id)}>
                              <Trash2 size={13} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardBody>
            </Card>
          )}
        </>
      )}

      {/* ── Summary ── */}
      {view === "summary" && (
        <div className="space-y-4">
          {/* Total value card */}
          <Card shadow="sm">
            <CardBody className="px-6 py-5 flex items-center justify-between">
              <span className="text-sm font-semibold text-default-700">{t("inventory.inventoryValue")}</span>
              <span className="text-2xl font-bold text-default-900">{fmt(totalInventoryValue())}</span>
            </CardBody>
          </Card>

          {/* Per-item breakdown */}
          {items.length > 0 && (
            <Card shadow="sm">
              <CardBody className="p-0">
                <Table aria-label="Inventory summary" removeWrapper>
                  <TableHeader>
                    <TableColumn className="w-24">{t("inventory.sku")}</TableColumn>
                    <TableColumn>{t("inventory.name")}</TableColumn>
                    <TableColumn className="text-right w-24">{t("inventory.qtyOnHand")}</TableColumn>
                    <TableColumn className="text-right w-28">{t("inventory.totalValue")}</TableColumn>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => {
                      const qty   = qtyOnHand(item.id);
                      const value = inventoryValue(item.id);
                      const isLow = qty < item.reorderPoint;
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-xs text-default-500">{item.sku}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-default-800">{item.name}</span>
                              {isLow && <AlertTriangle size={13} className="text-warning-500 shrink-0" />}
                            </div>
                          </TableCell>
                          <TableCell className={`text-right font-mono text-sm ${isLow ? "text-warning-600 font-semibold" : "text-default-700"}`}>
                            {qty} {item.unit}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm text-default-700">
                            {fmt(value)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardBody>
            </Card>
          )}

          {/* Low stock alerts */}
          <Card shadow="sm">
            <CardHeader className="px-5 pt-4 pb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-warning-500" />
                <span className="font-semibold text-sm text-default-800">{t("inventory.lowStock")}</span>
              </div>
            </CardHeader>
            <Divider />
            <CardBody className="px-6 py-4">
              {lowStockItems.length === 0 ? (
                <p className="text-sm text-default-400">{t("inventory.noLowStock")}</p>
              ) : (
                <div className="space-y-2">
                  {lowStockItems.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-default-700">{item.sku} — {item.name}</span>
                      <span className="text-warning-600 font-semibold">
                        {qtyOnHand(item.id)} / {item.reorderPoint} {item.unit}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* ── Profitability ── */}
      {view === "profitability" && (
        <div className="space-y-4">
          {profitabilityRows.length === 0 ? (
            <Card shadow="none" className="border-2 border-dashed border-default-200">
              <CardBody className="py-16 text-center text-default-400">
                <TrendingUp size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">{t("inventory.profitNoSales")}</p>
              </CardBody>
            </Card>
          ) : (
            <>
              {/* Summary totals */}
              {(() => {
                const totRev  = profitabilityRows.reduce((s, r) => s + r.revenue, 0);
                const totCogs = profitabilityRows.reduce((s, r) => s + r.cogs, 0);
                const totGP   = totRev - totCogs;
                const totMarg = totRev > 0 ? (totGP / totRev) * 100 : null;
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: t("inventory.profitRevenue"),     value: fmt(totRev),  color: "text-default-900" },
                      { label: t("inventory.profitCogs"),        value: fmt(totCogs), color: "text-danger-600" },
                      { label: t("inventory.profitGrossProfit"), value: fmt(totGP),   color: totGP >= 0 ? "text-success-600" : "text-danger-600" },
                      { label: t("inventory.profitMargin"),      value: totMarg !== null ? `${totMarg.toFixed(1)}%` : "—", color: totMarg !== null && totMarg >= 0 ? "text-success-600" : "text-danger-600" },
                    ].map(({ label, value, color }) => (
                      <Card key={label} shadow="sm">
                        <CardBody className="px-4 py-3">
                          <p className="text-xs text-default-500 mb-1">{label}</p>
                          <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                );
              })()}

              {/* Per-item table */}
              <Card shadow="sm">
                <CardBody className="p-0">
                  <Table aria-label={t("inventory.tabProfitability")} removeWrapper>
                    <TableHeader>
                      <TableColumn>{t("inventory.name")}</TableColumn>
                      <TableColumn className="text-right w-24">{t("inventory.profitUnitsSold")}</TableColumn>
                      <TableColumn className="text-right w-32">{t("inventory.profitRevenue")}</TableColumn>
                      <TableColumn className="text-right w-32">{t("inventory.profitCogs")}</TableColumn>
                      <TableColumn className="text-right w-32">{t("inventory.profitGrossProfit")}</TableColumn>
                      <TableColumn className="text-right w-24">{t("inventory.profitMargin")}</TableColumn>
                    </TableHeader>
                    <TableBody>
                      {profitabilityRows.map(({ item, unitsSold, revenue, cogs, grossProfit, margin }) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <span className="font-medium text-default-900">{item.name}</span>
                              <span className="ml-2 font-mono text-xs text-default-400">{item.sku}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm text-default-700">
                            {unitsSold} {item.unit}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm text-default-700">
                            {fmt(revenue)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm text-danger-600">
                            {fmt(cogs)}
                          </TableCell>
                          <TableCell className={`text-right font-mono text-sm font-semibold ${grossProfit >= 0 ? "text-success-600" : "text-danger-600"}`}>
                            {fmt(grossProfit)}
                          </TableCell>
                          <TableCell className={`text-right font-mono text-sm ${margin !== null && margin >= 0 ? "text-success-600" : "text-danger-600"}`}>
                            {margin !== null ? `${margin.toFixed(1)}%` : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardBody>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ── Item Add/Edit Modal ── */}
      <Modal isOpen={itemModal.isOpen} onClose={itemModal.onClose} placement="center" size="md" scrollBehavior="inside">
        <ModalContent>
          <form onSubmit={handleItemSubmit}>
            <ModalHeader>{editingItem ? t("inventory.editItem") : t("inventory.addItem")}</ModalHeader>
            <ModalBody className="gap-3">
              <div className="flex gap-3">
                <Input
                  label={t("inventory.sku")}
                  placeholder="e.g. WIDGET-001"
                  value={fSku}
                  onValueChange={(v) => { setFSku(v); setFItemErr(""); }}
                  className="w-1/3"
                  size="sm"
                />
                <Input
                  label={t("inventory.name")}
                  placeholder="e.g. Blue Widget"
                  value={fName}
                  onValueChange={(v) => { setFName(v); setFItemErr(""); }}
                  className="flex-1"
                  size="sm"
                />
              </div>
              <Input
                label={t("inventory.description")}
                value={fDesc}
                onValueChange={setFDesc}
                size="sm"
              />
              <div className="flex gap-3">
                <Input
                  label={t("inventory.unit")}
                  placeholder={t("inventory.unitPlaceholder")}
                  value={fUnit}
                  onValueChange={(v) => { setFUnit(v); setFItemErr(""); }}
                  size="sm"
                  className="flex-1"
                />
                <Input
                  label={t("inventory.costPerUnit")}
                  type="number" min="0" step="0.01"
                  value={fCost}
                  onValueChange={(v) => { setFCost(v); setFItemErr(""); }}
                  size="sm"
                  className="flex-1"
                />
                <Input
                  label={t("inventory.reorderPoint")}
                  type="number" min="0" step="1"
                  value={fReorder}
                  onValueChange={setFReorder}
                  size="sm"
                  className="w-28"
                />
              </div>
              <Select
                label={t("inventory.inventoryAccount")}
                selectedKeys={[fInvAcct]}
                onSelectionChange={(keys) => setFInvAcct([...keys][0] as string)}
                size="sm"
              >
                {assetAccounts.map((a) => (
                  <SelectItem key={a.id} textValue={`${a.code} ${a.name}`}>
                    <span className="font-mono text-default-500 mr-1 text-xs">{a.code}</span>{a.name}
                  </SelectItem>
                ))}
              </Select>
              <Select
                label={t("inventory.cogsAccount")}
                selectedKeys={[fCogsAcct]}
                onSelectionChange={(keys) => setFCogsAcct([...keys][0] as string)}
                size="sm"
                isInvalid={!!fItemErr}
                errorMessage={fItemErr}
              >
                {expenseAccounts.map((a) => (
                  <SelectItem key={a.id} textValue={`${a.code} ${a.name}`}>
                    <span className="font-mono text-default-500 mr-1 text-xs">{a.code}</span>{a.name}
                  </SelectItem>
                ))}
              </Select>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={itemModal.onClose}>{t("cancel")}</Button>
              <Button color="primary" type="submit">{editingItem ? t("save") : t("add")}</Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* ── Movement Modal ── */}
      <Modal isOpen={movModal.isOpen} onClose={movModal.onClose} placement="center" size="sm">
        <ModalContent>
          <form onSubmit={handleMovSubmit}>
            <ModalHeader>{t("inventory.addMovement")}</ModalHeader>
            <ModalBody className="gap-3">
              {/* Movement type selector */}
              <div className="flex gap-2">
                {(["purchase", "consumption", "adjustment"] as MovementType[]).map((type) => (
                  <Button
                    key={type}
                    size="sm"
                    variant={movType === type ? "solid" : "flat"}
                    color={movType === type ? (type === "purchase" ? "success" : type === "consumption" ? "danger" : "warning") : "default"}
                    onPress={() => {
                      setMovType(type);
                      if (type === "purchase")    setMovCounter(DEFAULT_CASH_ACCOUNT);
                      if (type === "consumption") setMovCounter(DEFAULT_COGS_ACCOUNT);
                      if (type === "adjustment")  setMovCounter(DEFAULT_INVENTORY_ACCOUNT);
                    }}
                    className="flex-1"
                  >
                    {type === "purchase" ? <ArrowDownToLine size={12} /> : type === "consumption" ? <ArrowUpFromLine size={12} /> : <SlidersHorizontal size={12} />}
                    {movTypeLabel(type)}
                  </Button>
                ))}
              </div>

              <Select
                label={t("inventory.movementItem")}
                selectedKeys={movItemId ? [movItemId] : []}
                onSelectionChange={(keys) => handleMovementItemChange([...keys][0] as string)}
                size="sm"
              >
                {items.map((item) => (
                  <SelectItem key={item.id} textValue={item.name}>
                    <span className="font-mono text-default-500 mr-1 text-xs">{item.sku}</span>{item.name}
                  </SelectItem>
                ))}
              </Select>

              <Input
                type="date"
                label={t("inventory.movementDate")}
                value={movDate}
                onValueChange={(v) => { setMovDate(v); setMovErr(""); }}
                size="sm"
              />

              <div className="flex gap-3">
                <Input
                  label={t("inventory.movementQty")}
                  type="number"
                  step={movType === "adjustment" ? "1" : "1"}
                  placeholder={movType === "adjustment" ? "e.g. -5 or 3" : "e.g. 10"}
                  value={movQty}
                  onValueChange={(v) => { setMovQty(v); setMovErr(""); }}
                  size="sm"
                  className="flex-1"
                />
                <Input
                  label={t("inventory.movementUnitCost")}
                  type="number" min="0" step="0.01"
                  value={movUnitCost}
                  onValueChange={setMovUnitCost}
                  size="sm"
                  className="flex-1"
                />
              </div>

              <Select
                label={t("inventory.counterAccount")}
                selectedKeys={movCounter ? [movCounter] : []}
                onSelectionChange={(keys) => setMovCounter([...keys][0] as string)}
                size="sm"
                isInvalid={!!movErr}
                errorMessage={movErr}
              >
                {allAccounts.map((a) => (
                  <SelectItem key={a.id} textValue={`${a.code} ${a.name}`}>
                    <span className="font-mono text-default-500 mr-1 text-xs">{a.code}</span>{a.name}
                  </SelectItem>
                ))}
              </Select>

              <Input
                label={t("inventory.movementNote")}
                value={movNote}
                onValueChange={setMovNote}
                size="sm"
              />
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={movModal.onClose}>{t("cancel")}</Button>
              <Button color="primary" type="submit">{t("add")}</Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </div>
  );
}
