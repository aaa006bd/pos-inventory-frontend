import { api, ApiError, type Product, type Supplier, type PaginatedResponse } from './api';

export const purchaseStatuses = ['DRAFT', 'CONFIRMED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'] as const;
export type PurchaseStatus = typeof purchaseStatuses[number];
export const purchaseStatusLabels: Record<PurchaseStatus, string> = {
  DRAFT: 'Draft', CONFIRMED: 'Confirmed', PARTIALLY_RECEIVED: 'Partially received', RECEIVED: 'Received', CANCELLED: 'Cancelled',
};

export interface PurchaseLine {
  id: number;
  productId: number;
  product: { id: number; name: string; sku?: string | null };
  quantity: number;
  receivedQuantity: number;
  unitCost: number | string;
  lineTotal: number | string;
  notes?: string | null;
}

export interface PurchaseOrder {
  id: number;
  tenantId: number;
  orderNumber: string;
  supplierId: number;
  supplier: { id: number; name: string; phone?: string; contactEmail?: string | null };
  status: PurchaseStatus;
  orderDate: string;
  expectedDeliveryDate?: string | null;
  totalAmount: number | string;
  notes?: string | null;
  cancellationReason?: string | null;
  confirmedAt?: string | null;
  cancelledAt?: string | null;
  lines: PurchaseLine[];
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseDraft {
  supplierId: number;
  expectedDeliveryDate?: string;
  notes?: string;
  items: { productId: number; quantity: number; unitCost: number; notes?: string }[];
}

export type PurchaseDraftUpdate = Omit<PurchaseDraft, 'expectedDeliveryDate'> & { expectedDeliveryDate?: string | null };

export interface PurchaseReceiptInput {
  items: { purchaseOrderLineId: number; quantity: number; lotNumber?: string; notes?: string }[];
}

export interface PurchaseReceiptResult {
  receiptId: number;
  order: PurchaseOrder;
  receipts: { purchaseOrderLineId: number; lotId: number; lotNumber: string; inventoryItemIds: number[] }[];
}

export interface PurchaseReceipt {
  id: number;
  purchaseOrderId: number;
  receiptDate: string;
  receivedById: number;
  receivedBy: { id: number; email: string; role: string };
  totalAmount: number | string;
  lines: {
    id: number;
    purchaseOrderLineId: number;
    productId: number;
    productName: string;
    receivedQuantity: number;
    unitCost: number | string;
    lineTotal: number | string;
    notes?: string | null;
    lotId: number;
    lotNumber: string;
    journalEntryId?: number | null;
    accounting?: { id: number; eventType: string; reference: string; date: string } | null;
  }[];
}

export interface PurchaseReceiptList {
  items: PurchaseReceipt[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
  hasNext: boolean;
}

export interface PurchaseListQuery {
  page: number;
  limit: number;
  status?: PurchaseStatus;
  supplierId?: number;
  orderNumber?: string;
}

export interface PurchaseList {
  items: PurchaseOrder[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
  hasNext: boolean;
}

export const purchasesApi = {
  list: (query: PurchaseListQuery) => api.get<PurchaseList>('/purchases/orders', { ...query }),
  get: (id: number) => api.get<PurchaseOrder>(`/purchases/orders/${id}`),
  create: (draft: PurchaseDraft) => api.post<PurchaseOrder>('/purchases/orders', draft),
  update: (id: number, draft: PurchaseDraftUpdate) => api.patch<PurchaseOrder>(`/purchases/orders/${id}`, draft),
  confirm: (id: number) => api.post<PurchaseOrder>(`/purchases/orders/${id}/confirm`, {}),
  cancel: (id: number, reason: string) => api.post<PurchaseOrder>(`/purchases/orders/${id}/cancel`, { reason }),
  receive: (id: number, receipt: PurchaseReceiptInput, idempotencyKey: string) => api.post<PurchaseReceiptResult>(`/purchases/orders/${id}/receive`, receipt, { headers: { 'Idempotency-Key': idempotencyKey } }),
  receipts: (id: number, page = 1, limit = 20) => api.get<PurchaseReceiptList>(`/purchases/orders/${id}/receipts`, { page, limit }),
};

export function canReceive(order: PurchaseOrder) {
  return order.status === 'CONFIRMED' || order.status === 'PARTIALLY_RECEIVED';
}

export function remainingQuantity(line: PurchaseLine) {
  return Math.max(0, Number(line.quantity) - Number(line.receivedQuantity));
}

export function purchaseProgress(order: PurchaseOrder) {
  return order.lines.reduce((total, line) => ({ ordered: total.ordered + Number(line.quantity), received: total.received + Number(line.receivedQuantity) }), { ordered: 0, received: 0 });
}

export function validateDraft(draft: PurchaseDraft): string | null {
  if (!Number.isInteger(draft.supplierId) || draft.supplierId < 1) return 'Select a supplier.';
  if (!draft.items.length) return 'Add at least one product.';
  for (const item of draft.items) {
    if (!Number.isInteger(item.productId) || item.productId < 1) return 'Select a product for every line.';
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10000) return 'Each quantity must be a whole number between 1 and 10,000.';
    if (!Number.isFinite(item.unitCost) || item.unitCost < 0.01) return 'Each unit cost must be at least 0.01.';
    if ((item.notes?.length ?? 0) > 1000) return 'Line notes must be 1,000 characters or fewer.';
  }
  if ((draft.notes?.length ?? 0) > 2000) return 'Order notes must be 2,000 characters or fewer.';
  return null;
}

export function validateReceipt(order: PurchaseOrder, input: PurchaseReceiptInput): string | null {
  if (!canReceive(order)) return 'This order is not open for receiving. Reload the order to check its status.';
  if (!input.items.length) return 'Enter a receiving quantity for at least one line.';
  const seen = new Set<number>();
  for (const item of input.items) {
    const line = order.lines.find(line => line.id === item.purchaseOrderLineId);
    if (!line || seen.has(item.purchaseOrderLineId)) return 'Each receipt line must refer to a different line on this order.';
    seen.add(item.purchaseOrderLineId);
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10000) return 'Receiving quantities must be whole numbers between 1 and 10,000.';
    if (item.quantity > remainingQuantity(line)) return `Cannot receive more than ${remainingQuantity(line)} outstanding units of ${line.product.name}.`;
    if ((item.lotNumber?.length ?? 0) > 100) return 'Lot numbers must be 100 characters or fewer.';
    if ((item.notes?.length ?? 0) > 1000) return 'Receipt notes must be 1,000 characters or fewer.';
  }
  return null;
}

export function uncertainMutation(error: unknown) {
  return !(error instanceof ApiError) || error.status >= 500 || error.status === 408 || (error.status >= 200 && error.status < 300);
}

export function purchaseError(error: unknown) {
  return error instanceof Error ? error.message : 'Unable to complete this request.';
}

export function formatAmount(value: number | string) {
  return Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatPurchaseDate(value?: string | null) {
  // Preserve calendar dates rather than shifting them across time zones.
  return value ? value.slice(0, 10) : '—';
}

// The existing catalog endpoint uses { data, total, page, limit }.
// Follow pages instead of silently limiting order entry to the first page.
export async function getPurchaseCatalog() {
  const products: Product[] = [];
  const seen = new Set<number>();
  for (let page = 1; ; page++) {
    const response = await api.get<PaginatedResponse<Product>>('/products', { page, limit: 100 });
    if (!Array.isArray(response.data) || !Number.isFinite(Number(response.total))) throw new Error('Unable to read the product catalog. Please try again.');
    for (const product of response.data) {
      if (seen.has(product.id)) throw new Error('The product catalog changed while loading. Please try again.');
      seen.add(product.id);
      products.push(product);
    }
    if (products.length >= Number(response.total)) return products;
    if (!response.data.length) throw new Error('The product catalog is incomplete. Please try again.');
  }
}

export const getPurchaseSuppliers = () => api.get<(Supplier & { active?: boolean })[]>('/suppliers');
