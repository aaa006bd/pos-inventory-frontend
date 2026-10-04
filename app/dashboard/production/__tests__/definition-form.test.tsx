import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Product } from '@/lib/api';
import * as purchases from '@/lib/purchases';
import { productionApi, type ProductionDefinition } from '@/lib/production';
import DefinitionForm from '../definitions/_components/definition-form';

const push = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
jest.mock('@/lib/auth-context', () => ({ useAuth: () => ({ token: 'test-token' }) }));
jest.mock('@/lib/purchases', () => ({ getPurchaseCatalog: jest.fn() }));

const products = [{ id: 1, name: 'Bread', active: true, trackingMode: 'QUANTITY', baseUnit: 'piece', quantityPrecision: 0 }, { id: 2, name: 'Flour', active: true, trackingMode: 'QUANTITY', baseUnit: 'kg', quantityPrecision: 3 }, { id: 3, name: 'Mixer', active: true, trackingMode: 'SERIALIZED', baseUnit: 'piece', quantityPrecision: 0 }] as Product[];
const created = { id: 7, outputProductId: 1, version: 1, name: 'Plain bread', outputQuantity: 20, outputUnit: 'piece', active: true, components: [{ id: 9, productId: 2, quantity: 3.25, baseUnit: 'kg' }] } as ProductionDefinition;

beforeEach(() => { push.mockReset(); jest.mocked(purchases.getPurchaseCatalog).mockResolvedValue(products); });
afterEach(() => jest.restoreAllMocks());

it('creates a definition from quantity products with base-unit quantities', async () => {
  const create = jest.spyOn(productionApi, 'createDefinition').mockResolvedValue(created);
  render(<DefinitionForm />);
  fireEvent.change(await screen.findByLabelText('Definition name *'), { target: { value: 'Plain bread' } });
  fireEvent.change(screen.getByLabelText('Finished product *'), { target: { value: '1' } });
  fireEvent.change(screen.getByLabelText('Expected output (piece) *'), { target: { value: '20' } });
  fireEvent.change(screen.getByLabelText('Material 1 *'), { target: { value: '2' } });
  fireEvent.change(screen.getByLabelText('Quantity (kg) *'), { target: { value: '3.25' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create Definition' }));
  await waitFor(() => expect(create).toHaveBeenCalledWith({ name: 'Plain bread', outputProductId: 1, outputQuantity: 20, components: [{ productId: 2, quantity: 3.25 }] }));
  expect(push).toHaveBeenCalledWith('/dashboard/production/definitions/7');
  expect(screen.queryByRole('option', { name: /Mixer/ })).not.toBeInTheDocument();
});
