import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import StockProductDetail from '../[id]/stock-product-detail';
import { realApi } from '@/lib/api';
import { getStockBalances } from '@/lib/stock-balances';
import { getStockSourcePreview } from '@/lib/stock-sources';
import { getInventoryMovements } from '@/lib/inventory-movements';

jest.mock('@/lib/auth-context', () => ({ useAuth: () => ({ token: 'test-token' }) }));
jest.mock('@/lib/stock-balances', () => ({ getStockBalances: jest.fn() }));
jest.mock('@/lib/stock-sources', () => ({ getStockSourcePreview: jest.fn() }));
jest.mock('@/lib/inventory-movements', () => ({
  ...jest.requireActual('@/lib/inventory-movements'),
  getInventoryMovements: jest.fn(),
}));

afterEach(() => jest.restoreAllMocks());

it('shows traceable source movements without inventing a purchase-order link', async () => {
  jest.spyOn(realApi, 'getProduct').mockResolvedValue({ id: 42, name: 'Jelly Bun', sku: 'JELLY', basePrice: 12, baseUnit: 'piece', trackingMode: 'QUANTITY' } as never);
  jest.spyOn(realApi, 'getInventory').mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 } as never);
  jest.mocked(getStockBalances).mockResolvedValue({ items: [{ productId: 42, productName: 'Jelly Bun', trackingMode: 'QUANTITY', baseUnit: 'piece', quantity: 500, stockValue: 4000 }], total: 1, page: 1, limit: 20 });
  jest.mocked(getInventoryMovements).mockResolvedValue({ items: [], total: 0, page: 1, limit: 20, netQuantityDelta: null, netQuantityByUnit: {} });
  jest.mocked(getStockSourcePreview).mockResolvedValue({ items: [
    { id: 1, type: 'PURCHASE_RECEIPT', referenceType: 'INVENTORY_LOT', referenceId: 9, inventoryItemId: null, sourceDocumentNumber: 'LOT-9', productId: 42, productName: 'Jelly Bun', barcode: null, baseUnit: 'piece', quantityDelta: 300, unitCost: 8, fromStatus: null, toStatus: 'in_stock', reason: null, notes: null, actorId: null, actorName: null, occurredAt: '2026-10-13T10:00:00Z' },
    { id: 2, type: 'PRODUCTION_OUTPUT', referenceType: 'PRODUCTION_ORDER', referenceId: 24, inventoryItemId: null, sourceDocumentNumber: 'PRD-24', productId: 42, productName: 'Jelly Bun', barcode: null, baseUnit: 'piece', quantityDelta: 180, unitCost: 7.5, fromStatus: null, toStatus: 'in_stock', reason: null, notes: null, actorId: null, actorName: null, occurredAt: '2026-10-13T09:00:00Z' },
    { id: 3, type: 'OPENING_BALANCE', referenceType: 'MIGRATION', referenceId: null, inventoryItemId: null, sourceDocumentNumber: 'Opening balance', productId: 42, productName: 'Jelly Bun', barcode: null, baseUnit: 'piece', quantityDelta: 20, unitCost: null, fromStatus: null, toStatus: 'in_stock', reason: null, notes: null, actorId: null, actorName: null, occurredAt: '2026-01-01T00:00:00Z' },
  ], hasMore: true });

  render(<StockProductDetail productId={42} />);

  expect(await screen.findByText('৳12.00 / piece')).toBeInTheDocument();
  expect(within(screen.getByRole('region', { name: 'Product stock summary' })).getByText('Avg stock cost').previousElementSibling).toHaveTextContent('৳8.00 / piece');
  expect(await screen.findByText('LOT-9')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'LOT-9' })).not.toBeInTheDocument();
  const productionLink = await screen.findByRole('link', { name: 'PRD-24' });
  expect(productionLink).toHaveAttribute('href', '/dashboard/production/orders/24');
  expect(productionLink.tagName).toBe('A');
  expect(within(screen.getByRole('region', { name: 'Stock sources' })).getByText('৳8.00 / piece')).toBeInTheDocument();
  const sources = screen.getByRole('region', { name: 'Stock sources' });
  expect(within(sources).getByText('Purchase receipt')).toHaveClass('bg-sky-100');
  expect(within(sources).getByText('Production output')).toHaveClass('bg-amber-100');
  expect(within(sources).getByText('Opening stock')).toHaveClass('bg-violet-100');
  expect(screen.getByRole('columnheader', { name: 'Received' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'See all stock movements' })).toHaveAttribute('href', '/dashboard/inventory/movements?productId=42');
  expect(within(sources).queryByRole('link', { name: 'Browse full stock history' })).not.toBeInTheDocument();
  expect(within(sources).getByText('Showing the latest 3 source movements.')).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Stock sources' }).compareDocumentPosition(screen.getByText('Quantity stock', { selector: 'h2' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

