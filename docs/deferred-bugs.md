# Deferred bugs

## BAK-07 — Child categories are unavailable after creation

Status: deferred on 2026-10-14.

Child-category hierarchy is not required for the current operational workflows, which can use top-level categories. When resumed, the frontend must recursively load and render category children, include them in the product category picker, and verify that products receive attributes from the selected category and all ancestors. The backend Swagger contract should document category list, children, path, and inherited-attribute response schemas before acceptance testing.

Acceptance should cover a child and grandchild category, persistence after reload, selection during product creation, and validation/persistence of both inherited and category-owned required attributes.
