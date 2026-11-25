# Purchase Receipts API contract

Verified against the running backend Swagger at `http://host.docker.internal:3000/api-json` on 2026-11-19. These endpoints are now documented on backend `main`.

- `GET /purchases/receipts` is an authenticated, tenant-scoped, paginated feed of received purchase-order lines and manual stock lots. It excludes unreceived orders. Filters: `page`, `limit`, `sourceType` (`PURCHASE_ORDER` or `MANUAL_STOCK`), `supplierId`, inclusive Asia/Dhaka `from`/`to` dates, and `search`. The response is `{ items, total, page, limit, pageCount, hasNext }` with one source-prefixed ID per line. `unitCost` can be `null` for legacy lots.
- `GET /inventory/lots/{lotNumber}` returns the original received quantity, cost, supplier, product, receipt timestamp, and source document for either tracking mode. The `sourceDocument` can be `null` for a legacy lot that cannot be linked. `itemCount` applies only to serialized items; it is `null` for quantity products.
- Quantity stock is held at product level. Neither response provides a remaining quantity allocated to a quantity lot, so the frontend must not claim one.

The order-specific `GET /purchases/orders/{id}/receipts` remains the source for paginated Receipt History and printable purchase-order receipts.
