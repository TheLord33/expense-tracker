import type { Account, AccountType, Bill, BillPayment, Customer, Expense, IncomeSource, InventoryItem, Invoice, InvoicePayment, JournalEntry, StockMovement } from "./types";
import { toMonthly } from "./useIncome";

const CASH_CODE     = "1000";
const INCOME_CODE   = "4000";
const FALLBACK_CODE = "5900"; // Other expenses

function findAccount(accounts: Account[], code: string): Account {
  return accounts.find((a) => a.code === code)!;
}

function expenseAccount(accounts: Account[], category: string): Account {
  return (
    accounts.find((a) => a.type === "expense" && a.categoryName === category) ??
    findAccount(accounts, FALLBACK_CODE)
  );
}

/** Derive a JournalEntry from a single Expense record. */
export function expenseToEntry(expense: Expense, accounts: Account[]): JournalEntry {
  const cash   = findAccount(accounts, CASH_CODE);
  const expAcc = expenseAccount(accounts, expense.category);
  return {
    id:          `exp-${expense.id}`,
    date:        expense.date,
    description: expense.description,
    sourceId:    expense.id,
    sourceType:  "expense",
    lines: [
      { accountId: expAcc.id, debit: expense.amount, credit: 0             },
      { accountId: cash.id,   debit: 0,              credit: expense.amount },
    ],
  };
}

/** Derive monthly income journal entries from all IncomeSource records. */
export function deriveIncomeEntries(sources: IncomeSource[], accounts: Account[]): JournalEntry[] {
  const cash   = findAccount(accounts, CASH_CODE);
  const incAcc = findAccount(accounts, INCOME_CODE);
  const entries: JournalEntry[] = [];
  const todayMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  for (const source of sources) {
    const startMonth = source.startDate.slice(0, 7);
    const endMonth   = source.endDate ? source.endDate.slice(0, 7) : todayMonth;

    if (source.frequency === "one-time") {
      entries.push({
        id:          `inc-${source.id}-onetime`,
        date:        source.startDate,
        description: source.name,
        sourceId:    source.id,
        sourceType:  "income",
        lines: [
          { accountId: cash.id,   debit: source.amount, credit: 0             },
          { accountId: incAcc.id, debit: 0,             credit: source.amount },
        ],
      });
      continue;
    }

    const monthlyAmt = toMonthly(source.amount, source.frequency);
    let [y, m] = startMonth.split("-").map(Number);
    const [ey, em] = endMonth.split("-").map(Number);

    while (y < ey || (y === ey && m <= em)) {
      const monthStr = `${y}-${String(m).padStart(2, "0")}`;
      entries.push({
        id:          `inc-${source.id}-${monthStr}`,
        date:        `${monthStr}-01`,
        description: `${source.name} (${monthStr})`,
        sourceId:    source.id,
        sourceType:  "income",
        lines: [
          { accountId: cash.id,   debit: monthlyAmt, credit: 0          },
          { accountId: incAcc.id, debit: 0,          credit: monthlyAmt },
        ],
      });
      m++;
      if (m > 12) { m = 1; y++; }
    }
  }

  return entries;
}

const AP_ACCOUNT_ID = "acc-2000"; // Accounts Payable (builtin)

/** Derive journal entries from AP bills and payments. */
export function deriveBillEntries(
  bills: Bill[],
  payments: BillPayment[],
  accounts: Account[]
): JournalEntry[] {
  const apAccount   = accounts.find((a) => a.id === AP_ACCOUNT_ID);
  const cashAccount = accounts.find((a) => a.code === CASH_CODE);
  if (!apAccount || !cashAccount) return [];

  const entries: JournalEntry[] = [];

  for (const bill of bills) {
    const expAccount = accounts.find((a) => a.id === bill.expenseAccountId);
    if (!expAccount) continue;
    entries.push({
      id:          `bill-${bill.id}`,
      date:        bill.date,
      description: `Bill #${bill.billNumber}: ${bill.description}`,
      sourceId:    bill.id,
      sourceType:  "bill",
      lines: [
        { accountId: expAccount.id, debit: bill.amount, credit: 0           },
        { accountId: apAccount.id,  debit: 0,           credit: bill.amount },
      ],
    });
  }

  for (const payment of payments) {
    const bill = bills.find((b) => b.id === payment.billId);
    entries.push({
      id:          `billpay-${payment.id}`,
      date:        payment.date,
      description: payment.note ?? (bill ? `Payment — Bill #${bill.billNumber}` : "Bill payment"),
      sourceId:    payment.id,
      sourceType:  "bill-payment",
      lines: [
        { accountId: apAccount.id,   debit: payment.amount, credit: 0              },
        { accountId: cashAccount.id, debit: 0,              credit: payment.amount },
      ],
    });
  }

  return entries;
}

