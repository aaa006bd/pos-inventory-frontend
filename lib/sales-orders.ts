import { api } from './api';
import { getPurchaseCatalog, uncertainMutation } from './purchases';
import { validProductQuantity, type ProductTracking } from './product-quantity';

export const salesOrderStatuses = ['DRAFT', 'CONFIRMED', 'PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED'] as const;
export type SalesOrderStatus = typeof salesOrderStatuses[number];
export const salesOrderStatusLabels: Record<SalesOrderStatus, string> = {
  DRAFT: 'Draft',
  CONFIRMED: 'Confirmed',
  PARTIALLY_FULFILLED: 'Partially fulfilled',
  FULFILLED: 'Fulfilled',
  CANCELLED: 'Cancelled',
};

export interface SalesOrderLine {
  id: number;
  productId: number;
  product: { id: number; name: string; sku: string | null; description: string | null } & ProductTracking;
  quantity: number;
  fulfilledQuantity: number;
  unitPrice: number | string;
  grossAmount: number | string;
  discountAmount: number | string;
  netAmount: number | string;
  notes: string | null;
}

export interface SalesOrder {
  id: number;
  tenantId: number;
  orderNumber: string;
  customerId: number;
  customer: { id: number; name: string; phone: string; email: string | null; address: string | null; customerType: 'direct_customer' | 'dealer'; dealerCode: string | null };
  status: SalesOrderStatus;
  orderDate: string;
  expectedDeliveryDate: string | null;
  paymentMethod: 'CASH' | 'CREDIT';
  paymentTermDays: number;
  grossAmount: number | string;
  discountAmount: number | string;
  netAmount: number | string;
  notes: string | null;
  createdById: number;
  confirmedById: number | null;
  confirmedAt: string | null;
  cancelledById: number | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  lines: SalesOrderLine[];
  createdAt: string;
  updatedAt: string;
}

export interface SalesOrderListQuery {
  page: number;
  limit: number;
  status?: SalesOrderStatus;
  customerId?: number;
  orderNumber?: string;
  from?: string;
  to?: string;
}

