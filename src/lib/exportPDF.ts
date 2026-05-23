import { Expense } from "./types";

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
  doc.setTextColor(79, 70, 229); // indigo-600
  doc.text("Family Finance Tracker", 14, 18);

  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128); // gray-500
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
