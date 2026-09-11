# API contract fixing

Last reviewed: 2026-09-09.

This file tracks confirmed frontend/backend contract inconsistencies. An item remains open until the live response, Swagger schema, and frontend type agree.

## Open: product-list pagination response

Priority: High

Area: Catalog / purchase-order product selection

Endpoint: `GET /products`

Owner: Backend contract

### Problem

The endpoint does not currently expose one reliable response shape:

- A captured live response returned a raw `Product[]` array.
- A browser response was observed using an `{ items, total, page, limit, pageCount, hasNext }` envelope.
- The existing frontend type historically expected `{ data, total, page, limit }`.
- The current Swagger operation lists pagination query parameters but has no documented `200` response schema.

A raw array is not sufficient for dependable pagination because it does not say how many records exist or whether another page is available. This matters when creating a purchase order: the product selector must not silently omit products beyond the first response.

### Required backend contract

`GET /products` should always return the same paginated envelope, including for an empty result:

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "limit": 100,
  "pageCount": 0,
  "hasNext": false
}
```

Field expectations:

| Field | Type | Requirement |
| --- | --- | --- |
| `items` | `Product[]` | Products for the requested page. |
| `total` | integer | Total records matching the filters. |
| `page` | integer | Current one-based page. |
| `limit` | integer | Applied page size. |
| `pageCount` | integer | Total number of pages; define empty-result behavior consistently. |
| `hasNext` | boolean | Whether a subsequent page exists. |

The API should use this envelope consistently regardless of whether `page`, `limit`, `search`, or `category` is omitted. Defaults and maximum limits should be documented. If legacy raw-array behavior must remain, it should use a separately documented/versioned endpoint rather than changing the shape of `GET /products` conditionally.

### Swagger work

- Add a named product-list response DTO.
- Attach that schema to the `200` response for `GET /products`.
- Document optional/default query parameters accurately; do not mark them required if the endpoint accepts omission.
- Document product field nullability, particularly `description`, `sku`, and `defaultCost`.
- Add examples for populated and empty pages.

### Frontend mitigation

The purchase catalog loader temporarily accepts all three observed formats:

1. Raw `Product[]`.
2. `{ items, total, ... }`.
3. Legacy `{ data, total, ... }`.

Development-only diagnostics use the `[purchases:catalog]` console prefix and report only response shape, pagination metadata, and item count. Product records and authentication data are not logged.

This compatibility is temporary. After the backend response and Swagger contract are stable, remove the raw-array and `data` branches and use one shared paginated-product type throughout the frontend.

### Acceptance criteria

- The same envelope is returned for requests with and without explicit pagination parameters.
- Empty results return the envelope with `items: []`, not a raw array or `null`.
- `items.length <= limit` and pagination metadata describes the filtered result set.
- Paging until `hasNext` is false returns each matching product exactly once.
- The Swagger response schema matches captured authenticated responses.
- Product list, purchase-order draft, and manual stock receipt consume the same typed contract.

## Related open documentation cleanup

The purchase receipt operation has also been observed documenting the case-insensitive `Idempotency-Key` header twice with conflicting required flags. Consolidate it into one required header definition. This is independent of product pagination but belongs in the same contract cleanup pass.
