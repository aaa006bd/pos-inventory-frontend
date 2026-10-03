'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { canReceive, purchasesApi, remainingQuantity, formatAmount, formatPurchaseDate, purchaseError, uncertainMutation, type PurchaseOrder } from '@/lib/purchases';
import { usePurchaseResource } from './use-purchase-resource';
import PurchaseHistory from './purchase-history';
import { PurchaseShell, PurchaseBadge, PurchaseError, PurchaseLoading, purchaseButton, purchaseSecondary, purchaseInput, purchaseCard } from './purchase-ui';
import { formatQuantity } from '@/lib/product-quantity';

export default function PurchaseDetail({ id }: { id: number }) {
  const load = useCallback(() => purchasesApi.get(id), [id]);
  const resource = usePurchaseResource(load);
  return resource.data ? <PurchaseDetailContent order={resource.data} reload={resource.reload} /> : <PurchaseShell title="Purchase Order">{resource.loading ? <PurchaseLoading /> : <PurchaseError message={resource.error ?? 'Order unavailable.'} retry={resource.reload} />}</PurchaseShell>;
}

function PurchaseDetailContent({ order, reload }: { order: PurchaseOrder; reload: () => void }) {
  const [tab, setTab] = useState<'items' | 'receipts'>('items');
  const [action, setAction] = useState<'confirm' | 'cancel' | null>(null);
  const [notice, setNotice] = useState('');
  const [reviewRequired, setReviewRequired] = useState(false);
  return <PurchaseShell title={order.orderNumber} description={order.supplier.name} order={{ id: order.id, label: order.orderNumber }} actions={<>
    {reviewRequired ? <button className={purchaseSecondary} onClick={reload}>Reload order</button> : <>
      {order.status === 'DRAFT' && <><Link className={purchaseSecondary} href={`/dashboard/purchases/${order.id}/edit`}>Edit Draft</Link><button className={purchaseButton} onClick={() => setAction('confirm')}>Confirm Order</button></>}
      {canReceive(order) && <Link href={`/dashboard/purchases/${order.id}/receive`} className={purchaseButton}>Receive Stock</Link>}
      {(order.status === 'DRAFT' || order.status === 'CONFIRMED') && <button className={purchaseSecondary} onClick={() => setAction('cancel')}>Cancel Order</button>}
    </>}
  </>}>
    {notice && <PurchaseError message={notice} retry={reload} />}
    <div className={`${purchaseCard} grid gap-5 sm:grid-cols-2 lg:grid-cols-4`}>
      <div><p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Status</p><PurchaseBadge status={order.status} /></div>
      <div><p className="text-xs uppercase tracking-wide text-slate-500">Ordered</p><p className="mt-2 font-semibold">{formatPurchaseDate(order.orderDate)}</p></div>
      <div><p className="text-xs uppercase tracking-wide text-slate-500">Expected delivery</p><p className="mt-2 font-semibold">{formatPurchaseDate(order.expectedDeliveryDate)}</p></div>
      <div><p className="text-xs uppercase tracking-wide text-slate-500">Order total</p><p className="mt-2 font-semibold tabular-nums">{formatAmount(order.totalAmount)}</p></div>
    </div>
    <div role="tablist" aria-label="Purchase order sections" className="flex gap-5 border-b border-slate-200 dark:border-slate-700">
      {(['items', 'receipts'] as const).map(value => <button key={value} type="button" role="tab" id={`purchase-tab-${value}`} aria-selected={tab === value} aria-controls={`purchase-panel-${value}`} tabIndex={tab === value ? 0 : -1} onClick={() => setTab(value)} onKeyDown={event => {
        if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          const target = event.key === 'Home' ? 'items' : event.key === 'End' ? 'receipts' : value === 'items' ? 'receipts' : 'items';
          setTab(target); document.getElementById(`purchase-tab-${target}`)?.focus();
        }
      }} className={`pb-3 text-sm font-semibold ${tab === value ? 'border-b-2 border-sky-600 text-sky-700 dark:text-sky-400' : 'text-slate-500'}`}>{value === 'items' ? 'Items' : 'Receipt History'}</button>)}
    </div>
    <section role="tabpanel" id={`purchase-panel-${tab}`} aria-labelledby={`purchase-tab-${tab}`} tabIndex={0}>
    {tab === 'receipts' ? <PurchaseHistory key={order.id} order={order} /> : <section className={purchaseCard} aria-label="Order items">
      <div className="mb-4 flex flex-wrap justify-between gap-2"><h2 className="font-semibold">Items</h2><p className="text-sm text-slate-500">{order.lines.filter(line => remainingQuantity(line) === 0).length} of {order.lines.length} product lines fully received</p></div>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-700"><tr>{['Product', 'Ordered', 'Received', 'Remaining', 'Unit cost', 'Line total'].map(label => <th key={label} className="px-3 py-3">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{order.lines.map(line => <tr key={line.id}>
          <td className="px-3 py-4"><p className="font-medium">{line.product.name}</p>{line.product.sku && <p className="text-xs text-slate-500">{line.product.sku}</p>}{line.notes && <p className="mt-1 max-w-xs whitespace-pre-wrap break-words text-xs text-slate-500">{line.notes}</p>}</td>
          <td className="px-3 py-4">{formatQuantity(line.quantity, line.product.baseUnit)}</td><td className="px-3 py-4">{formatQuantity(line.receivedQuantity, line.product.baseUnit)}</td><td className="px-3 py-4">{formatQuantity(remainingQuantity(line), line.product.baseUnit)}</td><td className="px-3 py-4 tabular-nums">{formatAmount(line.unitCost)} / {line.product.baseUnit}</td><td className="px-3 py-4 tabular-nums">{formatAmount(line.lineTotal)}</td>
        </tr>)}</tbody></table></div>
      <p className="mt-4 text-sm font-medium">{order.status === 'CANCELLED' ? 'This order is cancelled. No further stock can be received.' : `${order.lines.filter(line => remainingQuantity(line) > 0).length} product lines outstanding`}</p>
    </section>}
    </section>
    {order.notes && <section className={purchaseCard}><h2 className="mb-2 font-semibold">Order notes</h2><p className="whitespace-pre-wrap break-words text-sm">{order.notes}</p></section>}
    {order.cancellationReason && <section className={purchaseCard}><h2 className="mb-2 font-semibold">Cancellation reason</h2><p className="whitespace-pre-wrap break-words text-sm">{order.cancellationReason}</p></section>}
    <div className="flex flex-wrap gap-3"><Link className={purchaseSecondary} href="/dashboard/purchases">Back to orders</Link><Link className={purchaseSecondary} href="/dashboard/finance">Supplier balances & payments</Link></div>
    {action && <OrderActionDialog order={order} action={action} close={() => setAction(null)} onSuccess={reload} onFailure={message => { setNotice(message); setReviewRequired(true); setAction(null); }} />}
  </PurchaseShell>;
}

