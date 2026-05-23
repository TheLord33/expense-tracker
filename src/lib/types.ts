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
