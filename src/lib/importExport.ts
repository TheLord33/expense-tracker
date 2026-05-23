import { Expense } from "./types";

// ── Export ────────────────────────────────────────────────────────────────────

export function toCSV(expenses: Expense[]): string {
  const header = "date,description,category,amount";
  const rows = expenses.map((e) =>
    [
      e.date,
      `"${e.description.replace(/"/g, '""')}"`,
      e.category,
      e.amount.toFixed(2),
    ].join(",")
  );
  return [header, ...rows].join("\n");
}

export function toJSON(expenses: Expense[]): string {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return JSON.stringify(expenses.map(({ id, ...rest }) => rest), null, 2);
}

export function toText(expenses: Expense[]): string {
  const now = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const SEP = "-".repeat(76);

  const lines = [
    `Family Finance Tracker Export — ${now}`,
    "=".repeat(76),
    "",
    "DATE          DESCRIPTION                            CATEGORY         AMOUNT",
    SEP,
  ];

  for (const e of expenses) {
    const date = e.date.padEnd(14);
    const desc = e.description.slice(0, 38).padEnd(39);
    const cat = e.category.slice(0, 16).padEnd(17);
    const amt = `$${e.amount.toFixed(2)}`.padStart(7);
    lines.push(`${date}${desc}${cat}${amt}`);
  }

  lines.push(SEP);
  lines.push(
    `${"TOTAL".padEnd(69)}${`$${total.toFixed(2)}`.padStart(7)}`
  );
  lines.push(`${expenses.length} expense${expenses.length !== 1 ? "s" : ""}`);
  return lines.join("\n");
}

export function download(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Import ────────────────────────────────────────────────────────────────────

export interface ImportResult {
  expenses: Omit<Expense, "id">[];
  errors: string[];
}

function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
}

function parseCSVRow(line: string): string[] {
  const cols: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (ch === "," && !inQuote) {
      cols.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  cols.push(cur);
  return cols;
}

export function fromCSV(content: string): ImportResult {
  const errors: string[] = [];
  const expenses: Omit<Expense, "id">[] = [];
  const lines = content.trim().split(/\r?\n/);

  if (lines.length < 2)
    return { expenses: [], errors: ["File appears empty or has no data rows."] };

  const header = parseCSVRow(lines[0]).map((h) => h.toLowerCase().trim());
  const idx = {
    date: header.findIndex((h) => h === "date"),
    description: header.findIndex((h) =>
      ["description", "desc", "name", "memo", "note"].includes(h)
    ),
    category: header.findIndex((h) =>
      ["category", "cat", "type", "tag"].includes(h)
    ),
    amount: header.findIndex((h) =>
      ["amount", "amt", "cost", "price", "total", "value"].includes(h)
    ),
  };

  if (idx.date === -1) errors.push("No 'date' column found.");
  if (idx.description === -1) errors.push("No 'description' column found.");
  if (idx.amount === -1) errors.push("No 'amount' column found.");
  if (errors.length) return { expenses: [], errors };

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = parseCSVRow(line);

    const date = cols[idx.date]?.trim() ?? "";
    const description = cols[idx.description]?.trim() || "Imported expense";
    const category =
      idx.category >= 0 ? cols[idx.category]?.trim() || "Other" : "Other";
    const rawAmount = cols[idx.amount]?.trim().replace(/[$, ]/g, "") ?? "";
    const amount = parseFloat(rawAmount);

    if (!isValidDate(date)) {
      errors.push(`Row ${i + 1}: invalid date "${date}" (expected YYYY-MM-DD)`);
      continue;
    }
    if (isNaN(amount) || amount <= 0) {
      errors.push(`Row ${i + 1}: invalid amount "${rawAmount}"`);
      continue;
    }

    expenses.push({
      date,
      description,
      category,
      amount: parseFloat(amount.toFixed(2)),
    });
  }

  return { expenses, errors };
}

export function fromJSON(content: string): ImportResult {
  const errors: string[] = [];
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    return { expenses: [], errors: ["Invalid JSON — could not parse file."] };
  }

  const arr = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as Record<string, unknown>).expenses)
    ? (parsed as Record<string, unknown>).expenses
    : null;

  if (!Array.isArray(arr))
    return {
      expenses: [],
      errors: [
        "Expected a JSON array of expenses, or an object with an 'expenses' array.",
      ],
    };

  const expenses: Omit<Expense, "id">[] = [];
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i] as Record<string, unknown>;
    const date = String(item.date ?? "").trim();
    const description = String(
      item.description ?? item.desc ?? item.memo ?? "Imported expense"
    ).trim();
    const category = String(
      item.category ?? item.cat ?? item.type ?? "Other"
    ).trim();
    const amount = parseFloat(
      String(item.amount ?? item.amt ?? item.cost ?? "0").replace(/[$, ]/g, "")
    );

    if (!isValidDate(date)) {
      errors.push(`Item ${i + 1}: invalid date "${date}"`);
      continue;
    }
    if (isNaN(amount) || amount <= 0) {
      errors.push(`Item ${i + 1}: invalid amount`);
      continue;
    }

    expenses.push({
      date,
      description,
      category,
      amount: parseFloat(amount.toFixed(2)),
    });
  }

  return { expenses, errors };
}

export function fromText(content: string): ImportResult {
  const errors: string[] = [];
  const expenses: Omit<Expense, "id">[] = [];

  // Match the text export format OR a simpler pipe-separated format
  const exportFmtRe =
    /^(\d{4}-\d{2}-\d{2})\s{2,}(.+?)\s{2,}(.+?)\s{2,}\$?([\d,]+\.?\d*)$/;
  const pipeFmtRe =
    /^(\d{4}-\d{2}-\d{2})\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*\$?([\d,]+\.?\d*)$/;

  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || /^[=\-#]/.test(line)) continue;

    const m = pipeFmtRe.exec(line) ?? exportFmtRe.exec(line);
    if (!m) continue;

    const [, date, description, category, rawAmount] = m;
    const amount = parseFloat(rawAmount.replace(/,/g, ""));

    if (!isValidDate(date)) {
      errors.push(`Line ${i + 1}: invalid date "${date}"`);
      continue;
    }
    if (isNaN(amount) || amount <= 0) {
      errors.push(`Line ${i + 1}: invalid amount "${rawAmount}"`);
      continue;
    }

    expenses.push({
      date,
      description: description.trim(),
      category: category.trim(),
      amount: parseFloat(amount.toFixed(2)),
    });
  }

  if (expenses.length === 0 && errors.length === 0)
    errors.push(
      'No parseable rows found.\nExpected format: 2026-05-22 | Coffee | Food | 4.50'
    );

  return { expenses, errors };
}
