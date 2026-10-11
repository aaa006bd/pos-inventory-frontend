import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApiError, type Product } from '@/lib/api';
import * as purchases from '@/lib/purchases';
import { productionApi, type ProductionOrder } from '@/lib/production';
import ProductionComplete from '../orders/_components/production-complete';

const replace = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
jest.mock('@/lib/auth-context', () => ({ useAuth: () => ({ token: 'test-token' }) }));
jest.mock('@/lib/purchases', () => ({ getPurchaseCatalog: jest.fn() }));

const order: ProductionOrder = { id: 12, definitionId: 7, definitionVersion: 2, outputProductId: 1, outputUnit: 'piece', plannedQuantity: 20, actualQuantity: null, status: 'PLANNED', materialCost: null, journalEntryId: null, notes: null, materials: [{ id: 20, productId: 2, baseUnit: 'kg', plannedQuantity: 3, actualQuantity: null, actualCost: null }] };
const products = [{ id: 1, name: 'Bread', active: true, trackingMode: 'QUANTITY', baseUnit: 'piece', quantityPrecision: 0 }, { id: 2, name: 'Flour', active: true, trackingMode: 'QUANTITY', baseUnit: 'kg', quantityPrecision: 3 }] as Product[];

beforeEach(() => { sessionStorage.clear(); replace.mockReset(); jest.spyOn(productionApi, 'getOrder').mockResolvedValue(order); jest.mocked(purchases.getPurchaseCatalog).mockResolvedValue(products); });
afterEach(() => jest.restoreAllMocks());

it('retries an uncertain completion with the exact body and key', async () => {
  const complete = jest.spyOn(productionApi, 'completeOrder').mockRejectedValueOnce(new TypeError('Network')).mockResolvedValueOnce({ ...order, status: 'COMPLETED', actualQuantity: 20 });
  const first = render(<ProductionComplete id={12} />);
  fireEvent.change(await screen.findByLabelText('Actual quantity for Flour'), { target: { value: '3.1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Complete & Post Stock' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('could not be confirmed');
  const original = complete.mock.calls[0]; first.unmount();
  render(<ProductionComplete id={12} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Retry Saved Completion' }));
  await waitFor(() => expect(complete).toHaveBeenCalledTimes(2));
  expect(complete.mock.calls[1]).toEqual(original);
  await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard/production/orders/12'));
});

it('shows a backend conflict and clears the saved attempt for correction', async () => {
  jest.spyOn(productionApi, 'completeOrder').mockRejectedValue(new ApiError(409, 'Insufficient stock for Flour'));
  render(<ProductionComplete id={12} />);
  const submit = await screen.findByRole('button', { name: 'Complete & Post Stock' });
  await waitFor(() => expect(submit).toBeEnabled());
  fireEvent.click(submit);
  expect(await screen.findByRole('alert')).toHaveTextContent('Insufficient stock for Flour');
  expect(screen.queryByRole('button', { name: 'Retry Saved Completion' })).not.toBeInTheDocument();
  expect(sessionStorage.getItem('inventory-operation:production-complete:12')).toBeNull();
});
