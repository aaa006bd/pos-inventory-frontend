# POS Frontend–Backend Workflow and API Integration Plan

## Purpose

This document maps the current frontend against the local Inventory POS OpenAPI contract and defines the recommended implementation order for the missing UI workflows.

The API contract used for this audit is the Swagger JSON supplied from the local backend. Its normalized content matches the currently reachable deployed Swagger document.

## Current Coverage

The OpenAPI contract contains 104 operations: one application health/root operation and 103 business operations. The frontend API client represents 49 unique business operations, while 39 are currently called by the UI.

| API area | Documented operations | Used by UI | Current state |
| --- | ---: | ---: | --- |
| Authentication and tenant onboarding | 7 | 5 | Login, organization signup, and password reset exist |
| Categories and attributes | 12 | 8 | Main CRUD exists; hierarchy helpers and individual reads are unused |
| Products | 6 | 2 | List and create only |
| Suppliers | 5 | 4 | CRUD exists except detail workflow |
| Customers | 7 | 2 | List and create only, embedded in POS |
| Inventory | 17 | 9 | Direct receipt, sale, return, list, daily stock, lots, and barcodes exist |
| Accounting | 17 | 6 | Supplier balances/payments and expenses exist |
| Sales records | 7 | 3 | History, customer history, and sale detail exist |
| Sales orders | 7 | 0 | No UI |
| Purchase orders | 7 | 0 | No UI |
| Organization users | 5 | 0 | No UI |
| Platform tenants | 6 | 0 | No UI |

Endpoint counts are useful for tracking, but completion must be measured by end-to-end business journeys rather than raw endpoint coverage.

## Existing Working Workflows

1. Organization signup with OTP verification.
2. Login and password reset.
3. Category and category-attribute management.
4. Product creation with category attributes and supplier selection.
5. Supplier management.
6. Direct batch inventory receipt.
7. Inventory listing, scanning, daily-stock lookup, and lot-based barcode printing.
8. Immediate cash or credit POS sale by scanning inventory barcodes.
9. Supplier return by item, batch, or lot.
10. Sales history and sale detail.
11. Supplier ledgers and supplier payment entry.
12. Expense entry, listing, and date-range summary.

## Missing or Incomplete Workflows

### 1. Purchase-to-stock

The current Receive screen calls `POST /inventory/receive-batch` directly. The backend also exposes the controlled purchase lifecycle:

`Draft purchase order -> edit -> confirm -> partial/full receipt -> inventory lot/items -> supplier payable`

Missing endpoints:

- `POST /purchases/orders`
- `GET /purchases/orders`
- `GET /purchases/orders/{id}`
- `PATCH /purchases/orders/{id}`
- `POST /purchases/orders/{id}/confirm`
- `POST /purchases/orders/{id}/cancel`
- `POST /purchases/orders/{id}/receive`

Normal procurement should use purchase orders. Direct batch receipt should remain available only as a clearly labeled manual stock intake or administrator exception.

### 2. Dealer order-to-cash

The current POS handles immediate CASH and CREDIT transactions, but there is no longer-running dealer order workflow:

`Draft sales order -> edit -> confirm -> partial/full fulfillment -> sale -> payment allocation -> documents`

Missing sales-order endpoints:

- `POST /sales/orders`
- `GET /sales/orders`
- `GET /sales/orders/{id}`
- `PATCH /sales/orders/{id}`
- `POST /sales/orders/{id}/confirm`
- `POST /sales/orders/{id}/cancel`
- `POST /sales/orders/{id}/fulfill`

Missing sale settlement and document endpoints:

- `POST /sales/{id}/payments`
- `GET /sales/{id}/challan`
- `GET /sales/{id}/invoice`
- `GET /sales/{id}/payments/{allocationId}/receipt`

The immediate POS should remain the short retail path. Sales orders should support dealer orders, reservations, partial fulfillment, and credit collection.

### 3. Customer and credit administration

Customers can currently be listed and created inside the POS. Missing UI capabilities are:

