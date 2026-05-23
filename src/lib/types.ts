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
