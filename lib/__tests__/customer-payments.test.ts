import { api } from '../api';
import { allocationKey, buildAllocations, customerPaymentsApi, paymentCents, validateReceipt, validateOrderPayment, type OutstandingTarget } from '../customer-payments';

const order: OutstandingTarget = { type: 'SALES_ORDER', id: 12, reference: 'SO-12', outstandingAmount: 80 };
const pos: OutstandingTarget = { type: 'SALES_RECORD', id: 12, reference: 'POS-12', outstandingAmount: 50 };

afterEach(() => jest.restoreAllMocks());

it('records and applies an order payment with one request and optional reference', async () => {
  const post = jest.spyOn(api, 'post').mockResolvedValue({ id: 8, salesOrderId: 12 });
  const body = { amount: 80, paymentMethod: 'CASH' as const, paymentDate: '2026-09-18' };
  expect(validateOrderPayment(body, 80)).toBeNull();
  expect(validateOrderPayment(body, 79)).toMatch(/outstanding/);
  expect(validateOrderPayment(body, 0)).toMatch(/outstanding/);
  await customerPaymentsApi.execute({ type: 'order-payment', orderId: 12, body }, 'order-key');
  expect(post).toHaveBeenCalledTimes(1);
  expect(post).toHaveBeenCalledWith('/sales/orders/12/payments', body, { headers: { 'Idempotency-Key': 'order-key' } });
});

it('separates recording money, applying credit, and reversing an allocation', async () => {
  const post = jest.spyOn(api, 'post').mockResolvedValue({ id: 8 });
  const body = { amount: 100, paymentMethod: 'CASH' as const, paymentDate: '2026-09-14', reference: 'RCPT-1' };
  await customerPaymentsApi.execute({ type: 'receive', customerId: 17, body }, 'receive-key');
  await customerPaymentsApi.execute({ type: 'allocate', paymentId: 8, body: { targets: [{ salesOrderId: 12, amount: 40 }] } }, 'apply-key');
  await customerPaymentsApi.execute({ type: 'reverse', paymentId: 8, allocationId: 9, body: { reason: 'Wrong order' } }, 'reverse-key');
  expect(post.mock.calls).toEqual([
    ['/customers/17/payments', body, { headers: { 'Idempotency-Key': 'receive-key' } }],
    ['/payments/8/allocations', { targets: [{ salesOrderId: 12, amount: 40 }] }, { headers: { 'Idempotency-Key': 'apply-key' } }],
    ['/payments/8/allocations/9/reverse', { reason: 'Wrong order' }, { headers: { 'Idempotency-Key': 'reverse-key' } }],
  ]);
});

it('enforces cents, total credit, individual balances, and distinct target kinds', () => {
  expect(paymentCents('0.29')).toBe(29);
  expect(paymentCents('1.005')).toBeNull();
  expect(buildAllocations([order, pos], { [allocationKey(order)]: '40', [allocationKey(pos)]: '20' }, 100)).toEqual([{ salesOrderId: 12, amount: 40 }, { salesRecordId: 12, amount: 20 }]);
  expect(() => buildAllocations([order, pos], { [allocationKey(order)]: '80', [allocationKey(pos)]: '50' }, 100)).toThrow(/available credit/);
  expect(() => buildAllocations([order], { [allocationKey(order)]: '80.01' }, 100)).toThrow(/outstanding balance/);
  expect(() => buildAllocations([order], { [allocationKey(order)]: '0.001' }, 100)).toThrow(/two decimals/);
  expect(() => buildAllocations([order], {}, 100)).toThrow(/at least one/);
});

it('rejects invalid received amounts, dates and references', () => {
  const body = { amount: 10, paymentMethod: 'BANK_TRANSFER' as const, paymentDate: '2026-09-14', reference: 'BANK-1' };
  expect(validateReceipt(body)).toBeNull();
  expect(validateReceipt({ ...body, amount: -1 })).toMatch(/positive amount/);
  expect(validateReceipt({ ...body, paymentDate: '2026-02-30' })).toMatch(/valid payment date/);
  expect(validateReceipt({ ...body, reference: ' ' })).toMatch(/reference/);
});
