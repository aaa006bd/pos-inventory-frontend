import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { api, ApiError } from '@/lib/api';
import { customerPaymentsApi, type CustomerPayment } from '@/lib/customer-payments';
import PaymentsWorkspace from '../_components/payments-workspace';
import PaymentDetail from '../_components/payment-detail';

jest.mock('@/lib/auth-context', () => ({ useAuth: () => ({ token: 'test-token', user: { id: 2, role: 'admin' } }) }));
const payment: CustomerPayment = { id: 8, customerId: 17, amount: 100, availableAmount: 100, allocatedAmount: 0, paymentMethod: 'CASH', paymentDate: '2026-09-14', reference: 'RCPT-1', notes: null, createdAt: '2026-09-14T00:00:00Z', receiptUrl: '/payments/8/receipt', allocations: [] };
const customer = { id: 17, name: 'City Traders', phone: '123' };

beforeEach(() => {
  sessionStorage.clear();
  jest.spyOn(api, 'get').mockImplementation(async endpoint => endpoint === '/customers' ? [customer] : customer);
  jest.spyOn(customerPaymentsApi, 'list').mockResolvedValue({ items: [payment], page: 1, limit: 20, total: 1 });
  jest.spyOn(customerPaymentsApi, 'get').mockResolvedValue(payment);
  jest.spyOn(customerPaymentsApi, 'outstanding').mockResolvedValue({ items: [{ id: 25, type: 'SALES_ORDER', reference: 'SO-25', outstandingAmount: 80 }], page: 1, limit: 20, total: 1 });
});
afterEach(() => jest.restoreAllMocks());

it('records money once without auto-allocating and links to the next step', async () => {
  const execute = jest.spyOn(customerPaymentsApi, 'execute').mockResolvedValue(payment);
  render(<PaymentsWorkspace customerId={17} orderId={25} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Receive payment' }));
  fireEvent.change(screen.getByLabelText('Amount received'), { target: { value: '100' } });
  fireEvent.change(screen.getByLabelText('Transaction reference'), { target: { value: 'RCPT-1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Record money received' }));
  expect(await screen.findByRole('link', { name: 'View payment and apply credit' })).toHaveAttribute('href', '/dashboard/sales/payments/8?salesOrderId=25');
  expect(execute).toHaveBeenCalledTimes(1);
  expect(execute).toHaveBeenCalledWith(expect.objectContaining({ type: 'receive', customerId: 17, body: expect.objectContaining({ amount: 100, reference: 'RCPT-1' }) }), expect.any(String));
});

it('applies existing credit to the preselected order without receiving money again', async () => {
  const execute = jest.spyOn(customerPaymentsApi, 'execute').mockResolvedValue({ ...payment, allocatedAmount: 80, availableAmount: 20 });
  render(<PaymentDetail id={8} orderId={25} />);
  expect(await screen.findByLabelText('Apply to SO-25')).toHaveValue(80);
  fireEvent.click(screen.getByRole('button', { name: 'Apply existing payment' }));
  await waitFor(() => expect(execute).toHaveBeenCalledWith({ type: 'allocate', paymentId: 8, body: { targets: [{ salesOrderId: 25, amount: 80 }] } }, expect.any(String)));
  expect(execute).toHaveBeenCalledTimes(1);
});

it('recovers an uncertain receive after a reload with the original key and payload', async () => {
  const execute = jest.spyOn(customerPaymentsApi, 'execute').mockRejectedValueOnce(new TypeError('Network error')).mockResolvedValueOnce(payment);
  const first = render(<PaymentsWorkspace customerId={17} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Receive payment' }));
  fireEvent.change(screen.getByLabelText('Amount received'), { target: { value: '100' } });
  fireEvent.change(screen.getByLabelText('Transaction reference'), { target: { value: 'RCPT-1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Record money received' }));
  await screen.findByText('The result could not be confirmed. Retry the same operation to recover its result.');
  const original = execute.mock.calls[0];
  first.unmount();
  render(<PaymentsWorkspace customerId={17} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Receive payment' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Recover payment result' }));
  await screen.findByRole('link', { name: 'View payment and apply credit' });
  expect(execute.mock.calls[1]).toEqual(original);
});

it('reverses an allocation with a reason and keeps the original payment receipt available', async () => {
  const allocation = { id: 9, salesRecordId: 81, salesOrderId: 25, amount: 50, balanceAfter: 30, allocatedAt: '2026-09-14T00:00:00Z', reversedAt: null, reversalReason: null };
  const reversed = { ...payment, allocations: [{ ...allocation, reversedAt: '2026-09-14T01:00:00Z', reversalReason: 'Applied to wrong order' }] };
  jest.spyOn(customerPaymentsApi, 'get').mockResolvedValueOnce({ ...payment, allocatedAmount: 50, availableAmount: 50, allocations: [allocation] }).mockResolvedValue(reversed);
  const execute = jest.spyOn(customerPaymentsApi, 'execute').mockResolvedValue(reversed);
  render(<PaymentDetail id={8} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Reverse allocation' }));
  fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Applied to wrong order' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm reversal' }));
  await waitFor(() => expect(execute).toHaveBeenCalledWith({ type: 'reverse', paymentId: 8, allocationId: 9, body: { reason: 'Applied to wrong order' } }, expect.any(String)));
  await screen.findByText(/50.00 · 2026-09-14 · Reversed/);
  expect(screen.getByRole('button', { name: 'Print money receipt' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Reverse allocation' })).not.toBeInTheDocument();
});

it('allows balance review after a rejected allocation without leaving an uncertain request', async () => {
  jest.spyOn(customerPaymentsApi, 'execute').mockRejectedValue(new ApiError(409, 'Allocation already changed'));
  render(<PaymentDetail id={8} orderId={25} />);
  await screen.findByLabelText('Apply to SO-25');
  fireEvent.click(screen.getByRole('button', { name: 'Apply existing payment' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Allocation already changed');
  expect(screen.queryByRole('button', { name: 'Recover operation result' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Refresh payment' })).toBeEnabled();
});
