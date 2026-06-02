"use client";

import { useState } from "react";
import {
  Modal, ModalContent, ModalHeader, ModalBody,
  Button, Divider,
} from "@nextui-org/react";
import {
  BookOpen, DollarSign, TrendingUp, Scale, ShoppingCart, Package,
  ClipboardList, Banknote, ListChecks, Building2, Download, Shield,
  Calculator, ChevronRight, AlertTriangle,
} from "lucide-react";
import { useLanguage } from "@/app/providers";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type SectionKey =
  | "gettingStarted" | "expenses" | "income" | "accounting"
  | "ap" | "ar" | "inventory" | "po" | "checkRec"
  | "companies" | "backup" | "security" | "calculator";

interface Section {
  key: SectionKey;
  icon: React.ElementType;
  color: string;
}

const SECTIONS: Section[] = [
  { key: "gettingStarted", icon: BookOpen,      color: "text-indigo-500" },
  { key: "expenses",       icon: DollarSign,    color: "text-orange-500" },
  { key: "income",         icon: TrendingUp,    color: "text-green-500"  },
  { key: "accounting",     icon: Scale,         color: "text-blue-500"   },
  { key: "ap",             icon: ShoppingCart,  color: "text-red-500"    },
  { key: "ar",             icon: Banknote,      color: "text-teal-500"   },
  { key: "inventory",      icon: Package,       color: "text-purple-500" },
  { key: "po",             icon: ClipboardList, color: "text-amber-500"  },
  { key: "checkRec",       icon: ListChecks,    color: "text-cyan-500"   },
  { key: "companies",      icon: Building2,     color: "text-violet-500" },
  { key: "backup",         icon: Download,      color: "text-emerald-500"},
  { key: "security",       icon: Shield,        color: "text-rose-500"   },
  { key: "calculator",     icon: Calculator,    color: "text-sky-500"    },
];

// ── Section content ───────────────────────────────────────────────────────────

