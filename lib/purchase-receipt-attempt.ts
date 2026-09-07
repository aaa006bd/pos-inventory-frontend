import type { PurchaseOrder, PurchaseReceiptInput } from './purchases';

export interface ReceiptAttempt {
  version: 1;
  tenantId: number;
  orderId: number;
  key: string;
  createdAt: number;
  input: PurchaseReceiptInput;
}

type OrderIdentity = Pick<PurchaseOrder, 'id' | 'tenantId'>;
// Stop slightly before the documented seven-day backend retention period.
export const RECEIPT_RETRY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000 - 60 * 1000;

function storageKey(order: OrderIdentity) {
  if (!Number.isSafeInteger(order.tenantId) || order.tenantId < 1) throw new Error('The order is missing its business identity. Reload the order before receiving.');
  return `purchase-receipt:${order.tenantId}:${order.id}`;
}

export function readReceiptAttempt(order: OrderIdentity): ReceiptAttempt | null {
  const raw = sessionStorage.getItem(storageKey(order));
  if (!raw) return null;
  const value = JSON.parse(raw) as ReceiptAttempt;
  if (value?.version !== 1 || value.tenantId !== order.tenantId || value.orderId !== order.id || typeof value.key !== 'string' || !value.key || value.key.length > 200 || !Number.isFinite(value.createdAt) || !Array.isArray(value.input?.items) || !value.input.items.length || value.input.items.some(item =>
    !item || !Number.isSafeInteger(item.purchaseOrderLineId) || item.purchaseOrderLineId < 1 || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10000 ||
    (item.lotNumber !== undefined && typeof item.lotNumber !== 'string') || (item.notes !== undefined && typeof item.notes !== 'string')
  )) throw new Error('Saved receipt recovery data could not be read. Review receipt history before starting another delivery.');
  return value;
}

export function createReceiptAttempt(order: OrderIdentity, input: PurchaseReceiptInput): ReceiptAttempt {
  if (readReceiptAttempt(order)) throw new Error('A receipt is already pending. Reload this page to recover it.');
  const attempt: ReceiptAttempt = {
    version: 1, tenantId: order.tenantId, orderId: order.id,
    key: crypto.randomUUID(), createdAt: Date.now(),
    // Keep an immutable JSON snapshot: retries must not pick up edited quantities.
    input: JSON.parse(JSON.stringify(input)) as PurchaseReceiptInput,
  };
  // Persist before dispatch. If storage fails, do not risk an unrecoverable POST.
  sessionStorage.setItem(storageKey(order), JSON.stringify(attempt));
  return attempt;
}

export function clearReceiptAttempt(order: OrderIdentity, attempt: ReceiptAttempt) {
  const current = readReceiptAttempt(order);
  if (current?.key === attempt.key) sessionStorage.removeItem(storageKey(order));
}

export function canRetryReceiptAttempt(attempt: ReceiptAttempt, now = Date.now()) {
  const age = now - attempt.createdAt;
  return age >= 0 && age < RECEIPT_RETRY_WINDOW_MS;
}
