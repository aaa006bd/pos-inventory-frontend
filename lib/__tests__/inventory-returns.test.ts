import { api } from '../api';
import { inventoryReturnsApi, validateReturnQuantity } from '../inventory-returns';
import type { SaleRecord } from '../sales-orders';

afterEach(() => jest.restoreAllMocks());
it('posts an original quantity sale line with an idempotency key', async () => {
  const body = { type: 'customer_return' as const, salesRecordId: 81, items: [{ salesRecordLineId: 61, quantity: 0.5, restockable: true }] };
  const response = { id: 3, returnNumber: 'RET-3', type: 'customer_return', refundAmount: 32.5, costAmount: 25, items: [] };
  const post = jest.spyOn(api, 'post').mockResolvedValue(response);
  expect(await inventoryReturnsApi.create(body, 'return-key')).toEqual(response);
  expect(post).toHaveBeenCalledWith('/inventory/returns', body, { headers: { 'Idempotency-Key': 'return-key' } });
});
it('limits cumulative returns to original quantity minus returned quantity', () => {
  const line = { quantity: 2.5, returnedQuantity: 0.5, baseUnit: 'kg', product: { name: 'Rice', trackingMode: 'QUANTITY', baseUnit: 'kg', quantityPrecision: 3 } } as SaleRecord['lines'][number];
  expect(validateReturnQuantity(line, '2')).toBe(true);
  expect(validateReturnQuantity(line, '2.001')).toBe(false);
  expect(validateReturnQuantity(line, '0.0001')).toBe(false);
});
