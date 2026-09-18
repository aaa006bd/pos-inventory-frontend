'use client';

import { useRef, useState } from 'react';
import { salesOrdersApi } from '@/lib/sales-orders';
import { salesSecondary } from './sales-ui';

export default function SalesPrintButton({ saleId, kind }: { saleId: number; kind: 'challan' | 'invoice' }) {
  const lock = useRef(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const label = kind === 'challan' ? 'Print challan' : 'Print invoice / cash receipt';
  const open = async () => {
    if (lock.current) return;
    const tab = window.open('about:blank', '_blank');
    if (!tab) { setError('Allow pop-ups for this site and try again.'); return; }
    tab.opener = null;
    tab.document.body.textContent = 'Preparing printable document…';
    lock.current = true; setBusy(true); setError('');
    try {
      const html = kind === 'challan' ? await salesOrdersApi.challan(saleId) : await salesOrdersApi.invoice(saleId);
      if (!html?.trim()) throw new Error('The server returned an empty document.');
      const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
      tab.location.replace(url);
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (cause) { tab.close(); setError(cause instanceof Error ? cause.message : 'Unable to open document.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <span className="inline-flex flex-col gap-1"><button type="button" className={salesSecondary} disabled={busy} onClick={() => void open()}>{busy ? 'Preparing…' : label}</button>{error && <span role="alert" className="text-xs text-rose-700">{error}</span>}</span>;
}
