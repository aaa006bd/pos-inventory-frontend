# Quantity inventory rollout

Branch: `feat/product-quantity-inventory`, based on merged PR #3 (`origin/main`). Local Swagger checked on 2026-10-03. No migration or business-data writes performed by the frontend agent.

## Implemented

- Product creation: SERIALIZED / QUANTITY, piece/kg/litre/metre, precision 0–3. Serialized and piece products require precision 0. Creation form explicitly warns these settings are immutable; update API does not accept them.
- Product catalog reads all pages using the existing catalog reader. Supplier is selected on receiving, not sent as an undocumented product creation property.
- Stock Balances reads `/inventory/stock/balances` with product filter and pagination, showing each product's quantity/unit and backend stock value. No cross-unit quantity total.
- Existing `/inventory/items` remains explicitly labeled Serialized Items.
- Movements accept nullable unit IDs/barcodes and nullable mixed-unit aggregate. Display `netQuantityByUnit`, and filter by product for quantity history rather than inventing inventory units.
- Receiving reads `{ items, lot }`; checkout reads `{ soldItems, salesRecord }`. Receiving, checkout, fulfillment, customer returns, purchase receiving and serialized supplier returns preserve an idempotency key plus exact payload for safe retry. Validation and 409 responses are visible.
- POS checkout supports serialized barcode scans and manual decimal quantity lines in one cart. Prices are per base unit and discounts apply to the whole line.
- Sales and purchase orders validate decimal quantities at product precision. Fulfillment uses `inventoryItemIds` for serialized lines and `quantity` for quantity lines.
- Customer returns bind quantity returns to the original `salesRecordId` and `salesRecordLineId`, and display the backend-calculated return value with distinct cash/credit language.
- Daily stock requires a product and renders values in its base unit. Mixed-unit order screens report completed product lines instead of adding kg, litres and pieces.
- The automated acceptance path receives 100 kg, retries without duplication, sells 2.5 kg alongside a serialized item, verifies 97.5 kg, and partially returns the original sale line with another duplicate-safe retry.

## Release boundary

Packaging conversions, scales, expiry tracking, quantity supplier returns and manual bulk adjustments remain out of scope. `/inventory/items` and `/inventory/stock/summary` remain serialized-only; Stock Balances is the mixed-inventory overview.
