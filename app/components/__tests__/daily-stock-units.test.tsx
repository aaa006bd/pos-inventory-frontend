import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import DailyStockTab from '../DailyStockTab';
import type { Product } from '@/lib/api';

const products = [
  { id: 1, name: 'Flour', basePrice: 70, trackingMode: 'QUANTITY', baseUnit: 'kg', quantityPrecision: 3, active: true },
  { id: 2, name: 'Bun', basePrice: 15, trackingMode: 'QUANTITY', baseUnit: 'piece', quantityPrecision: 0, active: true },
] as Product[];

it('labels prices using each product base unit', () => {
  render(<DailyStockTab products={products} showMessage={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: /Select a product/ }));

  expect(screen.getByText('৳70 per kg')).toBeInTheDocument();
  expect(screen.getByText('৳15 each')).toBeInTheDocument();
});