function SectionContent({ sectionKey }: { sectionKey: SectionKey }) {
  const H2 = ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-sm font-semibold text-default-800 mt-5 mb-1 first:mt-0">{children}</h3>
  );
  const P = ({ children }: { children: React.ReactNode }) => (
    <p className="text-sm text-default-600 leading-relaxed mb-2">{children}</p>
  );
  const Li = ({ children }: { children: React.ReactNode }) => (
    <li className="text-sm text-default-600 leading-relaxed">{children}</li>
  );
  const Ul = ({ children }: { children: React.ReactNode }) => (
    <ul className="list-disc list-inside space-y-1 mb-3 ml-1">{children}</ul>
  );
  const Note = ({ children }: { children: React.ReactNode }) => (
    <div className="flex gap-2 bg-warning-50 border border-warning-200 rounded-lg px-3 py-2.5 mb-3">
      <AlertTriangle size={14} className="text-warning-600 shrink-0 mt-0.5" />
      <p className="text-xs text-warning-700 leading-relaxed">{children}</p>
    </div>
  );
  const Tip = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-primary-50 border border-primary-200 rounded-lg px-3 py-2.5 mb-3">
      <p className="text-xs text-primary-700 leading-relaxed">{children}</p>
    </div>
  );

  switch (sectionKey) {

    case "gettingStarted": return (
      <div>
        <P>Folio is a personal and small-business accounting app. All your data stays on your device — nothing is sent to any server.</P>
        <H2>First launch</H2>
        <P>On your first visit you'll be asked to create a username and password. These credentials protect access to the app on this browser. Keep them somewhere safe — there is no password recovery (see Security).</P>
        <H2>Navigation</H2>
        <Ul>
          <Li><strong>Personal tabs</strong> (Expenses, Budgets, Recurring, Income, Calculator) — personal finance tracking.</Li>
          <Li><strong>Accounting dropdown</strong> — full double-entry accounting suite for business use.</Li>
          <Li>The <strong>Import / Export</strong> button in the header handles backups and data migration.</Li>
          <Li>The <strong>lock icon</strong> (🔒) in the header ends your session immediately.</Li>
        </Ul>
        <H2>Multi-company</H2>
        <P>If you manage more than one business, use the company switcher at the top of the Accounting area. All accounting data is scoped per company.</P>
        <Note>Folio stores all data in your browser's localStorage. Clearing browser data or using a different browser/device will not show your existing data unless you restore a backup.</Note>
      </div>
    );

    case "expenses": return (
      <div>
        <H2>Adding expenses</H2>
        <P>Click <strong>Add Expense</strong> in the header. Fill in the amount, category, description, and date. Expenses are displayed in the list view by default.</P>
        <H2>Filtering & sorting</H2>
        <P>Use the filter bar to narrow by date range, category, or amount. Click any column header to sort. The filter count badge shows how many active filters are applied.</P>
        <H2>Views</H2>
        <Ul>
          <Li><strong>List</strong> — chronological feed with edit / delete per row.</Li>
          <Li><strong>Category</strong> — grouped by category with subtotals.</Li>
          <Li><strong>Monthly</strong> — grouped by month.</Li>
          <Li><strong>Trends</strong> — bar chart of monthly spending + category breakdown.</Li>
        </Ul>
        <H2>Budgets</H2>
        <P>Go to the <strong>Budgets</strong> tab to set a monthly spending limit per category. A progress bar shows how much of the budget is used. Overspent budgets appear in red.</P>
        <H2>Recurring expenses</H2>
        <P>Use the <strong>Recurring</strong> tab to set up subscriptions, rent, or any repeating expense. When you open the app, any overdue recurring expenses are automatically generated and added to your expense list.</P>
        <Tip>Use the date preset shortcuts (This Month, Last Month, etc.) to quickly review spending for a specific period.</Tip>
      </div>
    );

    case "income": return (
      <div>
        <H2>Income sources</H2>
        <P>The <strong>Income</strong> tab tracks your income sources (salary, freelance, investments, etc.). Each source has a name, amount, frequency, and optional start/end date.</P>
        <H2>Monthly total</H2>
        <P>Folio calculates your combined monthly income and displays it in the summary cards alongside your monthly expenses and savings rate.</P>
        <H2>Frequencies</H2>
        <Ul>
          <Li><strong>Monthly</strong> — used as-is.</Li>
          <Li><strong>Annual</strong> — divided by 12.</Li>
          <Li><strong>Weekly / Bi-weekly</strong> — multiplied to monthly equivalent.</Li>
        </Ul>
        <P>Sources with an end date in the past are marked inactive and excluded from the monthly total.</P>
      </div>
    );

    case "accounting": return (
      <div>
        <P>Folio uses double-entry bookkeeping. Every transaction debits one account and credits another, keeping the books balanced.</P>
        <H2>Chart of Accounts</H2>
        <P>A default chart is pre-loaded (Assets, Liabilities, Equity, Revenue, Expenses). You can add custom accounts from the Ledger tab.</P>
        <H2>Ledger</H2>
        <P>Shows all journal entries across all accounts. You can add manual journal entries (e.g., owner contributions, depreciation). Filter by account or date range.</P>
        <H2>Profit & Loss (P&L)</H2>
        <P>Revenue minus Expenses for any selected period. Revenue and expense accounts from the chart of accounts determine what appears here.</P>
        <H2>Balance Sheet</H2>
        <P>Assets = Liabilities + Equity at any point in time. Opening balances can be set per account to reflect prior period data.</P>
        <H2>Trial Balance</H2>
        <P>Lists all accounts with their total debits and credits. Debits and credits must match — if not, there is a data entry error.</P>
        <H2>Cash Flow</H2>
        <P>Indirect method cash flow statement: starts with Net Income and adjusts for changes in AR, AP, and Inventory.</P>
        <Tip>Set <strong>Opening Balances</strong> (button in the Ledger toolbar) before entering new transactions to carry forward prior-period account balances.</Tip>
      </div>
    );

    case "ap": return (
      <div>
        <H2>Vendors</H2>
        <P>Go to <strong>Accounting → A/P → Vendors</strong> to manage your supplier list. Each vendor has a name and optional contact details.</P>
        <H2>Bills</H2>
        <P>Record bills (vendor invoices you owe). Each bill has a vendor, due date, amount, and GL expense account. Bills post a debit to the expense account and a credit to Accounts Payable.</P>
        <H2>Payments</H2>
        <P>Select one or more bills and click <strong>Print Check</strong> to mark them paid and record a check. The total is debited to AP and credited to the bank account.</P>
        <H2>Check amount limit</H2>
        <P>Each company can have a maximum check amount. If the selected bills exceed this limit, the print button is disabled with a warning. Adjust the limit in <strong>Company Settings</strong>.</P>
        <H2>AP Aging</H2>
        <P>The aging report (bottom of A/P tab) groups outstanding bills by how overdue they are: Current, 1–30, 31–60, 61–90, 90+ days.</P>
      </div>
    );

    case "ar": return (
      <div>
        <H2>Customers</H2>
        <P>Go to <strong>Accounting → A/R → Customers</strong> to manage your customer list. Customer addresses and contact details are included in invoice PDFs.</P>
        <H2>Invoices</H2>
        <P>Create invoices with multiple line items. Each line can optionally link to an inventory item (which triggers automatic COGS entries). Click the PDF button on any invoice to download it.</P>
        <H2>Payments</H2>
        <P>Record payments against invoices from the invoice detail card. The outstanding balance updates in real time.</P>
        <H2>Statements</H2>
        <P>Click <strong>Statement</strong> on any customer card to generate a PDF statement. Choose <em>All Time</em> or a custom date range. The statement shows a running balance of all charges and credits.</P>
        <H2>AR Aging</H2>
        <P>The aging report groups outstanding invoice balances by how overdue they are: Current, 1–30, 31–60, 61–90, 90+ days.</P>
        <Tip>Inventory-linked invoice lines automatically post COGS (Dr COGS / Cr Inventory) when the invoice is saved.</Tip>
      </div>
    );

    case "inventory": return (
      <div>
        <H2>Items</H2>
        <P>Define your inventory items with a SKU, name, unit, cost per unit, and reorder point. Each item links to an Inventory asset account and a COGS expense account.</P>
        <H2>Stock movements</H2>
        <Ul>
          <Li><strong>Purchase (Receive)</strong> — increases stock. Posts Dr Inventory / Cr Cash (or AP).</Li>
          <Li><strong>Use / Sell</strong> — decreases stock. Posts Dr COGS / Cr Inventory.</Li>
          <Li><strong>Adjustment</strong> — corrects quantity discrepancies (positive or negative).</Li>
        </Ul>
        <H2>Summary tab</H2>
        <P>Shows total inventory value (qty × cost) per item, plus a low-stock alert for items below their reorder point.</P>
        <H2>Profitability tab</H2>
        <P>Derived from AR invoices. Shows per-item units sold, revenue, COGS (qty × cost per unit), gross profit, and margin %. Only items linked to at least one invoice line appear here.</P>
        <Note>COGS in the Profitability report uses the current <em>Cost per Unit</em> field, not historical weighted-average cost. Update the cost per unit if your purchase price changes.</Note>
      </div>
    );

    case "po": return (
      <div>
        <H2>Purchase Orders</H2>
        <P>Create purchase orders for vendors from <strong>Accounting → P/O</strong>. Each PO has a vendor, date, line items, and status.</P>
        <H2>Statuses</H2>
        <Ul>
          <Li><strong>Draft</strong> — in progress, not yet submitted.</Li>
          <Li><strong>Sent</strong> — submitted to vendor.</Li>
          <Li><strong>Received</strong> — goods/services delivered. Receiving a PO automatically creates a bill in AP and updates inventory stock.</Li>
          <Li><strong>Cancelled</strong> — voided.</Li>
        </Ul>
        <H2>Receiving a PO</H2>
        <P>Click <strong>Receive</strong> on a Sent PO. A confirmation dialog shows the total amount. Confirming creates the AP bill and posts inventory movements for any linked items.</P>
        <Tip>Link inventory items to PO lines to have stock received automatically when you mark the PO as received.</Tip>
      </div>
    );

    case "checkRec": return (
      <div>
        <H2>Check Register</H2>
        <P>The Check Reconciliation tab shows all checks recorded when printing from A/P. Checks start as <strong>Outstanding</strong>.</P>
        <H2>Reconciling</H2>
        <P>Enter your bank statement's ending balance. Select the checks that appear on your statement and click <strong>Mark Cleared</strong> (enter the cleared date). The <strong>Adjusted Balance</strong> should match your bank statement.</P>
        <H2>Formula</H2>
        <P>Adjusted Balance = Bank Balance − Sum of Outstanding (uncleared) checks</P>
        <H2>Voiding a check</H2>
        <P>Voided checks are kept for audit history but excluded from the outstanding total.</P>
      </div>
    );

    case "companies": return (
      <div>
        <H2>Multiple companies</H2>
        <P>Folio supports multiple companies in the same browser. Each company has its own completely isolated set of accounting data (chart of accounts, vendors, customers, inventory, etc.).</P>
        <H2>Switching companies</H2>
        <P>Use the company dropdown at the top of the Accounting area. All accounting modules reload automatically when you switch.</P>
        <H2>Adding a company</H2>
        <P>Click the <strong>+</strong> button in the company switcher. Fill in the company name and any optional details (address, email, tax ID). These appear on invoices and checks.</P>
        <H2>Deleting a company</H2>
        <P>A company can only be deleted if it has no invoices, bills, or other transactions. Remove all data first, then delete.</P>
        <Note>Your personal expense data (Expenses, Budgets, Income) is shared across all companies and is not company-scoped.</Note>
      </div>
    );

    case "backup": return (
      <div>
        <H2>Why back up?</H2>
        <P>All Folio data lives in your browser's localStorage. Clearing browser data, using private/incognito mode, or switching browsers will lose your data unless you have a backup.</P>
        <H2>Full Accounting Backup ★ (recommended)</H2>
        <P>Go to <strong>Import / Export → Full accounting backup (.json) ★</strong>. This exports <em>all</em> of your data: companies, accounts, vendors, customers, inventory, invoices, bills, checks, purchase orders, and expenses.</P>
        <P>To restore, use <strong>Import / Export → JSON (.json)</strong> and select your backup file. The app will reload with all data restored.</P>
        <H2>Expenses Backup</H2>
        <P>The standard <em>Expenses backup</em> option only covers your expenses, custom accounts, and opening balances — it does not include AP, AR, or Inventory data.</P>
        <H2>Export formats</H2>
        <Ul>
          <Li><strong>CSV</strong> — expenses only, opens in Excel/Sheets.</Li>
          <Li><strong>JSON</strong> — expenses array, useful for custom integrations.</Li>
          <Li><strong>Text (.txt)</strong> — human-readable expense report.</Li>
        </Ul>
        <H2>Report exports</H2>
        <P>P&L, Balance Sheet, Trial Balance, and Cash Flow reports each have a CSV download button in their toolbar.</P>
        <Tip>Set a calendar reminder to download a Full Accounting Backup weekly.</Tip>
      </div>
    );

    case "security": return (
      <div>
        <H2>How login works</H2>
        <P>Your password is hashed with SHA-256 in the browser before being stored in localStorage. The original password is never saved anywhere.</P>
        <H2>Sessions</H2>
        <P>Your session is stored in <strong>sessionStorage</strong>, which is cleared when the tab or browser closes. You will need to sign in again after closing the tab.</P>
        <P>To lock the app immediately without closing the tab, click the <strong>lock icon (🔒)</strong> in the header.</P>
        <H2>Changing your password</H2>
        <P>Click your username in the header to open the account menu, then choose <strong>Change Password</strong>. You must know your current password to set a new one.</P>
        <H2>⚠ Forgotten password</H2>
        <Note>There is no password recovery. If you forget your password, the only way to regain access is to manually clear your browser's localStorage for this site — which will also delete all your data. Always keep a current backup and write down your password somewhere safe.</Note>
        <H2>Data privacy</H2>
        <P>Folio is a fully client-side app. No data is ever sent to any server. Your financial data never leaves your device.</P>
      </div>
    );

    case "calculator": return (
      <div>
        <H2>Financial Calculator</H2>
        <P>Access the calculator from the <strong>Calc</strong> tab in the personal section. It covers the most common time-value-of-money calculations.</P>
        <H2>Loan / Mortgage</H2>
        <P>Enter principal, annual interest rate, and term (months). The calculator shows monthly payment, total interest paid, and an amortization breakdown.</P>
        <H2>Savings / FV</H2>
        <P>Project the future value of a lump sum or recurring deposit at a given interest rate over time.</P>
        <H2>ROI</H2>
        <P>Calculate return on investment: enter initial investment, final value, and holding period. Shows total return % and annualized return.</P>
        <H2>Break-even</H2>
        <P>Enter fixed costs, variable cost per unit, and selling price per unit. The calculator shows break-even units and revenue.</P>
        <Tip>Results from the Loan calculator can be used as a reference when recording loan-related journal entries in the Ledger.</Tip>
      </div>
    );

    default: return null;
  }
}

