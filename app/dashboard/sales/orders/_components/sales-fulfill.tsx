'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState, type FormEvent } from 'react';
import { api, type InventoryItemWithProduct } from '@/lib/api';
import { salesOrdersApi, uncertainMutation } from '@/lib/sales-orders';
import { useSalesResource } from './use-sales-resource';
import { SalesShell, SalesError, SalesLoading, salesButton, salesSecondary, salesInput, salesCard } from './sales-ui';

type Picked = { id: number; barcode: string; productId: number };

export default function SalesFulfillPage({ id }: { id: number }) {
  const router = useRouter();
  const load = useCallback(() => salesOrdersApi.get(id), [id]);
  const resource = useSalesResource(load);
  const [barcode, setBarcode] = useState('');
  const [lineId, setLineId] = useState('');
  const [picked, setPicked] = useState<Picked[]>([]);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [mustReview, setMustReview] = useState(false);
  const lock = useRef(false);
  const order = resource.data;
  const remaining = order?.lines.filter(line => Number(line.quantity) > Number(line.fulfilledQuantity)) ?? [];

  const scan = async (event: FormEvent) => {
    event.preventDefault();
    const line = remaining.find(item => String(item.id) === lineId);
    if (!line || !barcode.trim()) { setError('Choose an order line and enter a barcode.'); return; }
    setBusy(true); setError('');
    try {
      const item = await api.get<InventoryItemWithProduct>('/inventory/scan', { barcode: barcode.trim() });
      if (!item || item.status !== 'in_stock' || Number(item.productId) !== line.productId) throw new Error('That barcode is not an in-stock unit of the selected product.');
      if (picked.some(value => value.id === item.id)) throw new Error('This inventory unit is already selected.');
      if (picked.filter(value => value.productId === line.productId).length >= Number(line.quantity) - Number(line.fulfilledQuantity)) throw new Error('This line has no remaining quantity.');
      setPicked(previous => [...previous, { id: item.id, barcode: item.barcode, productId: item.productId }]);
      setBarcode('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to scan barcode.'); }
    finally { setBusy(false); }
  };

  const fulfill = async () => {
    if (lock.current || mustReview || !order || !picked.length) return;
    if (!window.confirm(`Fulfill ${picked.length} selected inventory unit${picked.length === 1 ? '' : 's'}? This records a sale and moves stock.`)) return;
    const items = remaining.map(line => ({ salesOrderLineId: line.id, inventoryItemIds: picked.filter(item => item.productId === line.productId).map(item => item.id) })).filter(item => item.inventoryItemIds.length);
    lock.current = true; setBusy(true); setError('');
    try {
      const result = await salesOrdersApi.fulfill(order.id, items, notes.trim() || undefined);
      if (!result?.sale?.id) throw new Error('Fulfillment completed without a sale ID.');
      router.push(`/dashboard/sales/orders/${order.id}`);
    } catch (cause) {
      const review = uncertainMutation(cause);
      setMustReview(review);
      setError(review ? 'The fulfillment result is uncertain. Review the order and sales history before trying again to avoid selling the same units twice.' : cause instanceof Error ? cause.message : 'Unable to fulfill order.');
      lock.current = false; setBusy(false);
    }
  };

  return <SalesShell title="Fulfill Sales Order" description={order?.orderNumber} order={order ? { id, label: order.orderNumber } : undefined}>
    {resource.loading ? <SalesLoading /> : resource.error || !order ? <SalesError message={resource.error ?? 'Order unavailable.'} retry={resource.reload} /> : !['CONFIRMED', 'PARTIALLY_FULFILLED'].includes(order.status) ? <div className={salesCard}>This order cannot be fulfilled in its current status. <Link className="underline" href={`/dashboard/sales/orders/${id}`}>Back to order</Link></div> : <div className="space-y-5">
      {error && <SalesError message={error} retry={resource.reload} />}
      <section className={`${salesCard} space-y-4`}><h2 className="font-semibold">Select exact inventory units</h2><p className="text-sm text-slate-500">Scan or enter each unit’s barcode. One unit equals one fulfilled quantity.</p>
        <form onSubmit={scan} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><label className="text-sm">Order line<select className={salesInput} value={lineId} onChange={event => setLineId(event.target.value)} required><option value="">Select line</option>{remaining.map(line => <option key={line.id} value={line.id}>{line.product.name} · {Number(line.quantity) - Number(line.fulfilledQuantity)} remaining</option>)}</select></label><label className="text-sm">Barcode<input className={salesInput} value={barcode} onChange={event => setBarcode(event.target.value)} required /></label><button className={salesSecondary} disabled={busy || mustReview}>Add unit</button></form>
        <div className="space-y-2">{remaining.map(line => <div key={line.id} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700"><strong>{line.product.name}</strong> · {picked.filter(item => item.productId === line.productId).length} selected / {Number(line.quantity) - Number(line.fulfilledQuantity)} remaining<div className="mt-2 flex flex-wrap gap-2">{picked.filter(item => item.productId === line.productId).map(item => <button type="button" key={item.id} className={salesSecondary} disabled={busy || mustReview} onClick={() => setPicked(previous => previous.filter(value => value.id !== item.id))}>{item.barcode} ×</button>)}</div></div>)}</div>
      </section>
      <label className={`${salesCard} block space-y-2 text-sm`}>Fulfillment notes<textarea className={salesInput} maxLength={1000} rows={2} value={notes} onChange={event => setNotes(event.target.value)} /></label>
      <div className="flex justify-end gap-2"><Link href={`/dashboard/sales/orders/${id}`} className={salesSecondary}>Back to order</Link><button type="button" className={salesButton} disabled={busy || mustReview || !picked.length} onClick={() => void fulfill()}>{busy ? 'Processing…' : `Fulfill ${picked.length} unit${picked.length === 1 ? '' : 's'}`}</button></div>
    </div>}
  </SalesShell>;
}
