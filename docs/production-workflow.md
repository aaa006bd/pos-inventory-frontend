# Production workflow

Production converts active quantity-tracked materials into an active quantity-tracked finished product. Serialized products, labor, explicit waste, by-products, packaging conversion, and unit conversion are outside this release.

## User flow

1. Create a versioned Recipe / Bill of Materials with an expected finished quantity and material quantities in each product's base unit.
2. Create a planned production order from an active definition. The backend scales and returns the planned material quantities; planning does not change stock.
3. Complete the planned order with actual finished output and one actual quantity for every planned material. At least one material must be consumed.
4. Completion atomically consumes material stock, receives finished stock, calculates transferred material cost, and records a journal entry when the batch has non-zero cost.
5. Review planned and completed orders from Production History. Existing orders retain their definition version when a newer version becomes active.

## Retry and conflict behavior

Completion is stored in session storage with one idempotency key and its exact request body. An uncertain network or server failure exposes **Retry Saved Completion** and replays both unchanged. Definite validation and `409` responses are displayed and clear the saved attempt so the operator can correct the input. Typical conflicts include insufficient material stock, an already completed order, and reuse of a key with different input.

Stock movements remain read-only and show the resulting backend ledger entries through the existing movement workflow.
