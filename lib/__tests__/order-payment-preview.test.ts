import { previewOrderPayment } from '../order-payment-preview';
import type { SaleRecord } from '../sales-orders';

const sale = (id: number, outstandingAmount: number, extra: Partial<SaleRecord> = {}) => ({ id, outstandingAmount, soldAt: '2026-09-18T00:00:00Z', status: 'COMPLETED', paymentMethod: 'CREDIT', ...extra }) as SaleRecord;

it('previews oldest first with ID tie-break and exact cents', () => {
  const rows = previewOrderPayment([sale(2, 50), sale(1, 80)], '100.29');
  expect(rows.map(row => [row.sale.id, row.applied, row.remaining])).toEqual([[1, 80, 0], [2, 20.29, 29.71]]);
});

it('excludes paid, voided and cash sales and does not overallocate', () => {
  const rows = previewOrderPayment([sale(1, 0), sale(2, 10, { status: 'VOIDED' }), sale(3, 10, { paymentMethod: 'CASH' }), sale(4, 20)], '100');
  expect(rows.map(row => [row.sale.id, row.applied])).toEqual([[4, 20]]);
  expect(previewOrderPayment([sale(4, 20)], '')[0].applied).toBe(0);
});
