import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { api } from '@/lib/api';
import { salesOrdersApi, type SalesOrder } from '@/lib/sales-orders';
import SalesFulfillPage from '../_components/sales-fulfill';

const push = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
jest.mock('@/lib/auth-context', () => ({ useAuth: () => ({ token: 'test' }) }));
const order = { id: 25, orderNumber: 'SO-25', status: 'CONFIRMED', lines: [
  { id: 1, productId: 42, quantity: 10, fulfilledQuantity: 2, product: { id: 42, name: 'Rice', trackingMode: 'QUANTITY', baseUnit: 'kg', quantityPrecision: 3 } },
  { id: 2, productId: 7, quantity: 2, fulfilledQuantity: 0, product: { id: 7, name: 'Tiller', trackingMode: 'SERIALIZED', baseUnit: 'piece', quantityPrecision: 0 } },
] } as SalesOrder;
beforeEach(() => { sessionStorage.clear(); push.mockReset(); jest.spyOn(salesOrdersApi, 'get').mockResolvedValue(order); });
afterEach(() => jest.restoreAllMocks());

it('fulfills quantity and serialized lines with mutually exclusive selectors', async () => {
  jest.spyOn(api, 'get').mockResolvedValue({ id: 9, productId: 7, barcode: 'UNIT-1', status: 'in_stock' });
  const fulfill = jest.spyOn(salesOrdersApi, 'fulfill').mockResolvedValue({ order, sale: { id: 81, saleNumber: 'SALE-81' } });
  render(<SalesFulfillPage id={25} />);
  fireEvent.change(await screen.findByLabelText('Fulfill quantity for Rice'), { target: { value: '2.5' } });
  fireEvent.change(screen.getByLabelText('Order line'), { target: { value: '2' } });
  fireEvent.change(screen.getByLabelText('Barcode'), { target: { value: 'UNIT-1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add unit' }));
  await screen.findByRole('button', { name: 'UNIT-1 ×' });
  fireEvent.click(screen.getByRole('button', { name: 'Fulfill selected stock' }));
  await waitFor(() => expect(fulfill).toHaveBeenCalledWith(25, { items: [{ salesOrderLineId: 2, inventoryItemIds: [9] }, { salesOrderLineId: 1, quantity: 2.5 }], notes: undefined }, expect.any(String)));
  await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard/sales/orders/25'));
});

it('blocks quantity beyond the remaining order amount', async () => {
  const fulfill = jest.spyOn(salesOrdersApi, 'fulfill');
  render(<SalesFulfillPage id={25} />);
  fireEvent.change(await screen.findByLabelText('Fulfill quantity for Rice'), { target: { value: '8.001' } });
  fireEvent.click(screen.getByRole('button', { name: 'Fulfill selected stock' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Enter up to 8 kg');
  expect(fulfill).not.toHaveBeenCalled();
});
