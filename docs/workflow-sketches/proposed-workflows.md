# Proposed workflow and UI plan

Date: 2026-09-08.

This document explains the [workflow sketches](README.md). It is a future-state UX proposal, not a description of every screen currently implemented. Existing-capability notes reflect the project review and purchase-order implementation work; they are not a new live acceptance test. Backend contracts must be checked before implementing each proposed feature.

## Shared navigation and screen structure

- Expand functional groups in the existing main sidebar. Do not add a second vertical tab bar inside a workflow.
- Use horizontal tabs for sections of an individual record.
- List and detail frames shown side by side in the sketches represent separate screens in a journey, not a requirement for a split-pane layout.
- Open create/edit and fulfillment/receiving as focused pages. Use reviewed dialogs for short confirmation, cancellation, or administrative actions.
- Preserve loading, empty, error, retry, stale-state, and duplicate-submission handling throughout.

Proposed tenant navigation:

| Group | Destinations |
| --- | --- |
| Sales | POS Checkout, Sales Orders, Sales History, Customers |
| Purchasing | Purchase Orders, Suppliers, Manual Stock Receipt |
| Inventory | Stock, Lots & Barcodes, Supplier Returns, Adjustments |
| Finance | Receivables, Payables, Expenses, Reports |
| Catalog | Products, Categories & Attributes |
| Settings | Users & Access |

Dashboard remains a top-level destination. Platform tenant administration is a separate privileged surface, not a tenant-sidebar group. This table is the proposed grouping; incidental sidebar labels in generated sketches are not additional scope.

## 1. Purchasing — implemented baseline, acceptance pending

[Sketch](00-purchasing-reference.png) · [Implementation details](../purchase-order-implementation.md)

Implemented on the purchase-order branch: order list, shared create/edit draft page, detail page, confirmation/cancellation, partial/full receipt, persisted receipt history, recoverable receipt retries, and links to inventory/barcodes.

Flow: list → create draft → review/edit → confirm → partial/full receipt → receipt history → lots/barcodes.

Detail tabs: Items and Receipt History. Editing is draft-only; other actions follow backend order state. Manual Stock Receipt remains clearly separate from ordered procurement.

Remaining work is authenticated acceptance testing, accounting reconciliation, and retry/concurrency verification—not another redesign. The original sketch's receipt-history API-support footnote is historical; that integration now exists. The purchase slice is in a PR and should not be assumed merged or deployed.

## 2. Sales orders and immediate POS — proposed extension

[Sketch](01-sales-orders-and-pos.png)

Existing capabilities: immediate cash/credit POS sale, scanning, sales history, and sale detail.

Proposed screens:

1. Sales-order list with customer/status filters and New Order.
2. Shared draft create/edit page with customer, product lines, quantities, prices, and totals.
3. Order detail with Items, Fulfillments, Payments, and Documents tabs.
4. Fulfillment page showing outstanding quantities and eligible stock selection according to the backend contract.
5. Sale settlement/document view, reusable from sales history and customer detail.

Dealer flow: draft → confirm → partial/full fulfillment → resulting sale → payment allocation → invoice/challan/payment receipt.

Quick retail flow stays short: scan → cart → customer when needed → cash or credit → sale.

Before implementation: verify lifecycle rules, stock reservation/selection semantics, fulfillment-to-sale mapping, payment allocation, document formats, and safe retry support. Sketch statuses are illustrative, not API enum definitions. Customer refunds/exchanges are not part of this slice.

## 3. Customers and credit collection — proposed workspace

[Sketch](02-customers-and-credit.png)

Existing capabilities: basic customer listing/selection and creation within POS, plus customer sales history access.

Proposed screens:

1. Dedicated searchable customer list.
2. Customer create/edit page or form.
3. Detail page with credit summary and Overview, Sales, Ledger, and Payments tabs.
4. Reviewed payment/allocation form with access to the resulting receipt.

Flow: select customer → review credit/outstanding balance → review unpaid sales → record payment → allocate to sales → receipt and updated ledger.

Check credit before a credit sale/order. Dealer-status editing depends on documented backend rules. Payment recording and allocation must reference the same payment, not record money twice. Confirm whether the backend supports one combined operation or a recoverable sequence before designing submission behavior.

Customer master-data expansion remains deferred; agree any minimal customer/credit dependency needed for the sales slice before expanding scope.

## 4. Inventory, lots, and supplier returns — proposed consolidation

[Sketch](03-inventory-and-returns.png)

