import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PurchaseDraftPage from '../_components/purchase-draft';
import { api } from '@/lib/api';
import { purchasesApi, type PurchaseOrder } from '@/lib/purchases';

const push = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
jest.mock('@/lib/auth-context', () => ({ useAuth: () => ({ token: 'test-token' }) }));

const order: PurchaseOrder = {
  id: 25, tenantId: 3, orderNumber: 'PO-25', supplierId: 7, supplier: { id: 7, name: 'Supplier One' },
  status: 'DRAFT', orderDate: '2026-09-07', totalAmount: 20,
  createdAt: '2026-09-07', updatedAt: '2026-09-07',
  lines: [{ id: 101, productId: 42, product: { id: 42, name: 'Shirt' }, quantity: 2, receivedQuantity: 0, unitCost: 10, lineTotal: 20 }],
};

describe('purchase draft entry', () => {
  beforeEach(() => {
    push.mockReset();
    jest.spyOn(api, 'get').mockImplementation(async path => {
      if (path === '/products') return { data: [{ id: 42, name: 'Shirt', active: true }], total: 1, page: 1, limit: 100 };
      if (path === '/suppliers') return [{ id: 7, name: 'Supplier One', active: true }];
      throw new Error('Unexpected GET');
    });
  });
  afterEach(() => jest.restoreAllMocks());

  it('submits supplier, product, quantity and purchase cost as a draft', async () => {
    const create = jest.spyOn(purchasesApi, 'create').mockResolvedValue(order);
    render(<PurchaseDraftPage />);
    fireEvent.change(await screen.findByLabelText('Supplier *'), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText('Product *'), { target: { value: '42' } });
    fireEvent.change(screen.getByLabelText('Quantity *'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Unit cost *'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard/purchases/25'));
    expect(create).toHaveBeenCalledWith({ supplierId: 7, expectedDeliveryDate: undefined, notes: '', items: [{ productId: 42, quantity: 2, unitCost: 10, notes: undefined }] });
  });

  it('locks direct edit routes after confirmation', async () => {
    jest.spyOn(purchasesApi, 'get').mockResolvedValue({ ...order, status: 'CONFIRMED' });
    render(<PurchaseDraftPage id={25} />);
    expect(await screen.findByText('This order is no longer a draft and cannot be edited.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save Draft' })).not.toBeInTheDocument();
  });

  it('sends null to clear a saved expected delivery date', async () => {
    jest.spyOn(purchasesApi, 'get').mockResolvedValue({ ...order, expectedDeliveryDate: '2026-09-30' });
    const update = jest.spyOn(purchasesApi, 'update').mockResolvedValue({ ...order, expectedDeliveryDate: null });
    render(<PurchaseDraftPage id={25} />);
    fireEvent.change(await screen.findByLabelText('Expected delivery date'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    await waitFor(() => expect(update).toHaveBeenCalledWith(25, expect.objectContaining({ expectedDeliveryDate: null })));
  });
});
