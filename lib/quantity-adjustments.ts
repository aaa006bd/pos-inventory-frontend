import { api, type Product } from './api';
import { validProductQuantity } from './product-quantity';

export type QuantityAdjustmentReason = 'WASTAGE' | 'MANUAL_CORRECTION';

export interface QuantityAdjustmentInput {
  productId: number;
  quantityDelta: number;
  reason: QuantityAdjustmentReason;
  notes: string;
  occurredAt?: string;
}

export interface QuantityAdjustmentResult extends QuantityAdjustmentInput {
  id: number;
  baseUnit: 'piece' | 'kg' | 'litre' | 'metre';
  actorId: number;
  occurredAt: string;
  resultingBalance: number;
}

export function validateQuantityAdjustment(input: QuantityAdjustmentInput, product?: Product): string | null {
  if (!product || product.active === false || product.trackingMode !== 'QUANTITY') return 'Select an active quantity-tracked product.';
  if (!Number.isFinite(input.quantityDelta) || input.quantityDelta === 0) return 'Enter a non-zero quantity.';
  if (input.reason === 'WASTAGE' && input.quantityDelta >= 0) return 'Wastage must remove stock.';
  const tracking = { trackingMode: 'QUANTITY' as const, baseUnit: product.baseUnit ?? 'piece', quantityPrecision: product.quantityPrecision ?? 0 };
  if (!validProductQuantity(Math.abs(input.quantityDelta), tracking)) return `Enter a quantity with at most ${tracking.quantityPrecision} decimal places.`;
  if (!input.notes.trim()) return 'Enter an audit note explaining this adjustment.';
  if (input.notes.trim().length > 2000) return 'Notes must be 2,000 characters or fewer.';
  if (input.occurredAt && !Number.isFinite(new Date(input.occurredAt).getTime())) return 'Enter a valid occurrence date and time.';
  return null;
}

export function createQuantityAdjustment(input: QuantityAdjustmentInput, idempotencyKey: string) {
  return api.post<QuantityAdjustmentResult>('/inventory/quantity-adjustments', input, { headers: { 'Idempotency-Key': idempotencyKey } });
}
