# Technical debt

## TD-01 — Pending state for products without a selling price

Status: deferred (2026-11-10).

The first Stock Overview and receipt-review implementation will use the existing product selling-price workflow. It will not introduce a `Pending` stock or product state.

If the business must record physical stock before a selling price is available, design this as a separate backend-supported workflow. Define whether `Pending` belongs to the product, receipt, or stock; whether pending quantity is included in stock valuation and available stock; and which actions (sale, fulfillment, production, adjustment, and return) are allowed. The API and persisted state must enforce the rules, expose pending quantities/status, and support completing the missing price. A frontend-only label or validation rule is insufficient.

Acceptance: stock can be recorded without a selling price only under the agreed pending rules; it cannot be sold while ineligible; entering a valid selling price transitions it exactly once without duplicating the receipt or stock movement.
