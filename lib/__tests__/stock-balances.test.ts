import { api } from '../api';
import { getStockBalances } from '../stock-balances';

afterEach(() => jest.restoreAllMocks());
it('reads the mixed-stock endpoint and retains separate units and backend values', async () => {
  const items = [{ productId: 1, productName: 'Rice', trackingMode: 'QUANTITY', baseUnit: 'kg', quantity: 97.5, stockValue: 4875 }, { productId: 2, productName: 'Tiller', trackingMode: 'SERIALIZED', baseUnit: 'piece', quantity: 1, stockValue: 100 }];
  const get = jest.spyOn(api, 'get').mockResolvedValue({ items, page: 1, limit: 20, total: 2 });
  expect((await getStockBalances(1)).items).toEqual(items);
  expect(get).toHaveBeenCalledWith('/inventory/stock/balances', { page: 1, limit: 20, productId: undefined });
});
