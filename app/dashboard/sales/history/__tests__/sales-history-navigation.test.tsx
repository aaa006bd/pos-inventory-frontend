import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SalesHistoryTab from '@/app/components/SalesHistoryTab';
import { realApi } from '@/lib/api';

jest.mock('next/navigation', () => ({ useRouter: () => ({ replace: jest.fn() }) }));
jest.mock('@/lib/auth-context', () => ({ useAuth: () => ({ token: 'test-token', loading: false }) }));
jest.mock('@/lib/api', () => ({ realApi: { getSales: jest.fn() } }));

beforeEach(() => {
  jest.mocked(realApi.getSales).mockResolvedValue({ items: [{ id: 3, saleNumber: 'SALE-3', soldAt: '2026-10-20T00:00:00Z', customer: { id: 7, name: 'Mina', phone: '01712345678' }, paymentMethod: 'CASH', status: 'COMPLETED', returnedAmount: 25, discountAmount: '0', netAmount: '100' }], total: 1, page: 1, limit: 20, pageCount: 1, hasNext: false } as never);
});

afterEach(() => jest.clearAllMocks());

it('links a sales reference to its item detail and labels returned sales', async () => {
  render(<SalesHistoryTab />);
  expect(await screen.findByRole('link', { name: 'SALE-3' })).toHaveAttribute('href', '/dashboard/sales/history/3');
  expect(screen.getByRole('link', { name: 'View items' })).toHaveAttribute('href', '/dashboard/sales/history/3');
  expect(screen.getByText('Has returns', { selector: 'span' })).toBeInTheDocument();
});

it('searches sale references or customer phones through the paginated backend endpoint', async () => {
  render(<SalesHistoryTab />);
  await screen.findByRole('link', { name: 'SALE-3' });

  fireEvent.change(screen.getByRole('searchbox', { name: 'Search sales by number or phone' }), { target: { value: '  SALE-3  ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));
  await waitFor(() => expect(realApi.getSales).toHaveBeenLastCalledWith({ page: 1, limit: 20, search: 'SALE-3', hasReturns: undefined }));

  fireEvent.change(screen.getByRole('searchbox', { name: 'Search sales by number or phone' }), { target: { value: '01712345678' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));
  await waitFor(() => expect(realApi.getSales).toHaveBeenLastCalledWith({ page: 1, limit: 20, search: '01712345678', hasReturns: undefined }));
});

it('combines the return filter with the search and clears both', async () => {
  render(<SalesHistoryTab />);
  await screen.findByRole('link', { name: 'SALE-3' });

  fireEvent.change(screen.getByRole('searchbox', { name: 'Search sales by number or phone' }), { target: { value: '01712345678' } });
  fireEvent.change(screen.getByRole('combobox', { name: 'Return filter' }), { target: { value: 'returned' } });
  await waitFor(() => expect(realApi.getSales).toHaveBeenLastCalledWith({ page: 1, limit: 20, search: '01712345678', hasReturns: true }));

  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
  await waitFor(() => expect(realApi.getSales).toHaveBeenLastCalledWith({ page: 1, limit: 20, search: undefined, hasReturns: undefined }));
});

it('refuses to show an unfiltered backend page as returned sales', async () => {
  jest.mocked(realApi.getSales).mockResolvedValue({
    items: [{ id: 3, saleNumber: 'SALE-3', soldAt: '2026-10-20T00:00:00Z', customer: null, paymentMethod: 'CASH', status: 'COMPLETED', returnedAmount: 0, lines: [{ id: 7, quantity: 1, returnedQuantity: 0 }], discountAmount: '0', netAmount: '100' }],
    total: 1, page: 1, limit: 20, pageCount: 1, hasNext: false,
  } as never);

  render(<SalesHistoryTab />);
  await screen.findByRole('link', { name: 'SALE-3' });
  fireEvent.change(screen.getByRole('combobox', { name: 'Return filter' }), { target: { value: 'returned' } });

  expect(await screen.findByRole('alert')).toHaveTextContent('backend included sales without returns');
  expect(screen.queryByRole('link', { name: 'SALE-3' })).not.toBeInTheDocument();
  expect(realApi.getSales).toHaveBeenLastCalledWith({ page: 1, limit: 20, search: undefined, hasReturns: true });
});

it('resets pagination when a new search is submitted', async () => {
  jest.mocked(realApi.getSales).mockResolvedValue({ items: [{ id: 3, saleNumber: 'SALE-3', soldAt: '2026-10-20T00:00:00Z', customer: null, paymentMethod: 'CASH', status: 'COMPLETED', discountAmount: '0', netAmount: '100' }], total: 25, page: 1, limit: 20, pageCount: 2, hasNext: true } as never);
  render(<SalesHistoryTab />);
  await screen.findByRole('button', { name: 'Next' });

  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  await waitFor(() => expect(realApi.getSales).toHaveBeenLastCalledWith({ page: 2, limit: 20, search: undefined, hasReturns: undefined }));

  fireEvent.change(screen.getByRole('searchbox', { name: 'Search sales by number or phone' }), { target: { value: 'SALE-3' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));
  await waitFor(() => expect(realApi.getSales).toHaveBeenLastCalledWith({ page: 1, limit: 20, search: 'SALE-3', hasReturns: undefined }));
});
