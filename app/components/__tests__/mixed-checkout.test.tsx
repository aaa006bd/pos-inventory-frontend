import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { realApi, type Product } from '@/lib/api';
import { getPurchaseCatalog } from '@/lib/purchases';
import SellTab from '../SellTab';

jest.mock('@/lib/purchases', () => ({ getPurchaseCatalog: jest.fn() }));
const rice = { id: 42, name: 'Rice', basePrice: 65, active: true, trackingMode: 'QUANTITY', baseUnit: 'kg', quantityPrecision: 3 } as Product;
const tiller = { id: 7, name: 'Tiller', basePrice: 100, active: true, trackingMode: 'SERIALIZED', baseUnit: 'piece', quantityPrecision: 0 } as Product;
beforeEach(() => {
  sessionStorage.clear(); localStorage.clear();
  (getPurchaseCatalog as jest.Mock).mockResolvedValue([rice, tiller]);
  jest.spyOn(realApi, 'getCustomers').mockResolvedValue([]);
  jest.spyOn(realApi, 'scanBarcode').mockResolvedValue({ id: 9, barcode: 'UNIT-1', status: 'in_stock', product: tiller } as never);
});
afterEach(() => jest.restoreAllMocks());

it('submits quantity and serialized lines together and shows backend totals', async () => {
  const sell = jest.spyOn(realApi, 'sellBatchItems').mockResolvedValue({ soldItems: [{ id: 9 }], salesRecord: { id: 81, saleNumber: 'SALE-81', grossAmount: 262.5, discountAmount: 0, netAmount: 262.5, outstandingAmount: 0, lines: [] } } as never);
  render(<SellTab showMessage={jest.fn()} />);
  await screen.findByRole('option', { name: 'Rice · kg' });
  fireEvent.change(screen.getByLabelText('Product'), { target: { value: '42' } });
  fireEvent.change(screen.getByLabelText('Quantity (kg)'), { target: { value: '2.5' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add quantity' }));
  fireEvent.change(screen.getByLabelText('Barcode'), { target: { value: 'UNIT-1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add barcode' }));
  await screen.findByText('UNIT-1');
  fireEvent.click(screen.getByRole('button', { name: 'Complete sale' }));
  await screen.findByText(/Sale-81/i);
  expect(sell).toHaveBeenCalledWith({ paymentMethod: 'CASH', items: [{ productId: 42, quantity: 2.5, salePrice: 65, discountAmount: 0, notes: undefined }, { barcode: 'UNIT-1', salePrice: 100, discountAmount: 0, notes: undefined }] }, expect.any(String));
  expect(screen.getByText(/Backend total: 262.50/)).toBeInTheDocument();
});

it('rejects quantity beyond product precision before checkout', async () => {
  const message = jest.fn(); render(<SellTab showMessage={message} />);
  await screen.findByRole('option', { name: 'Rice · kg' });
  fireEvent.change(screen.getByLabelText('Product'), { target: { value: '42' } });
  fireEvent.change(screen.getByLabelText('Quantity (kg)'), { target: { value: '2.5555' } });
  fireEvent.submit(screen.getByRole('button', { name: 'Add quantity' }).closest('form')!);
  await waitFor(() => expect(message).toHaveBeenCalledWith('error', expect.stringMatching(/at most 3/)));
});
