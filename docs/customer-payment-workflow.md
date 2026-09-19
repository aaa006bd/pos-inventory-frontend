# Customer payments

Updated against the local Swagger on 2026-09-18.

## Record payment from an order

The form shows a linked sales-order reference and a "Sales being paid" table: sales number, outstanding, proposed payment, and remaining balance. The preview follows the documented oldest-first (soldAt, then ID) rule using integer cents; it is not a promise of final allocations if balances change concurrently. Payment success and history show actual backend allocations with links to sales records. No manual batch selection is required.

Sales Records uses its own breadcrumb and shows customer, parent order, amount, paid, and outstanding without the "Fulfillment Batches" heading. Official printable receipts still come from the backend receipt endpoint. Sales-number rendering inside that HTML needs live verification; the backend was unavailable during this UI update.

Open Sales → Sales Orders → an order → Order balance → Record payment. Enter amount, method, date, and an optional external transaction reference. The order ID is fixed by the page, not inferred from reference text.

`POST /sales/orders/{id}/payments` records and allocates in one atomic operation, oldest unpaid completed credit sale first. The form limits the amount to the fulfilled-sales outstanding balance; the backend enforces the authoritative balance. Retries reuse the exact stored request and idempotency key, including after reload. A successful payment refreshes the combined order balance and offers its original money receipt.

Order payment history includes payments linked directly by salesOrderId or through allocations (including reversals). It reads all customer payment pages and filters by actual IDs. Each payment has a receipt button. The separate customer-credit workspace remains available for existing credit and standalone POS payments; it is no longer the required order-payment path.

## User flow

1. Open Sales → Customer Payments and choose a customer.
2. Select an existing payment, or use Receive payment to record newly received money.
3. The payment detail shows the original received amount, active allocated amount, and available credit.
4. Apply existing credit to outstanding orders or standalone POS credit sales. Order allocations distribute oldest-first across eligible fulfillment sales.
5. Unapplied money remains customer credit, including payments received before fulfillment.
6. Reverse an individual allocation with a reason to restore credit and the sale balance. This does not refund money.

Sale detail shortcuts preselect the customer and allocation target. Every payment retains one original money receipt, accessible from payment history. Invoices and delivery challans remain attached to sales.

The order detail presents one combined financial summary before its expandable delivery batches: order total, fulfilled value, not-yet-fulfilled value, payments applied, and current outstanding. The summary reads every page of linked sales and uses their current balances; unapplied customer credit is not counted as payment against the order. For the verified development example, these values are 580,000 / 360,000 / 220,000 / 280,000 / 80,000. The two 180,000 delivery sales are legitimate unit sales. Delivery details expose their product names and individual barcodes, and completing fulfillment returns to the order overview.

Voided/refunded sales are excluded from current receivables. The UI leaves unfulfilled value unavailable when such adjustments exist because the current contract does not define their effect on fulfillment quantities.

## API mapping

| Action | Endpoint |
| --- | --- |
| Record and apply order payment | `POST /sales/orders/{id}/payments` |
| Receive money | `POST /customers/{customerId}/payments` |
| Payment history | `GET /customers/{customerId}/payments` |
| Payment and allocation details | `GET /payments/{paymentId}` |
| Outstanding orders / POS credit sales | `GET /customers/{customerId}/outstanding` |
| Apply existing credit | `POST /payments/{paymentId}/allocations` |
| Reverse allocation | `POST /payments/{paymentId}/allocations/{allocationId}/reverse` |
| Original receipt | `GET /payments/{paymentId}/receipt` |

All mutations send an Idempotency-Key. The UI preserves unresolved requests in session storage and retries their original body and key across reloads. Allocation totals are validated in integer cents; the backend remains authoritative for concurrent balance changes and admin permissions. Known non-admin users see read-only controls; token-only login responses rely on backend authorization.

The old order-payment and sale-payment POSTs, allocation receipt calls, and their forms have been removed from the frontend. No compatibility calls are retained. Existing development data has not been reset or migrated by this frontend change.

## Swagger follow-ups

- `CustomerPaymentResponseDto.notes` should be a nullable string, rather than nullable object.
- `PaymentAllocationResponseDto.reversedAt` should be a nullable date-time string, and `reversalReason` a nullable string.
- Mutation operations declare the same case-insensitive idempotency header twice. Retain one required declaration.
- Sale responses still document the old `SalePaymentAllocationResponseDto`. Payment history and reversal status in the new UI come from `GET /payments/{paymentId}`; update the sale schema if its embedded allocation representation has also changed.

## Verification

Automated coverage checks that receiving does not allocate, applying does not record new money, allocation limits use available credit and target balances, an uncertain receive reuses its original request after reload, and reversal uses the separate reversal endpoint. A signed-in backend smoke test should cover receipt printing and balance changes across receive → apply → reverse.
