import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProductsPage from '../page';
import { realApi, type Attribute, type Category, type Product } from '@/lib/api';
import { getPurchaseCatalog } from '@/lib/purchases';

jest.mock('next/navigation', () => ({ useRouter: () => ({ replace: jest.fn() }) }));
jest.mock('@/lib/auth-context', () => ({ useAuth: () => ({ token: 'test-token', loading: false }) }));
jest.mock('@/lib/purchases', () => ({ getPurchaseCatalog: jest.fn() }));
jest.mock('@/lib/api', () => ({
  realApi: {
    getCategories: jest.fn(),
    getAttributes: jest.fn(),
    createProduct: jest.fn(),
    updateProduct: jest.fn(),
  },
}));

const category = { id: 5, name: 'Food', description: null, attributes: [], products: [], active: true } as Category;
const product = {
  id: 12,
  name: 'Rice',
  description: null,
  basePrice: 65,
  categoryId: 5,
  attributes: [{}],
  active: true,
  trackingMode: 'QUANTITY',
  baseUnit: 'kg',
  quantityPrecision: 3,
  createdAt: '2026-10-14T00:00:00Z',
  updatedAt: '2026-10-14T00:00:00Z',
} as Product;

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(realApi.getCategories).mockResolvedValue([category]);
  jest.mocked(realApi.getAttributes).mockResolvedValue([]);
  jest.mocked(realApi.updateProduct).mockResolvedValue(product);
  jest.mocked(getPurchaseCatalog).mockResolvedValue([product]);
});

it('prevents the focused price field from changing during page scrolling', async () => {
  render(<ProductsPage />);
  await screen.findByText('Rice');
  fireEvent.click(screen.getByRole('button', { name: 'Add Product' }));

  const price = screen.getByLabelText('Price per piece');
  fireEvent.change(price, { target: { value: '90' } });
  price.focus();
  fireEvent.wheel(price, { deltaY: -100 });

  expect(price).toHaveValue(90);
  expect(price).not.toHaveFocus();
});

it('updates mutable product details without sending immutable tracking fields', async () => {
  render(<ProductsPage />);
  await screen.findByText('Rice');
  fireEvent.click(screen.getByRole('button', { name: 'Edit Rice' }));
  await screen.findByText('Tracking mode, base unit, and precision cannot change after creation.');

  fireEvent.change(screen.getByLabelText('Price per kg'), { target: { value: '72.5' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

  await waitFor(() => expect(realApi.updateProduct).toHaveBeenCalledWith(12, {
    name: 'Rice',
    basePrice: 72.5,
    categoryId: 5,
  }));
  expect(screen.queryByText('Edit Product')).not.toBeInTheDocument();
});

it('blocks creation while attributes load and explains an unusable required select', async () => {
  let finishAttributes!: (attributes: Attribute[]) => void;
  jest.mocked(realApi.getAttributes).mockReturnValue(new Promise(resolve => { finishAttributes = resolve; }));
  render(<ProductsPage />);
  await screen.findByText('Rice');
  fireEvent.click(screen.getByRole('button', { name: 'Add Product' }));
  fireEvent.click(screen.getByRole('button', { name: /Select a category/ }));
  fireEvent.click(screen.getByRole('button', { name: /Food/ }));

  expect(screen.getByRole('button', { name: 'Loading attributes…' })).toBeDisabled();

  finishAttributes([{ id: 9, name: 'Filling', type: 'select', unit: null, options: [], required: true, categoryId: 5 }]);
  expect(await screen.findByRole('alert')).toHaveTextContent('required attribute “Filling” has no selectable options');
  expect(screen.getByRole('button', { name: 'Create Product' })).toBeDisabled();
  expect(realApi.createProduct).not.toHaveBeenCalled();
});
