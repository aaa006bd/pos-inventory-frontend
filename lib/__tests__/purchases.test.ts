import { api, ApiError } from '../api';
import { purchasesApi, validateDraft, validateReceipt, purchaseProgress, uncertainMutation, getPurchaseCatalog, type PurchaseOrder } from '../purchases';

export const orderFixture: PurchaseOrder = {
  id: 25, orderNumber: 'PO-TEST-25', supplierId: 7, supplier: { id: 7, name: 'Test supplier' },
  status: 'PARTIALLY_RECEIVED', orderDate: '2026-09-07', totalAmount: '1255.00',
  createdAt: '2026-09-07', updatedAt: '2026-09-07',
  lines: [{ id: 101, productId: 42, product: { id: 42, name: 'Cotton Shirt' }, quantity: 10, receivedQuantity: 6, unitCost: '125.50', lineTotal: '1255.00' }],
};

describe('purchase workflow rules', () => {
  afterEach(() => jest.restoreAllMocks());

  it('validates required draft fields and backend quantity/cost constraints', () => {
    const valid = { supplierId: 7, items: [{ productId: 42, quantity: 10, unitCost: 125.5 }] };
    expect(validateDraft(valid)).toBeNull();
    expect(validateDraft({ ...valid, items: [] })).toContain('at least one');
    for (const quantity of [0, -1, 1.5, 10001, NaN]) expect(validateDraft({ ...valid, items: [{ ...valid.items[0], quantity }] })).not.toBeNull();
    for (const unitCost of [0, -1, Infinity, NaN]) expect(validateDraft({ ...valid, items: [{ ...valid.items[0], unitCost }] })).not.toBeNull();
  });

  it('allows partial and final receipts but prevents over-receipt and repeated lines', () => {
    const item = { purchaseOrderLineId: 101, quantity: 4 };
    expect(validateReceipt(orderFixture, { items: [item] })).toBeNull();
    expect(validateReceipt(orderFixture, { items: [{ ...item, quantity: 2 }] })).toBeNull();
    expect(validateReceipt(orderFixture, { items: [{ ...item, quantity: 5 }] })).toContain('4 outstanding');
    expect(validateReceipt(orderFixture, { items: [item, item] })).toContain('different line');
    expect(validateReceipt(orderFixture, { items: [] })).not.toBeNull();
    expect(purchaseProgress(orderFixture)).toEqual({ ordered: 10, received: 6 });
  });

  it.each(['DRAFT', 'RECEIVED', 'CANCELLED'] as const)('does not receive an order in %s state', status => {
    expect(validateReceipt({ ...orderFixture, status }, { items: [{ purchaseOrderLineId: 101, quantity: 1 }] })).toContain('not open');
  });

  it('uses the documented receipt line identifier, not the product ID', async () => {
    const post = jest.spyOn(api, 'post').mockResolvedValue({ order: orderFixture, receipts: [] });
    const receipt = { items: [{ purchaseOrderLineId: 101, quantity: 2, lotNumber: 'LOT-1' }] };
    await purchasesApi.receive(25, receipt);
    expect(post).toHaveBeenCalledWith('/purchases/orders/25/receive', receipt);
  });

  it('uses PATCH for draft edits and requires a cancellation reason payload', async () => {
    const patch = jest.spyOn(api, 'patch').mockResolvedValue(orderFixture);
    const post = jest.spyOn(api, 'post').mockResolvedValue(orderFixture);
    const draft = { supplierId: 7, items: [{ productId: 42, quantity: 10, unitCost: 125.5 }] };
    await purchasesApi.update(25, draft);
    await purchasesApi.cancel(25, 'Supplier unavailable');
    expect(patch).toHaveBeenCalledWith('/purchases/orders/25', draft);
    expect(post).toHaveBeenCalledWith('/purchases/orders/25/cancel', { reason: 'Supplier unavailable' });
  });

  it('loads products beyond the first response page', async () => {
    const get = jest.spyOn(api, 'get')
      .mockResolvedValueOnce({ data: [{ id: 1 }], total: 2, page: 1, limit: 1 })
      .mockResolvedValueOnce({ data: [{ id: 2 }], total: 2, page: 2, limit: 1 });
    await expect(getPurchaseCatalog()).resolves.toEqual([{ id: 1 }, { id: 2 }]);
    expect(get).toHaveBeenLastCalledWith('/products', { page: 2, limit: 100 });
  });

  it('does not silently offer an incomplete product catalog', async () => {
    jest.spyOn(api, 'get').mockResolvedValue({ data: [], total: 2, page: 1, limit: 100 });
    await expect(getPurchaseCatalog()).rejects.toThrow('incomplete');
  });

  it('treats network, server and unreadable-success responses as uncertain mutations', () => {
    expect(uncertainMutation(new TypeError('NetworkError'))).toBe(true);
    expect(uncertainMutation(new ApiError(500, 'Server error'))).toBe(true);
    expect(uncertainMutation(new ApiError(200, 'Invalid JSON'))).toBe(true);
    expect(uncertainMutation(new ApiError(400, 'Validation failed'))).toBe(false);
  });
});
