import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PurchaseReceiptPrintButton from '../_components/purchase-receipt-print-button';
import { purchasesApi } from '@/lib/purchases';

describe('purchase receipt print button', () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, writable: true, value: jest.fn(() => 'blob:purchase-receipt') });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, writable: true, value: jest.fn() });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, writable: true, value: originalCreateObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, writable: true, value: originalRevokeObjectURL });
  });

  it('opens authenticated receipt HTML in an isolated window', async () => {
    const popup = {
      opener: window,
      document: { title: '', body: { textContent: '' } },
      location: { replace: jest.fn() },
      close: jest.fn(),
    } as unknown as Window;
    jest.spyOn(window, 'open').mockReturnValue(popup);
    const printReceipt = jest.spyOn(purchasesApi, 'printReceipt').mockResolvedValue('<html><body>Receipt</body></html>');

    render(<PurchaseReceiptPrintButton orderId={25} receiptId={55} />);
    fireEvent.click(screen.getByRole('button', { name: 'Print receipt' }));

    await waitFor(() => expect(popup.location.replace).toHaveBeenCalledWith('blob:purchase-receipt'));
    expect(printReceipt).toHaveBeenCalledWith(25, 55);
    expect(popup.opener).toBeNull();
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.objectContaining({ type: 'text/html;charset=utf-8' }));
  });

  it('explains when the browser blocks the receipt window', () => {
    jest.spyOn(window, 'open').mockReturnValue(null);
    const printReceipt = jest.spyOn(purchasesApi, 'printReceipt');
    render(<PurchaseReceiptPrintButton orderId={25} receiptId={55} />);
    fireEvent.click(screen.getByRole('button', { name: 'Print receipt' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Allow pop-ups');
    expect(printReceipt).not.toHaveBeenCalled();
  });
});
