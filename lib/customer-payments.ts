import { api } from './api';

export const paymentMethods = ['CASH', 'BANK_TRANSFER', 'CARD', 'MOBILE_BANKING', 'CHEQUE', 'OTHER'] as const;
export type PaymentMethod = typeof paymentMethods[number];
export const paymentMethodLabels: Record<PaymentMethod, string> = { CASH: 'Cash', BANK_TRANSFER: 'Bank transfer', CARD: 'Card', MOBILE_BANKING: 'Mobile banking', CHEQUE: 'Cheque', OTHER: 'Other' };
export interface ReceivePayment { amount: number; paymentMethod: PaymentMethod; paymentDate: string; reference: string; notes?: string }
export type RecordOrderPayment = Omit<ReceivePayment, 'reference' | 'notes'> & { reference?: string };
export interface PaymentAllocation {
  id: number; salesRecordId: number; salesOrderId: number | null; amount: number; balanceAfter: number;
  allocatedAt: string; reversedAt: string | null; reversalReason: string | null;
}
export interface CustomerPayment {
  salesOrderId?: number | null;
  id: number; customerId: number; amount: number; allocatedAmount: number; availableAmount: number;
  paymentMethod: PaymentMethod; paymentDate: string; reference: string; notes: string | null;
  createdAt: string; receiptUrl: string; allocations: PaymentAllocation[];
}
export interface PaymentPage<T> { items: T[]; page: number; limit: number; total: number }
export interface OutstandingTarget { type: 'SALES_ORDER' | 'SALES_RECORD'; id: number; reference: string; outstandingAmount: number }
export type AllocationTarget = { salesOrderId: number; salesRecordId?: never; amount: number } | { salesRecordId: number; salesOrderId?: never; amount: number };
export type PaymentAction =
  | { type: 'order-payment'; orderId: number; body: RecordOrderPayment }
  | { type: 'receive'; customerId: number; body: ReceivePayment }
  | { type: 'allocate'; paymentId: number; body: { targets: AllocationTarget[] } }
  | { type: 'reverse'; paymentId: number; allocationId: number; body: { reason: string } };

export const customerPaymentsApi = {
  list: (customerId: number, page = 1) => api.get<PaymentPage<CustomerPayment>>(`/customers/${customerId}/payments`, { page, limit: 20 }),
  outstanding: (customerId: number, page = 1) => api.get<PaymentPage<OutstandingTarget>>(`/customers/${customerId}/outstanding`, { page, limit: 20 }),
  get: (paymentId: number) => api.get<CustomerPayment>(`/payments/${paymentId}`),
  receipt: (paymentId: number) => api.getText(`/payments/${paymentId}/receipt`),
  execute: (action: PaymentAction, key: string) => {
    const path = action.type === 'order-payment' ? `/sales/orders/${action.orderId}/payments` : action.type === 'receive' ? `/customers/${action.customerId}/payments` : action.type === 'allocate' ? `/payments/${action.paymentId}/allocations` : `/payments/${action.paymentId}/allocations/${action.allocationId}/reverse`;
    return api.post<CustomerPayment>(path, action.body, { headers: { 'Idempotency-Key': key } });
  },
};

export function validateOrderPayment(body: RecordOrderPayment, outstanding: number): string | null {
  const error = validatePaymentFields(body);
  if (error) return error;
  const balance = paymentCents(outstanding);
  if (balance === null || balance <= 0 || (paymentCents(body.amount) ?? Infinity) > balance) return 'Amount cannot exceed the order’s current outstanding balance.';
  return null;
}

// Integer cents keep validation and allocation totals exact.
export function paymentCents(value: string | number): number | null {
  if (!/^\d+(\.\d{1,2})?$/.test(String(value))) return null;
  const cents = Math.round(Number(value) * 100);
  return Number.isSafeInteger(cents) ? cents : null;
}

function validatePaymentFields(body: RecordOrderPayment): string | null {
  const cents = paymentCents(body.amount);
  if (cents === null || cents <= 0) return 'Enter a positive amount with at most two decimal places.';
  if (!paymentMethods.includes(body.paymentMethod)) return 'Choose a payment method.';
  const date = new Date(`${body.paymentDate}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.paymentDate) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== body.paymentDate) return 'Enter a valid payment date.';
  if ((body.reference?.length ?? 0) > 200) return 'Enter a payment reference of up to 200 characters.';
  return null;
}

export function validateReceipt(body: ReceivePayment): string | null {
  const error = validatePaymentFields(body);
  if (error) return error;
  if (!body.reference.trim()) return 'Enter a payment reference of up to 200 characters.';
  if ((body.notes?.length ?? 0) > 1000) return 'Notes must be 1,000 characters or fewer.';
  return null;
}

export function allocationKey(target: Pick<OutstandingTarget, 'type' | 'id'>) { return `${target.type}:${target.id}`; }
export function buildAllocations(rows: OutstandingTarget[], amounts: Record<string, string>, available: number): AllocationTarget[] {
  const targets: AllocationTarget[] = [];
  let total = 0;
  for (const row of rows) {
    const raw = amounts[allocationKey(row)];
    if (!raw || Number(raw) === 0) continue;
    const cents = paymentCents(raw);
    const balance = paymentCents(row.outstandingAmount);
    if (cents === null || cents <= 0 || balance === null || cents > balance) throw new Error(`Enter an amount within the outstanding balance for ${row.reference}, with at most two decimals.`);
    total += cents;
    targets.push(row.type === 'SALES_ORDER' ? { salesOrderId: row.id, amount: cents / 100 } : { salesRecordId: row.id, amount: cents / 100 });
  }
  if (!targets.length) throw new Error('Choose at least one outstanding order or POS sale.');
  const credit = paymentCents(available);
  if (credit === null || total > credit) throw new Error('The total applied cannot exceed this payment’s available credit.');
  return targets;
}

export function paymentShortcut(customerId: number, orderId?: number | null, saleId?: number | null) {
  const query = new URLSearchParams({ customerId: String(customerId) });
  if (orderId) query.set('salesOrderId', String(orderId));
  else if (saleId) query.set('salesRecordId', String(saleId));
  return `/dashboard/sales/payments?${query}`;
}