- Dedicated customer list and detail pages.
- Customer editing and deletion/deactivation.
- Dealer operational-status management.
- Credit summary before accepting a credit order or sale.
- Customer ledger and outstanding receivables.
- Customer payment entry and sale allocation.
- Payment receipt access.

Relevant endpoints:

- `GET /customers/{id}`
- `PUT /customers/{id}`
- `DELETE /customers/{id}`
- `GET /customers/{id}/credit-summary`
- `PATCH /customers/{id}/dealer-status`
- `POST /accounting/customer-payments`
- `GET /accounting/ledger/customers/{customerId}`
- `GET /accounting/receivables`

### 4. Financial reporting

The Finance page currently covers supplier balances, supplier payments, expenses, and expense summaries. It does not expose:

- Profit and loss.
- Cash flow.
- Trial balance.
- Receivables and payables.
- Account ledger.
- Account-role ledger.
- Customer ledger and customer payments.
- Chart-of-accounts initialization status/action.

Relevant endpoints:

- `POST /accounting/chart-of-accounts/initialize`
- `GET /accounting/ledger/accounts/{accountId}`
- `GET /accounting/ledger/roles`
- `GET /accounting/ledger/roles/{role}`
- `GET /accounting/ledger/customers/{customerId}`
- `GET /accounting/reports/profit-loss`
- `GET /accounting/reports/cash-flow`
- `GET /accounting/receivables`
- `GET /accounting/payables`
- `GET /accounting/trial-balance`

### 5. Inventory control and visibility

Missing or incomplete capabilities are:

- Current-stock overview.
- Stock summary on the main dashboard.
- Lot detail and lot-item drill-down.
- Actual damaged/returned stock adjustment through `PATCH /inventory/adjust`.
- Server-side inventory search and filtering.
- Backend PNG and printable barcode responses.
- Clear separation between stock adjustment, supplier return, and customer return.

The inventory list currently filters only the records loaded for the active page. Counts and filtered results can therefore be misleading when more records exist on the server.

Relevant unused endpoints:

- `POST /inventory/receive`
- `GET /inventory/current-stock`
- `GET /inventory/stock/summary`
- `GET /inventory/lots/{lotNumber}`
- `GET /inventory/lots/{lotNumber}/items`
- `GET /inventory/barcode/{barcode}/image.png`
- `GET /inventory/barcodes/print`

### 6. Product catalog completion

Product list and creation exist, but product detail, editing, archive/delete, API search, category filtering, and pagination are missing from the UI.

The current client also loads only the default product page for screens such as Receive, which can prevent users from selecting products beyond the first response page.

Relevant endpoints:

- `GET /products/search`
- `GET /products/{id}`
- `PUT /products/{id}`
- `DELETE /products/{id}`
- `GET /products` with `search`, `category`, `page`, and `limit`

### 7. Users and role-based access

The backend exposes organization-user management, but the frontend does not retain a complete authenticated user profile or use roles to control routes and actions. The sidebar currently displays a hard-coded workspace owner.

Missing endpoints:

- `GET /users`
- `POST /users`
- `PATCH /users/{id}/role`
- `PATCH /users/{id}/disable`
- `PATCH /users/{id}/enable`

The UI must distinguish at least administrator and cashier capabilities. Hiding navigation is not sufficient; protected actions and backend authorization responses must also be handled.

### 8. Platform tenant administration

These operations belong in a separate platform-administrator surface, not the normal tenant sidebar:

- `GET /platform/tenants`
- `GET /platform/tenants/{id}`
- `PATCH /platform/tenants/{id}/freeze`
- `PATCH /platform/tenants/{id}/unfreeze`
- `PATCH /platform/tenants/{id}/disable`
- `PATCH /platform/tenants/{id}/plan`

### 9. Backend capability gap: customer returns/refunds

The API contains supplier returns and inventory adjustment, but it does not document a customer return, refund, sale reversal, exchange, or credit-note workflow. A complete retail workflow requires backend design for this before a correct UI can be implemented.

## Implementation Plan

### Phase 0 — Stabilize the contract and frontend foundation

#### Backend contract

