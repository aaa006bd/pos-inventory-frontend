import { api } from './api';

export const movementTypes = { OPENING_BALANCE: 'Opening balance', PURCHASE_RECEIPT: 'Purchase receipt', SALE: 'Sale', CUSTOMER_RETURN: 'Customer return', SUPPLIER_RETURN: 'Supplier return', ADJUSTMENT: 'Adjustment' };
export const stockStatuses = { in_stock: 'In stock', sold: 'Sold', damaged: 'Damaged', returned: 'Returned' };
export interface InventoryMovement {
  id: number; inventoryItemId: number; productId: number; productName: string; barcode: string;
  type: keyof typeof movementTypes; quantityDelta: number;
  fromStatus: keyof typeof stockStatuses | null; toStatus: keyof typeof stockStatuses;
  referenceType: 'INVENTORY_LOT' | 'SALES_RECORD' | 'INVENTORY_RETURN' | 'MANUAL_ADJUSTMENT' | 'MIGRATION';
  referenceId: number | null; sourceDocumentNumber: string | null;
  unitCost: number | null; reason: string | null; notes: string | null; actorId: number | null; actorName: string | null; occurredAt: string;
}
export interface MovementPage { items: InventoryMovement[]; page: number; limit: number; total: number; netQuantityDelta: number }
export interface MovementFilters { productId: string; type: string; toStatus: string; from: string; to: string; inventoryItemId?: number }
export const emptyMovementFilters: MovementFilters = { productId: '', type: '', toStatus: '', from: '', to: '' };

export function movementQuery(filters: MovementFilters, page: number) {
  const from = filters.from ? new Date(`${filters.from}T00:00:00`) : undefined;
  const to = filters.to ? new Date(`${filters.to}T23:59:59.999`) : undefined;
  if ((from && !Number.isFinite(from.getTime())) || (to && !Number.isFinite(to.getTime()))) throw new Error('Enter valid dates.');
  if (from && to && from > to) throw new Error('Start date must be on or before end date.');
  return { page, limit: 20, productId: filters.productId ? Number(filters.productId) : undefined, inventoryItemId: filters.inventoryItemId, type: filters.type || undefined, toStatus: filters.toStatus || undefined, from: from?.toISOString(), to: to?.toISOString() };
}
export async function getInventoryMovements(filters: MovementFilters, page: number) {
  const response = await api.get<MovementPage>('/inventory/movements', movementQuery(filters, page));
  if (!response || !Array.isArray(response.items) || !Number.isInteger(response.total) || response.total < 0 || response.page !== page || !Number.isInteger(response.limit) || response.limit <= 0 || !Number.isFinite(response.netQuantityDelta)) throw new Error('Unable to read the movement ledger. Please try again.');
  return response;
}
export function movementSourceLink(row: InventoryMovement): string | undefined {
  if (row.referenceType === 'SALES_RECORD' && row.referenceId) return `/dashboard/sales/records/${row.referenceId}`;
  if (row.referenceType === 'INVENTORY_LOT' && row.sourceDocumentNumber) return `/dashboard/inventory/list?lotNumber=${encodeURIComponent(row.sourceDocumentNumber)}`;
}
export function movementSourceLabel(row: InventoryMovement) {
  return row.sourceDocumentNumber ?? (row.referenceType === 'MANUAL_ADJUSTMENT' ? 'Manual adjustment' : row.referenceType === 'MIGRATION' ? 'Opening migration' : `${row.referenceType.replaceAll('_', ' ').toLowerCase()}${row.referenceId ? ` #${row.referenceId}` : ''}`);
}
export function movementDelta(value: number) { return value > 0 ? `+${value} In` : value < 0 ? `${value} Out` : '0 Status change'; }