it('puts sources before serialized units and links purchase receipts to their lot', async () => {
  jest.spyOn(realApi, 'getProduct').mockResolvedValue({ id: 7, name: 'Raja Pump', sku: 'RAJA', basePrice: 4500, baseUnit: 'piece', trackingMode: 'SERIALIZED' } as never);
  jest.spyOn(realApi, 'getInventory').mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 } as never);
  jest.mocked(getStockBalances).mockResolvedValue({ items: [{ productId: 7, productName: 'Raja Pump', trackingMode: 'SERIALIZED', baseUnit: 'piece', quantity: 2, stockValue: 10000 }], total: 1, page: 1, limit: 20 });
  jest.mocked(getInventoryMovements).mockResolvedValue({ items: [], total: 0, page: 1, limit: 20, netQuantityDelta: null, netQuantityByUnit: {} });
  jest.mocked(getStockSourcePreview).mockResolvedValue({ items: [
    { id: 3, type: 'PURCHASE_RECEIPT', referenceType: 'INVENTORY_LOT', referenceId: 11, inventoryItemId: 19, sourceDocumentNumber: 'LOT-PUMP', productId: 7, productName: 'Raja Pump', barcode: 'PUMP-19', baseUnit: 'piece', quantityDelta: 1, unitCost: 5000, fromStatus: null, toStatus: 'in_stock', reason: null, notes: null, actorId: null, actorName: null, occurredAt: '2026-10-13T10:00:00Z' },
  ], hasMore: false });

  render(<StockProductDetail productId={7} />);

  const summary = await screen.findByRole('region', { name: 'Product stock summary' });
  expect(within(summary).getByText('৳4,500.00 / piece')).toBeInTheDocument();
  expect(within(summary).getByText('Avg stock cost').previousElementSibling).toHaveTextContent('৳5,000.00 / piece');
  expect(screen.getByText('RAJA · Serialized units')).toBeInTheDocument();
  const lotLink = await screen.findByRole('link', { name: 'LOT-PUMP' });
  expect(lotLink).toHaveAttribute('href', '/dashboard/inventory/list?lotNumber=LOT-PUMP');
  expect(lotLink.tagName).toBe('A');
  expect(screen.getByRole('link', { name: 'View all serialized units' })).toHaveAttribute('href', '/dashboard/inventory/list?productId=7');
  expect(screen.getByRole('region', { name: 'Stock sources' }).compareDocumentPosition(screen.getByText(/A preview of individual barcodes, lots and unit status/)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

it('shows concise unit and movement previews without nested pagination', async () => {
  jest.spyOn(realApi, 'getProduct').mockResolvedValue({ id: 7, name: 'Raja Pump', sku: 'RAJA', basePrice: 4500, baseUnit: 'piece', trackingMode: 'SERIALIZED' } as never);
  jest.spyOn(realApi, 'getInventory').mockResolvedValue({ items: Array.from({ length: 8 }, (_, index) => ({ id: index + 1, barcode: `PUMP-${index + 1}`, status: 'in_stock', acquiredDate: '2026-10-13T10:00:00Z', product: { name: 'Raja Pump' } })), total: 12, page: 1, limit: 20 } as never);
  jest.mocked(getStockBalances).mockResolvedValue({ items: [{ productId: 7, productName: 'Raja Pump', trackingMode: 'SERIALIZED', baseUnit: 'piece', quantity: 5, stockValue: 25000 }], total: 1, page: 1, limit: 20 });
  jest.mocked(getInventoryMovements).mockResolvedValue({ items: Array.from({ length: 8 }, (_, index) => ({ id: index + 1, occurredAt: '2026-10-13T10:00:00Z', type: 'SALE', quantityDelta: -1, baseUnit: 'piece', sourceDocumentNumber: `MOV-${index + 1}` })), total: 15, page: 1, limit: 20, netQuantityDelta: -8, netQuantityByUnit: { piece: -8 } } as never);
  jest.mocked(getStockSourcePreview).mockResolvedValue({ items: [], hasMore: false });

  render(<StockProductDetail productId={7} />);

  expect(await screen.findByText('Showing 5 of 12 units.')).toBeInTheDocument();
  expect(await screen.findByText('Showing 5 of 15 movements.')).toBeInTheDocument();
  expect(realApi.getInventory).toHaveBeenCalledWith({ productId: 7, page: 1, limit: 20 });
  expect(getInventoryMovements).toHaveBeenCalledWith(expect.objectContaining({ productId: '7' }), 1);
  expect(screen.getByText('MOV-5')).toBeInTheDocument();
  expect(screen.queryByText('MOV-6')).not.toBeInTheDocument();
  expect(screen.getByText('PUMP-5')).toBeInTheDocument();
  expect(screen.queryByText('PUMP-6')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'View all serialized units' })).toHaveAttribute('href', '/dashboard/inventory/list?productId=7');
  expect(screen.getByRole('link', { name: 'See all stock movements' })).toHaveAttribute('href', '/dashboard/inventory/movements?productId=7');
});

it('shows no average cost when available stock is zero', async () => {
  jest.spyOn(realApi, 'getProduct').mockResolvedValue({ id: 7, name: 'Raja Pump', sku: 'RAJA', basePrice: 4500, baseUnit: 'piece', trackingMode: 'SERIALIZED' } as never);
  jest.spyOn(realApi, 'getInventory').mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 } as never);
  jest.mocked(getStockBalances).mockResolvedValue({ items: [{ productId: 7, productName: 'Raja Pump', trackingMode: 'SERIALIZED', baseUnit: 'piece', quantity: 0, stockValue: 0 }], total: 1, page: 1, limit: 20 });
  jest.mocked(getInventoryMovements).mockResolvedValue({ items: [], total: 0, page: 1, limit: 20, netQuantityDelta: null, netQuantityByUnit: {} });
  jest.mocked(getStockSourcePreview).mockResolvedValue({ items: [], hasMore: false });

  render(<StockProductDetail productId={7} />);

  const summary = await screen.findByRole('region', { name: 'Product stock summary' });
  expect(within(summary).getByText('৳4,500.00 / piece')).toBeInTheDocument();
  expect(within(summary).getByText('Avg stock cost').previousElementSibling).toHaveTextContent('—');
});
