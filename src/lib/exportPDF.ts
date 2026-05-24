import { Expense } from "./types";
import type { PnLReport, BalanceSheetReport } from "./ledger";

const APP_NAME = "Family Finances Organizer";
const INDIGO: [number, number, number] = [79, 70, 229];
const GRAY:   [number, number, number] = [107, 114, 128];

export async function generatePDF(expenses: Expense[]): Promise<Blob> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF();
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const now = new Date().toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  // Header
  doc.setFontSize(18);
  doc.setTextColor(...INDIGO);
  doc.text(APP_NAME, 14, 18);

  doc.setFontSize(10);
  doc.setTextColor(...GRAY);
  doc.text(`Exported on ${now}`, 14, 25);
  doc.text(`${expenses.length} record${expenses.length !== 1 ? "s" : ""} · Total: $${total.toFixed(2)}`, 14, 31);

  // Table
  autoTable(doc, {
    startY: 38,
    head: [["Date", "Description", "Category", "Amount"]],
    body: expenses.map((e) => [
      e.date,
      e.description,
      e.category,
      `$${e.amount.toFixed(2)}`,
    ]),
    foot: [["", "", "Total", `$${total.toFixed(2)}`]],
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold" },
    footStyles: { fillColor: [238, 242, 255], textColor: [55, 48, 163], fontStyle: "bold" },
    columnStyles: { 3: { halign: "right" } },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    styles: { fontSize: 9, cellPadding: 3 },
    margin: { left: 14, right: 14 },
  });

  return doc.output("blob");
}

