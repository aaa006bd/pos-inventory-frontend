import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { inventoryReturnsApi } from '@/lib/inventory-returns';
import { salesOrdersApi, type SaleRecord } from '@/lib/sales-orders';
import CustomerReturn from '../_components/customer-return';

jest.mock('@/lib/auth-context', () => ({ useAuth: () => ({ token: 'test' }) }));
const sale = { id: 81, saleNumber: 'SALE-81', paymentMethod: 'CREDIT', lines: [{ id: 61, quantity: 2.5, returnedQuantity: 0.5, baseUnit: 'kg', barcode: null, product: { name: 'Rice', trackingMode: 'QUANTITY', baseUnit: 'kg', quantityPrecision: 3 } }] } as SaleRecord;
beforeEach(() => { sessionStorage.clear(); jest.spyOn(salesOrdersApi, 'sale').mockResolvedValue(sale); });
afterEach(() => jest.restoreAllMocks());

it('returns part of an original quantity line and explains credit accounting', async () => {
  const create = jest.spyOn(inventoryReturnsApi, 'create').mockResolvedValue({ id: 3, returnNumber: 'RET-3', type: 'customer_return', refundAmount: 32.5, costAmount: 25, items: [] });
  render(<CustomerReturn saleId={81} />);
  fireEvent.click(await screen.findByLabelText('Return Rice'));
  fireEvent.change(screen.getByLabelText('Return quantity (kg)'), { target: { value: '0.5' } });
  fireEvent.click(screen.getByRole('button', { name: 'Submit return' }));
  await waitFor(() => expect(create).toHaveBeenCalledWith({ type: 'customer_return', salesRecordId: 81, items: [{ salesRecordLineId: 61, quantity: 0.5, restockable: true }], notes: undefined }, expect.any(String)));
  expect(await screen.findByText(/not a cash refund/)).toBeInTheDocument();
  expect(screen.getByText(/32.50/)).toBeInTheDocument();
});
