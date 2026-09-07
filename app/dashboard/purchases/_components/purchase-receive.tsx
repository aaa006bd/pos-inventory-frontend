'use client';

import Link from 'next/link';
import { useCallback, useRef, useState, type FormEvent } from 'react';
import { ApiError } from '@/lib/api';
import { canReceive, remainingQuantity, purchasesApi, validateReceipt, purchaseError, uncertainMutation, formatAmount, type PurchaseOrder, type PurchaseReceiptResult, type PurchaseReceiptInput } from '@/lib/purchases';
import { readReceiptAttempt, createReceiptAttempt, clearReceiptAttempt, canRetryReceiptAttempt, type ReceiptAttempt } from '@/lib/purchase-receipt-attempt';
import { usePurchaseResource } from './use-purchase-resource';
import { PurchaseShell, PurchaseBadge, PurchaseError, PurchaseLoading, purchaseButton, purchaseSecondary, purchaseInput, purchaseCard } from './purchase-ui';

export default function PurchaseReceive({ id }: { id: number }) {
  const load = useCallback(() => purchasesApi.get(id), [id]);
  const resource = usePurchaseResource(load);
  return <PurchaseShell title="Receive Purchase Order" description="Record only the quantities arriving in this delivery." order={resource.data ? { id, label: resource.data.orderNumber } : undefined}>
    {resource.loading ? <PurchaseLoading /> : resource.error ? <PurchaseError message={resource.error} retry={resource.reload} /> : resource.data && <ReceiptSession key={`${resource.data.tenantId}:${id}`} order={resource.data} reload={resource.reload} />}
  </PurchaseShell>;
}

