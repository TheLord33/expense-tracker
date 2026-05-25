export type ChipColor =
  | "default"
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "danger";

export const CHIP_COLORS: ChipColor[] = [
  "primary",
  "secondary",
  "success",
  "warning",
  "danger",
  "default",
];

export const CHIP_COLOR_LABELS: Record<ChipColor, string> = {
  primary: "Blue",
  secondary: "Purple",
  success: "Green",
  warning: "Yellow",
  danger: "Red",
  default: "Gray",
};

// Approximate hex values for NextUI v2 default theme
export const CHIP_COLOR_HEX: Record<ChipColor, string> = {
  primary: "#006FEE",
  secondary: "#7828C8",
  success: "#17C964",
  warning: "#F5A524",
  danger: "#F31260",
  default: "#71717A",
};

export interface CategoryDef {
  name: string;
  color: ChipColor;
  isBuiltin?: boolean;
}

export const BUILTIN_CATEGORIES: CategoryDef[] = [
  { name: "Food", color: "success", isBuiltin: true },
  { name: "Transport", color: "primary", isBuiltin: true },
  { name: "Housing", color: "secondary", isBuiltin: true },
  { name: "Entertainment", color: "warning", isBuiltin: true },
  { name: "Healthcare", color: "danger", isBuiltin: true },
  { name: "Shopping", color: "default", isBuiltin: true },
  { name: "Other", color: "default", isBuiltin: true },
];

export interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string; // YYYY-MM-DD
  recurringId?: string; // set when auto-generated from a recurring rule
}

// ── Budgets ───────────────────────────────────────────────────────────────────

export interface Budget {
  id: string;
  category: string;
  monthlyLimit: number;
}

// ── Recurring expenses ────────────────────────────────────────────────────────

export type RecurringFrequency =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "yearly";

export const RECURRING_FREQUENCIES: { value: RecurringFrequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export interface RecurringExpense {
  id: string;
  description: string;
  category: string;
  amount: number;
  frequency: RecurringFrequency;
  startDate: string;
  endDate?: string;
  lastGenerated?: string; // date of last auto-generated entry
}

// ── Income sources ────────────────────────────────────────────────────────────

export type IncomeFrequency =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "yearly"
  | "one-time";

export const INCOME_FREQUENCIES: { value: IncomeFrequency; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "one-time", label: "One-time" },
];

export interface IncomeSource {
  id: string;
  name: string;
  amount: number;
  frequency: IncomeFrequency;
  startDate: string;
  endDate?: string;
}

// ── General Ledger ────────────────────────────────────────────────────────────

export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  isBuiltin?: boolean;
  categoryName?: string; // links expense/revenue accounts to category names
}

export interface JournalLine {
  accountId: string;
  debit: number;
  credit: number;
}

export type JournalEntrySource = "expense" | "income" | "manual" | "bill" | "bill-payment";

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  lines: JournalLine[];
  sourceId?: string;
  sourceType?: JournalEntrySource;
}

export const BUILTIN_ACCOUNTS: Account[] = [
  { id: "acc-1000", code: "1000", name: "Cash & Bank",         type: "asset",     isBuiltin: true },
  { id: "acc-1100", code: "1100", name: "Accounts Receivable", type: "asset",     isBuiltin: true },
  { id: "acc-2000", code: "2000", name: "Accounts Payable",    type: "liability", isBuiltin: true },
  { id: "acc-2100", code: "2100", name: "Credit Cards",        type: "liability", isBuiltin: true },
  { id: "acc-3000", code: "3000", name: "Owner's Equity",      type: "equity",    isBuiltin: true },
  { id: "acc-4000", code: "4000", name: "General Income",      type: "revenue",   isBuiltin: true },
  { id: "acc-5100", code: "5100", name: "Food",                type: "expense",   isBuiltin: true, categoryName: "Food"          },
  { id: "acc-5200", code: "5200", name: "Transport",           type: "expense",   isBuiltin: true, categoryName: "Transport"     },
  { id: "acc-5300", code: "5300", name: "Housing",             type: "expense",   isBuiltin: true, categoryName: "Housing"       },
  { id: "acc-5400", code: "5400", name: "Entertainment",       type: "expense",   isBuiltin: true, categoryName: "Entertainment" },
  { id: "acc-5500", code: "5500", name: "Healthcare",          type: "expense",   isBuiltin: true, categoryName: "Healthcare"    },
  { id: "acc-5600", code: "5600", name: "Shopping",            type: "expense",   isBuiltin: true, categoryName: "Shopping"      },
  { id: "acc-5900", code: "5900", name: "Other",               type: "expense",   isBuiltin: true, categoryName: "Other"         },
];

// ── Accounts Payable ──────────────────────────────────────────────────────────

export interface Vendor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface Bill {
  id: string;
  vendorId: string;
  billNumber: string;
  date: string;             // YYYY-MM-DD received
  dueDate: string;          // YYYY-MM-DD
  amount: number;
  description: string;
  expenseAccountId: string;
}

export interface BillPayment {
  id: string;
  billId: string;
  date: string;             // YYYY-MM-DD
  amount: number;
  note?: string;
}

// ── Cloud Export ──────────────────────────────────────────────────────────────

export type ExportDestination = "download" | "email" | "googlesheets" | "dropbox" | "onedrive" | "link";

export interface ExportRecord {
  id: string;
  timestamp: string; // ISO
  format: string;
  template: string;
  recordCount: number;
  totalAmount: number;
  destination: ExportDestination;
  filename: string;
  recipientEmail?: string;
}

export interface BackupSchedule {
  enabled: boolean;
  frequency: "daily" | "weekly" | "monthly";
  format: "csv" | "json" | "pdf";
  destination: "email" | "dropbox" | "onedrive";
  email: string;
  lastBackup: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────

export type SortField = "date" | "amount" | "category" | "description";
export type SortDir = "asc" | "desc";
export type ViewMode = "list" | "category" | "monthly" | "trends";
export type DatePreset =
  | "all"
  | "week"
  | "month"
  | "last-month"
  | "3months"
  | "year"
  | "custom";

export interface FilterState {
  search: string;
  categories: string[];
  datePreset: DatePreset;
  dateFrom: string;
  dateTo: string;
  amountMin: string;
  amountMax: string;
}

export const DEFAULT_FILTER: FilterState = {
  search: "",
  categories: [],
  datePreset: "all",
  dateFrom: "",
  dateTo: "",
  amountMin: "",
  amountMax: "",
};
