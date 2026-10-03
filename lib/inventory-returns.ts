import { api } from './api';
import { validProductQuantity, type BaseUnit, type ProductTracking } from './product-quantity';
import type { SaleRecord } from './sales-orders';

export type CustomerReturnItem = { barcode: string; salesRecordLineId?: never; quantity?: never; restockable: boolean; notes?: string } | { barcode?: never; salesRecordLineId: number; quantity: number; restockable: boolean; notes?: string };
export interface CustomerReturnInput { type: 'customer_return'; salesRecordId: number; items: CustomerReturnItem[]; notes?: string }
export interface ReturnResult { id: number; returnNumber: string; type: 'customer_return' | 'supplier_return'; refundAmount: number; costAmount: number; items: { id: number; inventoryItemId: number | null; salesRecordLineId: number | null; quantity: number; baseUnit: string; restockable: boolean; salePrice: number; acquisitionCost: number }[] }
export const inventoryReturnsApi = { create: (body: CustomerReturnInput, key: string) => api.post<ReturnResult>('/inventory/returns', body, { headers: { 'Idempotency-Key': key } }) };

export function validateReturnQuantity(line: SaleRecord['lines'][number], raw: string) {
  const remaining = Number(line.quantity) - Number(line.returnedQuantity);
  const product: ProductTracking = { trackingMode: 'QUANTITY', baseUnit: (line.baseUnit || line.product.baseUnit || 'piece') as BaseUnit, quantityPrecision: line.product.quantityPrecision ?? (line.baseUnit === 'piece' ? 0 : 3) };
  return validProductQuantity(raw, product) && Number(raw) <= remaining;
}
