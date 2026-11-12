import { api } from '../api';
import { getStockSourcePreview } from '../stock-sources';

afterEach(() => jest.restoreAllMocks());

it('loads only inbound stock sources for the selected product and sorts the preview', async () => {
  const get = jest.spyOn(api, 'get').mockImplementation(async (_path, query) => {
    const type = (query as { type: string }).type;
    const item = { id: type === 'PRODUCTION_OUTPUT' ? 2 : type === 'PURCHASE_RECEIPT' ? 1 : 3, occurredAt: type === 'PRODUCTION_OUTPUT' ? '2026-10-17T12:00:00Z' : '2026-10-15T12:00:00Z' };
    return { items: [item], page: 1, limit: 20, total: 1, netQuantityDelta: null, netQuantityByUnit: {} };
  });
  const result = await getStockSourcePreview(42);
  expect(result.items.map(item => item.id)).toEqual([2, 1, 3]);
  expect(result.hasMore).toBe(false);
  expect(get).toHaveBeenCalledTimes(3);
  expect(get.mock.calls.map(([, query]) => query)).toEqual(expect.arrayContaining([
    expect.objectContaining({ productId: 42, type: 'PURCHASE_RECEIPT' }),
    expect.objectContaining({ productId: 42, type: 'PRODUCTION_OUTPUT' }),
    expect.objectContaining({ productId: 42, type: 'OPENING_BALANCE' }),
  ]));
});

it('keeps the product preview to the five latest sources and signals older records', async () => {
  jest.spyOn(api, 'get').mockImplementation(async (_path, query) => {
    const type = (query as { type: string }).type;
    const firstId = type === 'PURCHASE_RECEIPT' ? 1 : type === 'PRODUCTION_OUTPUT' ? 4 : 7;
    return {
      items: Array.from({ length: 3 }, (_, index) => ({ id: firstId + index, occurredAt: `2026-10-${String(firstId + index + 10).padStart(2, '0')}T12:00:00Z` })),
      page: 1,
      limit: 20,
      total: 3,
      netQuantityDelta: null,
      netQuantityByUnit: {},
    };
  });

  const result = await getStockSourcePreview(42);
  expect(result.items.map(item => item.id)).toEqual([9, 8, 7, 6, 5]);
  expect(result.hasMore).toBe(true);
});
