'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import { formatQuantity } from '@/lib/product-quantity';
import { formatAmount, purchasesApi } from '@/lib/purchases';
import { usePurchaseResource } from '../../purchases/_components/use-purchase-resource';
import { PurchaseError, PurchaseLoading, PurchaseShell, purchaseCard, purchaseSecondary } from '../../purchases/_components/purchase-ui';

export default function PurchaseLotPageContent({ lotNumber }: { lotNumber: string }) {
  const load = useCallback(() => purchasesApi.lotDetail(lotNumber), [lotNumber]);
  const lot = usePurchaseResource(load);
  if (!lotNumber) return <PurchaseShell section="receipts" title="Lot details"><PurchaseError message="Choose a lot from Purchase Receipts or a purchase order." /></PurchaseShell>;
  if (lot.loading) return <PurchaseShell section="receipts" title={lotNumber}><PurchaseLoading /></PurchaseShell>;
  if (lot.error || !lot.data) return <PurchaseShell section="receipts" title={lotNumber}><PurchaseError message={lot.error ?? 'Lot unavailable.'} retry={lot.reload} /></PurchaseShell>;

  const detail = lot.data;
  const isQuantity = detail.product.trackingMode === 'QUANTITY';
  const source = detail.sourceDocument;
  const stockHref = isQuantity ? `/dashboard/inventory/balances/${detail.productId}` : `/dashboard/inventory/list?lotNumber=${encodeURIComponent(detail.lotNumber)}`;
  const sourceHref = source?.type === 'PURCHASE_ORDER' && source.purchaseOrderId ? `/dashboard/purchases/${source.purchaseOrderId}?tab=receipts` : null;
  const receivedAt = new Date(detail.receivedAt);

  return <PurchaseShell section="receipts" title={detail.lotNumber} description="Original receipt details for this lot." actions={<Link href="/dashboard/purchases/receipts" className={purchaseSecondary}>All receipts</Link>}>
    <section className={`${purchaseCard} grid gap-5 sm:grid-cols-2 lg:grid-cols-4`} aria-label="Lot summary">
      <div><p className="text-xs uppercase tracking-wide text-slate-500">Product</p><p className="mt-2 font-semibold">{detail.product.name}</p><p className="text-xs text-slate-500">{isQuantity ? 'Quantity' : 'Serialized'} · {detail.product.sku ?? `Product #${detail.productId}`}</p></div>
      <div><p className="text-xs uppercase tracking-wide text-slate-500">Originally received</p><p className="mt-2 font-semibold tabular-nums">{formatQuantity(detail.quantityReceived, detail.product.baseUnit)}</p></div>
      <div><p className="text-xs uppercase tracking-wide text-slate-500">Unit cost</p><p className="mt-2 font-semibold tabular-nums">{detail.unitCost === null ? '—' : `${formatAmount(detail.unitCost)} / ${detail.product.baseUnit}`}</p></div>
      <div><p className="text-xs uppercase tracking-wide text-slate-500">Receipt total</p><p className="mt-2 font-semibold tabular-nums">{formatAmount(detail.totalCost)}</p></div>
    </section>
    <section className={`${purchaseCard} space-y-4`} aria-label="Receipt source">
      <h2 className="font-semibold">Receipt source</h2>
      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <div><dt className="text-slate-500">Source</dt><dd className="mt-1 font-medium">{source?.type === 'PURCHASE_ORDER' ? 'Purchase order' : source?.type === 'MANUAL_STOCK' ? 'Manual stock receipt' : 'Legacy receipt'}{source && <> · {sourceHref ? <Link href={sourceHref} className="text-sky-700 underline-offset-4 hover:underline dark:text-sky-400">{source.number}</Link> : source.number}</>}</dd></div>
        <div><dt className="text-slate-500">Supplier</dt><dd className="mt-1 font-medium">{detail.supplier.name}</dd></div>
        <div><dt className="text-slate-500">Received at</dt><dd className="mt-1 font-medium"><time dateTime={detail.receivedAt}>{Number.isNaN(receivedAt.getTime()) ? detail.receivedAt : new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dhaka', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(receivedAt)}</time></dd></div>
        <div><dt className="text-slate-500">Accounting</dt><dd className="mt-1 font-medium">{detail.journalEntryId ? `Journal #${detail.journalEntryId}` : '—'}</dd></div>
        {!isQuantity && <div><dt className="text-slate-500">Serialized units created</dt><dd className="mt-1 font-medium">{detail.itemCount ?? '—'}</dd></div>}
      </dl>
      {detail.notes && <div><p className="text-sm text-slate-500">Receipt notes</p><p className="mt-1 whitespace-pre-wrap break-words text-sm">{detail.notes}</p></div>}
    </section>
    {isQuantity && <p className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200">Quantity stock is tracked at product level. This page shows the original receipt, not remaining stock in this lot.</p>}
    <div className="flex flex-wrap gap-3"><Link href={stockHref} className={purchaseSecondary}>{isQuantity ? 'View product stock' : 'View serialized units in this lot'}</Link>{sourceHref && <Link href={sourceHref} className={purchaseSecondary}>Open purchase order receipt history</Link>}</div>
  </PurchaseShell>;
}
