import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { customerPaymentsApi, type CustomerPayment } from '@/lib/customer-payments';
import type { SalesOrder, SaleRecord } from '@/lib/sales-orders';
import OrderPayment from '../_components/order-payment';

jest.mock('@/lib/auth-context', () => ({ useAuth: () => ({ token: 'test', user: { id: 2, role: 'admin' } }) }));
const order = { id: 25, customerId: 17, orderNumber: 'SO-25', customer: { name: 'City Traders' } } as SalesOrder;
const payment = { id: 8, salesOrderId: 25, customerId: 17, amount: 80, allocations: [], paymentDate: '2026-09-18' } as unknown as CustomerPayment;
beforeEach(() => {
  sessionStorage.clear();
  jest.spyOn(customerPaymentsApi, 'list').mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 });
});
afterEach(() => jest.restoreAllMocks());

it('shows the sale reference before payment and actual allocation afterward', async () => {
  const sales = [{ id: 3, saleNumber: 'SALE-EXAMPLE', salesOrderId: 25, soldAt: '2026-09-18', paymentMethod: 'CREDIT', status: 'COMPLETED', outstandingAmount: 80 }] as SaleRecord[];
  jest.spyOn(customerPaymentsApi, 'execute').mockResolvedValue({ ...payment, allocations: [{ id: 1, salesRecordId: 3, salesOrderId: 25, amount: 50, balanceAfter: 30, allocatedAt: '2026-09-18', reversedAt: null, reversalReason: null }] });
  render(<OrderPayment order={order} sales={sales} outstanding={80} onRecorded={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Record payment' }));
  expect(screen.getByRole('link', { name: 'SALE-EXAMPLE' })).toHaveAttribute('href', '/dashboard/sales/records/3');
  fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '50' } });
  expect(screen.getByRole('row', { name: /SALE-EXAMPLE/ })).toHaveTextContent('80.0050.0030.00');
  fireEvent.click(screen.getByRole('button', { name: 'Confirm payment' }));
  await screen.findByText(/Payment #8 recorded and applied/);
  expect(screen.getByRole('link', { name: 'SALE-EXAMPLE' })).toBeInTheDocument();
  expect(screen.getByText(/50.00 applied/)).toBeInTheDocument();
});

it('records against the fixed order without a reference and offers its receipt', async () => {
  const execute = jest.spyOn(customerPaymentsApi, 'execute').mockResolvedValue(payment);
  const reload = jest.fn();
  render(<OrderPayment order={order} outstanding={80} onRecorded={reload} />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Record payment' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Record payment' }));
  fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '80' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm payment' }));
  await screen.findByText(/Payment #8 recorded and applied to SO-25/);
  expect(execute).toHaveBeenCalledTimes(1);
  expect(execute).toHaveBeenCalledWith({ type: 'order-payment', orderId: 25, body: { amount: 80, paymentMethod: 'CASH', paymentDate: expect.any(String) } }, expect.any(String));
  expect(screen.getByRole('button', { name: 'Print money receipt' })).toBeInTheDocument();
  expect(reload).toHaveBeenCalledTimes(1);
});

it('recovers the identical order payment after a network error and reload', async () => {
  const execute = jest.spyOn(customerPaymentsApi, 'execute').mockRejectedValueOnce(new TypeError('Network error')).mockResolvedValueOnce(payment);
  const first = render(<OrderPayment order={order} outstanding={80} onRecorded={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Record payment' }));
  fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '80' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm payment' }));
  await screen.findByText(/result could not be confirmed/);
  const original = execute.mock.calls[0];
  first.unmount();
  render(<OrderPayment order={order} outstanding={0} onRecorded={jest.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Recover payment result' }));
  await screen.findByText(/Payment #8 recorded and applied/);
  expect(execute.mock.calls[1]).toEqual(original);
});

it('disables new payment when fulfilled sales are fully paid', async () => {
  render(<OrderPayment order={order} outstanding={0} onRecorded={jest.fn()} />);
  await screen.findByText('No outstanding payment for fulfilled items.');
  expect(screen.getByRole('button', { name: 'Record payment' })).toBeDisabled();
});

it('rejects overpayment even when native form validation is bypassed', async () => {
  const execute = jest.spyOn(customerPaymentsApi, 'execute');
  render(<OrderPayment order={order} outstanding={80} onRecorded={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Record payment' }));
  fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '81' } });
  fireEvent.submit(screen.getByRole('button', { name: 'Confirm payment' }).closest('form')!);
  expect(await screen.findByRole('alert')).toHaveTextContent('outstanding balance');
  expect(execute).not.toHaveBeenCalled();
});

it('finds linked receipts on later history pages without showing another order’s payments', async () => {
  jest.spyOn(customerPaymentsApi, 'list')
    .mockResolvedValueOnce({ items: [{ ...payment, id: 7, salesOrderId: 99 }], page: 1, limit: 1, total: 2 })
    .mockResolvedValueOnce({ items: [payment], page: 2, limit: 1, total: 2 });
  render(<OrderPayment order={order} outstanding={80} onRecorded={jest.fn()} />);
  fireEvent.click(screen.getByText('Payment history'));
  expect(await screen.findByRole('link', { name: 'Payment #8' })).toHaveAttribute('href', '/dashboard/sales/payments/8');
  expect(screen.queryByText('Payment #7')).not.toBeInTheDocument();
});
