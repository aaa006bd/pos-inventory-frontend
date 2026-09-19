import { loadSalesOrderBatches, summarizeSalesOrder } from '../sales-order-summary';
import { salesOrdersApi, type SaleRecord } from '../sales-orders';

const order = { id: 1, netAmount: '580000.00' };
const first = { id: 1, salesOrderId: 1, status: 'COMPLETED', netAmount: '180000.00', paidAmount: 180000, outstandingAmount: 0 } as SaleRecord;
const second = { ...first, id: 2, paidAmount: 100000, outstandingAmount: 80000 };

afterEach(() => jest.restoreAllMocks());

it('separates the verified 580k order, 360k fulfilled, 280k applied and 80k outstanding', () => {
  expect(summarizeSalesOrder(order, [first, second])).toEqual({ orderTotal: 580000, fulfilledValue: 360000, unfulfilledValue: 220000, paidAmount: 280000, outstandingAmount: 80000, adjusted: false });
});

it('does not charge unfulfilled value or count voided sales as current debt', () => {
  expect(summarizeSalesOrder(order, []).outstandingAmount).toBe(0);
  expect(summarizeSalesOrder(order, []).unfulfilledValue).toBe(580000);
  const adjusted = summarizeSalesOrder(order, [second, { ...first, status: 'VOIDED' }]);
  expect(adjusted.outstandingAmount).toBe(80000);
  expect(adjusted.paidAmount).toBe(100000);
  expect(adjusted.unfulfilledValue).toBeNull();
});

it('reads every page before reporting a combined balance', async () => {
  const list = jest.spyOn(salesOrdersApi, 'sales')
    .mockResolvedValueOnce({ items: [first], page: 1, limit: 100, total: 2, pageCount: 2, hasNext: true })
    .mockResolvedValueOnce({ items: [second], page: 2, limit: 100, total: 2, pageCount: 2, hasNext: false });
  const sales = await loadSalesOrderBatches(1);
  expect(list).toHaveBeenNthCalledWith(2, 2, 100, 1);
  expect(summarizeSalesOrder(order, sales).outstandingAmount).toBe(80000);
});

it('does not display a partial or duplicate balance', async () => {
  jest.spyOn(salesOrdersApi, 'sales').mockResolvedValue({ items: [first], page: 1, limit: 100, total: 2, pageCount: 2, hasNext: false });
  await expect(loadSalesOrderBatches(1)).rejects.toThrow(/incomplete/);
  expect(() => summarizeSalesOrder(order, [{ ...first, paidAmount: 190000 }])).toThrow(/reconciled/);
});
