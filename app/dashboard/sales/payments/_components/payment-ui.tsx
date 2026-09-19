'use client';

import Link from 'next/link';
import { useRef, useState, type ReactNode } from 'react';
import { customerPaymentsApi } from '@/lib/customer-payments';
import { salesCard, salesSecondary } from '../../orders/_components/sales-ui';

export function PaymentShell({ title, children }: { title: string; children: ReactNode }) {
  return <div className="mx-auto max-w-6xl space-y-6 pb-8"><nav className="text-sm text-slate-500"><Link href="/dashboard/sales/payments">Sales / Customer Payments</Link></nav><h1 className="text-2xl font-semibold">{title}</h1>{children}</div>;
}
export function PaymentPager({ page, total, limit, change }: { page: number; total: number; limit: number; change: (page: number) => void }) {
  return <div className="flex items-center justify-between gap-3 text-sm"><span>{total} records · Page {page} of {Math.max(1, Math.ceil(total / limit))}</span><div className="flex gap-2"><button type="button" className={salesSecondary} disabled={page <= 1} onClick={() => change(page - 1)}>Previous</button><button type="button" className={salesSecondary} disabled={page * limit >= total} onClick={() => change(page + 1)}>Next</button></div></div>;
}
export function PaymentLoading() { return <div role="status" className={salesCard}>Loading payments…</div>; }
export function PaymentReceipt({ id }: { id: number }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const print = async () => {
    if (lock.current) return;
    const tab = window.open('about:blank', '_blank');
    if (!tab) { setError('Allow pop-ups to open the receipt.'); return; }
    tab.opener = null;
    tab.document.body.textContent = 'Preparing payment receipt…';
    lock.current = true; setBusy(true); setError('');
    try {
      const html = await customerPaymentsApi.receipt(id);
      if (typeof html !== 'string' || !html.trim()) throw new Error('The receipt was empty.');
      const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
      tab.location.replace(url);
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (cause) { tab.close(); setError(cause instanceof Error ? cause.message : 'Unable to print receipt.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <div><button type="button" className={salesSecondary} disabled={busy} onClick={() => void print()}>{busy ? 'Preparing…' : 'Print money receipt'}</button>{error && <p role="alert" className="text-sm text-rose-700">{error}</p>}</div>;
}
