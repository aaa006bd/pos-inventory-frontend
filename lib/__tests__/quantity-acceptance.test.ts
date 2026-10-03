import { api, realApi } from '../api';
import { inventoryReturnsApi } from '../inventory-returns';
import { getStockBalances } from '../stock-balances';

describe('quantity inventory acceptance path', () => {
  afterEach(() => jest.restoreAllMocks());

  it('receives 100 kg, sells 2.5 kg with a serialized unit, and partially returns the original sale line without duplicate retries', async () => {
    let rice = 0;
    const responses = new Map<string, unknown>();
    const once = <T>(route: string, key: string, operation: () => T) => {
      const identity = `${route}:${key}`;
      if (!responses.has(identity)) responses.set(identity, operation());
      return responses.get(identity) as T;
    };

    jest.spyOn(api, 'post').mockImplementation(async (path, body, options) => {
      const key = (options?.headers as Record<string, string> | undefined)?.['Idempotency-Key'] ?? '';
      if (path === '/inventory/receive-batch') return once(path, key, () => {
        rice += Number((body as { quantity: number }).quantity);
        return { items: [], lot: { id: 1, productId: 42, lotNumber: 'RICE-1', quantityReceived: 100, totalCost: 5000, unitCost: 50 } };
      });
      if (path === '/inventory/returns') return once(path, key, () => {
        const quantity = Number((body as { items: { quantity: number }[] }).items[0].quantity);
        rice += quantity;
        return { id: 9, returnNumber: 'RET-9', type: 'customer_return', refundAmount: 65 * quantity, costAmount: 50 * quantity, items: [] };
      });
      throw new Error(`Unexpected POST ${path}`);
    });
    jest.spyOn(api, 'patch').mockImplementation(async (path, body, options) => {
      if (path !== '/inventory/sell') throw new Error(`Unexpected PATCH ${path}`);
      const key = (options?.headers as Record<string, string> | undefined)?.['Idempotency-Key'] ?? '';
      return once(path, key, () => {
        const quantityLine = (body as { items: { productId?: number; quantity?: number }[] }).items.find(line => line.productId === 42)!;
        rice -= Number(quantityLine.quantity);
        return { soldItems: [{ id: 7, barcode: 'SERIAL-1' }], salesRecord: { id: 81, saleNumber: 'SALE-81', netAmount: 172.5, grossAmount: 172.5, discountAmount: 0, outstandingAmount: 0, lines: [{ id: 61, productId: 42, quantity: 2.5, inventoryItemId: null, barcode: null }] } };
      });
    });
    jest.spyOn(api, 'get').mockImplementation(async path => {
      if (path !== '/inventory/stock/balances') throw new Error(`Unexpected GET ${path}`);
      return { items: [{ productId: 42, productName: 'Rice', trackingMode: 'QUANTITY', baseUnit: 'kg', quantity: rice, stockValue: rice * 50 }], total: 1, page: 1, limit: 20 };
    });

    const receipt = { productId: 42, supplierId: 7, quantity: 100, unitCost: 50 };
    await realApi.receiveBatchInventory(receipt, 'receive-1');
    await realApi.receiveBatchInventory(receipt, 'receive-1');
    expect(rice).toBe(100);

    const checkout = { paymentMethod: 'CASH' as const, items: [{ productId: 42, quantity: 2.5, salePrice: 65, discountAmount: 0 }, { barcode: 'SERIAL-1', salePrice: 10, discountAmount: 0 }] };
    const sale = await realApi.sellBatchItems(checkout, 'checkout-1');
    await realApi.sellBatchItems(checkout, 'checkout-1');
    expect((await getStockBalances(1, 42)).items[0].quantity).toBe(97.5);

    const returned = { type: 'customer_return' as const, salesRecordId: sale.salesRecord.id, items: [{ salesRecordLineId: 61, quantity: 0.5, restockable: true }] };
    await inventoryReturnsApi.create(returned, 'return-1');
    await inventoryReturnsApi.create(returned, 'return-1');
    expect(rice).toBe(98);
    expect(returned).toEqual(expect.objectContaining({ salesRecordId: 81, items: [expect.objectContaining({ salesRecordLineId: 61, quantity: 0.5 })] }));
  });
});