/** Derive journal entries from inventory stock movements. */
export function deriveInventoryEntries(
  items: InventoryItem[],
  movements: StockMovement[]
): JournalEntry[] {
  const entries: JournalEntry[] = [];

  for (const movement of movements) {
    const item   = items.find((i) => i.id === movement.itemId);
    if (!item) continue;

    const absQty = Math.abs(movement.quantity);
    const amount = absQty * movement.unitCost;
    if (amount < 0.005) continue;

    // Does this movement increase or decrease the inventory asset?
    const inventoryIncreases =
      movement.type === "purchase" ||
      (movement.type === "adjustment" && movement.quantity > 0);

    entries.push({
      id:          `inv-${movement.id}`,
      date:        movement.date,
      description: movement.note ?? `${item.name} — ${movement.type}`,
      sourceId:    movement.id,
      sourceType:  "inventory",
      lines: inventoryIncreases
        ? [
            { accountId: item.inventoryAccountId,   debit: amount, credit: 0      },
            { accountId: movement.counterAccountId, debit: 0,      credit: amount },
          ]
        : [
            { accountId: movement.counterAccountId, debit: amount, credit: 0      },
            { accountId: item.inventoryAccountId,   debit: 0,      credit: amount },
          ],
    });
  }

  return entries;
}

const AR_ACCOUNT_ID = "acc-1100"; // Accounts Receivable (builtin)

/** Derive journal entries from AR invoices and payments received. */
export function deriveAREntries(
  invoices: Invoice[],
  payments: InvoicePayment[],
  accounts: Account[]
): JournalEntry[] {
  const arAccount   = accounts.find((a) => a.id === AR_ACCOUNT_ID);
  const cashAccount = accounts.find((a) => a.code === CASH_CODE);
  if (!arAccount || !cashAccount) return [];

  const entries: JournalEntry[] = [];

  for (const inv of invoices) {
    const revAccount = accounts.find((a) => a.id === inv.revenueAccountId);
    if (!revAccount) continue;
    entries.push({
      id:          `inv-${inv.id}`,
      date:        inv.date,
      description: `Invoice #${inv.invoiceNumber}: ${inv.description}`,
      sourceId:    inv.id,
      sourceType:  "invoice",
      lines: [
        { accountId: arAccount.id,   debit: inv.amount, credit: 0          },
        { accountId: revAccount.id,  debit: 0,          credit: inv.amount },
      ],
    });
  }

  for (const payment of payments) {
    const inv = invoices.find((i) => i.id === payment.invoiceId);
    entries.push({
      id:          `invpay-${payment.id}`,
      date:        payment.date,
      description: payment.note ?? (inv ? `Payment — Invoice #${inv.invoiceNumber}` : "Invoice payment"),
      sourceId:    payment.id,
      sourceType:  "invoice-payment",
      lines: [
        { accountId: cashAccount.id, debit: payment.amount, credit: 0              },
        { accountId: arAccount.id,   debit: 0,              credit: payment.amount },
      ],
    });
  }

  return entries;
}

/** All derived journal entries (expenses + income + AP + inventory + AR), sorted ascending by date. */
export function deriveAllEntries(
  expenses: Expense[],
  sources: IncomeSource[],
  accounts: Account[],
  bills: Bill[] = [],
  billPayments: BillPayment[] = [],
  inventoryItems: InventoryItem[] = [],
  inventoryMovements: StockMovement[] = [],
  invoices: Invoice[] = [],
  invoicePayments: InvoicePayment[] = []
): JournalEntry[] {
  if (accounts.length === 0) return [];
  const expEntries = expenses.map((e) => expenseToEntry(e, accounts));
  const incEntries = deriveIncomeEntries(sources, accounts);
  const billEntries  = deriveBillEntries(bills, billPayments, accounts);
  const invEntries   = deriveInventoryEntries(inventoryItems, inventoryMovements);
  const arEntries    = deriveAREntries(invoices, invoicePayments, accounts);
  return [...expEntries, ...incEntries, ...billEntries, ...invEntries, ...arEntries].sort((a, b) => a.date.localeCompare(b.date));
}

