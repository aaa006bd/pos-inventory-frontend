# Workflow sketches

Hand-drawn UX concepts matching the original purchasing sketch. These are planning illustrations, not screenshots or evidence that a feature is implemented. Example records are fictional.

See [the proposed workflow and UI plan](proposed-workflows.md) for existing capabilities, proposed screens, user journeys, backend dependencies, and suggested implementation order.

Each sheet shows separate screens side by side to explain navigation between pages; it does not require a single split-pane screen. Groups expand in the main sidebar, and detail sections use horizontal tabs.

| Sketch | Journey | Scope |
| --- | --- | --- |
| [Purchasing reference](00-purchasing-reference.png) | Draft → confirm → receive → lots/barcodes | Original concept; receipt history has since been implemented. Its API-support footnote is historical. |
| [Sales orders and POS](01-sales-orders-and-pos.png) | Order → fulfillment → sale → settlement/documents; quick retail shortcut | Proposed order workflow alongside existing immediate POS. |
| [Customers and credit](02-customers-and-credit.png) | Customer → credit check → payment → allocation → receipt | Proposed dedicated customer/credit workspace. |
| [Inventory and supplier returns](03-inventory-and-returns.png) | Stock → lot → items → barcode; separate returns/adjustments | Mix of existing capabilities and proposed drill-down UX. |
| [Finance and settlement](04-finance-and-settlement.png) | Balance → ledger → payment; financial reports | Extends existing supplier payments and expenses. |
| [Catalog and master data](05-catalog-and-master-data.png) | Category → attributes → product | Deferred enhancements to existing master data. |
| [Users and platform administration](06-users-and-platform-admin.png) | Tenant user administration; separate platform tenant controls | Permissions deferred; platform administration optional. |

## Boundaries

- Screen groupings and proposed tabs are design suggestions, not verified backend contracts. Confirm live schemas before implementing another workflow.
- Payment recording and allocation must not create the same payment twice.
- Supplier returns, stock adjustments, and customer refunds are different operations. Customer refunds still require backend design.
- Platform administration stays separate from the tenant workspace. Backend authorization remains necessary regardless of visible UI controls.
- See [the roadmap](../frontend-backend-workflow-plan.md) for planning context and [purchase implementation](../purchase-order-implementation.md) for the completed purchase slice and its outstanding acceptance checks.

## Generation

Created using the built-in image-generation tool, following the imagegen skill. The original purchasing image is the style reference. Exact prompts for the six new sheets are in [prompts.md](prompts.md). Sketches and their proposed workflow plan are included as a documentation follow-up on the purchase-order branch.
