# Purchase order implementation

Branch: `feat/purchase-orders`.

## Agreed navigation and screens

Purchasing is an expandable group in the existing sidebar, containing Purchase Orders, Suppliers, and Manual Stock Receipt. There is no second vertical navigation inside Purchasing.

Four screen types:

1. `/dashboard/purchases`: list, search, supplier/status filters and New Order action.
2. `/dashboard/purchases/new` and `/dashboard/purchases/[id]/edit`: shared draft editor.
3. `/dashboard/purchases/[id]`: order detail, outstanding quantities, confirm/cancel/edit/receive actions appropriate to backend state.
4. `/dashboard/purchases/[id]/receive`: partial/full receipt and results, with links to inventory and barcode printing.

Receipt History is a horizontal detail tab only if the backend provides persisted receipt history. Confirmation and cancellation use dialogs. Existing master-data and permission expansion are deferred.

## Local backend inspection — 2026-09-07

`http://host.docker.internal:3000/api-json` returns HTTP 200 from the dev container. Browser requests must continue to use the existing `/backend-api` proxy.

Swagger exposes:

- `GET /purchases/orders`
- `POST /purchases/orders`
- `GET /purchases/orders/{id}`
- `PATCH /purchases/orders/{id}`
- `POST /purchases/orders/{id}/confirm`
- `POST /purchases/orders/{id}/cancel`
- `POST /purchases/orders/{id}/receive`

All are marked as JWT protected. An unauthenticated list request returns HTTP 401.

The first inspection found empty DTOs. A subsequent live fetch on the same date provides the purchase request and response schemas. The implementation uses that updated contract:

| Operation | Contract |
| --- | --- |
| List | Filters: `status`, `supplierId`, `orderNumber`, `page`, `limit` (max 100). Response: `{ items, total, page, limit, pageCount, hasNext }`. |
| Create/update | `{ supplierId, expectedDeliveryDate?, notes?, items: [{ productId, quantity, unitCost, notes? }] }`; update uses PATCH. |
| Order detail | `orderNumber`, `supplier`, `status`, dates, `totalAmount`, notes, cancellation reason and `lines`. Each line has its own `id`, `product`, `quantity`, `receivedQuantity`, `unitCost` and `lineTotal`. |
| Confirm | POST with no required request fields. Draft only. |
| Cancel | `{ reason }` (max 1,000 characters). Draft or confirmed only. |
| Receive | `{ items: [{ purchaseOrderLineId, quantity, lotNumber?, notes? }] }`. Receipt line IDs are order-line IDs, not product IDs. Blank lot numbers are omitted for automatic generation. |
| Receipt result | `{ order, receipts: [{ purchaseOrderLineId, lotId, lotNumber, inventoryItemIds }] }`. |

Statuses: `DRAFT`, `CONFIRMED`, `PARTIALLY_RECEIVED`, `RECEIVED`, `CANCELLED`.

Quantity constraints: whole units from 1 to 10,000; receipt quantities cannot exceed the outstanding line quantity. Unit cost minimum is 0.01. Order notes have a 2,000-character limit, line notes 1,000, lot numbers 100.

## Implemented behavior and boundaries

- The four screens use the existing authenticated API client and same-origin proxy.
- Products are loaded across catalog pages so draft entry is not limited to the first page. Product choices can be filtered locally by name/SKU.
- Order list filtering and pagination run on the server.
- Draft editing and confirm/cancel/receive actions depend on the latest loaded order status. Direct edit/receive routes also check status.
- Receipt submission has an explicit review step and an immediate submission lock. Failures do not automatically retry. Network/server failures warn that stock may already have been received and require review/reloading before another attempt.
- Successful receipts show returned lots and item counts. Links open lot-filtered inventory and the existing bulk barcode screen focused on the returned lot.
- Supplier accounting links open the existing Finance screen. The UI does not post a second supplier payable or journal entry. Automatic accounting effects must be confirmed through a backend acceptance test.
- No receipt-history tab: order reads expose cumulative line quantities, not persisted receipt history. Newly returned receipt summaries are shown on the receiving screen until navigation/reload.
- The receipt item-ID schema says strings but its example contains numbers; the frontend accepts either and does not coerce IDs.
- Permission UI expansion is deferred; backend authorization remains enforced.
- Existing delivery dates can be replaced but not cleared: the update DTO documents an optional date string, not a nullable value for removing a saved date.

## Verification

Implementation checks on 2026-09-07:

- Full Jest run: 25 tests passed; subsequently added draft-entry coverage: 2 tests passed (27 total).
- Full lint passed; targeted lint and standalone TypeScript checks passed after the final form changes.
- Production build passed and includes the list, new, detail, edit and receive routes.
- All five purchase route URLs and the inventory/barcode destination pages returned HTTP 200 in development. These check route rendering, not authenticated data or mutations.
- Purchase-list proxy returned the expected HTTP 401 without credentials.
- Stale dev-cache route discovery caused initial nested-route 404s. Moving the ignored dev cache aside and restarting resolved them; production output already contained the routes.
- No backend records were created by automated checks. Authenticated backend acceptance testing and accounting reconciliation remain to be performed with test data.

Acceptance checklist:

- Test draft submission and editing against the confirmed request contract.
- Test partial/full receipt and quantity limits; do not automatically retry ambiguous receipt failures.
- Test stale order state, authorization errors, loading/error/empty states and duplicate submission prevention.
- Verify full product selection beyond the first catalog page.
- Test the complete draft → confirm → partial receipt → final receipt journey with explicitly designated test data.
