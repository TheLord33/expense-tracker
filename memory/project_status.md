---
name: project-status
description: Current state of Folio — which modules are complete and what's been deployed
metadata:
  type: project
---

Accounting suite fully implemented and deployed at expense-tracker-rose-mu.vercel.app.

**Completed modules (all with full GL integration and 7-language i18n):**
1. General Ledger + Chart of Accounts (`LedgerTab`)
2. Profit & Loss report with period presets (`PnLTab`)
3. Balance Sheet with opening balances (`BalanceSheetTab`)
4. Trial Balance (`TrialBalanceTab`)
5. Accounts Payable — vendors, bills, payments, AP aging (`APTab`)
6. Inventory — items, stock movements (purchase/consumption/adjustment), low-stock alerts (`InventoryTab`)
7. Accounts Receivable — customers, invoices, payment collection, AR aging (`ARTab`)

**GL entry sources:** expense | income | bill | bill-payment | inventory | invoice | invoice-payment

**Storage keys:** old `expense-tracker-*` keys preserved; new modules use `folio-*` prefix.

**Why:** Full small-business double-entry accounting suite built on top of the original personal finance app (Folio rebrand).

**How to apply:** Any future module should follow the same pattern: add types to `types.ts`, create `use*.ts` hook with `folio-*` storage key, add `derive*Entries()` to `ledger.ts` and extend `deriveAllEntries()`, update all 4 report tabs with optional props, add i18n to all 7 language files, build the tab component, wire into `page.tsx`.
