import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { realApi } from '@/lib/api';
import InventoryListPage from '../page';

jest.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));
jest.mock('@/lib/auth-context', () => ({ useAuth: () => ({ token: 'test-token' }) }));

beforeEach(() => {
  jest.spyOn(realApi, 'getInventory').mockResolvedValue({
    items: [], total: 0, page: 1, limit: 20, pageCount: 1, hasNext: false,
  });
});

afterEach(() => jest.restoreAllMocks());

it('sends the selected status to the backend before pagination', async () => {
  render(<InventoryListPage />);
  await waitFor(() => expect(realApi.getInventory).toHaveBeenCalledWith({ page: 1, limit: 20, lotNumber: undefined, status: undefined, search: undefined }));
  fireEvent.click(screen.getByRole('button', { name: 'Sold' }));
  await waitFor(() => expect(realApi.getInventory).toHaveBeenLastCalledWith({ page: 1, limit: 20, lotNumber: undefined, status: 'sold', search: undefined }));
});

it('uses the supported 100-row maximum instead of an unbounded All request', async () => {
  render(<InventoryListPage />);
  await waitFor(() => expect(realApi.getInventory).toHaveBeenCalled());
  expect(screen.getAllByRole('button', { name: 'All' })).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: '100' }));
  await waitFor(() => expect(realApi.getInventory).toHaveBeenLastCalledWith({ page: 1, limit: 100, lotNumber: undefined, status: undefined, search: undefined }));
});

it('debounces cross-page search through the backend', async () => {
  render(<InventoryListPage />);
  await waitFor(() => expect(realApi.getInventory).toHaveBeenCalled());
  fireEvent.change(screen.getByPlaceholderText('Search by barcode, product or supplier...'), { target: { value: '  Slice Cheese  ' } });
  await waitFor(() => expect(realApi.getInventory).toHaveBeenLastCalledWith({ page: 1, limit: 20, lotNumber: undefined, status: undefined, search: 'Slice Cheese' }), { timeout: 1500 });
});