export interface LedgerRow {
  entry: JournalEntry;
  debit: number;
  credit: number;
  balance: number;
}

/** Running ledger rows for a single account. */
export function accountLedger(
  accountId: string,
  entries: JournalEntry[],
  accountType: AccountType
): LedgerRow[] {
  const rows: LedgerRow[] = [];
  let balance = 0;

  for (const entry of entries) {
    for (const line of entry.lines) {
      if (line.accountId !== accountId) continue;
      // Normal balance: assets & expenses increase with debits; others increase with credits
      if (accountType === "asset" || accountType === "expense") {
        balance += line.debit - line.credit;
      } else {
        balance += line.credit - line.debit;
      }
      rows.push({ entry, debit: line.debit, credit: line.credit, balance });
    }
  }

  return rows;
}

// ── Profit & Loss ─────────────────────────────────────────────────────────────

export interface PnLRow {
  account: Account;
  amount: number;
}

export interface PnLReport {
  revenue: PnLRow[];
  expenses: PnLRow[];
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
}

export function computePnL(
  accounts: Account[],
  entries: JournalEntry[],
  dateFrom: string,
  dateTo: string
): PnLReport {
  const filtered = entries.filter((e) => {
    if (dateFrom && e.date < dateFrom) return false;
    if (dateTo && e.date > dateTo) return false;
    return true;
  });

  const revenue: PnLRow[] = accounts
    .filter((a) => a.type === "revenue")
    .map((account) => {
      let amount = 0;
      for (const entry of filtered)
        for (const line of entry.lines)
          if (line.accountId === account.id) amount += line.credit - line.debit;
      return { account, amount };
    })
    .filter((r) => r.amount > 0);

  const expenses: PnLRow[] = accounts
    .filter((a) => a.type === "expense")
    .map((account) => {
      let amount = 0;
      for (const entry of filtered)
        for (const line of entry.lines)
          if (line.accountId === account.id) amount += line.debit - line.credit;
      return { account, amount };
    })
    .filter((r) => r.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const totalRevenue  = revenue.reduce((s, r) => s + r.amount, 0);
  const totalExpenses = expenses.reduce((s, r) => s + r.amount, 0);

  return { revenue, expenses, totalRevenue, totalExpenses, netIncome: totalRevenue - totalExpenses };
}

// ── Balance Sheet ─────────────────────────────────────────────────────────────

export interface BalanceSheetRow {
  account: Account;
  openingBalance: number;
  ledgerBalance: number; // derived from journal entries
  totalBalance: number;  // opening + ledger
}

export interface BalanceSheetReport {
  assets: BalanceSheetRow[];
  liabilities: BalanceSheetRow[];
  equity: BalanceSheetRow[];
  retainedEarnings: number; // all-time net income
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number; // equity accounts + retained earnings
  difference: number;  // assets − (liabilities + equity); 0 = balanced
}

export function computeBalanceSheet(
  accounts: Account[],
  entries: JournalEntry[],
  openingBalances: Record<string, number>
): BalanceSheetReport {
  function ledgerBal(account: Account): number {
    let debit = 0, credit = 0;
    for (const entry of entries)
      for (const line of entry.lines)
        if (line.accountId === account.id) { debit += line.debit; credit += line.credit; }
    return account.type === "asset" ? debit - credit : credit - debit;
  }

  function makeRow(account: Account): BalanceSheetRow {
    const openingBalance = openingBalances[account.id] ?? 0;
    const ledgerBalance  = ledgerBal(account);
    return { account, openingBalance, ledgerBalance, totalBalance: openingBalance + ledgerBalance };
  }

  const assets      = accounts.filter((a) => a.type === "asset").map(makeRow);
  const liabilities = accounts.filter((a) => a.type === "liability").map(makeRow);
  const equity      = accounts.filter((a) => a.type === "equity").map(makeRow);

  const { netIncome: retainedEarnings } = computePnL(accounts, entries, "", "");

  const totalAssets      = assets.reduce((s, r) => s + r.totalBalance, 0);
  const totalLiabilities = liabilities.reduce((s, r) => s + r.totalBalance, 0);
  const totalEquity      = equity.reduce((s, r) => s + r.totalBalance, 0) + retainedEarnings;

  return {
    assets, liabilities, equity, retainedEarnings,
    totalAssets, totalLiabilities, totalEquity,
    difference: totalAssets - (totalLiabilities + totalEquity),
  };
}

// ── Cash Flow Statement (Indirect Method) ────────────────────────────────────

export interface CashFlowReport {
  netIncome: number;
  changeInAR: number;        // positive = source of cash (AR decreased)
  changeInAP: number;        // positive = source of cash (AP increased = deferred payment)
  changeInInventory: number; // positive = source of cash (inventory decreased)
  netOperating: number;
  equityChanges: { account: Account; amount: number }[];
  netFinancing: number;
  netChange: number;
  beginCash: number;
  endCash: number;
}

function periodNetMovement(accountId: string, entries: JournalEntry[], normalDebit: boolean): number {
  let debit = 0, credit = 0;
  for (const entry of entries) {
    for (const line of entry.lines) {
      if (line.accountId !== accountId) continue;
      debit += line.debit;
      credit += line.credit;
    }
  }
  return normalDebit ? debit - credit : credit - debit;
}

export function computeCashFlow(
  accounts: Account[],
  allEntries: JournalEntry[],
  openingBalances: Record<string, number>,
  dateFrom: string,
  dateTo: string
): CashFlowReport {
  const periodEntries = allEntries.filter((e) => {
    if (dateFrom && e.date < dateFrom) return false;
    if (dateTo && e.date > dateTo) return false;
    return true;
  });
  const prePeriodEntries = dateFrom ? allEntries.filter((e) => e.date < dateFrom) : [];

  const { netIncome } = computePnL(accounts, allEntries, dateFrom, dateTo);

  const arAcc   = accounts.find((a) => a.id === AR_ACCOUNT_ID);
  const apAcc   = accounts.find((a) => a.id === AP_ACCOUNT_ID);
  const invAcc  = accounts.find((a) => a.code === "1200");
  const cashAcc = accounts.find((a) => a.code === CASH_CODE);

  const deltaAR        = arAcc   ? periodNetMovement(arAcc.id,   periodEntries, true)  : 0;
  const deltaAP        = apAcc   ? periodNetMovement(apAcc.id,   periodEntries, false) : 0;
  const deltaInventory = invAcc  ? periodNetMovement(invAcc.id,  periodEntries, true)  : 0;

  const changeInAR        = -deltaAR;
  const changeInAP        =  deltaAP;
  const changeInInventory = -deltaInventory;

  const netOperating = netIncome + changeInAR + changeInAP + changeInInventory;

  const equityChanges = accounts
    .filter((a) => a.type === "equity")
    .map((account) => ({ account, amount: periodNetMovement(account.id, periodEntries, false) }))
    .filter((ec) => Math.abs(ec.amount) >= 0.005);
  const netFinancing = equityChanges.reduce((s, ec) => s + ec.amount, 0);

  const netChange = netOperating + netFinancing;

  const cashOpening   = cashAcc ? (openingBalances[cashAcc.id] ?? 0) : 0;
  const cashPrePeriod = cashAcc ? periodNetMovement(cashAcc.id, prePeriodEntries, true) : 0;
  const beginCash     = cashOpening + cashPrePeriod;
  const endCash       = beginCash + netChange;

  return {
    netIncome, changeInAR, changeInAP, changeInInventory,
    netOperating, equityChanges, netFinancing,
    netChange, beginCash, endCash,
  };
}

// ── Trial Balance ─────────────────────────────────────────────────────────────

export interface TrialBalanceRow {
  account: Account;
  totalDebit: number;
  totalCredit: number;
}

/** Trial balance: total debits and credits per account. */
export function trialBalance(accounts: Account[], entries: JournalEntry[]): TrialBalanceRow[] {
  return accounts
    .map((account) => {
      let totalDebit = 0, totalCredit = 0;
      for (const entry of entries) {
        for (const line of entry.lines) {
          if (line.accountId === account.id) {
            totalDebit  += line.debit;
            totalCredit += line.credit;
          }
        }
      }
      return { account, totalDebit, totalCredit };
    })
    .filter((r) => r.totalDebit > 0 || r.totalCredit > 0);
}
