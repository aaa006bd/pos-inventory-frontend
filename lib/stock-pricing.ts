import type { StockBalance } from './stock-balances';

export function averageStockCost(balance: Pick<StockBalance, 'quantity' | 'stockValue'>): number | null {
  if (!Number.isFinite(balance.quantity) || balance.quantity <= 0 || !Number.isFinite(balance.stockValue)) return null;
  return balance.stockValue / balance.quantity;
}

export function currentSellingPrice(product?: { basePrice: number | string | null }): number | null {
  if (product?.basePrice == null || product.basePrice === '') return null;
  const price = Number(product.basePrice);
  return Number.isFinite(price) && price >= 0 ? price : null;
}
