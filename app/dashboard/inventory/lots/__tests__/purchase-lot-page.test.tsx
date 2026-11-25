import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import PurchaseLotPageContent from '../purchase-lot-page-content';
import { purchasesApi, type PurchaseLotDetail } from '@/lib/purchases';

jest.mock('@/lib/auth-context', () => ({ useAuth: () => ({ token: 'test-token' }) }));

const lot: PurchaseLotDetail = {
  id: 88, lotNumber: 'LOT/25 A', productId: 42,
  product: { id: 42, name: 'Rice', trackingMode: 'QUANTITY', baseUnit: 'kg', quantityPrecision: 2 },
  supplierId: 7, supplier: { id: 7, name: 'Farm Supply' },
  quantityReceived: 100, unitCost: 50, totalCost: 5000, notes: null,
  journalEntryId: 120, purchaseOrderLineId: 101, receivedAt: '2026-10-15T01:00:00Z',
  sourceDocument: { type: 'PURCHASE_ORDER', id: 55, number: 'PO-25', purchaseOrderId: 25, receiptId: 55 },
  itemCount: null,
};

describe('purchase lot details', () => {
  afterEach(() => jest.restoreAllMocks());

  it('shows original quantity without inventing quantity-lot remaining stock', async () => {
    jest.spyOn(purchasesApi, 'lotDetail').mockResolvedValue(lot);
    render(<PurchaseLotPageContent lotNumber="LOT/25 A" />);
    expect(await screen.findByText('Originally received')).toBeInTheDocument();
    expect(screen.getByText('100 kg')).toBeInTheDocument();
    expect(screen.getByText(/not remaining stock in this lot/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'PO-25' })).toHaveAttribute('href', '/dashboard/purchases/25?tab=receipts');
    expect(screen.getByRole('link', { name: 'View product stock' })).toHaveAttribute('href', '/dashboard/inventory/balances/42');
    expect(screen.queryByText('Serialized units created')).not.toBeInTheDocument();
  });

  it('shows serialized item count and the lot-filtered inventory link', async () => {
    jest.spyOn(purchasesApi, 'lotDetail').mockResolvedValue({ ...lot, product: { ...lot.product, trackingMode: 'SERIALIZED', baseUnit: 'piece', quantityPrecision: 0 }, quantityReceived: 10, itemCount: 10 });
    render(<PurchaseLotPageContent lotNumber="LOT/25 A" />);
    expect(await screen.findByText('Serialized units created')).toBeInTheDocument();
    expect(screen.getByText('10 piece')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View serialized units in this lot' })).toHaveAttribute('href', '/dashboard/inventory/list?lotNumber=LOT%2F25%20A');
    expect(screen.queryByText(/not remaining stock in this lot/i)).not.toBeInTheDocument();
  });
});
