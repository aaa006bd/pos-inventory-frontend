'use client';

import Link from 'next/link';
import { useCallback, useRef, useState, type FormEvent } from 'react';
import { canReceive, remainingQuantity, purchasesApi, validateReceipt, purchaseError, uncertainMutation, formatAmount, type PurchaseOrder, type PurchaseReceiptResult } from '@/lib/purchases';
import { usePurchaseResource } from './use-purchase-resource';
import { PurchaseShell, PurchaseBadge, PurchaseError, PurchaseLoading, purchaseButton, purchaseSecondary, purchaseInput, purchaseCard } from './purchase-ui';

export default function PurchaseReceive({ id }: { id: number }) {
  const load = useCallback(() => purchasesApi.get(id), [id]);
  const resource = usePurchaseResource(load);
  return <PurchaseShell title="Receive Purchase Order" description="Record only the quantities arriving in this delivery." order={resource.data ? { id, label: resource.data.orderNumber } : undefined}>
    {resource.loading ? <PurchaseLoading /> : resource.error ? <PurchaseError message={resource.error} retry={resource.reload} /> : resource.data && (
      canReceive(resource.data) ? <ReceiveForm order={resource.data} reload={resource.reload} /> : <div className={`${purchaseCard} space-y-4`}><PurchaseBadge status={resource.data.status} /><p>This order is not open for receiving.</p><Link href={`/dashboard/purchases/${id}`} className={purchaseSecondary}>Back to order</Link></div>
    )}
  </PurchaseShell>;
}

function ReceiveForm({ order, reload }: { order: PurchaseOrder; reload: () => void }) {
  const outstanding = order.lines.filter(line => remainingQuantity(line) > 0);
  const [rows, setRows] = useState(() => outstanding.map(line => ({ purchaseOrderLineId: line.id, quantity: '', lotNumber: '', notes: '' })));
  const [reviewing, setReviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [result, setResult] = useState<PurchaseReceiptResult>();
  const lock = useRef(false);
  const input = { items: rows.filter(row => row.quantity !== '' && Number(row.quantity) !== 0).map(row => ({ purchaseOrderLineId: row.purchaseOrderLineId, quantity: Number(row.quantity), lotNumber: row.lotNumber.trim() || undefined, notes: row.notes.trim() || undefined })) };
  const units = input.items.reduce((sum, item) => sum + item.quantity, 0);
  const update = (id: number, patch: Partial<typeof rows[number]>) => setRows(previous => previous.map(row => row.purchaseOrderLineId === id ? { ...row, ...patch } : row));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (lock.current || blocked || result) return;
    const validation = validateReceipt(order, input);
    if (validation) { setError(validation); return; }
    if (!reviewing) { setError(''); setReviewing(true); return; }
    lock.current = true; setBusy(true); setError('');
    try {
      const received = await purchasesApi.receive(order.id, input);
      if (!received?.order || !Array.isArray(received.receipts)) throw new Error('The receipt response could not be read.');
      setResult(received);
    } catch (cause) {
      setBlocked(true);
      setError(uncertainMutation(cause)
        ? 'The receipt result could not be confirmed. Stock may already have been received. Review the order and inventory before starting another receipt.'
        : `${purchaseError(cause)} Reload the latest quantities before trying again.`);
    } finally { lock.current = false; setBusy(false); }
  };

  if (result) return <section className={`${purchaseCard} space-y-5`}>
    <div role="status"><h2 className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">Stock received</h2><p className="mt-1 text-sm">{units} units recorded for {result.order.orderNumber}.</p></div>
    <PurchaseBadge status={result.order.status} />
    <div className="space-y-3">{result.receipts.map((receipt, index) => <div key={`${receipt.purchaseOrderLineId}-${receipt.lotId}-${index}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <div><p className="font-semibold">{receipt.lotNumber}</p><p className="text-sm text-slate-500">{order.lines.find(line => line.id === receipt.purchaseOrderLineId)?.product.name} · {receipt.inventoryItemIds.length} inventory items</p></div>
      <div className="flex flex-wrap gap-2"><Link className={purchaseSecondary} href={{ pathname: '/dashboard/inventory/list', query: { lotNumber: receipt.lotNumber } }}>View stock</Link><Link className={purchaseSecondary} href={{ pathname: '/dashboard/inventory/barcode', query: { lotNumber: receipt.lotNumber } }}>Print lot barcodes</Link></div>
    </div>)}</div>
    <div className="flex flex-wrap gap-3"><Link href={`/dashboard/purchases/${order.id}`} className={purchaseButton}>Back to order</Link><Link className={purchaseSecondary} href="/dashboard/finance">Supplier balances & payments</Link></div>
  </section>;

  return <form onSubmit={submit} className="space-y-5">
    <div className={`${purchaseCard} flex flex-wrap items-center justify-between gap-3`}><div><p className="font-semibold">{order.orderNumber}</p><p className="text-sm text-slate-500">{order.supplier.name}</p></div><PurchaseBadge status={order.status} /></div>
    {error && <PurchaseError message={error} />}
    {blocked && <div className="flex flex-wrap gap-3"><Link href={`/dashboard/purchases/${order.id}`} className={purchaseButton}>Review order</Link><button type="button" className={purchaseSecondary} onClick={reload}>Reload quantities</button></div>}
    {reviewing && !blocked && <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200"><h2 className="font-semibold">Review this delivery</h2><p className="mt-1">Receive {units} units across {input.items.length} lines. Confirm only after checking the physical delivery.</p></div>}
    <fieldset disabled={busy || reviewing || blocked} className="space-y-4">
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
    <div className="flex flex-wrap justify-end gap-3"><Link className={purchaseSecondary} href={`/dashboard/purchases/${order.id}`}>Back to order</Link>{reviewing && !blocked && <button type="button" className={purchaseSecondary} disabled={busy} onClick={() => setReviewing(false)}>Change quantities</button>}<button className={purchaseButton} disabled={busy || blocked || !outstanding.length}>{busy ? 'Receiving…' : reviewing ? 'Confirm Receipt' : 'Review Receipt'}</button></div>
  </form>;
}
