@AGENTS.md

# Folio — Project Guide for Claude

## What this app is

Folio is a self-hosted personal finance + small-business accounting web app. It runs entirely client-side: all data lives in `localStorage`, there is no database, and the only server-side routes are Stripe webhooks and license validation.

Two logical halves share one UI:

| Half | Tabs | Data scope |
|------|------|-----------|
| Personal | Expenses, Budgets, Recurring, Income, FinCalc | Single-user, no company context |
| Business/Accounting | Ledger, P&L, Balance Sheet, Trial Balance, Cash Flow, AP, AR, Inventory, PO, Check Rec | Per-company, namespaced in localStorage |

---

## Tech stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | **Next.js 16** (App Router) | Client-only page; API routes only for Stripe/license |
| UI | **NextUI v2** | **Incompatible with Tailwind v4** — stay on Tailwind v3 |
| Styling | **Tailwind CSS v3** | Do not upgrade to v4 |
| Icons | **lucide-react v1** | |
| PDF | **jsPDF + jspdf-autotable** | Used in `exportPDF.ts` |
| Language | **TypeScript 5** | Strict mode |
| Deploy | **Vercel** | `expense-tracker-rose-mu.vercel.app` |

Always run `npm run build` (not just `tsc`) before committing — Turbopack catches issues that `tsc` alone misses.

---

## Repository layout

```
src/
  app/
    page.tsx          ← single-page shell; mounts all tabs and accounting modules
    providers.tsx     ← React contexts: Theme, Language, Currency, Toast
    layout.tsx
    api/
      stripe/         ← checkout, success, webhook
      license/        ← validate endpoint
      subscription/   ← activate endpoint
  components/         ← one file per tab/modal; no sub-directories
  lib/
    types.ts          ← all shared TypeScript types (single source of truth)
    ledger.ts         ← pure functions: derive JournalEntries from raw data
    exportPDF.ts      ← jsPDF helpers for invoices, statements, reports
    importExport.ts   ← CSV/JSON import-export helpers
    currencies.ts     ← currency list and formatting
    formatPhone.ts    ← US phone formatter + PAYMENT_TERMS constant
    sampleData.ts     ← seed data for first-run demo
    i18n/             ← en, es, pt, fr, de, it, ja + index.ts
    use*.ts           ← one hook per data domain
```

---

## Data layer — localStorage hooks

Every data domain has a dedicated hook. **Accounting hooks take `companyId: string` as their first argument** so switching companies reloads all data automatically.

### Hook pattern

```ts
export function useXxx(companyId: string) {
  const [items, setItems] = useState<Xxx[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load effect — re-runs when companyId changes
  useEffect(() => {
    setLoaded(false);
    const raw = localStorage.getItem(`folio-${companyId}-xxx`);
    setItems(raw ? JSON.parse(raw) : []);
    setLoaded(true);
  }, [companyId]);

  // Save effect — only fires after initial load to avoid overwriting on mount
  useEffect(() => {
    if (loaded) localStorage.setItem(`folio-${companyId}-xxx`, JSON.stringify(items));
  }, [items, loaded, companyId]);

  // ... CRUD callbacks wrapped in useCallback ...
  return { items, loaded, addItem, updateItem, deleteItem };
}
```

### localStorage key reference

| Hook | Key(s) |
|------|--------|
| `useCompanies` | `folio-companies`, `folio-active-company` |
| `useAccounts(id)` | `folio-{id}-accounts` |
| `useOpeningBalances(id)` | `folio-{id}-opening-balances` |
| `useVendors(id)` | `folio-{id}-vendors` |
| `useBills(id)` | `folio-{id}-bills`, `folio-{id}-bill-payments` |
| `useInventory(id)` | `folio-{id}-inventory-items`, `folio-{id}-inventory-movements` |
| `useAR(id)` | `folio-{id}-customers`, `folio-{id}-invoices`, `folio-{id}-invoice-payments` |
| `useChecks(id)` | `folio-{id}-checks` |
| `usePurchaseOrders(id)` | `folio-{id}-purchase-orders` |
| `useExpenses` | `expense-tracker-expenses` |
| `useBudgets` | `expense-tracker-budgets` |
| `useRecurring` | `expense-tracker-recurring` |
| `useIncome` | `expense-tracker-income-sources` |
| `useCategories` | `expense-tracker-categories` |

