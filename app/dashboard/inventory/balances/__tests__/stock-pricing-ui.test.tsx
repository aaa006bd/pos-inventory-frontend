import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import StockBalancesPage from '../page';
import { getStockBalances } from '@/lib/stock-balances';
import { getPurchaseCatalog } from '@/lib/purchases';

jest.mock('@/lib/auth-context', () => ({ useAuth: () => ({ token: 'test-token' }) }));
jest.mock('@/lib/stock-balances', () => ({ getStockBalances: jest.fn() }));
jest.mock('@/lib/purchases', () => ({ getPurchaseCatalog: jest.fn(), formatAmount: (value: number) => Number(value).toFixed(2) }));

it('shows average stock cost separately from current selling price', async () => {
  jest.mocked(getStockBalances).mockResolvedValue({ items: [
    { productId: 1, productName: 'A Flour', trackingMode: 'QUANTITY', baseUnit: 'kg', quantity: 97.5, stockValue: 4875 },
    { productId: 2, productName: 'Empty item', trackingMode: 'QUANTITY', baseUnit: 'piece', quantity: 0, stockValue: 0 },
  ], page: 1, limit: 20, total: 2 });
  jest.mocked(getPurchaseCatalog).mockResolvedValue([{ id: 1, name: 'A Flour', basePrice: 65 } as never]);

  render(<StockBalancesPage />);

  expect(await screen.findByText('৳50.00 / kg')).toBeInTheDocument();
  expect(screen.getByText('৳65.00 / kg')).toBeInTheDocument();
  const productLink = screen.getByRole('link', { name: 'A Flour' });
  expect(productLink).toHaveAttribute('href', '/dashboard/inventory/balances/1');
  expect(productLink.tagName).toBe('A');
  expect(screen.getByRole('row', { name: /Empty item/ })).toHaveTextContent('0 piece');
  expect(screen.getByRole('row', { name: /Empty item/ })).not.toHaveTextContent('Infinity');
});
