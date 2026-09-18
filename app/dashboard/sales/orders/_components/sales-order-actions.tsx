'use client';

import Link from 'next/link';
import { useState } from 'react';
import { salesOrdersApi, type SalesOrder } from '@/lib/sales-orders';
import { SalesError, salesButton, salesSecondary, salesCard, salesInput } from './sales-ui';

export default function SalesOrderActions({ order, reload }: { order: SalesOrder; reload: () => void }) {
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const [error, setError] = useState('');
  const act = async (action: 'confirm' | 'cancel') => {
    if (busy) return;
    if (action === 'cancel' && (!reason.trim() || reason.trim().length > 1000)) { setError('Enter a cancellation reason of 1–1,000 characters.'); return; }
    if (action === 'confirm' && !window.confirm('Confirm this order? It can no longer be edited.')) return;
    setBusy(true); setError('');
    try { if (action === 'confirm') await salesOrdersApi.confirm(order.id); else await salesOrdersApi.cancel(order.id, reason.trim()); reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Action failed. Refresh the order before retrying.'); }
    finally { setBusy(false); }
  };
  if (order.status === 'FULFILLED' || order.status === 'CANCELLED') return null;
  return <section className={`${salesCard} space-y-3`} aria-label="Order actions">
    <div className="flex flex-wrap gap-2">{order.status === 'DRAFT' && <><Link href={`/dashboard/sales/orders/${order.id}/edit`} className={salesSecondary}>Edit draft</Link><button type="button" className={salesButton} disabled={busy} onClick={() => void act('confirm')}>Confirm order</button></>}
      {(order.status === 'CONFIRMED' || order.status === 'PARTIALLY_FULFILLED') && <Link href={`/dashboard/sales/orders/${order.id}/fulfill`} className={salesButton}>Fulfill items</Link>}
      {(order.status === 'DRAFT' || order.status === 'CONFIRMED') && <button type="button" className={salesSecondary} disabled={busy} onClick={() => setShowCancel(value => !value)}>Cancel order</button>}</div>
    {showCancel && <div className="flex flex-wrap items-end gap-2"><label className="min-w-64 flex-1 text-sm">Cancellation reason<textarea className={salesInput} maxLength={1000} rows={2} value={reason} onChange={event => setReason(event.target.value)} /></label><button type="button" className={salesSecondary} disabled={busy} onClick={() => void act('cancel')}>Confirm cancellation</button></div>}
    {error && <SalesError message={error} retry={reload} />}
  </section>;
}
