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

it('jumps to a valid page without accepting out-of-range input', async () => {
  jest.spyOn(realApi, 'getInventory').mockResolvedValue({
    items: [], total: 100, page: 1, limit: 20, pageCount: 5, hasNext: true,
  });
  render(<InventoryListPage />);
  const pageField = await screen.findByRole('textbox', { name: 'Page' });
  await screen.findByText('of 5');

  fireEvent.change(pageField, { target: { value: '9' } });
  fireEvent.click(screen.getByRole('button', { name: 'Go' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Enter a page from 1 to 5.');
  expect(realApi.getInventory).not.toHaveBeenCalledWith(expect.objectContaining({ page: 9 }));

  fireEvent.change(pageField, { target: { value: '3' } });
  fireEvent.click(screen.getByRole('button', { name: 'Go' }));
  await waitFor(() => expect(realApi.getInventory).toHaveBeenCalledWith(expect.objectContaining({ page: 3, limit: 20 })));
  expect(pageField).toHaveValue('3');
});
