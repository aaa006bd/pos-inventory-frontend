'use client';

import Link from 'next/link';
import { useCallback, useState, type FormEvent } from 'react';
import { formatQuantity } from '@/lib/product-quantity';
import { formatAmount, getPurchaseSuppliers, purchaseLotDetailHref, purchaseReceiptSourceHref, purchasesApi, type PurchaseReceiptFeedQuery, type PurchaseReceiptSource } from '@/lib/purchases';
import { usePurchaseResource } from '../_components/use-purchase-resource';
import { PurchaseError, PurchaseLoading, PurchaseShell, purchaseButton, purchaseCard, purchaseInput, purchaseSecondary } from '../_components/purchase-ui';

type ReceiptFilters = Pick<PurchaseReceiptFeedQuery, 'sourceType' | 'supplierId' | 'from' | 'to' | 'search'>;
const initialQuery: PurchaseReceiptFeedQuery = { page: 1, limit: 20 };

export default function PurchaseReceiptsPage() {
  const [draft, setDraft] = useState<ReceiptFilters>({});
  const [query, setQuery] = useState<PurchaseReceiptFeedQuery>(initialQuery);
  const [filterError, setFilterError] = useState('');
  const load = useCallback(() => purchasesApi.receiptFeed(query), [query]);
  const receipts = usePurchaseResource(load);
  const suppliers = usePurchaseResource(getPurchaseSuppliers);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (draft.from && draft.to && draft.from > draft.to) { setFilterError('Start date must be on or before end date.'); return; }
    setFilterError('');
    setQuery({ page: 1, limit: 20, ...draft, search: draft.search?.trim() || undefined });
  };

  return <PurchaseShell section="receipts" title="Purchase Receipts" description="Received purchase-order deliveries and manual stock receipts. Planned but undelivered orders do not appear here." actions={<Link href="/dashboard/purchases" className={purchaseSecondary}>Purchase Orders</Link>}>
    <form onSubmit={submit} className={`${purchaseCard} grid gap-3 sm:grid-cols-2 lg:grid-cols-3`}>
      <label className="space-y-1 text-sm">Search<input className={purchaseInput} maxLength={100} placeholder="Supplier, product, lot or order…" value={draft.search ?? ''} onChange={event => setDraft(previous => ({ ...previous, search: event.target.value }))} /></label>
      <label className="space-y-1 text-sm">Source<select className={purchaseInput} value={draft.sourceType ?? ''} onChange={event => setDraft(previous => ({ ...previous, sourceType: (event.target.value || undefined) as PurchaseReceiptSource | undefined }))}><option value="">All sources</option><option value="PURCHASE_ORDER">Purchase order</option><option value="MANUAL_STOCK">Manual stock receipt</option></select></label>
      <label className="space-y-1 text-sm">Supplier<select className={purchaseInput} disabled={!suppliers.data} value={draft.supplierId ?? ''} onChange={event => setDraft(previous => ({ ...previous, supplierId: Number(event.target.value) || undefined }))}><option value="">All suppliers</option>{suppliers.data?.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
      <label className="space-y-1 text-sm">From (Bangladesh date)<input className={purchaseInput} type="date" value={draft.from ?? ''} onChange={event => setDraft(previous => ({ ...previous, from: event.target.value || undefined }))} /></label>
      <label className="space-y-1 text-sm">To (Bangladesh date)<input className={purchaseInput} type="date" value={draft.to ?? ''} onChange={event => setDraft(previous => ({ ...previous, to: event.target.value || undefined }))} /></label>
      <div className="flex items-end gap-2"><button type="submit" className={purchaseButton}>Apply filters</button><button type="button" className={purchaseSecondary} onClick={() => { setDraft({}); setQuery(initialQuery); setFilterError(''); }}>Reset</button></div>
    </form>
    {filterError && <PurchaseError message={filterError} />}
    {suppliers.error && <PurchaseError message={`Supplier filter: ${suppliers.error}`} retry={suppliers.reload} />}
    {receipts.loading ? <PurchaseLoading /> : receipts.error ? <PurchaseError message={receipts.error} retry={receipts.reload} /> : receipts.data && <>
      <div className={`${purchaseCard} overflow-x-auto`}>
        {!receipts.data.items.length ? <div className="py-12 text-center"><h2 className="font-semibold">No receipts found</h2><p className="mt-2 text-sm text-slate-500">Try another filter or receive stock first.</p></div> : <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700"><tr>{['Received', 'Source', 'Supplier', 'Product', 'Quantity', 'Lot', 'Unit cost', 'Total'].map(label => <th key={label} className="whitespace-nowrap px-3 py-3">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{receipts.data.items.map(row => {
            const lotHref = purchaseLotDetailHref(row.lotNumber);
            const sourceHref = purchaseReceiptSourceHref(row);
            const stockHref = row.trackingMode === 'QUANTITY' ? `/dashboard/inventory/balances/${row.productId}` : `/dashboard/inventory/list?lotNumber=${encodeURIComponent(row.lotNumber)}`;
            return <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
              <td className="whitespace-nowrap px-3 py-4"><time dateTime={row.receiptDate}>{formatReceiptTimestamp(row.receiptDate)}</time></td>
              <td className="px-3 py-4"><span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${row.sourceType === 'PURCHASE_ORDER' ? 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300' : 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300'}`}>{row.sourceType === 'PURCHASE_ORDER' ? 'Purchase order' : 'Manual stock'}</span><div className="mt-1 whitespace-nowrap">{sourceHref ? <Link href={sourceHref} className="font-medium text-sky-700 underline-offset-4 hover:underline dark:text-sky-400">{row.sourceDocumentNumber}</Link> : row.sourceDocumentNumber}</div></td>
              <td className="px-3 py-4">{row.supplierName}</td>
              <td className="px-3 py-4"><Link href={stockHref} className="font-medium text-sky-700 underline-offset-4 hover:underline dark:text-sky-400">{row.productName}</Link><p className="text-xs text-slate-500">{row.trackingMode === 'SERIALIZED' ? 'Serialized' : 'Quantity'}</p></td>
              <td className="whitespace-nowrap px-3 py-4 tabular-nums">{formatQuantity(row.quantityReceived, row.baseUnit)}</td>
              <td className="whitespace-nowrap px-3 py-4">{lotHref ? <Link href={lotHref} className="font-medium text-sky-700 underline-offset-4 hover:underline dark:text-sky-400">{row.lotNumber}</Link> : '—'}</td>
              <td className="whitespace-nowrap px-3 py-4 tabular-nums">{row.unitCost === null ? '—' : `${formatAmount(row.unitCost)} / ${row.baseUnit}`}</td>
              <td className="whitespace-nowrap px-3 py-4 tabular-nums">{formatAmount(row.lineTotal)}</td>
            </tr>;
          })}</tbody>
        </table>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500"><span>{receipts.data.total} received lines · Page {receipts.data.page} of {Math.max(1, receipts.data.pageCount)}</span><div className="flex gap-2"><button type="button" className={purchaseSecondary} disabled={query.page <= 1} onClick={() => setQuery(previous => ({ ...previous, page: previous.page - 1 }))}>Previous</button><button type="button" className={purchaseSecondary} disabled={!receipts.data.hasNext} onClick={() => setQuery(previous => ({ ...previous, page: previous.page + 1 }))}>Next</button></div></div>
    </>}
  </PurchaseShell>;
}

export function formatReceiptTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dhaka', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
}
