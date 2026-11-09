import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import SaleHistoryDetailPage from '@/app/dashboard/sales/history/[id]/page';
import SaleRecordDetail from '@/app/dashboard/sales/orders/_components/sale-record-detail';
import CustomerReturn from '@/app/dashboard/sales/orders/_components/customer-return';
import { useSalesResource } from '@/app/dashboard/sales/orders/_components/use-sales-resource';

jest.mock('@/app/dashboard/sales/orders/_components/use-sales-resource', () => ({ useSalesResource: jest.fn() }));
jest.mock('@/app/dashboard/sales/orders/_components/sales-print-button', () => ({ __esModule: true, default: () => null }));

it('opens the original sale by default', async () => {
  const page = await SaleHistoryDetailPage({
    params: Promise.resolve({ id: '3' }),
    searchParams: Promise.resolve({}),
  });

  expect(page.type).toBe(SaleRecordDetail);
  expect(page.props).toMatchObject({ id: 3 });
});

it('opens the customer return item list on the existing sale route', async () => {
  const page = await SaleHistoryDetailPage({
    params: Promise.resolve({ id: '3' }),
    searchParams: Promise.resolve({ action: 'return' }),
  });

  expect(page.type).toBe(CustomerReturn);
  expect(page.props).toMatchObject({ saleId: 3 });
});

it('links a returnable sale to the existing sale route', () => {
  jest.mocked(useSalesResource).mockReturnValue({
    loading: false,
    error: null,
    reload: jest.fn(),
    data: {
      id: 3,
      saleNumber: 'SALE-3',
      status: 'COMPLETED',
      paymentStatus: 'PAID',
      netAmount: 100,
      outstandingAmount: 0,
      soldAt: '2026-11-01T00:00:00Z',
      salesOrderId: null,
      customerId: null,
      lines: [{ id: 7, quantity: 1, returnedQuantity: 0, barcode: 'ABC', baseUnit: 'piece', netAmount: 100, product: { name: 'Pump' } }],
    },
  } as never);

  render(<SaleRecordDetail id={3} />);

  expect(screen.getByRole('link', { name: 'Create customer return' })).toHaveAttribute('href', '/dashboard/sales/history/3?action=return');
});
