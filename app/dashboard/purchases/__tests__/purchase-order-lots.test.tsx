import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import PurchaseDetail from '../_components/purchase-detail';
import { purchasesApi, type PurchaseOrder, type PurchaseReceiptList } from '@/lib/purchases';

jest.mock('@/lib/auth-context', () => ({ useAuth: () => ({ token: 'test-token' }) }));

const order: PurchaseOrder = {
  id: 25, tenantId: 1, orderNumber: 'PO-25', supplierId: 3,
  supplier: { id: 3, name: 'Supplier' }, status: 'PARTIALLY_RECEIVED',
  orderDate: '2026-10-13', totalAmount: 5000, createdAt: '2026-10-13', updatedAt: '2026-10-13',
  lines: [{ id: 101, productId: 42, product: { id: 42, name: 'Jelly Bun', trackingMode: 'SERIALIZED', baseUnit: 'piece', quantityPrecision: 0 }, quantity: 500, receivedQuantity: 300, unitCost: 10, lineTotal: 5000 }],
};

const receiptList: PurchaseReceiptList = {
  items: [
    { id: 55, purchaseOrderId: 25, receiptDate: '2026-10-13', receivedById: 1, receivedBy: { id: 1, email: 'staff@example.com', role: 'admin' }, totalAmount: 2000, lines: [{ id: 201, purchaseOrderLineId: 101, productId: 42, productName: 'Jelly Bun', receivedQuantity: 200, unitCost: 10, lineTotal: 2000, lotId: 1, lotNumber: 'LOT-001' }] },
    { id: 56, purchaseOrderId: 25, receiptDate: '2026-10-14', receivedById: 1, receivedBy: { id: 1, email: 'staff@example.com', role: 'admin' }, totalAmount: 1000, lines: [{ id: 202, purchaseOrderLineId: 101, productId: 42, productName: 'Jelly Bun', receivedQuantity: 100, unitCost: 10, lineTotal: 1000, lotId: 2, lotNumber: 'LOT-002' }] },
  ],
  total: 2, page: 1, limit: 20, pageCount: 1, hasNext: false,
};

describe('purchase order received lots', () => {
  afterEach(() => jest.restoreAllMocks());

  it('shows multiple lot links on a partially received order', async () => {
    jest.spyOn(purchasesApi, 'get').mockResolvedValue(order);
    jest.spyOn(purchasesApi, 'receipts').mockResolvedValue(receiptList);
    render(<PurchaseDetail id={25} />);

    expect(await screen.findByRole('link', { name: 'LOT-001' })).toHaveAttribute('href', '/dashboard/inventory/lots?lotNumber=LOT-001');
    expect(screen.getByRole('link', { name: 'LOT-002' })).toHaveAttribute('href', '/dashboard/inventory/lots?lotNumber=LOT-002');
    expect(screen.getByText('200 piece')).toBeInTheDocument();
    expect(purchasesApi.receipts).toHaveBeenCalledWith(25, 1, 20);
  });
});
