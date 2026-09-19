# Payment API cleanup

Audited frontend callers on 2026-09-18 after adding atomic order payments.

## Keep

| API | Current use |
| --- | --- |
| POST /sales/orders/{id}/payments | Record and allocate order payment atomically |
| GET /customers/{customerId}/payments | Customer history and order-linked receipt history |
| GET /payments/{paymentId} | Payment details, allocation and reversal history |
| GET /payments/{paymentId}/receipt | Original money receipt, including order payments |
| POST /customers/{customerId}/payments | Separate customer credit and standalone POS collection workflow |
| GET /customers/{customerId}/outstanding | Select targets for existing credit |
| POST /payments/{paymentId}/allocations | Apply existing credit without recording money twice |
| POST /payments/{paymentId}/allocations/{allocationId}/reverse | Correct an allocation and restore credit; not a refund |

None of these APIs is unused by the current frontend. The atomic order endpoint replaces two-step collection **for orders**, not every customer-credit operation.

## Frontend cleanup

- Fulfillment sale payment shortcuts now lead to the parent order, not the separate receive/apply workspace.
- Common amount, method, date and reference-length validation is shared without inventing a reference for order payments. The standalone receive contract still requires a reference; the order contract does not.
- Old order-payments and order-payment-receipt-button components and old salesOrdersApi payment methods are already absent. Do not restore per-batch collection forms.

## Not dead code

ReceivePaymentForm, ApplyCredit, AllocationForm, buildAllocations, validateReceipt, customerPaymentsApi.outstanding and the receive/allocate/reverse action variants remain active in Customer Payments. Removing them requires explicitly dropping or replacing customer-credit and standalone POS settlement, plus handling any unapplied or reversed payments. This cleanup does not delete those features or backend data.
