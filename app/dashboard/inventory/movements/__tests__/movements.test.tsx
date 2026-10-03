import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as movements from '@/lib/inventory-movements';
import { getPurchaseCatalog } from '@/lib/purchases';
import InventoryMovementsPage from '../page';

jest.mock('@/lib/auth-context', () => ({ useAuth: () => ({ token: 'test' }) }));
jest.mock('@/lib/purchases', () => ({ getPurchaseCatalog: jest.fn() }));
jest.mock('@/lib/inventory-movements', () => ({ ...jest.requireActual('@/lib/inventory-movements'), getInventoryMovements: jest.fn() }));
const row: movements.InventoryMovement = { id: 1, baseUnit: 'piece', inventoryItemId: 7, productId: 4, productName: 'Tiller', barcode: 'UNIT-7', type: 'SALE', quantityDelta: -1, fromStatus: 'in_stock', toStatus: 'sold', referenceType: 'SALES_RECORD', referenceId: 3, sourceDocumentNumber: 'SALE-3', unitCost: 50, reason: null, notes: null, actorId: 1, actorName: 'Admin', occurredAt: '2026-09-19T12:00:00Z' };
beforeEach(() => {
  (getPurchaseCatalog as jest.Mock).mockResolvedValue([]);
  HTMLDialogElement.prototype.showModal = jest.fn(function (this: HTMLDialogElement) { this.setAttribute('open', ''); });
  HTMLDialogElement.prototype.close = jest.fn(function (this: HTMLDialogElement) { this.removeAttribute('open'); });
  (movements.getInventoryMovements as jest.Mock).mockReset().mockResolvedValue({ items: [row], page: 1, limit: 20, total: 21, netQuantityDelta: -10, netQuantityByUnit: { piece: -10 } });
});
afterEach(() => jest.restoreAllMocks());

it('shows mixed units separately and uses product history when no inventory unit exists', async () => {
  (movements.getInventoryMovements as jest.Mock).mockResolvedValue({ items: [{ ...row, baseUnit: 'kg', inventoryItemId: null, barcode: null, quantityDelta: -2.5 }], page: 1, limit: 20, total: 2, netQuantityDelta: null, netQuantityByUnit: { kg: -2.5, piece: -1 } });
  render(<InventoryMovementsPage />);
  expect(await screen.findByText('-2.5 kg')).toBeInTheDocument();
  expect(screen.getByText('-1 piece')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'View movement 1' }));
  fireEvent.click(screen.getByRole('button', { name: 'View this product’s history' }));
  await waitFor(() => expect(movements.getInventoryMovements).toHaveBeenLastCalledWith({ ...movements.emptyMovementFilters, productId: '4' }, 1));
});

it('shows source links and filtered totals and opens item history', async () => {
  render(<InventoryMovementsPage />);
  expect(await screen.findByRole('link', { name: 'SALE-3' })).toHaveAttribute('href', '/dashboard/sales/records/3');
  expect(screen.getByText('-10 piece')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'View movement 1' }));
  expect(screen.getByText('In stock → Sold')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'View this item’s history' }));
  await waitFor(() => expect(movements.getInventoryMovements).toHaveBeenLastCalledWith({ ...movements.emptyMovementFilters, inventoryItemId: 7 }, 1));
});

it('paginates and resets page when filters change', async () => {
  render(<InventoryMovementsPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Next' }));
  await waitFor(() => expect(movements.getInventoryMovements).toHaveBeenLastCalledWith(movements.emptyMovementFilters, 2));
  fireEvent.change(screen.getByLabelText('Movement type'), { target: { value: 'ADJUSTMENT' } });
  fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
  await waitFor(() => expect(movements.getInventoryMovements).toHaveBeenLastCalledWith({ ...movements.emptyMovementFilters, type: 'ADJUSTMENT' }, 1));
});

it('offers recovery from a failed ledger request', async () => {
  (movements.getInventoryMovements as jest.Mock).mockRejectedValueOnce(new Error('Network unavailable'));
  render(<InventoryMovementsPage />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Network unavailable');
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('Tiller')).toBeInTheDocument();
});