- Add Swagger properties and examples to the 28 empty request DTO schemas.
- Add success and error response schemas; currently none of the 104 operations documents a response body schema.
- Document all status enums and state transitions for purchase orders, sales orders, sales, customers, inventory items, tenants, and users.
- Document pagination, date formats, currency/decimal representation, and downloadable content types.
- Confirm authentication and role requirements for Inventory, Accounting, Users, and Platform endpoints because their Swagger security declarations are absent.
- Clarify whether `GET /products` query fields are truly required; the existing UI calls it without them.

#### Frontend foundation

- Consolidate duplicated and inconsistent API interfaces.
- Introduce a typed API module per domain: auth, catalog, customers, inventory, purchases, sales, accounting, users, and platform.
- Add response handlers for JSON, text/SVG, blob/PDF/PNG, and `204 No Content`.
- Normalize API errors, including validation arrays and 401, 403, 404, and 409 behavior.
- On 401, clear the session and return to login while preserving the intended destination.
- Store the authenticated user and role rather than only the token.
- Decide between the current browser-to-backend calls and a Next.js backend-for-frontend using secure HttpOnly cookies.
- Add loading, empty, error, retry, and success patterns shared by every workflow.
- Prevent duplicate submissions for state-changing operations.

#### Existing quality gates

- Fix the production build failure caused by `useSearchParams` on `/login` not being inside a Next.js 16 Suspense boundary.
- Fix the five current ESLint errors.
- Align the authentication tests with the intended user/session contract; four of six currently fail.
- Establish a clean `npm run lint`, `npm test`, and `npm run build` baseline before adding workflows.

#### Phase 0 exit criteria

- OpenAPI request and response contracts are sufficient to type new modules without guessing.
- Authenticated identity and role are available throughout the application.
- Shared API error and file-response behavior works.
- Lint, tests, and production build pass.

### Phase 1 — Complete master data and authorization

- Build product detail/edit/archive/delete and server-side search/pagination.
- Build customer list/detail/edit/deactivate screens.
- Add dealer status and credit-summary panels.
- Build tenant user list/create/role/enable/disable screens.
- Add administrator/cashier route and action policies.
- Replace hard-coded sidebar identity with the logged-in user.

#### Phase 1 exit criteria

- Administrators can manage products, customers, and tenant users.
- Cashiers cannot access or trigger administrator-only actions.
- Credit status is visible before a credit transaction begins.

### Phase 2 — Implement purchase orders

Proposed routes:

- `/dashboard/purchases`
- `/dashboard/purchases/new`
- `/dashboard/purchases/[id]`

Deliverables:

- Purchase-order list with status filters and search.
- Draft creation and editing with supplier and product lines.
- Confirm and cancel actions with confirmation dialogs.
- Partial and full receiving against outstanding line quantities.
- Receipt results showing generated lots, inventory items, costs, and accounting references.
- Direct links from receipt results to lot details and barcode printing.
- Supplier payable/ledger refresh after receipt.
- Keep manual direct receipt as a separately permissioned exception.

#### Phase 2 exit criteria

- A confirmed PO cannot be edited as a draft.
- Receipt quantities cannot exceed the outstanding quantity.
- Partial receipt leaves the correct balance open.
- Full receipt updates inventory, lots, and supplier payable exactly once.
- Canceled orders cannot be received.

### Phase 3 — Implement sales orders and customer settlement

Proposed routes:

- `/dashboard/sales/orders`
- `/dashboard/sales/orders/new`
- `/dashboard/sales/orders/[id]`
- `/dashboard/customers/[id]/ledger`

Deliverables:

- Sales-order list, detail, creation, and draft editing.
- Confirmation and cancellation actions.
- Partial/full fulfillment with availability feedback.
- Credit summary and dealer-status checks before confirmation.
- Customer payment entry and allocation to credit sales.
- Receivable balance and allocation history.
- Invoice, challan, cash receipt, and money-receipt actions.
- Preserve existing immediate POS for counter sales.

#### Phase 3 exit criteria