Existing capabilities: inventory listing, manual receiving, daily stock lookup, supplier returns, and lot-based barcode printing. Purchase receipts now link to lot-filtered inventory and barcode destinations.

Proposed screens:

1. Current-stock overview with backend search/filtering and accurate totals.
2. Product stock detail leading to its lots.
3. Lot detail with individual item/barcode status; a Movements tab only if supported by a suitable history contract.
4. Existing barcode-printing workflow reached from selected lots/items.
5. Reviewed supplier-return and stock-adjustment forms as separate operations.

Main flow: stock → product → lot → items → print barcodes.

Supplier return: select eligible stock → review supplier, quantities, and reason → submit → verify stock/accounting outcome.

Adjustment: select eligible stock → choose supported adjustment/reason → review → submit → refresh stock.

Do not present current-page filtering as a search of all inventory. Verify return/adjustment eligibility and history APIs. Customer returns/refunds require separate backend design and must not reuse supplier-return or adjustment actions as a substitute.

## 5. Finance and settlement — proposed expansion

[Sketch](04-finance-and-settlement.png)

Existing capabilities: supplier balances/ledgers, supplier payment entry, expenses, and expense summaries.

Proposed screens:

1. Payables list → supplier detail with Ledger and Payments tabs.
2. Receivables list → customer ledger and shared payment/allocation workflow.
3. Existing expense entry/list/summary under the Finance group.
4. Reports workspace with period filters for profit and loss, cash flow, trial balance, and account-ledger drill-down where supported.

Supplier flow: payables → supplier ledger → record payment → updated balance.

Customer flow: receivables → customer → payment/allocation → receipt → updated balance.

Reporting flow: select report → date range → view results → supported ledger drill-down.

Use backend balances and posting semantics as the source of truth. Purchase receiving already documents automatic payable posting; the UI must not create a duplicate journal. Generated amounts, debit/credit examples, and labels are layout placeholders, not accounting specifications. Confirm report schemas and date/currency conventions before implementation.

## 6. Catalog and master data — deferred

[Sketch](05-catalog-and-master-data.png)

Existing capabilities: category and attribute management, product listing/creation, and supplier management.

Proposed screens:

1. Product list with backend search, category filtering, and pagination.
2. Product detail and shared create/edit page with General and Attributes sections.
3. Category/attribute management with supported hierarchy and attribute configuration.
4. Supplier detail/edit improvements under Purchasing; customer master data stays under Sales.

Flow: create/select category → define attributes → create product → enter attribute values → save → use in purchasing/POS.

Supported attribute type values from the integration work: `text`, `number`, `boolean`, `select`, `multi_select`, `date`.

Confirm product deletion/archive semantics and referenced-record restrictions before adding destructive controls. Do not infer a product draft lifecycle from the sketch. Broader master-data work remains deferred at the user's request.

## 7. Users and platform administration — deferred / optional

[Sketch](06-users-and-platform-admin.png)

Existing foundation: authenticated user/session persistence. The proposed management screens and expanded permission-aware UI are not implemented by the purchase-order slice.

Tenant administration:

- Users list with role and enabled/disabled state.
- Create-user form and reviewed role/enable/disable actions.
- Flow: users → add user → assign a backend-supported role → manage access state.

Platform administration, separately scoped:

- Tenant list and tenant detail with Overview and Plan sections.
- Reviewed freeze/unfreeze, disable, and plan-change actions as supported by the backend.
- Flow: select tenant → inspect state → review consequence → confirm supported action.

Backend authorization is mandatory; hidden navigation is not a security boundary. Role names, invitations, access-policy tabs, and plan names drawn in the sketch are illustrative and do not establish supported capabilities. Tenant permissions remain deferred; platform administration is optional and requires explicit scope agreement.

## Suggested implementation sequence

1. Finish purchase-order acceptance checks and review its PR.
2. Verify the live sales-order contract, then implement list/draft/detail/fulfillment.
3. Add settlement/documents and the minimum agreed customer-credit workflow, reusing payment UI rather than duplicating it.
4. Improve inventory drill-down and financial reporting as separately scoped slices.
5. Resume broader master-data and permission work when requested.
6. Treat platform administration as optional and customer refunds as a separate backend/frontend design project.

This is a proposal, not authorization to implement every item. The [original integration roadmap](../frontend-backend-workflow-plan.md) provides broader context but includes historical gap counts; the purchase implementation document supersedes its original purchase-order gap description.
