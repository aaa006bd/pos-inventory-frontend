# Inventory movements

Open Inventory Movements in the sidebar (`/dashboard/inventory/movements`). This is a read-only ledger using `GET /inventory/movements`.

- Apply product, movement type, local date range and resulting-status filters. Date boundaries are sent as ISO timestamps; the end date includes the whole local day.
- Matching count and net change come from the backend across all filtered rows, not the displayed page. Net change is not current stock.
- View opens a modal side panel with status transition, cost, explanation, actor and source. Escape and Close dismiss it.
- View this item's history clears other filters and requests the selected inventoryItemId.
- Sale sources link to sales records. Lot sources link to the existing lot-filtered inventory list. Returns, adjustments and migration entries remain text because no matching detail destination is available.
- Product choices reuse the existing paginated catalog reader. Catalog failure does not prevent reading the ledger.

No inventory writes, barcode search, editing, or deletion are introduced. Existing workflows create movements. Backend authentication and tenant scoping remain authoritative.
