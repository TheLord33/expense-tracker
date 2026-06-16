import { Expense } from "./types";
import type { Bill, BillPayment, CompanyProfile, Customer, Employee, Invoice, InvoicePayment, PayRun, PayRunLine, Vendor } from "./types";
import { invoiceTotal, invoiceSubtotal } from "./useAR";

function custAddrLines(c: Customer): string[] {
  if (c.street || c.city || c.state || c.zip) {
    const lines: string[] = [];
    if (c.street) lines.push(c.street);
    const mid = [c.city, c.state, c.zip].filter(Boolean).join(", ");
    if (mid) lines.push(mid);
    if (c.country) lines.push(c.country);
    return lines;
  }
  return c.address ? c.address.split("\n").map((l) => l.trim()).filter(Boolean) : [];
}
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
  company: CompanyProfile | null,
  fmtFn: (n: number) => string,
  locale: string
): Promise<Blob> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF();
  const PAGE_W = doc.internal.pageSize.getWidth();
  const PAGE_H = doc.internal.pageSize.getHeight();

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

  const total     = invoiceTotal(invoice);
  const collected = payments.reduce((s, p) => s + p.amount, 0);
  const amountDue = Math.max(0, total - collected);
  const isPaid    = amountDue < 0.01;
  const isOverdue = !isPaid && invoice.dueDate < new Date().toISOString().split("T")[0];
  const isDueSoon = !isPaid && !isOverdue && (() => {
    const days = Math.round((new Date(invoice.dueDate).getTime() - Date.now()) / 86400000);
    return days <= 7;
  })();

  // ── Header band ───────────────────────────────────────────────────────────────
  doc.setFillColor(...INDIGO);
  doc.rect(0, 0, PAGE_W, 28, "F");

  // Left: app watermark
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255, 0.6);
  doc.setTextColor(200, 210, 255);
  doc.text(APP_NAME, 14, 10);

  // Left: company name (large) inside band
  const senderName = company?.name?.trim() || APP_NAME;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(senderName, 14, 22);

  // Right: "INVOICE" label
  doc.setFontSize(20);
  doc.text("INVOICE", PAGE_W - 14, 20, { align: "right" });

  // ── Sender info (left, below band) ───────────────────────────────────────────
  let senderY = 34;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);

  if (company?.address) {
    // Split on newlines so multi-line addresses render correctly
    const lines = company.address.split("\n").map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      doc.text(line, 14, senderY);
      senderY += 4.5;
    }
  }
  if (company?.email)   { doc.text(company.email,   14, senderY); senderY += 4.5; }
  if (company?.phone)   { doc.text(company.phone,   14, senderY); senderY += 4.5; }
  if (company?.website) { doc.text(company.website, 14, senderY); senderY += 4.5; }
  if (company?.taxId)   {
    doc.setFont("helvetica", "bold");
    doc.text(`Tax ID: ${company.taxId}`, 14, senderY);
    doc.setFont("helvetica", "normal");
    senderY += 4.5;
  }

  // ── Invoice meta (right column) ───────────────────────────────────────────────
  const metaX = PAGE_W - 14;
  let metaY = 34;

  function metaRow(label: string, value: string) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DEFAULT_D);
    doc.text(label, metaX - 50, metaY, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(55, 65, 81);
    doc.text(value, metaX, metaY, { align: "right" });
    metaY += 6;
  }

  metaRow("Invoice #", invoice.invoiceNumber || "—");
  metaRow("Date",      fmtDateStr(invoice.date));
  metaRow("Due",       fmtDateStr(invoice.dueDate));

  // ── Divider ───────────────────────────────────────────────────────────────────
  const dividerY = Math.max(senderY, metaY) + 4;
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(14, dividerY, PAGE_W - 14, dividerY);

  // ── Bill To ───────────────────────────────────────────────────────────────────
  let billY = dividerY + 6;
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GRAY);
  doc.text("BILL TO", 14, billY);
  billY += 5;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(17, 24, 39);
  doc.text(customer?.name ?? "—", 14, billY);
  billY += 6;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  if (customer) {
    for (const line of custAddrLines(customer)) { doc.text(line, 14, billY); billY += 4.5; }
  }
  if (customer?.email) { doc.text(customer.email, 14, billY); billY += 4.5; }
  if (customer?.phone) { doc.text(customer.phone, 14, billY); billY += 4.5; }

  // ── Line items table ──────────────────────────────────────────────────────────
  const tableStartY = billY + 6;

  const lineRows: [string, string, string, string][] = invoice.lines?.length
    ? invoice.lines.map((l) => [
        l.description,
        String(l.quantity % 1 === 0 ? l.quantity : l.quantity.toFixed(3)),
        fmtFn(l.unitPrice),
        fmtFn(l.quantity * l.unitPrice),
      ])
    : [[(invoice.description ?? ""), "1", fmtFn(total), fmtFn(total)]];

  autoTable(doc, {
    startY: tableStartY,
    head: [["Description", "Qty", "Unit Price", "Amount"]],
    body: lineRows,
    headStyles: { fillColor: INDIGO, textColor: 255, fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 10, cellPadding: 5 },
    columnStyles: {
      1: { halign: "right", cellWidth: 20 },
      2: { halign: "right", cellWidth: 36 },
      3: { halign: "right", cellWidth: 40 },
    },
    margin: { left: 14, right: 14 },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let y = (doc as any).lastAutoTable.finalY + 4;

  // ── Payments received ─────────────────────────────────────────────────────────
  if (payments.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Payments Received", "Date", "Note", "Amount"]],
      body: payments.map((p) => ["", fmtDateStr(p.date), p.note ?? "", fmtFn(p.amount)]),
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
  const subtotal = invoiceSubtotal(invoice);
  const taxAmt   = invoice.taxAmount ?? 0;
  const totalsBody: [string, string][] = [["Subtotal", fmtFn(subtotal)]];
  if (taxAmt > 0) {
    const pct = invoice.taxRate ? ` (${(invoice.taxRate * 100).toFixed(2)}%)` : "";
    totalsBody.push([`Tax${pct}`, fmtFn(taxAmt)]);
    totalsBody.push(["Total", fmtFn(total)]);
  }
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

  // Amount due
  const dueFill  = isPaid ? GREEN_L : isOverdue ? RED_L    : isDueSoon ? YELLOW_L : DEFAULT_L;
  const dueColor = isPaid ? GREEN_D : isOverdue ? RED_D    : isDueSoon ? YELLOW_D : DEFAULT_D;
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
  const badgeFill   = isPaid
    ? GREEN
    : isOverdue
      ? [220, 38, 38] as [number, number, number]
      : isDueSoon
        ? [245, 158, 11] as [number, number, number]
        : [107, 114, 128] as [number, number, number];
  doc.setFillColor(...badgeFill);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  const badgeW = doc.getTextWidth(statusLabel) + 10;
  doc.roundedRect(PAGE_W - 14 - badgeW, y, badgeW, 8, 2, 2, "F");
  doc.text(statusLabel, PAGE_W - 14 - badgeW / 2, y + 5.5, { align: "center" });

  // ── Footer ────────────────────────────────────────────────────────────────────
  doc.setFillColor(248, 250, 252);
  doc.rect(0, PAGE_H - 14, PAGE_W, 14, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  doc.text(`Generated by ${APP_NAME}`, PAGE_W / 2, PAGE_H - 5, { align: "center" });

  return doc.output("blob");
}

// ── AR Statement PDF ───────────────────────────────────────────────────────────

export async function generateStatementPDF(
  customer: Customer,
  invoices: Invoice[],
  payments: InvoicePayment[],
  company: CompanyProfile | null,
  fmtFn: (n: number) => string,
  locale: string,
  startDate?: string,
  endDate?: string
): Promise<Blob> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc    = new jsPDF();
  const PAGE_W = doc.internal.pageSize.getWidth();
  const PAGE_H = doc.internal.pageSize.getHeight();
  const today  = new Date().toISOString().split("T")[0];

  function fmtDateStr(iso: string) {
    const [y, m, d] = iso.split("-");
    return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString(locale, {
      month: "short", day: "numeric", year: "numeric",
    });
  }

  // ── Header band ───────────────────────────────────────────────────────────────
  doc.setFillColor(...INDIGO);
  doc.rect(0, 0, PAGE_W, 28, "F");

  doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.setTextColor(200, 210, 255);
  doc.text(APP_NAME, 14, 10);

  const senderName = company?.name?.trim() || APP_NAME;
  doc.setFontSize(18); doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(senderName, 14, 22);

  doc.setFontSize(14);
  doc.text("STATEMENT", PAGE_W - 14, 20, { align: "right" });

  // ── Sender info ───────────────────────────────────────────────────────────────
  let senderY = 34;
  doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(...GRAY);
  if (company?.address) {
    for (const line of company.address.split("\n").map((l) => l.trim()).filter(Boolean)) {
      doc.text(line, 14, senderY); senderY += 4.5;
    }
  }
  if (company?.email)   { doc.text(company.email,   14, senderY); senderY += 4.5; }
  if (company?.phone)   { doc.text(company.phone,   14, senderY); senderY += 4.5; }
  if (company?.taxId)   { doc.setFont("helvetica", "bold"); doc.text(`Tax ID: ${company.taxId}`, 14, senderY); doc.setFont("helvetica", "normal"); senderY += 4.5; }

  // ── Statement meta (right) ────────────────────────────────────────────────────
  const metaX = PAGE_W - 14;
  let metaY   = 34;
  function metaRow(label: string, value: string) {
    doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(55, 65, 81);
    doc.text(label, metaX - 50, metaY, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.text(value, metaX, metaY, { align: "right" }); metaY += 6;
  }
  metaRow("Statement Date:", fmtDateStr(today));
  const periodLabel = startDate || endDate
    ? `${startDate ? fmtDateStr(startDate) : "—"}  →  ${endDate ? fmtDateStr(endDate) : fmtDateStr(today)}`
    : "All Time";
  metaRow("Period:", periodLabel);

  // ── Divider ───────────────────────────────────────────────────────────────────
  const divY = Math.max(senderY, metaY) + 4;
  doc.setDrawColor(229, 231, 235); doc.setLineWidth(0.3);
  doc.line(14, divY, PAGE_W - 14, divY);

  // ── Customer info ─────────────────────────────────────────────────────────────
  let custY = divY + 6;
  doc.setFontSize(7); doc.setFont("helvetica", "bold"); doc.setTextColor(...GRAY);
  doc.text("STATEMENT FOR", 14, custY); custY += 5;
  doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(17, 24, 39);
  doc.text(customer.name, 14, custY); custY += 6;
  doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(...GRAY);
  for (const line of custAddrLines(customer)) { doc.text(line, 14, custY); custY += 4.5; }
  if (customer.email) { doc.text(customer.email, 14, custY); custY += 4.5; }
  if (customer.phone) { doc.text(customer.phone, 14, custY); custY += 4.5; }

  // ── Build transaction rows ────────────────────────────────────────────────────
  type TxRow = { date: string; ref: string; description: string; charges: number; credits: number };
  const rows: TxRow[] = [];

  for (const inv of invoices) {
    if (startDate && inv.date < startDate) continue;
    if (endDate   && inv.date > endDate)   continue;
    rows.push({
      date:        inv.date,
      ref:         `INV-${inv.invoiceNumber}`,
      description: inv.lines?.[0]?.description ?? (inv.description ?? "Invoice"),
      charges:     invoiceTotal(inv),
      credits:     0,
    });
  }

  for (const pmt of payments) {
    if (startDate && pmt.date < startDate) continue;
    if (endDate   && pmt.date > endDate)   continue;
    const inv = invoices.find((i) => i.id === pmt.invoiceId);
    rows.push({
      date:        pmt.date,
      ref:         inv ? `INV-${inv.invoiceNumber}` : "—",
      description: pmt.note ?? "Payment received",
      charges:     0,
      credits:     pmt.amount,
    });
  }

  rows.sort((a, b) => a.date.localeCompare(b.date));

  // Opening balance: outstanding invoices before startDate
  let openingBalance = 0;
  if (startDate) {
    for (const inv of invoices) {
      if (inv.date >= startDate) continue;
      const paid = payments
        .filter((p) => p.invoiceId === inv.id && p.date < startDate)
        .reduce((s, p) => s + p.amount, 0);
      openingBalance += Math.max(0, invoiceTotal(inv) - paid);
    }
  }

  // ── Transactions table ────────────────────────────────────────────────────────
  const tableY = custY + 6;
  let runBalance = openingBalance;

  type TableRow = [string, string, string, string, string, string];
  const tableBody: TableRow[] = [];

  if (openingBalance > 0.005) {
    tableBody.push(["", "", "Opening Balance", "", "", fmtFn(openingBalance)]);
  }

  for (const row of rows) {
    runBalance += row.charges - row.credits;
    tableBody.push([
      fmtDateStr(row.date),
      row.ref,
      row.description,
      row.charges > 0 ? fmtFn(row.charges) : "—",
      row.credits > 0 ? fmtFn(row.credits) : "—",
      fmtFn(Math.max(0, runBalance)),
    ]);
  }

  const totalDue = Math.max(0, runBalance);

  autoTable(doc, {
    startY: tableY,
    head: [["Date", "Reference", "Description", "Charges", "Credits", "Balance"]],
    body: tableBody,
    headStyles: { fillColor: INDIGO, textColor: 255, fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8, cellPadding: 3, textColor: [55, 65, 81] },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 26 },
      3: { halign: "right", cellWidth: 26 },
      4: { halign: "right", cellWidth: 26 },
      5: { halign: "right", cellWidth: 30 },
    },
    margin: { left: 14, right: 14 },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let y = (doc as any).lastAutoTable.finalY + 4;

  // ── Total Due row ─────────────────────────────────────────────────────────────
  const dueFill:  [number, number, number] = totalDue < 0.01 ? [240, 253, 244] : [254, 242, 242];
  const dueColor: [number, number, number] = totalDue < 0.01 ? [21, 128, 61]   : [185, 28, 28];
  autoTable(doc, {
    startY: y,
    body: [["Total Due", fmtFn(totalDue)]],
    bodyStyles: { fillColor: dueFill, textColor: dueColor, fontStyle: "bold", fontSize: 11, cellPadding: 4 },
    columnStyles: { 0: { halign: "right" }, 1: { halign: "right", cellWidth: 40 } },
    margin: { left: 14, right: 14 },
    tableWidth: "wrap",
  });

  // ── Footer ────────────────────────────────────────────────────────────────────
  doc.setFillColor(248, 250, 252);
  doc.rect(0, PAGE_H - 14, PAGE_W, 14, "F");
  doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(...GRAY);
  doc.text(`Generated by ${APP_NAME}`, PAGE_W / 2, PAGE_H - 5, { align: "center" });

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

// ── Amount-to-words (English, up to 999,999.99) ───────────────────────────────
function amountToWords(amount: number): string {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function below100(n: number): string {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
  }
  function below1000(n: number): string {
    if (n < 100) return below100(n);
    return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + below100(n % 100) : "");
  }

  const dollars = Math.floor(amount);
  const cents   = Math.round((amount - dollars) * 100);
  let words = "";
  if (dollars >= 1000) words += below1000(Math.floor(dollars / 1000)) + " Thousand ";
  words += below1000(dollars % 1000);
  words = words.trim() || "Zero";
  return words.toUpperCase() + ` AND ${String(cents).padStart(2, "0")}/100`;
}

export interface CheckLineItem {
  billNumber?: string;
  vendorInvoiceNumber?: string;
  description?: string;
  dueDate?: string;
  originalAmount: number;
  discount: number;
  netAmount: number;
}

export interface CheckData {
  checkNumber: string;
  date: string;
  payee: string;
  amount: number;
  memo?: string;
  lineItems?: CheckLineItem[];
  billIds?: string[];
}

export async function printChecksPDF(
  checks: CheckData[],
  company: CompanyProfile | null,
  fmtFn: (n: number) => string
): Promise<Blob> {
  const { default: jsPDF } = await import("jspdf");

  // Standard 8.5" × 11" voucher check: top third = remittance stub, middle third = check
  const W = 8.5, H = 11;
  const doc = new jsPDF({ orientation: "portrait", unit: "in", format: "letter" });

  checks.forEach((chk, idx) => {
    if (idx > 0) doc.addPage("letter", "portrait");

    const dateStr = new Date(chk.date + "T00:00:00").toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric",
    });

    // ─── REMITTANCE STUB (top third: 0.2" → 3.6") ──────────────────────────
    const sT = 0.2, sH = 3.4;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.008);
    doc.rect(0.3, sT, W - 0.6, sH);

    // Stub header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(55, 65, 81);
    doc.text(company?.name ?? "Your Company", 0.5, sT + 0.35);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("REMITTANCE ADVICE", W - 0.5, sT + 0.35, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(107, 114, 128);
    if (company?.address) doc.text(company.address, 0.5, sT + 0.55);
    doc.text(`Check #: ${chk.checkNumber}`, W - 0.5, sT + 0.55, { align: "right" });
    doc.text(`Date: ${dateStr}`, W - 0.5, sT + 0.72, { align: "right" });
    doc.text(`Pay to: ${chk.payee}`, 0.5, sT + 0.72);

    // Column header row
    const hdrY = sT + 1.05;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.005);
    doc.line(0.3, hdrY - 0.18, W - 0.3, hdrY - 0.18);

    const cols = {
      bill:    { label: "Bill #",        x: 0.5,        align: "left"  as const },
      vinv:    { label: "Vendor Inv #",  x: 1.35,       align: "left"  as const },
      desc:    { label: "Description",   x: 2.45,       align: "left"  as const },
      due:     { label: "Due Date",      x: 5.15,       align: "left"  as const },
      orig:    { label: "Amount",        x: 6.35,       align: "right" as const },
      disc:    { label: "Discount",      x: 7.2,        align: "right" as const },
      net:     { label: "Net",           x: 8.1,        align: "right" as const },
    };

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    for (const col of Object.values(cols)) {
      doc.text(col.label, col.x, hdrY, { align: col.align });
    }
    doc.line(0.3, hdrY + 0.1, W - 0.3, hdrY + 0.1);

    // Line items
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    let lineY = hdrY + 0.28;
    const items = chk.lineItems ?? [];
    const hasDiscount = items.some((li) => li.discount > 0);

    for (const item of items) {
      const desc = (item.description ?? "").length > 35
        ? (item.description ?? "").slice(0, 33) + "…"
        : (item.description ?? "");
      const dueStr = item.dueDate
        ? new Date(item.dueDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })
        : "";

      doc.setTextColor(30, 30, 30);
      doc.text(item.billNumber ?? "", cols.bill.x, lineY, { align: "left" });
      doc.text(item.vendorInvoiceNumber ?? "", cols.vinv.x, lineY, { align: "left" });
      doc.text(desc, cols.desc.x, lineY, { align: "left" });
      doc.text(dueStr, cols.due.x, lineY, { align: "left" });
      doc.text(fmtFn(item.originalAmount), cols.orig.x, lineY, { align: "right" });
      if (item.discount > 0) {
        doc.setTextColor(22, 163, 74);
        doc.text(`(${fmtFn(item.discount)})`, cols.disc.x, lineY, { align: "right" });
        doc.setTextColor(30, 30, 30);
      }
      doc.text(fmtFn(item.netAmount), cols.net.x, lineY, { align: "right" });
      lineY += 0.22;
    }

    // Totals row
    doc.setDrawColor(200, 200, 200);
    doc.line(0.3, lineY + 0.02, W - 0.3, lineY + 0.02);
    lineY += 0.22;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(55, 65, 81);
    if (hasDiscount) {
      const totalDisc = items.reduce((s, li) => s + li.discount, 0);
      doc.text(`(${fmtFn(totalDisc)})`, cols.disc.x, lineY, { align: "right" });
    }
    doc.text("Total:", cols.orig.x, lineY, { align: "right" });
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(8.5);
    doc.text(fmtFn(chk.amount), cols.net.x, lineY, { align: "right" });

    // ─── DASHED CUT LINE ────────────────────────────────────────────────────
    const cutY = sT + sH + 0.1;
    doc.setLineDashPattern([0.08, 0.08], 0);
    doc.setDrawColor(160, 160, 160);
    doc.setLineWidth(0.005);
    doc.line(0.3, cutY, W - 0.3, cutY);
    doc.setLineDashPattern([], 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(180, 180, 180);
    doc.text("✂  DETACH AND RETAIN THIS STUB FOR YOUR RECORDS", W / 2, cutY - 0.06, { align: "center" });

    // ─── CHECK (middle third: ~3.8" → 7.15") ────────────────────────────────
    const cT = cutY + 0.15;
    const cH = 3.35;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.008);
    doc.rect(0.3, cT, W - 0.6, cH);

    // Company block
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(55, 65, 81);
    doc.text(company?.name ?? "Your Company", 0.5, cT + 0.38);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    if (company?.address) doc.text(company.address, 0.5, cT + 0.58);

    // Date + check number (top right of check)
    doc.setFontSize(8.5);
    doc.setTextColor(55, 65, 81);
    doc.text("Date:", W - 2.9, cT + 0.38);
    doc.setFont("helvetica", "bold");
    doc.text(dateStr, W - 2.35, cT + 0.38);
    doc.setFont("helvetica", "normal");
    doc.text("Check #:", W - 2.9, cT + 0.58);
    doc.setFont("helvetica", "bold");
    doc.text(chk.checkNumber, W - 2.2, cT + 0.58);

    // Pay to the order of
    const payY = cT + 1.05;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text("Pay to the order of:", 0.5, payY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.text(chk.payee, 2.25, payY);
    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(0.007);
    doc.line(2.22, payY + 0.07, W - 1.7, payY + 0.07);

    // Amount box
    doc.setLineWidth(0.012);
    doc.rect(W - 1.55, payY - 0.27, 1.2, 0.4);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.text("$" + fmtFn(chk.amount).replace(/[^0-9.,]/g, ""), W - 1.45, payY + 0.02);

    // Amount in words
    const wordsY = payY + 0.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(55, 65, 81);
    const wordsText = amountToWords(chk.amount) + " DOLLARS";
    doc.text(wordsText, 0.5, wordsY);
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.006);
    doc.line(0.5, wordsY + 0.09, W - 0.4, wordsY + 0.09);

    // Memo + signature
    const memoY = wordsY + 0.58;
    doc.setFontSize(8.5);
    doc.setTextColor(107, 114, 128);
    doc.text("Memo:", 0.5, memoY);
    doc.setTextColor(55, 65, 81);
    if (chk.memo) doc.text(chk.memo, 1.15, memoY);
    doc.setDrawColor(180, 180, 180);
    doc.line(1.12, memoY + 0.09, W / 2 + 0.5, memoY + 0.09);

    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(0.008);
    doc.line(W - 2.7, memoY + 0.09, W - 0.4, memoY + 0.09);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text("Authorized Signature", W - 2.35, memoY + 0.23);

    // MICR-style footer
    doc.setFont("courier", "normal");
    doc.setFontSize(8);
    doc.setTextColor(190, 190, 190);
    doc.text(
      `⑆ ${chk.checkNumber.padStart(6, "0")} ⑆  ⑉ 000000000 ⑉  ⑈ 0000000000 ⑈`,
      0.5, cT + cH - 0.2
    );
  });

  return doc.output("blob");
}