- Fulfillment cannot exceed confirmed or available quantities.
- Partial fulfillment preserves correct outstanding quantities.
- Credit restrictions are visible and backend rejections are explained.
- Payments update both the customer ledger and affected sale balances.
- Generated documents can be viewed, downloaded, and printed.

### Phase 4 — Complete inventory and accounting visibility

- Add current stock and stock summary to the dashboard.
- Add lot detail and lot-item pages.
- Implement stock damage/return adjustments independently from supplier returns.
- Move product and inventory filtering to server-side API queries.
- Add profit-and-loss, cash-flow, trial-balance, receivables, payables, and ledger views.
- Add date presets, custom ranges, totals, empty states, and export-ready layouts.
- Replace catalog-only dashboard values with operational KPIs.

#### Phase 4 exit criteria

- Dashboard totals reconcile with the underlying reports.
- Inventory filters and totals represent the full dataset, not only the active page.
- Financial reports reconcile with supplier/customer ledgers and sales/purchase activity.

### Phase 5 — Add platform administration if required

Proposed routes should live outside the tenant dashboard, for example `/platform/tenants`.

- Tenant list with status, account type, plan, and subscription filters.
- Tenant detail and administrative history.
- Freeze, unfreeze, and disable actions with reason capture.
- Plan and subscription changes.
- Strict platform-role route protection.

## Required Backend Clarifications

Resolve these before implementing the affected phases:

1. Does sales-order fulfillment create a normal `/sales` record, and how are multiple partial fulfillments represented?
2. Does purchase-order receipt automatically create inventory lots, supplier payable entries, and journal entries?
3. What is the exact relationship between `POST /accounting/customer-payments` and `POST /sales/{id}/payments`?
4. Is an unallocated customer payment supported?
5. Are walk-in sales supported? The sales response model permits a null customer, while the current UI requires one.
6. What are the allowed payment methods and their validation rules?
7. What response types are returned by invoice, challan, receipt, barcode PNG, and barcode print endpoints?
8. Is `/auth/setup-password/confirm` intended for users created through `POST /users`?
9. Which roles may use direct inventory receipt, stock adjustment, returns, accounting, user management, and platform administration?
10. What is the intended backend workflow for customer return, exchange, refund, and credit note?

## Testing Strategy

### Contract tests

- Validate frontend request and response types against the OpenAPI document.
- Add fixtures for every state and document/file endpoint.
- Confirm error envelopes for validation, unauthorized, forbidden, conflict, and missing-resource cases.

### Component and integration tests

- Forms validate required values and backend constraints.
- Status-dependent actions are shown and enabled correctly.
- Pagination and server-side filters preserve query state.
- Mutations refresh or invalidate all affected views.
- File responses render/download correctly.
- Role restrictions apply to navigation and actions.

### End-to-end acceptance journeys

1. `Create supplier -> create PO -> confirm -> partial receive -> complete receive -> print lot barcodes -> supplier payable -> supplier payment`
2. `Create customer -> create sales order -> confirm -> partial/full fulfill -> invoice/challan`
3. `Credit sale -> receivable -> customer payment -> allocation -> money receipt`
4. `Immediate cash POS sale -> sales history -> printable receipt`
5. `Damage or supplier return -> inventory status change -> accounting/ledger update`
6. `Administrator creates cashier -> cashier sees and performs only allowed actions`
7. `Platform administrator freezes tenant -> tenant access and status behave as defined`

Each journey must also test refresh/reload recovery, duplicate submission, network failure, authorization failure, and invalid state transitions.

## Recommended Delivery Order

1. Contract completion and current build/test stabilization.
2. Authenticated user identity, role enforcement, customers, and product completion.
3. Purchase orders and PO-based receiving.
4. Sales orders, fulfillment, customer credit, and payment allocation.
5. Inventory drill-down and accounting reports.
6. Platform tenant administration.
7. Customer returns/refunds after the backend contract is designed.

The first business delivery slice should be purchase orders. It closes the largest current process gap and prevents normal stock receipts and supplier accounting from bypassing the backend's intended lifecycle.
