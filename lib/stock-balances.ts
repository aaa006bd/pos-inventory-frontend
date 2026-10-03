import { api } from './api';
import { baseUnits, type BaseUnit, type TrackingMode } from './product-quantity';

export interface StockBalance { productId: number; productName: string; trackingMode: TrackingMode; baseUnit: BaseUnit; quantity: number; stockValue: number }
export interface StockBalancePage { items: StockBalance[]; total: number; page: number; limit: number }
export async function getStockBalances(page: number, productId?: number) {
  const data = await api.get<StockBalancePage>('/inventory/stock/balances', { page, limit: 20, productId });
  if (!data || !Array.isArray(data.items) || data.page !== page || !Number.isInteger(data.limit) || data.limit <= 0 || !Number.isInteger(data.total) || data.total < 0 || data.items.some(row => !baseUnits.includes(row.baseUnit) || !Number.isFinite(row.quantity) || !Number.isFinite(row.stockValue))) throw new Error('Unable to read stock balances. Please try again.');
  return data;
}
