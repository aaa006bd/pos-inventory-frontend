import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SalesOrderDraftPage from '../_components/sales-order-draft';
import { api } from '@/lib/api';
import * as salesOrders from '@/lib/sales-orders';

const push = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
jest.mock('@/lib/auth-context', () => ({ useAuth: () => ({ token: 'test-token' }) }));

describe('sales order draft form', () => {
  beforeEach(() => {
    push.mockClear();
    jest.spyOn(api, 'get').mockImplementation(async endpoint => endpoint === '/products'
      ? [{ id: 42, name: 'Tiller', sku: 'TL-42', basePrice: 125, active: true }]
      : [{ id: 17, name: 'City Traders' }]);
  });
  afterEach(() => jest.restoreAllMocks());

  it('creates a draft and opens its detail page', async () => {
    const create = jest.spyOn(salesOrders.salesOrdersApi, 'create').mockResolvedValue({ id: 25 } as salesOrders.SalesOrder);
    render(<SalesOrderDraftPage />);
    await screen.findByRole('option', { name: 'City Traders' });
    fireEvent.change(screen.getByLabelText('Customer *'), { target: { value: '17' } });
    fireEvent.change(screen.getByLabelText('Product *'), { target: { value: '42' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    await waitFor(() => expect(create).toHaveBeenCalledWith(expect.objectContaining({ customerId: 17, paymentMethod: 'CASH', items: [expect.objectContaining({ productId: 42, quantity: 1, unitPrice: 125 })] })));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard/sales/orders/25'));
  });
});