// ── Pay Stub PDF ───────────────────────────────────────────────────────────────

export async function generatePayStubPDF(
  run: PayRun,
  line: PayRunLine,
  employee: Employee,
  company: CompanyProfile,
  fmt: (n: number) => string
): Promise<Blob> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const PW = 215.9;
  const M  = 14;

  function fmtDate(iso: string) {
    const [y, m, d] = iso.split("-");
    return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...INDIGO);
  doc.text(company.name || "Folio", M, 18);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  if (company.address) {
    const addrLines = company.address.split("\n").filter(Boolean);
    addrLines.forEach((l, i) => doc.text(l, M, 24 + i * 4));
  }

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(17, 24, 39);
  doc.text("PAY STUB", PW - M, 18, { align: "right" });

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  doc.text(`Pay Period: ${fmtDate(run.periodFrom)} – ${fmtDate(run.periodTo)}`, PW - M, 24, { align: "right" });
  doc.text(`Pay Date: ${fmtDate(run.payDate)}`, PW - M, 29, { align: "right" });

  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(M, 36, PW - M, 36);

  let y = 44;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(17, 24, 39);
  doc.text("EMPLOYEE", M, y);
  doc.text("PAY SUMMARY", PW / 2, y);

  y += 5;
  doc.setFontSize(11);
  const fullName = [employee.firstName, employee.middleInitial ? employee.middleInitial + "." : "", employee.lastName].filter(Boolean).join(" ");
  doc.text(fullName, M, y);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  if (employee.jobTitle)   { y += 5; doc.text(employee.jobTitle,  M, y); }
  if (employee.department) { y += 4; doc.text(employee.department, M, y); }
  if (employee.street || employee.city) {
    const addrLine = [employee.street, [employee.city, employee.state, employee.zip].filter(Boolean).join(", ")].filter(Boolean).join(", ");
    y += 4; doc.text(addrLine, M, y);
  }
  if (employee.ssn && employee.ssn.replace(/\D/g, "").length === 9) {
    const d = employee.ssn.replace(/\D/g, "");
    y += 4; doc.text(`SSN: ***-**-${d.slice(5)}`, M, y);
  }

  const boxX = PW / 2;
  const summaryStartY = 49;
  const summaryRows: [string, string][] = [
    ["Gross Pay",        fmt(line.grossPay)],
    ["Total Deductions", fmt(line.totalPreTax + line.totalEmployeeWithholding + line.garnishment + line.otherPostTax)],
    ["Net Pay",          fmt(line.netPay)],
  ];
  summaryRows.forEach(([label, value], i) => {
    const ry = summaryStartY + i * 7;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text(label, boxX, ry);
    const isNet = label === "Net Pay";
    doc.setFont("helvetica", "bold");
    doc.setTextColor(isNet ? INDIGO[0] : 17, isNet ? INDIGO[1] : 24, isNet ? INDIGO[2] : 39);
    doc.text(value, PW - M, ry, { align: "right" });
  });

  y = Math.max(y, summaryStartY + summaryRows.length * 7) + 10;

  autoTable(doc, {
    startY: y,
    head: [["EARNINGS", "Hours", "Rate", "Amount"]],
    body: [
      ...(employee.payType === "hourly" ? [
        ["Regular Pay", String(line.regularHours ?? 0), fmt(employee.payRate), fmt(line.regularPay)],
        ...(line.overtimePay > 0 ? [["Overtime (1.5×)", String(line.overtimeHours ?? 0), fmt(employee.payRate * 1.5), fmt(line.overtimePay)]] : []),
      ] : [
        ["Salary", "—", "—", fmt(line.grossPay)],
      ]),
      [{ content: "Gross Pay", styles: { fontStyle: "bold" } }, "", "", fmt(line.grossPay)],
    ],
    theme: "plain",
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [243, 244, 246], textColor: [...GRAY], fontStyle: "bold", fontSize: 7 },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
    margin: { left: M, right: M },
  });

  const afterEarnings = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
  const colW = (PW - M * 2 - 6) / 2;

  autoTable(doc, {
    startY: afterEarnings,
    head: [["PRE-TAX DEDUCTIONS", "Amount"]],
    body: [
      ...(line.healthPremium  > 0 ? [["Health Insurance", fmt(line.healthPremium)]]  : []),
      ...(line.dentalPremium  > 0 ? [["Dental Insurance", fmt(line.dentalPremium)]]  : []),
      ...(line.visionPremium  > 0 ? [["Vision Insurance", fmt(line.visionPremium)]]  : []),
      ...(line.retirement401k > 0 ? [["401(k)",           fmt(line.retirement401k)]] : []),
      ...(line.hsa            > 0 ? [["HSA",              fmt(line.hsa)]]            : []),
      [{ content: "Total Pre-Tax", styles: { fontStyle: "bold" } }, fmt(line.totalPreTax)],
    ],
    theme: "plain",
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [243, 244, 246], textColor: [...GRAY], fontStyle: "bold", fontSize: 7 },
    columnStyles: { 1: { halign: "right" } },
    tableWidth: colW,
    margin: { left: M, right: M + colW + 6 },
  });

  autoTable(doc, {
    startY: afterEarnings,
    head: [["TAXES & WITHHOLDING", "Amount"]],
    body: [
      ["Federal Income Tax",  fmt(line.federalIncomeTax)],
      ["Social Security",     fmt(line.socialSecurityTax)],
      ["Medicare",            fmt(line.medicareTax)],
      ...(line.stateIncomeTax > 0 ? [["State Income Tax", fmt(line.stateIncomeTax)]] : []),
      ...(line.garnishment    > 0 ? [["Garnishment",       fmt(line.garnishment)]]    : []),
      ...(line.otherPostTax   > 0 ? [["Other Post-Tax",    fmt(line.otherPostTax)]]   : []),
      [{ content: "Total Withheld", styles: { fontStyle: "bold" } },
       fmt(line.totalEmployeeWithholding + line.garnishment + line.otherPostTax)],
    ],
    theme: "plain",
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [243, 244, 246], textColor: [...GRAY], fontStyle: "bold", fontSize: 7 },
    columnStyles: { 1: { halign: "right" } },
    tableWidth: colW,
    margin: { left: M + colW + 6, right: M },
  });

  const lastY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  doc.setFillColor(...INDIGO);
  doc.roundedRect(M, lastY, PW - M * 2, 14, 2, 2, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("NET PAY", M + 6, lastY + 9);
  doc.text(fmt(line.netPay), PW - M - 6, lastY + 9, { align: "right" });

  const empY = lastY + 22;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GRAY);
  doc.text("EMPLOYER TAXES (informational)", M, empY);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Social Security: ${fmt(line.employerSocialSecurity)}   Medicare: ${fmt(line.employerMedicare)}   FUTA: ${fmt(line.futa)}   Total Employer Cost: ${fmt(line.grossPay + line.totalEmployerTax)}`,
    M, empY + 5
  );

  doc.setFontSize(7);
  doc.setTextColor(156, 163, 175);
  doc.text(
    "Federal withholding computed using 2025 IRS Publication 15-T percentage method. Verify with a payroll professional.",
    M, empY + 12
  );

  return doc.output("blob");
}

export async function generatePayrollSummaryPDF(
  run: PayRun,
  employees: Employee[],
  company: CompanyProfile,
  fmt: (n: number) => string
): Promise<Blob> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const PW = 215.9;
  const M  = 14;

  function fmtDate(iso: string) {
    const [y, m, d] = iso.split("-");
    return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...INDIGO);
  doc.text(company.name || "Folio", M, 18);

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(17, 24, 39);
  doc.text("Payroll Summary", PW - M, 16, { align: "right" });

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  doc.text(`Pay Period: ${fmtDate(run.periodFrom)} – ${fmtDate(run.periodTo)}`, PW - M, 22, { align: "right" });
  doc.text(`Pay Date: ${fmtDate(run.payDate)}`, PW - M, 27, { align: "right" });

  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(M, 32, PW - M, 32);

  const rows = run.lines.map((l) => {
    const emp = employees.find((e) => e.id === l.employeeId);
    return [
      emp ? [emp.firstName, emp.middleInitial ? emp.middleInitial + "." : "", emp.lastName].filter(Boolean).join(" ") : "—",
      fmt(l.grossPay),
      fmt(l.totalPreTax),
      fmt(l.totalEmployeeWithholding),
      fmt(l.garnishment + l.otherPostTax),
      fmt(l.netPay),
      fmt(l.totalEmployerTax),
    ];
  });

  const totals = run.lines.reduce(
    (acc, l) => ({
      gross:    acc.gross    + l.grossPay,
      preTax:   acc.preTax   + l.totalPreTax,
      withhold: acc.withhold + l.totalEmployeeWithholding,
      postTax:  acc.postTax  + l.garnishment + l.otherPostTax,
      net:      acc.net      + l.netPay,
      empTax:   acc.empTax   + l.totalEmployerTax,
    }),
    { gross: 0, preTax: 0, withhold: 0, postTax: 0, net: 0, empTax: 0 }
  );

  autoTable(doc, {
    startY: 38,
    head: [["Employee", "Gross Pay", "Pre-Tax Ded.", "Withholding", "Post-Tax Ded.", "Net Pay", "Employer Tax"]],
    body: [
      ...rows,
      [
        { content: "TOTALS", styles: { fontStyle: "bold" } },
        fmt(totals.gross), fmt(totals.preTax), fmt(totals.withhold),
        fmt(totals.postTax), fmt(totals.net), fmt(totals.empTax),
      ],
    ],
    theme: "striped",
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [...INDIGO], textColor: [255, 255, 255], fontSize: 7, fontStyle: "bold" },
    columnStyles: {
      1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" },
      4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" },
    },
    margin: { left: M, right: M },
  });

  const lastY2 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  doc.setFontSize(7);
  doc.setTextColor(156, 163, 175);
  doc.text(
    "Federal withholding computed using 2025 IRS Publication 15-T percentage method. Verify with a payroll professional.",
    M, lastY2
  );

  return doc.output("blob");
}