### One-time migration

`useCompanies` runs a transparent migration on first load. If `folio-companies` does not exist but `folio-company-profile` does (legacy single-company format), it copies all old keys into the `folio-{id}-*` namespace. This must not be broken.

### Accounts: builtins + custom

`useAccounts` merges `BUILTIN_ACCOUNTS` (from `types.ts`) with the custom accounts stored in localStorage. Builtin accounts are never stored — they are always re-injected at merge time. Never persist builtin accounts into localStorage.

---

## Multi-company architecture

- `useCompanies()` owns the company list and `activeId`.
- All accounting hooks in `page.tsx` receive `activeId` as the first argument.
- Each company has its own chart of accounts starting from the default template.
- Switching companies triggers a full data reload via the `companyId` dependency in each hook's `useEffect`.
- Company code is a 2-digit display identifier (01–99), auto-assigned but editable.
- Cannot delete the last company.

---

## General Ledger — pure derivation

`ledger.ts` contains **pure functions only** — no state, no side effects. It derives `JournalEntry[]` from raw data arrays. The reporting tabs (Ledger, P&L, Balance Sheet, etc.) call these functions at render time; nothing is pre-computed or stored.

Key functions: `expenseToEntry`, `deriveIncomeEntries`, `billToEntry`, `billPaymentToEntry`, `invoiceToEntry`, `invoicePaymentToEntry`, `movementToEntry`, `buildTrialBalance`, `buildPnL`, `buildBalanceSheet`.

Bills created from PO receipts carry `fromPOId` — the GL entry for those bills is **skipped** because the inventory movement already posts the debit. Do not remove this guard.

---

## i18n system

- Languages: `en`, `es`, `pt`, `fr`, `de`, `it`, `ja`
- All keys live in `src/lib/i18n/<lang>.ts`; TypeScript infers the type from `en.ts` automatically — no manual type definitions needed.
- Use `t("section.key")` via the `useLanguage()` hook from `@/app/providers`.
- Variable interpolation: `t("foo.bar", { count: 3 })` → replaces `{count}` in the string.
- **Every new user-facing string must be added to all 7 language files.** Use English text as a reasonable fallback for non-English files when you do not know the translation, but mark it clearly.
- `locale` from `useLanguage()` is a BCP-47 tag (e.g. `"en-US"`) used for `toLocaleDateString` and `Intl.NumberFormat`.

---

## Currency and number formatting

- Use `fmt(amount)` from `useCurrency()` for all monetary display — never call `toFixed` or `Intl.NumberFormat` directly in components.
- `fmt` respects the user's selected currency symbol, locale, and compact/full mode.

---

## Authentication and plans

- Auth is password-based, stored hashed in localStorage via `useAuth`. No server session.
- Plans: `usePlan()` returns `isPro`. Pro gates the business modules (AP, AR, Inventory, PO, Check Rec). Free users see an upgrade prompt.
- License key activation hits `/api/license/validate`.
- Stripe checkout hits `/api/stripe/checkout` and `/api/stripe/webhook`.

---

## PDF generation

`exportPDF.ts` uses jsPDF directly (no React). Functions accept data arrays and return a `Blob`. Call `downloadBlob(blob, filename)` from `importExport.ts` to trigger download. Do not add DOM manipulation inside PDF functions.

---

## Component conventions

- All components are `"use client"` — there are no Server Components in the UI layer.
- Props interfaces are defined locally at the top of each file (not in a shared types file).
- Modal state is managed with NextUI's `useDisclosure()` hook.
- Form state uses individual `useState` fields (not a single form object) — consistent with existing code.
- Confirmation before destructive actions uses inline state booleans, not separate modals (see APTab void/delete patterns).
- Financial totals shown in tables: use `tabular-nums` Tailwind class for alignment.