// ── Main component ────────────────────────────────────────────────────────────

export function HelpModal({ isOpen, onClose }: Props) {
  const { t } = useLanguage();
  const [active, setActive] = useState<SectionKey>("gettingStarted");

  const activeSection = SECTIONS.find((s) => s.key === active)!;
  const Icon = activeSection.icon;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      placement="center"
      size="4xl"
      scrollBehavior="inside"
      classNames={{ base: "max-h-[85vh]" }}
    >
      <ModalContent>
        <ModalHeader className="border-b border-default-200 py-3">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-indigo-500" />
            <span className="text-base">{t("help.title")}</span>
          </div>
        </ModalHeader>
        <ModalBody className="p-0">
          <div className="flex h-full" style={{ minHeight: "520px" }}>
            {/* Sidebar */}
            <div className="w-48 shrink-0 border-r border-default-200 overflow-y-auto py-2">
              {SECTIONS.map((section) => {
                const SIcon = section.icon;
                const isActive = section.key === active;
                return (
                  <button
                    key={section.key}
                    onClick={() => setActive(section.key)}
                    className={[
                      "w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-medium transition-colors",
                      isActive
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30"
                        : "text-default-600 hover:bg-default-50 hover:text-default-900",
                    ].join(" ")}
                  >
                    <SIcon size={13} className={isActive ? "text-indigo-500" : section.color} />
                    {t(`help.sections.${section.key}` as Parameters<typeof t>[0])}
                    {isActive && <ChevronRight size={11} className="ml-auto" />}
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="flex items-center gap-2 mb-4">
                <Icon size={18} className={activeSection.color} />
                <h2 className="text-base font-semibold text-default-900">
                  {t(`help.sections.${active}` as Parameters<typeof t>[0])}
                </h2>
              </div>
              <Divider className="mb-4" />
              <SectionContent sectionKey={active} />
            </div>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
