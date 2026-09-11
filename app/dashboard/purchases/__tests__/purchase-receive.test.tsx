import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PurchaseReceive from '../_components/purchase-receive';
import { purchasesApi, type PurchaseOrder } from '@/lib/purchases';
import { ApiError } from '@/lib/api';
import { readReceiptAttempt, createReceiptAttempt, RECEIPT_RETRY_WINDOW_MS } from '@/lib/purchase-receipt-attempt';

jest.mock('@/lib/auth-context', () => ({ useAuth: () => ({ token: 'test-token' }) }));

const order: PurchaseOrder = {
  id: 25, tenantId: 3, orderNumber: 'PO-TEST-25', supplierId: 7, supplier: { id: 7, name: 'Test supplier' },
  status: 'PARTIALLY_RECEIVED', orderDate: '2026-09-07', totalAmount: '1255.00',
  createdAt: '2026-09-07', updatedAt: '2026-09-07',
  lines: [{ id: 101, productId: 42, product: { id: 42, name: 'Cotton Shirt' }, quantity: 10, receivedQuantity: 6, unitCost: '125.50', lineTotal: '1255.00' }],
};

describe('purchase receiving', () => {
  beforeEach(() => {
    sessionStorage.clear();
    Object.defineProperty(crypto, 'randomUUID', { configurable: true, value: () => '00000000-0000-4000-8000-000000000001' });
    jest.spyOn(purchasesApi, 'get').mockResolvedValue(order);
  });
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
    expect(receive).toHaveBeenCalledWith(25, { items: [{ purchaseOrderLineId: 101, quantity: 4 }] }, expect.any(String));
    finish({ receiptId: 55, order: { ...order, status: 'RECEIVED' }, receipts: [{ purchaseOrderLineId: 101, lotId: 88, lotNumber: 'LOT/25 A', inventoryItemIds: [901, 902, 903, 904] }] });
    expect(await screen.findByText('Stock received')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Print receipt' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View stock' })).toHaveAttribute('href', '/dashboard/inventory/list?lotNumber=LOT%2F25+A');
    expect(screen.getByRole('link', { name: 'Print lot barcodes' })).toHaveAttribute('href', '/dashboard/inventory/barcode?lotNumber=LOT%2F25+A');
    expect(screen.queryByRole('button', { name: 'Confirm Receipt' })).not.toBeInTheDocument();
    expect(readReceiptAttempt(order)).toBeNull();
  });

  it('retries a network failure with the same key and payload after remounting a completed order', async () => {
    const receive = jest.spyOn(purchasesApi, 'receive').mockRejectedValue(new TypeError('NetworkError'));
    const view = render(<PurchaseReceive id={25} />);
    fireEvent.change(await screen.findByLabelText('Receive Cotton Shirt'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review Receipt' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Receipt' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Retry this saved delivery');
    expect(receive).toHaveBeenCalledTimes(1);
    const savedCall = receive.mock.calls[0];
    expect(readReceiptAttempt(order)?.key).toBe(savedCall[2]);
    view.unmount();
    jest.spyOn(purchasesApi, 'get').mockResolvedValue({ ...order, status: 'RECEIVED' });
    receive.mockResolvedValue({ receiptId: 55, order: { ...order, status: 'RECEIVED' }, receipts: [] });
    render(<PurchaseReceive id={25} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Retry Saved Receipt' }));
    expect(await screen.findByText('Stock received')).toBeInTheDocument();
    expect(receive.mock.calls[1]).toEqual(savedCall);
    expect(readReceiptAttempt(order)).toBeNull();
  });

  it('keeps the original attempt when the backend returns 409 processing', async () => {
    const saved = createReceiptAttempt(order, { items: [{ purchaseOrderLineId: 101, quantity: 2 }] });
    const receive = jest.spyOn(purchasesApi, 'receive').mockRejectedValue(new ApiError(409, 'Still processing'));
    render(<PurchaseReceive id={25} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Retry Saved Receipt' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('still processing');
    expect(readReceiptAttempt(order)?.key).toBe(saved.key);
    expect(screen.queryByRole('button', { name: 'Reload & correct receipt' })).not.toBeInTheDocument();
    expect(receive).toHaveBeenCalledWith(25, saved.input, saved.key);
  });

  it('blocks expired-key retries and requires history review before discarding recovery data', async () => {
    const saved = createReceiptAttempt(order, { items: [{ purchaseOrderLineId: 101, quantity: 2 }] });
    sessionStorage.setItem('purchase-receipt:3:25', JSON.stringify({ ...saved, createdAt: Date.now() - RECEIPT_RETRY_WINDOW_MS - 1 }));
    const receive = jest.spyOn(purchasesApi, 'receive');
    render(<PurchaseReceive id={25} />);
    expect(await screen.findByRole('button', { name: 'Retry Saved Receipt' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Discard saved attempt & reload' })).toBeDisabled();
    expect(receive).not.toHaveBeenCalled();
  });

  it('does not show receiving inputs for completed orders', async () => {
    jest.spyOn(purchasesApi, 'get').mockResolvedValue({ ...order, status: 'RECEIVED' });
    render(<PurchaseReceive id={25} />);
    await waitFor(() => expect(screen.getByText('This order is not open for receiving.')).toBeInTheDocument());
    expect(screen.queryByLabelText('Receive Cotton Shirt')).not.toBeInTheDocument();
  });
});
