'use client';

import { useRef, useState } from 'react';
import { purchaseError, purchasesApi } from '@/lib/purchases';
import { purchaseSecondary } from './purchase-ui';

export default function PurchaseReceiptPrintButton({ orderId, receiptId }: { orderId: number; receiptId: number }) {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const openReceipt = async () => {
    if (lock.current) return;
    const printWindow = window.open('about:blank', '_blank');
    if (!printWindow) {
      setError('The receipt window was blocked. Allow pop-ups for this site and try again.');
      return;
    }

    // The HTML comes from the authenticated backend. Isolate it from this tab.
    printWindow.opener = null;
    printWindow.document.title = `Preparing receipt #${receiptId}`;
    printWindow.document.body.textContent = 'Preparing printable receipt…';
    lock.current = true;
    setBusy(true);
    setError('');

    try {
      const html = await purchasesApi.printReceipt(orderId, receiptId);
      if (typeof html !== 'string' || !html.trim()) throw new Error('The server returned an empty printable receipt.');
      const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
      printWindow.location.replace(url);
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (cause) {
      printWindow.close();
      setError(purchaseError(cause));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  return <div className="flex flex-col items-start gap-1 sm:items-end">
    <button type="button" className={purchaseSecondary} disabled={busy} onClick={() => void openReceipt()}>{busy ? 'Preparing receipt…' : 'Print receipt'}</button>
    {error && <p role="alert" className="max-w-sm text-xs text-rose-700 dark:text-rose-300">{error}</p>}
  </div>;
}
