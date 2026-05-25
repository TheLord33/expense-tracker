import { Expense } from "./types";
import type { Customer, Invoice, InvoicePayment } from "./types";
import type { PnLReport, BalanceSheetReport, TrialBalanceRow } from "./ledger";

const APP_NAME = "Folio";
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

export async function generateInvoicePDF(
  invoice: Invoice,
  customer: Customer | undefined,
  payments: InvoicePayment[],
  fmtFn: (n: number) => string,
  locale: string
): Promise<Blob> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF();
  const PAGE_W = doc.internal.pageSize.getWidth();

  const GREEN:    [number, number, number] = [22, 163, 74];
  const GREEN_L:  [number, number, number] = [240, 253, 244];
  const GREEN_D:  [number, number, number] = [21, 128, 61];
  const RED_L:    [number, number, number] = [254, 242, 242];
  const RED_D:    [number, number, number] = [185, 28, 28];
  const YELLOW_L: [number, number, number] = [255, 251, 235];
  const YELLOW_D: [number, number, number] = [146, 64, 14];
  const DEFAULT_L:[number, number, number] = [249, 250, 251];
  const DEFAULT_D:[number, number, number] = [55, 65, 81];

  function fmtDateStr(iso: string) {
    const [y, m, d] = iso.split("-");
    return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString(locale, {
      month: "long", day: "numeric", year: "numeric",
    });
  }

  const collected = payments.reduce((s, p) => s + p.amount, 0);
  const amountDue = Math.max(0, invoice.amount - collected);
  const isPaid     = amountDue < 0.01;
  const isOverdue  = !isPaid && invoice.dueDate < new Date().toISOString().split("T")[0];
  const isDueSoon  = !isPaid && !isOverdue && (() => {
    const days = Math.round((new Date(invoice.dueDate).getTime() - Date.now()) / 86400000);
    return days <= 7;
  })();

  // ── Header band ───────────────────────────────────────────────────────────────
  doc.setFillColor(...INDIGO);
  doc.rect(0, 0, PAGE_W, 28, "F");

  // App name (left)
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(APP_NAME, 14, 18);

  // "INVOICE" label (right)
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text("INVOICE", PAGE_W - 14, 18, { align: "right" });

  // ── Invoice meta (right column) ───────────────────────────────────────────────
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);

  const metaX = PAGE_W - 14;
  let metaY = 38;

  function metaRow(label: string, value: string) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DEFAULT_D);
    doc.text(label, metaX - 52, metaY, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(55, 65, 81);
    doc.text(value, metaX, metaY, { align: "right" });
    metaY += 7;
  }

  metaRow("Invoice #", invoice.invoiceNumber || "—");
  metaRow("Date", fmtDateStr(invoice.date));
  metaRow("Due", fmtDateStr(invoice.dueDate));

  // ── Bill To (left column) ─────────────────────────────────────────────────────
  let billY = 36;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GRAY);
  doc.text("BILL TO", 14, billY);
  billY += 6;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(17, 24, 39);
  doc.text(customer?.name ?? "—", 14, billY);
  billY += 6;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  if (customer?.email) { doc.text(customer.email, 14, billY); billY += 5; }
  if (customer?.phone) { doc.text(customer.phone, 14, billY); billY += 5; }

  // ── Divider ───────────────────────────────────────────────────────────────────
  const tableStartY = Math.max(metaY, billY) + 6;

  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(14, tableStartY - 3, PAGE_W - 14, tableStartY - 3);

  // ── Line items table ──────────────────────────────────────────────────────────
  autoTable(doc, {
    startY: tableStartY,
    head: [["Description", "Amount"]],
    body: [[invoice.description, fmtFn(invoice.amount)]],
    headStyles: { fillColor: INDIGO, textColor: 255, fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 10, cellPadding: 5 },
    columnStyles: { 1: { halign: "right", cellWidth: 40 } },
    margin: { left: 14, right: 14 },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let y = (doc as any).lastAutoTable.finalY + 4;

  // ── Payments received (if any) ────────────────────────────────────────────────
  if (payments.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Payments Received", "Date", "Note", "Amount"]],
      body: payments.map((p) => [
        "", fmtDateStr(p.date), p.note ?? "", fmtFn(p.amount),
      ]),
      headStyles: { fillColor: GREEN, textColor: 255, fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 9, cellPadding: 3, textColor: [55, 65, 81] },
      columnStyles: {
        0: { cellWidth: 0 },
        1: { cellWidth: 36 },
        2: { cellWidth: 80 },
        3: { halign: "right", cellWidth: 36 },
      },
      margin: { left: 14, right: 14 },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 4;
  }

  // ── Totals block ──────────────────────────────────────────────────────────────
  const totalsBody: [string, string][] = [
    ["Subtotal", fmtFn(invoice.amount)],
  ];
  if (collected > 0) totalsBody.push(["Collected", fmtFn(collected)]);

  autoTable(doc, {
    startY: y,
    body: totalsBody,
    bodyStyles: { fontSize: 9, cellPadding: 3, textColor: [55, 65, 81] },
    columnStyles: { 0: { halign: "right" }, 1: { halign: "right", cellWidth: 40 } },
    margin: { left: 14, right: 14 },
    tableWidth: "wrap",
    tableLineWidth: 0,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 2;

  // Amount due highlight row
  const dueFill  = isPaid ? GREEN_L  : isOverdue ? RED_L    : isDueSoon ? YELLOW_L : DEFAULT_L;
  const dueColor = isPaid ? GREEN_D  : isOverdue ? RED_D    : isDueSoon ? YELLOW_D : DEFAULT_D;
  autoTable(doc, {
    startY: y,
    body: [["Amount Due", fmtFn(amountDue)]],
    bodyStyles: { fillColor: dueFill, textColor: dueColor, fontStyle: "bold", fontSize: 12, cellPadding: 4 },
    columnStyles: { 0: { halign: "right" }, 1: { halign: "right", cellWidth: 40 } },
    margin: { left: 14, right: 14 },
    tableWidth: "wrap",
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 6;

  // Status badge
  const statusLabel = isPaid ? "PAID" : isOverdue ? "OVERDUE" : isDueSoon ? "DUE SOON" : "UNPAID";
  const badgeFill   = isPaid ? GREEN  : isOverdue ? [220, 38, 38] as [number, number, number] : isDueSoon ? [245, 158, 11] as [number, number, number] : [107, 114, 128] as [number, number, number];
  doc.setFillColor(...badgeFill);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  const badgeW = doc.getTextWidth(statusLabel) + 10;
  doc.roundedRect(PAGE_W - 14 - badgeW, y, badgeW, 8, 2, 2, "F");
  doc.text(statusLabel, PAGE_W - 14 - badgeW / 2, y + 5.5, { align: "center" });

  // ── Footer ────────────────────────────────────────────────────────────────────
  const PAGE_H = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  doc.text(`Generated by ${APP_NAME}`, PAGE_W / 2, PAGE_H - 8, { align: "center" });

  return doc.output("blob");
}

export async function generateTrialBalancePDF(
  rows: TrialBalanceRow[],
  dateLabel: string,
  fmtFn: (n: number) => string,
  totalDebit: number,
  totalCredit: number
): Promise<Blob> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF();
  const now = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  doc.setFontSize(18); doc.setTextColor(...INDIGO); doc.text(APP_NAME, 14, 18);
  doc.setFontSize(12); doc.setTextColor(55, 65, 81); doc.text("Trial Balance", 14, 27);
  doc.setFontSize(9);  doc.setTextColor(...GRAY);
  doc.text(`As of ${dateLabel}`, 14, 34);
  doc.text(`Generated: ${now}`, 14, 40);

  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  autoTable(doc, {
    startY: 47,
    head: [["Code", "Account", "Type", "Debit", "Credit"]],
    body: rows.map((r) => [
      r.account.code,
      r.account.name,
      r.account.type.charAt(0).toUpperCase() + r.account.type.slice(1),
      r.totalDebit > 0 ? fmtFn(r.totalDebit) : "—",
      r.totalCredit > 0 ? fmtFn(r.totalCredit) : "—",
    ]),
    foot: [
      ["", "Totals", "", fmtFn(totalDebit), fmtFn(totalCredit)],
      ["", isBalanced ? "✓ Balanced" : "⚠ Out of balance", "", "", ""],
    ],
    headStyles: { fillColor: INDIGO, textColor: 255, fontStyle: "bold" },
    footStyles: { fillColor: [238, 242, 255], textColor: [55, 48, 163], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 18 },
      2: { cellWidth: 22 },
      3: { halign: "right", cellWidth: 28 },
      4: { halign: "right", cellWidth: 28 },
    },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    styles: { fontSize: 9, cellPadding: 3 },
    margin: { left: 14, right: 14 },
  });

  return doc.output("blob");
}
