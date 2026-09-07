import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PurchaseReceive from '../_components/purchase-receive';
import { purchasesApi, type PurchaseOrder } from '@/lib/purchases';

jest.mock('@/lib/auth-context', () => ({ useAuth: () => ({ token: 'test-token' }) }));

const order: PurchaseOrder = {
  id: 25, orderNumber: 'PO-TEST-25', supplierId: 7, supplier: { id: 7, name: 'Test supplier' },
  status: 'PARTIALLY_RECEIVED', orderDate: '2026-09-07', totalAmount: '1255.00',
  createdAt: '2026-09-07', updatedAt: '2026-09-07',
  lines: [{ id: 101, productId: 42, product: { id: 42, name: 'Cotton Shirt' }, quantity: 10, receivedQuantity: 6, unitCost: '125.50', lineTotal: '1255.00' }],
};

describe('purchase receiving', () => {
  beforeEach(() => jest.spyOn(purchasesApi, 'get').mockResolvedValue(order));
  afterEach(() => jest.restoreAllMocks());

  it('requires review, submits once and shows the resulting lot links', async () => {
    let finish!: (value: Awaited<ReturnType<typeof purchasesApi.receive>>) => void;
    const receive = jest.spyOn(purchasesApi, 'receive').mockReturnValue(new Promise(resolve => { finish = resolve; }));
    render(<PurchaseReceive id={25} />);
    fireEvent.change(await screen.findByLabelText('Receive Cotton Shirt'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review Receipt' }));
    expect(receive).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Receipt' }));
    fireEvent.click(screen.getByRole('button', { name: 'Receiving…' }));
    expect(receive).toHaveBeenCalledTimes(1);
    expect(receive).toHaveBeenCalledWith(25, { items: [{ purchaseOrderLineId: 101, quantity: 4, lotNumber: undefined, notes: undefined }] });
    finish({ order: { ...order, status: 'RECEIVED' }, receipts: [{ purchaseOrderLineId: 101, lotId: 88, lotNumber: 'LOT/25 A', inventoryItemIds: [901, 902, 903, 904] }] });
    expect(await screen.findByText('Stock received')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View stock' })).toHaveAttribute('href', '/dashboard/inventory/list?lotNumber=LOT%2F25+A');
    expect(screen.getByRole('link', { name: 'Print lot barcodes' })).toHaveAttribute('href', '/dashboard/inventory/barcode?lotNumber=LOT%2F25+A');
    expect(screen.queryByRole('button', { name: 'Confirm Receipt' })).not.toBeInTheDocument();
  });

  it('blocks resubmission after a network failure until the user reviews the order', async () => {
    const receive = jest.spyOn(purchasesApi, 'receive').mockRejectedValue(new TypeError('NetworkError'));
    render(<PurchaseReceive id={25} />);
    fireEvent.change(await screen.findByLabelText('Receive Cotton Shirt'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review Receipt' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Receipt' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Stock may already have been received');
    expect(screen.getByRole('button', { name: 'Confirm Receipt' })).toBeDisabled();
    expect(receive).toHaveBeenCalledTimes(1);
  });

  it('does not show receiving inputs for completed orders', async () => {
    jest.spyOn(purchasesApi, 'get').mockResolvedValue({ ...order, status: 'RECEIVED' });
    render(<PurchaseReceive id={25} />);
    await waitFor(() => expect(screen.getByText('This order is not open for receiving.')).toBeInTheDocument());
    expect(screen.queryByLabelText('Receive Cotton Shirt')).not.toBeInTheDocument();
  });
});
