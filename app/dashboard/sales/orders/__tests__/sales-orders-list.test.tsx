import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SalesOrdersPage from '../page';
import { salesOrdersApi, type SalesOrderList } from '@/lib/sales-orders';
import { api } from '@/lib/api';

jest.mock('@/lib/auth-context', () => ({ useAuth: () => ({ token: 'test-token' }) }));

const list: SalesOrderList = {
  items: [{ id: 25, tenantId: 3, orderNumber: 'SO-TEST-25', customerId: 17,
    customer: { id: 17, name: 'City Traders', phone: '123', email: null, address: null, customerType: 'dealer', dealerCode: null },
    status: 'PARTIALLY_FULFILLED', orderDate: '2026-09-12', expectedDeliveryDate: null, paymentMethod: 'CREDIT', paymentTermDays: 30,
    grossAmount: 1250, discountAmount: 50, netAmount: 1200, notes: null, createdById: 2, confirmedById: 2, confirmedAt: null,
    cancelledById: null, cancelledAt: null, cancellationReason: null, createdAt: '2026-09-12T00:00:00Z', updatedAt: '2026-09-12T00:00:00Z',
    lines: [{ id: 101, productId: 42, product: { id: 42, name: 'Tiller', sku: null, description: null }, quantity: 10, fulfilledQuantity: 4, unitPrice: 125, grossAmount: 1250, discountAmount: 50, netAmount: 1200, notes: null }] }],
  total: 2, page: 1, limit: 20, pageCount: 2, hasNext: true,
};

describe('sales order list', () => {
  beforeEach(() => jest.spyOn(api, 'get').mockResolvedValue([{ id: 17, name: 'City Traders' }]));
  afterEach(() => jest.restoreAllMocks());

  it('shows orders and applies server filters with pagination', async () => {
    const load = jest.spyOn(salesOrdersApi, 'list').mockResolvedValue(list);
    render(<SalesOrdersPage />);
    expect(await screen.findByRole('link', { name: 'SO-TEST-25' })).toHaveAttribute('href', '/dashboard/sales/orders/25');
    expect(screen.getByText('4 / 10')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'CONFIRMED' } });
    await waitFor(() => expect(load).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, status: 'CONFIRMED' })));
    fireEvent.click(await screen.findByRole('button', { name: 'Next' }));
    await waitFor(() => expect(load).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, status: 'CONFIRMED' })));
  });

  it('shows a retryable error and links to draft creation', async () => {
    jest.spyOn(salesOrdersApi, 'list').mockRejectedValueOnce(new Error('Unavailable')).mockResolvedValueOnce({ ...list, items: [], total: 0, hasNext: false, pageCount: 0 });
    render(<SalesOrdersPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('No sales orders found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /New Order/ })).toHaveAttribute('href', '/dashboard/sales/orders/new');
  });
});
