import { api } from '../api';
import { salesOrdersApi, salesOrderProgress, formatSalesAmount, formatSalesDate, formatPaymentStatus, validateSalesOrderDraft, type SalesOrder } from '../sales-orders';

const order: SalesOrder = {
  id: 25, tenantId: 3, orderNumber: 'SO-TEST-25', customerId: 17,
  customer: { id: 17, name: 'Test customer', phone: '123', email: null, address: null, customerType: 'dealer', dealerCode: null },
  status: 'PARTIALLY_FULFILLED', orderDate: '2026-09-12', expectedDeliveryDate: null, paymentMethod: 'CREDIT', paymentTermDays: 30,
  grossAmount: '1250.00', discountAmount: '50.00', netAmount: '1200.00', notes: null, createdById: 2, confirmedById: 2, confirmedAt: null,
  cancelledById: null, cancelledAt: null, cancellationReason: null, createdAt: '2026-09-12T00:00:00Z', updatedAt: '2026-09-12T00:00:00Z',
  lines: [{ id: 101, productId: 42, product: { id: 42, name: 'Tiller', sku: null, description: null, trackingMode: 'SERIALIZED', baseUnit: 'piece', quantityPrecision: 0 }, quantity: 10, fulfilledQuantity: 4, unitPrice: '125.00', grossAmount: '1250.00', discountAmount: '50.00', netAmount: '1200.00', notes: null }],
};

describe('sales order reads', () => {
  afterEach(() => jest.restoreAllMocks());

  it('passes documented combined filters to the list endpoint', async () => {
    const get = jest.spyOn(api, 'get').mockResolvedValue({ items: [order], total: 1, page: 1, limit: 20, pageCount: 1, hasNext: false });
    const query = { page: 1, limit: 20, status: 'CONFIRMED' as const, customerId: 17, orderNumber: 'SO-2026', from: '2026-09-01', to: '2026-09-30' };
    await salesOrdersApi.list(query);
    expect(get).toHaveBeenCalledWith('/sales/orders', query);
  });

  it('reads one order and computes fulfillment progress without shifting dates', async () => {
    const get = jest.spyOn(api, 'get').mockResolvedValue(order);
    await expect(salesOrdersApi.get(25)).resolves.toEqual(order);
    expect(get).toHaveBeenCalledWith('/sales/orders/25');
    expect(salesOrderProgress(order)).toEqual({ ordered: 10, fulfilled: 4 });
    expect(formatSalesDate('2026-09-12T23:00:00Z')).toBe('2026-09-12');
    expect(formatSalesAmount('1200.00')).toMatch(/1,?200\.00/);
    expect(formatPaymentStatus('PARTIALLY_PAID')).toBe('Partially paid');
  });
});

describe('sales order draft creation', () => {
  afterEach(() => jest.restoreAllMocks());

  it('posts the documented draft payload', async () => {
    const post = jest.spyOn(api, 'post').mockResolvedValue(order);
    const draft = { customerId: 17, paymentMethod: 'CREDIT' as const, paymentTermDays: 30, items: [{ productId: 42, quantity: 2, unitPrice: 125.5, discountAmount: 5 }] };
    expect(validateSalesOrderDraft(draft)).toBeNull();
    await expect(salesOrdersApi.create(draft)).resolves.toEqual(order);
    expect(post).toHaveBeenCalledWith('/sales/orders', draft);
  });

  it('rejects duplicate products and excessive discounts before submission', () => {
    const line = { productId: 42, quantity: 2, unitPrice: 10, discountAmount: 0 };
    const base = { customerId: 17, paymentMethod: 'CASH' as const, items: [line] };
    expect(validateSalesOrderDraft({ ...base, items: [line, line] })).toMatch(/only once/);
    expect(validateSalesOrderDraft({ ...base, items: [{ ...line, discountAmount: 21 }] })).toMatch(/cannot exceed/);
    expect(validateSalesOrderDraft({ ...base, items: [{ ...line, unitPrice: 1.234 }] })).toMatch(/two decimals/);
  });

  it('allows quantity-product decimals only within configured precision', () => {
    const base = { customerId: 1, paymentMethod: 'CASH' as const, items: [{ productId: 42, quantity: 2.5, unitPrice: 65, discountAmount: 0 }] };
    const rice = [{ id: 42, trackingMode: 'QUANTITY' as const, baseUnit: 'kg' as const, quantityPrecision: 3 }];
    expect(validateSalesOrderDraft(base, '2026-01-01', rice)).toBeNull();
    expect(validateSalesOrderDraft({ ...base, items: [{ ...base.items[0], quantity: 2.5555 }] }, '2026-01-01', rice)).toMatch(/at most 3/);
  });

  it('uses the documented order action and print endpoints', async () => {
    const patch = jest.spyOn(api, 'patch').mockResolvedValue(order);
    const post = jest.spyOn(api, 'post').mockResolvedValue(order);
    const getText = jest.spyOn(api, 'getText').mockResolvedValue('<html>print</html>');
    const draft = { customerId: 17, paymentMethod: 'CREDIT' as const, items: [{ productId: 42, quantity: 1, unitPrice: 10 }] };
    await salesOrdersApi.update(25, draft);
    await salesOrdersApi.confirm(25);
    await salesOrdersApi.cancel(25, 'Customer request');
    await salesOrdersApi.fulfill(25, { items: [{ salesOrderLineId: 101, inventoryItemIds: [901] }] }, 'fulfill-key');
    await salesOrdersApi.challan(81);
    await salesOrdersApi.invoice(81);
    expect(patch).toHaveBeenCalledWith('/sales/orders/25', draft);
    expect(post).toHaveBeenCalledWith('/sales/orders/25/confirm', {});
    expect(post).toHaveBeenCalledWith('/sales/orders/25/cancel', { reason: 'Customer request' });
    expect(post).toHaveBeenCalledWith('/sales/orders/25/fulfill', { items: [{ salesOrderLineId: 101, inventoryItemIds: [901] }] }, { headers: { 'Idempotency-Key': 'fulfill-key' } });
    expect(getText).toHaveBeenCalledWith('/sales/81/challan');
    expect(getText).toHaveBeenCalledWith('/sales/81/invoice');
  });

  it('filters fulfillment sales by the exact order ID', async () => {
    const get = jest.spyOn(api, 'get').mockResolvedValue({ items: [], page: 1, limit: 20, total: 0, pageCount: 0, hasNext: false });
    await salesOrdersApi.sales(2, 20, 25);
    expect(get).toHaveBeenCalledWith('/sales', { page: 2, limit: 20, salesOrderId: 25 });
  });

});
