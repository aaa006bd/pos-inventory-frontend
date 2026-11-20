import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PurchaseReceiptsPage from '../receipts/page';
import { purchasesApi, type PurchaseReceiptFeed } from '@/lib/purchases';
import { api } from '@/lib/api';

jest.mock('@/lib/auth-context', () => ({ useAuth: () => ({ token: 'test-token' }) }));

const feed: PurchaseReceiptFeed = {
  items: [
    { id: 'po-1', receiptDate: '2026-10-15T01:00:00Z', sourceType: 'PURCHASE_ORDER', sourceId: 25, sourceDocumentNumber: 'PO-25', supplierId: 7, supplierName: 'Farm Supply', productId: 42, productName: 'Rice', trackingMode: 'QUANTITY', baseUnit: 'kg', quantityReceived: 2.5, unitCost: 100, lineTotal: 250, lotNumber: 'LOT/25 A', purchaseOrderId: 25, receiptId: 55 },
    { id: 'manual-1', receiptDate: '2026-10-15T02:00:00Z', sourceType: 'MANUAL_STOCK', sourceId: 88, sourceDocumentNumber: 'MANUAL-88', supplierId: 7, supplierName: 'Farm Supply', productId: 43, productName: 'Pump', trackingMode: 'SERIALIZED', baseUnit: 'piece', quantityReceived: 1, unitCost: null, lineTotal: 0, lotNumber: 'LOT-88', purchaseOrderId: null, receiptId: null },
  ], total: 21, page: 1, limit: 20, pageCount: 2, hasNext: true,
};

describe('purchase receipts feed', () => {
  afterEach(() => jest.restoreAllMocks());

  it('shows received PO and manual stock sources with correct stock and lot destinations', async () => {
    jest.spyOn(purchasesApi, 'receiptFeed').mockResolvedValue(feed);
    jest.spyOn(api, 'get').mockResolvedValue([]);
    render(<PurchaseReceiptsPage />);
    expect(await screen.findByRole('link', { name: 'PO-25' })).toHaveAttribute('href', '/dashboard/purchases/25?tab=receipts');
    expect(screen.getByRole('link', { name: 'MANUAL-88' })).toHaveAttribute('href', '/dashboard/inventory/lots?lotNumber=LOT-88');
    expect(screen.getByRole('link', { name: 'LOT/25 A' })).toHaveAttribute('href', '/dashboard/inventory/lots?lotNumber=LOT%2F25+A');
    expect(screen.getByRole('link', { name: 'Rice' })).toHaveAttribute('href', '/dashboard/inventory/balances/42');
    expect(screen.getByRole('link', { name: 'Pump' })).toHaveAttribute('href', '/dashboard/inventory/list?lotNumber=LOT-88');
    expect(screen.getByText('2.5 kg')).toBeInTheDocument();
    expect(screen.getByText('250.00')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('21 received lines · Page 1 of 2')).toBeInTheDocument();
  });

  it('applies backend filters and advances using the feed pagination', async () => {
    const request = jest.spyOn(purchasesApi, 'receiptFeed').mockResolvedValue(feed);
    jest.spyOn(api, 'get').mockResolvedValue([{ id: 7, name: 'Farm Supply' }]);
    render(<PurchaseReceiptsPage />);
    await screen.findByRole('link', { name: 'PO-25' });
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: ' Rice ' } });
    fireEvent.change(screen.getByLabelText('Source'), { target: { value: 'MANUAL_STOCK' } });
    fireEvent.change(screen.getByLabelText('Supplier'), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText('From (Bangladesh date)'), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText('To (Bangladesh date)'), { target: { value: '2026-10-31' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
    await waitFor(() => expect(request).toHaveBeenLastCalledWith({ page: 1, limit: 20, sourceType: 'MANUAL_STOCK', supplierId: 7, from: '2026-10-01', to: '2026-10-31', search: 'Rice' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(request).toHaveBeenLastCalledWith({ page: 2, limit: 20, sourceType: 'MANUAL_STOCK', supplierId: 7, from: '2026-10-01', to: '2026-10-31', search: 'Rice' }));
  });
});