export interface SalesOrderList {
  items: SalesOrder[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
  hasNext: boolean;
}

export interface SaleRecord {
  id: number; customerId: number | null; saleNumber: string; salesOrderId: number | null; salesOrder: { id: number; orderNumber: string } | null; paymentMethod: 'CASH' | 'CREDIT';
  netAmount: number | string; paidAmount: number; outstandingAmount: number;
  paymentStatus: string; status: string; soldAt: string;
  returnedAmount?: number;
  lines: { id: number; product: { name: string } & Partial<ProductTracking>; productId?: number; inventoryItemId?: number | null; quantity: number; returnedQuantity: number; baseUnit: string; barcode: string | null; salePrice: number; discountAmount?: number; netAmount: number; acquisitionCost?: number }[];
  paymentAllocations: { id: number; amount: number; balanceAfter: number; allocatedAt: string; description: string | null }[];
}

export interface SaleList { items: SaleRecord[]; total: number; page: number; limit: number; pageCount: number; hasNext: boolean }

export interface CreateSalesOrderLine {
  productId: number;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  notes?: string;
}

export interface CreateSalesOrder {
  customerId: number;
  expectedDeliveryDate?: string;
  paymentMethod: 'CASH' | 'CREDIT';
  paymentTermDays?: number;
  items: CreateSalesOrderLine[];
  notes?: string;
}

export function validateSalesOrderDraft(draft: CreateSalesOrder, earliestDate = new Date().toISOString().slice(0, 10), products?: Array<{ id: number } & ProductTracking>): string | null {
  if (!Number.isSafeInteger(draft.customerId) || draft.customerId < 1) return 'Select a customer.';
  if (!['CASH', 'CREDIT'].includes(draft.paymentMethod)) return 'Select a payment method.';
  if (draft.paymentTermDays !== undefined && (!Number.isInteger(draft.paymentTermDays) || draft.paymentTermDays < 0 || draft.paymentTermDays > 3650)) return 'Payment terms must be between 0 and 3,650 days.';
  if (draft.expectedDeliveryDate && (!/^\d{4}-\d{2}-\d{2}$/.test(draft.expectedDeliveryDate) || draft.expectedDeliveryDate < earliestDate)) return 'Expected delivery cannot be before the order date.';
  if (draft.notes !== undefined && draft.notes.length > 2000) return 'Order notes must be 2,000 characters or fewer.';
  if (draft.items.length < 1 || draft.items.length > 100) return 'Add between 1 and 100 order lines.';
  const seen = new Set<number>();
  for (const item of draft.items) {
    if (!Number.isSafeInteger(item.productId) || item.productId < 1) return 'Select a product for every line.';
    if (seen.has(item.productId)) return 'Each product can appear only once.';
    seen.add(item.productId);
    const product = products?.find(value => value.id === item.productId);
    if (item.quantity > 10000 || (product ? !validProductQuantity(item.quantity, product) : !Number.isFinite(item.quantity) || item.quantity < 0.001)) return product ? `Quantity for product #${item.productId} must be positive with at most ${product.quantityPrecision} decimal places.` : 'Quantity must be between 0.001 and 10,000.';
    if (!validMoney(item.unitPrice) || item.unitPrice < 0) return 'Unit price must be a non-negative amount with at most two decimals.';
    if (item.discountAmount !== undefined && (!validMoney(item.discountAmount) || item.discountAmount < 0 || item.discountAmount > item.quantity * item.unitPrice)) return 'Line discount must be non-negative and cannot exceed the line total.';
    if (item.notes !== undefined && item.notes.length > 1000) return 'Line notes must be 1,000 characters or fewer.';
  }
  return null;
}

function validMoney(value: number) {
  return Number.isFinite(value) && Math.abs(value * 100 - Math.round(value * 100)) < 1e-8;
}

export { getPurchaseCatalog, uncertainMutation };

export const salesOrdersApi = {
  list: (query: SalesOrderListQuery) => api.get<SalesOrderList>('/sales/orders', { ...query }),
  get: (id: number) => api.get<SalesOrder>(`/sales/orders/${id}`),
  create: (draft: CreateSalesOrder) => api.post<SalesOrder>('/sales/orders', draft),
  update: (id: number, draft: CreateSalesOrder) => api.patch<SalesOrder>(`/sales/orders/${id}`, draft),
  confirm: (id: number) => api.post<SalesOrder>(`/sales/orders/${id}/confirm`, {}),
  cancel: (id: number, reason: string) => api.post<SalesOrder>(`/sales/orders/${id}/cancel`, { reason }),
  fulfill: (id: number, body: FulfillSalesOrderInput, idempotencyKey: string) => api.post<{ order: SalesOrder; sale: { id: number; saleNumber: string } }>(`/sales/orders/${id}/fulfill`, body, { headers: { 'Idempotency-Key': idempotencyKey } }),
  sales: (page = 1, limit = 20, salesOrderId?: number) => api.get<SaleList>('/sales', { page, limit, salesOrderId }),
  sale: (id: number) => api.get<SaleRecord>(`/sales/${id}`),
  challan: (id: number) => api.getText(`/sales/${id}/challan`),
  invoice: (id: number) => api.getText(`/sales/${id}/invoice`),
};

export type FulfillSalesOrderLine = { salesOrderLineId: number; inventoryItemIds: number[]; quantity?: never } | { salesOrderLineId: number; inventoryItemIds?: never; quantity: number };
export interface FulfillSalesOrderInput { items: FulfillSalesOrderLine[]; notes?: string }

export function salesOrderProgress(order: SalesOrder) {
  return order.lines.reduce((result, line) => ({ ordered: result.ordered + Number(line.quantity), fulfilled: result.fulfilled + Number(line.fulfilledQuantity) }), { ordered: 0, fulfilled: 0 });
}

export function formatSalesAmount(value: number | string) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
}

export function formatSalesDate(value?: string | null) {
  return value ? value.slice(0, 10) : '—';
}

export function formatPaymentStatus(status: string) {
  const labels: Record<string, string> = { UNPAID: 'Unpaid', PARTIALLY_PAID: 'Partially paid', PAID: 'Paid', OVERDUE: 'Overdue' };
  return labels[status] ?? status.replaceAll('_', ' ').toLowerCase().replace(/^./, letter => letter.toUpperCase());
}