export async function generatePnLPDF(
  report: PnLReport,
  periodLabel: string,
  fmtFn: (n: number) => string
): Promise<Blob> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF();
  const now = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  doc.setFontSize(18); doc.setTextColor(...INDIGO); doc.text(APP_NAME, 14, 18);
  doc.setFontSize(12); doc.setTextColor(55, 65, 81); doc.text("Profit & Loss Report", 14, 27);
  doc.setFontSize(9);  doc.setTextColor(...GRAY);
  doc.text(`Period: ${periodLabel}`, 14, 34);
  doc.text(`Generated: ${now}`, 14, 40);

  const GREEN:   [number, number, number] = [22, 163, 74];
  const GREEN_L: [number, number, number] = [240, 253, 244];
  const GREEN_D: [number, number, number] = [21, 128, 61];
  const RED:     [number, number, number] = [220, 38, 38];
  const RED_L:   [number, number, number] = [254, 242, 242];
  const RED_D:   [number, number, number] = [185, 28, 28];

  let y = 47;

  // Revenue table
  autoTable(doc, {
    startY: y,
    head: [["Revenue", "Code", "Amount"]],
    body: report.revenue.length > 0
      ? report.revenue.map((r) => [r.account.name, r.account.code, fmtFn(r.amount)])
      : [["—", "", ""]],
    foot: [["Total Revenue", "", fmtFn(report.totalRevenue)]],
    headStyles: { fillColor: GREEN, textColor: 255, fontStyle: "bold" },
    footStyles: { fillColor: GREEN_L, textColor: GREEN_D, fontStyle: "bold" },
    columnStyles: { 1: { cellWidth: 22 }, 2: { halign: "right", cellWidth: 36 } },
    styles: { fontSize: 9, cellPadding: 3 },
    margin: { left: 14, right: 14 },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 6;

  // Expenses table
  autoTable(doc, {
    startY: y,
    head: [["Expenses", "Code", "Amount"]],
    body: report.expenses.length > 0
      ? report.expenses.map((r) => [r.account.name, r.account.code, fmtFn(r.amount)])
      : [["—", "", ""]],
    foot: [["Total Expenses", "", fmtFn(report.totalExpenses)]],
    headStyles: { fillColor: RED, textColor: 255, fontStyle: "bold" },
    footStyles: { fillColor: RED_L, textColor: RED_D, fontStyle: "bold" },
    columnStyles: { 1: { cellWidth: 22 }, 2: { halign: "right", cellWidth: 36 } },
    styles: { fontSize: 9, cellPadding: 3 },
    margin: { left: 14, right: 14 },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 6;

  // Net income / loss row
  const isProfit = report.netIncome >= 0;
  const netLabel = isProfit ? "Net Income" : "Net Loss";
  autoTable(doc, {
    startY: y,
    body: [[netLabel, fmtFn(Math.abs(report.netIncome))]],
    bodyStyles: {
      fillColor: isProfit ? GREEN_L : RED_L,
      textColor: isProfit ? GREEN_D : RED_D,
      fontStyle: "bold",
      fontSize: 11,
    },
    columnStyles: { 1: { halign: "right" } },
    styles: { cellPadding: 4 },
    margin: { left: 14, right: 14 },
  });

  return doc.output("blob");
}

export async function generateBalanceSheetPDF(
  report: BalanceSheetReport,
  dateLabel: string,
  fmtFn: (n: number) => string
): Promise<Blob> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF();
  const now = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  doc.setFontSize(18); doc.setTextColor(...INDIGO); doc.text(APP_NAME, 14, 18);
  doc.setFontSize(12); doc.setTextColor(55, 65, 81); doc.text("Balance Sheet", 14, 27);
  doc.setFontSize(9);  doc.setTextColor(...GRAY);
  doc.text(`As of ${dateLabel}`, 14, 34);
  doc.text(`Generated: ${now}`, 14, 40);

  const GREEN:   [number, number, number] = [22, 163, 74];
  const GREEN_L: [number, number, number] = [240, 253, 244];
  const GREEN_D: [number, number, number] = [21, 128, 61];
  const RED:     [number, number, number] = [220, 38, 38];
  const RED_L:   [number, number, number] = [254, 242, 242];
  const RED_D:   [number, number, number] = [185, 28, 28];
  const PURPLE:  [number, number, number] = [124, 58, 237];
  const PURPLE_L:[number, number, number] = [245, 243, 255];
  const PURPLE_D:[number, number, number] = [91, 33, 182];

  const colStyles = { 1: { cellWidth: 24 }, 2: { halign: "right" as const, cellWidth: 30 }, 3: { halign: "right" as const, cellWidth: 30 }, 4: { halign: "right" as const, cellWidth: 30 } };
  const style = { fontSize: 9, cellPadding: 3 };
  const margins = { left: 14, right: 14 };
  let y = 47;

  // Assets
  autoTable(doc, {
    startY: y,
    head: [["Assets", "Code", "Opening", "Activity", "Balance"]],
    body: report.assets.map((r) => [r.account.name, r.account.code, fmtFn(r.openingBalance), fmtFn(r.ledgerBalance), fmtFn(r.totalBalance)]),
    foot: [["Total Assets", "", "", "", fmtFn(report.totalAssets)]],
    headStyles: { fillColor: GREEN, textColor: 255, fontStyle: "bold" },
    footStyles: { fillColor: GREEN_L, textColor: GREEN_D, fontStyle: "bold" },
    columnStyles: colStyles, styles: style, margin: margins,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 6;

  // Liabilities
  autoTable(doc, {
    startY: y,
    head: [["Liabilities", "Code", "Opening", "Activity", "Balance"]],
    body: report.liabilities.map((r) => [r.account.name, r.account.code, fmtFn(r.openingBalance), fmtFn(r.ledgerBalance), fmtFn(r.totalBalance)]),
    foot: [["Total Liabilities", "", "", "", fmtFn(report.totalLiabilities)]],
    headStyles: { fillColor: RED, textColor: 255, fontStyle: "bold" },
    footStyles: { fillColor: RED_L, textColor: RED_D, fontStyle: "bold" },
    columnStyles: colStyles, styles: style, margin: margins,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 6;

  // Equity (including retained earnings)
  const equityBody = [
    ...report.equity.map((r) => [r.account.name, r.account.code, fmtFn(r.openingBalance), fmtFn(r.ledgerBalance), fmtFn(r.totalBalance)]),
    ["Retained Earnings", "", "", "", fmtFn(report.retainedEarnings)],
  ];
  autoTable(doc, {
    startY: y,
    head: [["Equity", "Code", "Opening", "Activity", "Balance"]],
    body: equityBody,
    foot: [["Total Equity", "", "", "", fmtFn(report.totalEquity)]],
    headStyles: { fillColor: PURPLE, textColor: 255, fontStyle: "bold" },
    footStyles: { fillColor: PURPLE_L, textColor: PURPLE_D, fontStyle: "bold" },
    columnStyles: colStyles, styles: style, margin: margins,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 6;

  // Total Liabilities + Equity
  const isBalanced = Math.abs(report.difference) < 0.01;
  autoTable(doc, {
    startY: y,
    body: [
      ["Total Assets", fmtFn(report.totalAssets)],
      ["Total Liabilities + Equity", fmtFn(report.totalLiabilities + report.totalEquity)],
      [isBalanced ? "✓ Balanced" : `⚠ Difference: ${fmtFn(Math.abs(report.difference))}`, ""],
    ],
    bodyStyles: { fontStyle: "bold", fontSize: 10 },
    columnStyles: { 1: { halign: "right" } },
    styles: { cellPadding: 3 },
    margin: margins,
  });

  return doc.output("blob");
}