function ReceiptSession({ order, reload }: { order: PurchaseOrder; reload: () => void }) {
  const [recovery, setRecovery] = useState<{ attempt: ReceiptAttempt | null; error?: string }>(() => {
    try { return { attempt: readReceiptAttempt(order) }; }
    catch { return { attempt: null, error: 'Saved receipt recovery data is unavailable. Check browser storage and review receipt history before receiving.' }; }
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [definitelyRejected, setDefinitelyRejected] = useState(false);
  const [reviewedHistory, setReviewedHistory] = useState(false);
  const [result, setResult] = useState<PurchaseReceiptResult>();
  const lock = useRef(false);
  const attempt = recovery.attempt;
  const units = attempt?.input.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  const send = async (saved: ReceiptAttempt) => {
    if (lock.current || result) return;
    if (!canRetryReceiptAttempt(saved)) { setError('The safe retry period has ended. Review receipt history before starting another delivery.'); return; }
    lock.current = true; setBusy(true); setError('');
    try {
      // Replay the original payload even when a fresh order read now says RECEIVED.
      // The backend looks up the key and returns the original receipt response.
      const received = await purchasesApi.receive(order.id, saved.input, saved.key);
      if (!received?.order || !Number.isSafeInteger(received.receiptId) || !Array.isArray(received.receipts)) throw new Error('The receipt response could not be read.');
      setResult(received);
      try { clearReceiptAttempt(order, saved); }
      catch { setError('Receipt saved, but browser recovery data could not be cleared. Any retry must use this same saved delivery.'); }
    } catch (cause) {
      const uncertain = uncertainMutation(cause) || (cause instanceof ApiError && ![400, 422].includes(cause.status));
      setDefinitelyRejected(!uncertain);
      setError(uncertain
        ? 'The receipt result could not be confirmed. Retry this saved delivery to recover its result without receiving stock twice. If it is still processing, wait before retrying.'
        : `${purchaseError(cause)} Reload the order before preparing a corrected receipt.`);
    } finally { lock.current = false; setBusy(false); }
  };

  const prepare = (input: PurchaseReceiptInput) => {
    if (attempt || lock.current || recovery.error) return;
    try {
      const saved = createReceiptAttempt(order, input);
      setRecovery({ attempt: saved });
      void send(saved);
    } catch (cause) { setError(`${purchaseError(cause)} No receipt request was sent.`); }
  };

  if (result) return <section className={`${purchaseCard} space-y-5`}>
    <div role="status"><h2 className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">Stock received</h2><p className="mt-1 text-sm">Receipt #{result.receiptId} · {units} units recorded for {result.order.orderNumber}.</p></div>
    {error && <PurchaseError message={error} />}
    <PurchaseBadge status={result.order.status} />
    <div className="space-y-3">{result.receipts.map((receipt, index) => <div key={`${receipt.purchaseOrderLineId}-${receipt.lotId}-${index}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <div><p className="font-semibold">{receipt.lotNumber}</p><p className="text-sm text-slate-500">{order.lines.find(line => line.id === receipt.purchaseOrderLineId)?.product.name} · {receipt.inventoryItemIds.length} inventory items</p></div>
      <div className="flex flex-wrap gap-2"><Link className={purchaseSecondary} href={{ pathname: '/dashboard/inventory/list', query: { lotNumber: receipt.lotNumber } }}>View stock</Link><Link className={purchaseSecondary} href={{ pathname: '/dashboard/inventory/barcode', query: { lotNumber: receipt.lotNumber } }}>Print lot barcodes</Link></div>
    </div>)}</div>
    <div className="flex flex-wrap gap-3"><Link href={`/dashboard/purchases/${order.id}`} className={purchaseButton}>Back to order</Link><Link className={purchaseSecondary} href="/dashboard/finance">Supplier balances & payments</Link></div>
  </section>;

  const expired = attempt ? !canRetryReceiptAttempt(attempt) : false;
  const discard = () => {
    if (!attempt || busy || (!definitelyRejected && !(expired && reviewedHistory))) return;
    try { clearReceiptAttempt(order, attempt); reload(); }
    catch { setError('The saved attempt could not be cleared. Check browser storage before continuing.'); }
  };

  return <div className="space-y-4">
    {(error || recovery.error) && <PurchaseError message={recovery.error ?? error} />}
    {attempt ? <section className={`${purchaseCard} space-y-4`}>
      <h2 className="font-semibold">{busy ? 'Receiving…' : 'Saved delivery awaiting confirmation'}</h2>
      <p className="text-sm text-slate-500">{units} units · Started {new Date(attempt.createdAt).toLocaleString()}. This delivery is saved in this browser tab so it can be recovered after a reload.</p>
      <ul className="space-y-1 text-sm">{attempt.input.items.map(item => <li key={item.purchaseOrderLineId}>{order.lines.find(line => line.id === item.purchaseOrderLineId)?.product.name ?? `Order line #${item.purchaseOrderLineId}`} · {item.quantity} units{item.lotNumber ? ` · ${item.lotNumber}` : ''}</li>)}</ul>
      {expired && <p role="alert" className="text-sm text-amber-700 dark:text-amber-400">The seven-day retry period has ended. Check receipt history before discarding this attempt; stock may already have been received.</p>}
      <div className="flex flex-wrap gap-3"><button type="button" className={purchaseButton} disabled={busy || expired || definitelyRejected} onClick={() => void send(attempt)}>{busy ? 'Receiving…' : 'Retry Saved Receipt'}</button><Link href={`/dashboard/purchases/${order.id}`} className={purchaseSecondary}>Review order & receipt history</Link></div>
      {expired && <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={reviewedHistory} onChange={event => setReviewedHistory(event.target.checked)} />I checked receipt history and will not submit a duplicate delivery.</label>}
      {(definitelyRejected || expired) && <button type="button" className={purchaseSecondary} disabled={busy || (!definitelyRejected && !reviewedHistory)} onClick={discard}>{definitelyRejected ? 'Reload & correct receipt' : 'Discard saved attempt & reload'}</button>}
    </section> : recovery.error ? <Link href={`/dashboard/purchases/${order.id}`} className={purchaseSecondary}>Review order & receipt history</Link> : canReceive(order) ? <ReceiveForm order={order} onReceive={prepare} /> : <div className={`${purchaseCard} space-y-4`}><PurchaseBadge status={order.status} /><p>This order is not open for receiving.</p><Link href={`/dashboard/purchases/${order.id}`} className={purchaseSecondary}>Back to order</Link></div>}
  </div>;
}

function ReceiveForm({ order, onReceive }: { order: PurchaseOrder; onReceive: (input: PurchaseReceiptInput) => void }) {
  const outstanding = order.lines.filter(line => remainingQuantity(line) > 0);
  const [rows, setRows] = useState(() => outstanding.map(line => ({ purchaseOrderLineId: line.id, quantity: '', lotNumber: '', notes: '' })));
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState('');
  const input = { items: rows.filter(row => row.quantity !== '' && Number(row.quantity) !== 0).map(row => ({ purchaseOrderLineId: row.purchaseOrderLineId, quantity: Number(row.quantity), lotNumber: row.lotNumber.trim() || undefined, notes: row.notes.trim() || undefined })) };
  const units = input.items.reduce((sum, item) => sum + item.quantity, 0);
  const update = (id: number, patch: Partial<typeof rows[number]>) => setRows(previous => previous.map(row => row.purchaseOrderLineId === id ? { ...row, ...patch } : row));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const validation = validateReceipt(order, input);
    if (validation) { setError(validation); return; }
    if (!reviewing) { setError(''); setReviewing(true); return; }
    onReceive(input);
  };

  return <form onSubmit={submit} className="space-y-5">
    <div className={`${purchaseCard} flex flex-wrap items-center justify-between gap-3`}><div><p className="font-semibold">{order.orderNumber}</p><p className="text-sm text-slate-500">{order.supplier.name}</p></div><PurchaseBadge status={order.status} /></div>
    {error && <PurchaseError message={error} />}
    {reviewing && <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200"><h2 className="font-semibold">Review this delivery</h2><p className="mt-1">Receive {units} units across {input.items.length} lines. Confirm only after checking the physical delivery.</p></div>}
    <fieldset disabled={reviewing} className="space-y-4">
      <div className="flex items-center justify-between gap-3"><h2 className="font-semibold">Outstanding items</h2><button type="button" className={purchaseSecondary} onClick={() => setRows(previous => previous.map(row => ({ ...row, quantity: String(remainingQuantity(order.lines.find(line => line.id === row.purchaseOrderLineId)!)) })))}>Fill outstanding quantities</button></div>
      {outstanding.map(line => {
        const row = rows.find(row => row.purchaseOrderLineId === line.id)!;
        return <div key={line.id} className={`${purchaseCard} space-y-3`}><div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">{line.product.name}</h3><span className="text-sm text-slate-500">{line.receivedQuantity} received · {remainingQuantity(line)} outstanding · unit cost {formatAmount(line.unitCost)}</span></div>
          <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-sm">Receive now<input aria-label={`Receive ${line.product.name}`} type="number" min="0" max={remainingQuantity(line)} step="1" placeholder="0" className={purchaseInput} value={row.quantity} onChange={event => update(line.id, { quantity: event.target.value })} /></label>
            <label className="space-y-1 text-sm">Lot number (optional)<input maxLength={100} className={purchaseInput} placeholder="Generated automatically if blank" value={row.lotNumber} onChange={event => update(line.id, { lotNumber: event.target.value })} /></label></div>
          <label className="block space-y-1 text-sm">Receipt notes<input maxLength={1000} className={purchaseInput} value={row.notes} onChange={event => update(line.id, { notes: event.target.value })} /></label>
        </div>;
      })}
    </fieldset>
    <div className="flex flex-wrap justify-end gap-3"><Link className={purchaseSecondary} href={`/dashboard/purchases/${order.id}`}>Back to order</Link>{reviewing && <button type="button" className={purchaseSecondary} onClick={() => setReviewing(false)}>Change quantities</button>}<button className={purchaseButton} disabled={!outstanding.length}>{reviewing ? 'Confirm Receipt' : 'Review Receipt'}</button></div>
  </form>;
}
