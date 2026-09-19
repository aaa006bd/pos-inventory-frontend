import { paymentCents } from './customer-payments';
import { salesOrdersApi, type SaleRecord, type SalesOrder } from './sales-orders';

export async function loadSalesOrderBatches(orderId: number): Promise<SaleRecord[]> {
  const sales: SaleRecord[] = [];
  const seen = new Set<number>();
  let expectedTotal: number | undefined;
  for (let page = 1; ; page++) {
    const response = await salesOrdersApi.sales(page, 100, orderId);
    if (!Array.isArray(response.items) || Number(response.page) !== page || !Number.isSafeInteger(response.total) || response.total < 0) throw new Error('Unable to read the complete order balance. Please refresh the order.');
    if (expectedTotal !== undefined && response.total !== expectedTotal) throw new Error('The deliveries changed while loading. Please refresh the order.');
    expectedTotal = response.total;
    for (const sale of response.items) {
      if (sale.salesOrderId !== orderId || seen.has(sale.id)) throw new Error('Unable to verify the order’s deliveries. Please refresh the order.');
      seen.add(sale.id); sales.push(sale);
    }
    if (sales.length === expectedTotal && !response.hasNext) return sales;
    if (!response.items.length || sales.length >= expectedTotal || !response.hasNext) throw new Error('The order balance is incomplete. Please refresh the order.');
  }
}

export function summarizeSalesOrder(order: Pick<SalesOrder, 'id' | 'netAmount'>, sales: SaleRecord[]) {
  const cents = (value: number | string) => {
    const result = paymentCents(value);
    if (result === null) throw new Error('Unable to verify the order amounts. Please refresh the order.');
    return result;
  };
  const orderTotal = cents(order.netAmount);
  let fulfilled = 0, paid = 0, outstanding = 0;
  const adjusted = sales.some(sale => sale.status !== 'COMPLETED');
  for (const sale of sales) {
    if (sale.salesOrderId !== order.id) throw new Error('A delivery does not belong to this order.');
    if (sale.status !== 'COMPLETED') continue;
    fulfilled += cents(sale.netAmount);
    paid += cents(sale.paidAmount);
    outstanding += cents(sale.outstandingAmount);
  }
  if (![orderTotal, fulfilled, paid, outstanding].every(Number.isSafeInteger) || fulfilled > orderTotal || paid + outstanding !== fulfilled) throw new Error('The order balance could not be reconciled. Refresh the order to load current amounts.');
  return {
    orderTotal: orderTotal / 100,
    fulfilledValue: fulfilled / 100,
    // The contract does not specify how voids/refunds affect fulfillment quantities.
    unfulfilledValue: adjusted ? null : (orderTotal - fulfilled) / 100,
    paidAmount: paid / 100,
    outstandingAmount: outstanding / 100,
    adjusted,
  };
}