function OrderActionDialog({ order, action, close, onSuccess, onFailure }: { order: PurchaseOrder; action: 'confirm' | 'cancel'; close: () => void; onSuccess: () => void; onFailure: (message: string) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (lock.current) return;
    if (action === 'cancel' && !reason.trim()) { setError('Enter a cancellation reason.'); return; }
    lock.current = true; setBusy(true); setError('');
    try {
      if (action === 'confirm') await purchasesApi.confirm(order.id);
      else await purchasesApi.cancel(order.id, reason.trim());
      onSuccess();
    } catch (cause) {
      onFailure(uncertainMutation(cause) ? 'The result could not be confirmed. Reload the order before taking another action.' : `${purchaseError(cause)} Reload the order to check its latest status.`);
    } finally { lock.current = false; setBusy(false); }
  };
  return <dialog ref={dialog} aria-labelledby="order-action-title" onCancel={event => { event.preventDefault(); if (!busy) close(); }} className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-2xl bg-white p-6 text-slate-900 shadow-xl backdrop:bg-slate-950/50 dark:bg-slate-900 dark:text-slate-100">
    <form onSubmit={submit} className="space-y-4"><h2 id="order-action-title" className="text-lg font-semibold">{action === 'confirm' ? 'Confirm order?' : 'Cancel order?'}</h2>
      <p className="text-sm text-slate-500">{action === 'confirm' ? 'Once confirmed, draft editing is locked and stock can be received against this order.' : 'This order will be closed without receiving further stock.'}</p>
      {error && <PurchaseError message={error} />}
      {action === 'cancel' && <label className="block space-y-2 text-sm">Reason *<textarea required maxLength={1000} value={reason} disabled={busy} onChange={event => setReason(event.target.value)} className={purchaseInput} rows={3} /></label>}
      <div className="flex justify-end gap-3"><button type="button" disabled={busy} className={purchaseSecondary} onClick={close}>Go back</button><button disabled={busy} className={purchaseButton}>{busy ? 'Saving…' : action === 'confirm' ? 'Confirm Order' : 'Cancel Order'}</button></div>
    </form>
  </dialog>;
}
