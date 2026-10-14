import type { Product } from '../api';
import { api } from '../api';
import { createQuantityAdjustment, validateQuantityAdjustment, type QuantityAdjustmentInput } from '../quantity-adjustments';

const flour = { id: 1, name: 'Flour', active: true, trackingMode: 'QUANTITY', baseUnit: 'kg', quantityPrecision: 3 } as Product;
const wastage: QuantityAdjustmentInput = { productId: 1, quantityDelta: -2.5, reason: 'WASTAGE', notes: 'Spoiled after water damage' };

it('accepts wastage matching the product precision', () => {
  expect(validateQuantityAdjustment(wastage, flour)).toBeNull();
});

it('requires wastage to remove stock', () => {
  expect(validateQuantityAdjustment({ ...wastage, quantityDelta: 2.5 }, flour)).toMatch(/remove stock/);
});

it('rejects excess precision and missing audit notes', () => {
  expect(validateQuantityAdjustment({ ...wastage, quantityDelta: -2.5555 }, flour)).toMatch(/3 decimal/);
  expect(validateQuantityAdjustment({ ...wastage, notes: ' ' }, flour)).toMatch(/audit note/);
});

it('sends the adjustment with its idempotency key', async () => {
  const response = { id: 9, ...wastage, baseUnit: 'kg', actorId: 1, occurredAt: '2026-10-14T20:00:00.000Z', resultingBalance: 97.5 } as const;
  const post = jest.spyOn(api, 'post').mockResolvedValue(response);
  await expect(createQuantityAdjustment(wastage, 'adjustment-key')).resolves.toEqual(response);
  expect(post).toHaveBeenCalledWith('/inventory/quantity-adjustments', wastage, { headers: { 'Idempotency-Key': 'adjustment-key' } });
});
