import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import PurchaseHistory from '../_components/purchase-history';
import { purchasesApi, type PurchaseOrder, type PurchaseReceiptList } from '@/lib/purchases';

jest.mock('@/lib/auth-context', () => ({ useAuth: () => ({ token: 'test-token' }) }));

const history: PurchaseReceiptList = {
  items: [{ id: 55, purchaseOrderId: 25, receiptDate: '2026-09-07T10:30:00Z', receivedById: 12, receivedBy: { id: 12, email: 'warehouse@example.com', role: 'admin' }, totalAmount: 753,
    lines: [{ id: 201, purchaseOrderLineId: 101, productId: 42, productName: 'Cotton Shirt', receivedQuantity: 6, unitCost: 125.5, lineTotal: 753, lotId: 88, lotNumber: 'LOT/25 A', notes: 'First delivery', accounting: { id: 350, eventType: 'PURCHASE', reference: 'PURCHASE-REF-350', date: '2026-09-07' } }] }],
  total: 2, page: 1, limit: 20, pageCount: 2, hasNext: true,
};
const order = { id: 25, lines: [{ id: 101, product: { trackingMode: 'SERIALIZED', baseUnit: 'piece', quantityPrecision: 0 } }] } as PurchaseOrder;

describe('purchase receipt history', () => {
  afterEach(() => jest.restoreAllMocks());

  it('loads persisted receipts with lot links, accounting references and pagination', async () => {
    const receipts = jest.spyOn(purchasesApi, 'receipts').mockResolvedValueOnce(history).mockResolvedValueOnce({ ...history, items: [{ ...history.items[0], id: 54 }], page: 2, hasNext: false });
    render(<PurchaseHistory order={order} />);
    expect(await screen.findByText('Receipt #55')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Print receipt' })).toBeInTheDocument();
    expect(screen.getByText('PURCHASE-REF-350')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View stock' })).toHaveAttribute('href', '/dashboard/inventory/list?lotNumber=LOT%2F25+A');
    fireEvent.click(screen.getByRole('button', { name: 'Next receipts' }));
    expect(await screen.findByText('Receipt #54')).toBeInTheDocument();
    expect(receipts).toHaveBeenLastCalledWith(25, 2);
    expect(screen.getByRole('button', { name: 'Next receipts' })).toBeDisabled();
  });

  it('offers retry after a failed history request, then shows the empty state', async () => {
    jest.spyOn(purchasesApi, 'receipts').mockRejectedValueOnce(new Error('History unavailable')).mockResolvedValueOnce({ items: [], total: 0, page: 1, limit: 20, pageCount: 0, hasNext: false });
    render(<PurchaseHistory order={order} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('History unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('No receipts recorded yet.')).toBeInTheDocument();
  });
});
