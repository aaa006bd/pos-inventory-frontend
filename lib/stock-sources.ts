import { emptyMovementFilters, getInventoryMovements, type InventoryMovement } from './inventory-movements';

export const stockSourceTypes = ['PURCHASE_RECEIPT', 'PRODUCTION_OUTPUT', 'OPENING_BALANCE'] as const;
export const stockSourcePreviewLimit = 5;

export interface StockSourcePreview {
  items: InventoryMovement[];
  hasMore: boolean;
}

export async function getStockSourcePreview(productId: number): Promise<StockSourcePreview> {
  const pages = await Promise.all(stockSourceTypes.map(type => getInventoryMovements({ ...emptyMovementFilters, productId: String(productId), type }, 1)));
  const items = pages.flatMap(page => page.items).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, stockSourcePreviewLimit);
  return { items, hasMore: pages.some(page => page.total > page.items.length) || pages.reduce((count, page) => count + page.items.length, 0) > items.length };
}
