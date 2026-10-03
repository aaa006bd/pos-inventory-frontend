import { api, realApi } from '../api';

afterEach(() => jest.restoreAllMocks());
it('sends the receipt idempotency key and reads the new envelope', async () => {
  const response = { items: [], lot: { id: 1, productId: 42, lotNumber: 'LOT-1', quantityReceived: 100, totalCost: 5000, unitCost: 50 } };
  const post = jest.spyOn(api, 'post').mockResolvedValue(response);
  const payload = { productId: 42, supplierId: 7, quantity: 100, unitCost: 50 };
  expect(await realApi.receiveBatchInventory(payload, 'receipt-key')).toEqual(response);
  expect(post).toHaveBeenCalledWith('/inventory/receive-batch', payload, { headers: { 'Idempotency-Key': 'receipt-key' } });
});
it('sends a mixed checkout with one idempotency key and reads the sales record envelope', async () => {
  const response = { soldItems: [{ id: 9 }], salesRecord: { id: 81, saleNumber: 'SALE-81', netAmount: 162.5 } };
  const patch = jest.spyOn(api, 'patch').mockResolvedValue(response);
  const payload = { paymentMethod: 'CASH' as const, items: [{ productId: 42, quantity: 2.5, salePrice: 65, discountAmount: 0 }, { barcode: 'UNIT-1', salePrice: 10, discountAmount: 0 }] };
  expect(await realApi.sellBatchItems(payload, 'checkout-key')).toEqual(response);
  expect(patch).toHaveBeenCalledWith('/inventory/sell', payload, { headers: { 'Idempotency-Key': 'checkout-key' } });
});
it('sends the supplier return idempotency key', async () => {
  const post = jest.spyOn(api, 'post').mockResolvedValue({ returnNumber: 'RET-1' });
  const payload = { type: 'supplier_return' as const, lotNumber: 'LOT-1', items: [{ barcode: 'UNIT-1' }] };
  await realApi.createReturn(payload, 'return-key');
  expect(post).toHaveBeenCalledWith('/inventory/returns', payload, { headers: { 'Idempotency-Key': 'return-key' } });
});