---

## Feature areas — key conventions

### Accounts Payable (APTab)
- Check printing groups bills by vendor, merges into one check per vendor.
- Max check amount enforcement: `selectedTotal > maxCheckAmount` disables the print button and shows a warning. Enforced in both AP (bill selection) and PO (grand total).
- Printed checks are added to `useChecks` as `"outstanding"`.
- Bills from PO receipts have `fromPOId` set — the Ledger skips their GL entry to avoid double-posting.

### Accounts Receivable (ARTab)
- Invoice numbering: `I000001` for invoices, `C000001` for credit memos.
- Tax: each TaxRate can have a `state` code; when an invoice is created the customer's state auto-selects the matching rate. Customers with a `taxId` are always exempt.
- Payment modal: amount defaults to the outstanding balance; `reference` field stores check/document number.
- The company profile (name, address, tax ID, tax rates) is managed from within ARTab via the Settings gear — `onUpdateCompany` callback propagates to `useCompanies`.

### Purchase Orders (POTab)
- Partial receiving: user can enter less than the ordered qty per line. The system posts movements and the AP bill for only what was received, then offers to create a remainder draft PO.
- Status flow: `draft` → `sent` → `received` (or `cancelled`). Only draft/sent POs can be edited.

### Check Reconciliation (CheckRecTab)
- Checks flow in from APTab (print checks → `onAddChecks`).
- User enters bank statement ending balance; adjusted balance = bank balance − outstanding checks total.
- Status: `outstanding` → `cleared` (with cleared date) or `voided`. Either can be reopened to `outstanding`.

### Inventory (InventoryTab)
- `qtyOnHand(itemId)` is derived from `StockMovement[]` at render time — no stored qty field.
- Movement types: `purchase` (DR Inventory / CR AP or Cash), `consumption` (DR COGS / CR Inventory), `adjustment` (signed qty, user-specified counter account).

---

## Things to never do

- **Do not upgrade Tailwind to v4** — NextUI v2 is incompatible with it.
- **Do not store builtin accounts in localStorage** — they are merged in-memory.
- **Do not add server state or a database** — the app is intentionally localStorage-only.
- **Do not skip the `loaded` guard in save effects** — it prevents overwriting data on mount before the load effect runs.
- **Do not add `"use server"` directives** to anything under `src/components/` or `src/lib/`.
- **Do not break the `fromPOId` GL skip** in `ledger.ts` — bills from PO receipts would double-post.
- **Do not delete the last company** — `useCompanies.deleteCompany` guards this; keep the guard.
- **Do not use `useCompanyProfile`** — it is the legacy single-company hook, superseded by `useCompanies`. It exists only for any remaining migration paths.

---

## Common tasks

### Add a new accounting module
1. Add the module key to `AccountingModule` type in `page.tsx`.
2. Add an entry to `MODULES` array with icon and i18n key.
3. Add the tab key to all 7 i18n files under `tabs.*`.
4. Render the component inside the `acctModule === "..."` block in the accounting content area.
5. Gate behind `isPro` if it is a business feature.

### Add a new i18n string
1. Add to `src/lib/i18n/en.ts` under the appropriate section.
2. Mirror the key in `de.ts`, `es.ts`, `fr.ts`, `it.ts`, `ja.ts`, `pt.ts`.
3. TypeScript will error on build if any language file is missing the key (inferred from `en`).

### Add a new per-company data domain
1. Create `use<Domain>(companyId: string)` in `src/lib/use<Domain>.ts` following the hook pattern above.
2. Use `folio-${companyId}-<domain>` as the localStorage key.
3. Add the old key → new key pair to `migrateToMultiCompany` in `useCompanies.ts` if this replaces a legacy key.
4. Wire the hook in `page.tsx` with `activeId` as the argument.

### Run the app locally
```bash
npm run dev      # http://localhost:3000
npm run build    # production build + TypeScript check
```
