'use client';

import Link from 'next/link';
import { useCallback, useState, type FormEvent } from 'react';
import { purchasesApi, getPurchaseSuppliers, purchaseStatuses, purchaseStatusLabels, purchaseProgress, formatAmount, formatPurchaseDate, type PurchaseListQuery, type PurchaseStatus } from '@/lib/purchases';
import { usePurchaseResource } from './_components/use-purchase-resource';
import { PurchaseShell, PurchaseLoading, PurchaseError, PurchaseBadge, purchaseButton, purchaseSecondary, purchaseInput, purchaseCard } from './_components/purchase-ui';

export default function PurchaseOrdersPage() {
  const [query, setQuery] = useState<PurchaseListQuery>({ page: 1, limit: 20 });
  const [search, setSearch] = useState('');
  const load = useCallback(() => purchasesApi.list(query), [query]);
  const orders = usePurchaseResource(load);
  const suppliers = usePurchaseResource(getPurchaseSuppliers);
  const applySearch = (event: FormEvent) => {
    event.preventDefault();
    setQuery(previous => ({ ...previous, page: 1, orderNumber: search.trim() || undefined }));
  };
  return <PurchaseShell title="Purchase Orders" description="Plan supplier orders and track deliveries into stock." actions={<Link href="/dashboard/purchases/new" className={purchaseButton}>+ New Order</Link>}>
    <form onSubmit={applySearch} className={`${purchaseCard} grid gap-3 sm:grid-cols-2 lg:grid-cols-4`}>
      <label className="space-y-1 text-sm">Order number<input className={purchaseInput} value={search} onChange={event => setSearch(event.target.value)} placeholder="Search order number…" /></label>
      <label className="space-y-1 text-sm">Status<select className={purchaseInput} value={query.status ?? ''} onChange={event => setQuery(previous => ({ ...previous, page: 1, status: (event.target.value || undefined) as PurchaseStatus | undefined }))}>
        <option value="">All statuses</option>{purchaseStatuses.map(status => <option key={status} value={status}>{purchaseStatusLabels[status]}</option>)}
      </select></label>
      <label className="space-y-1 text-sm">Supplier<select className={purchaseInput} disabled={!suppliers.data} value={query.supplierId ?? ''} onChange={event => setQuery(previous => ({ ...previous, page: 1, supplierId: Number(event.target.value) || undefined }))}>
        <option value="">All suppliers</option>{suppliers.data?.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
      </select></label>
      <div className="flex items-end gap-2"><button className={purchaseButton}>Search</button><button type="button" className={purchaseSecondary} onClick={() => { setSearch(''); setQuery({ page: 1, limit: 20 }); }}>Reset</button></div>
    </form>
    {suppliers.error && <PurchaseError message={`Supplier filters: ${suppliers.error}`} retry={suppliers.reload} />}
    {orders.loading ? <PurchaseLoading /> : orders.error ? <PurchaseError message={orders.error} retry={orders.reload} /> : orders.data && <>
      <div className={`${purchaseCard} overflow-x-auto`}>
        {!orders.data.items.length ? <div className="py-12 text-center"><h2 className="font-semibold">No purchase orders found</h2><p className="mt-2 text-sm text-slate-500">Create an order or change your filters.</p></div> : <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700"><tr>{['Order', 'Supplier', 'Date', 'Status', 'Received', 'Total'].map(label => <th key={label} className="px-3 py-3">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{orders.data.items.map(order => {
            const progress = purchaseProgress(order);
            return <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-800"><td className="px-3 py-4"><Link href={`/dashboard/purchases/${order.id}`} className="font-semibold text-sky-700 underline-offset-4 hover:underline dark:text-sky-400">{order.orderNumber}</Link></td><td className="px-3 py-4">{order.supplier.name}</td><td className="whitespace-nowrap px-3 py-4">{formatPurchaseDate(order.orderDate)}</td><td className="px-3 py-4"><PurchaseBadge status={order.status} /></td><td className="whitespace-nowrap px-3 py-4">{progress.received} / {progress.ordered}</td><td className="px-3 py-4 tabular-nums">{formatAmount(order.totalAmount)}</td></tr>;
          })}</tbody>
        </table>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500"><span>{orders.data.total} orders · Page {orders.data.page} of {Math.max(1, orders.data.pageCount)}</span><div className="flex gap-2">
        <button type="button" className={purchaseSecondary} disabled={query.page <= 1} onClick={() => setQuery(previous => ({ ...previous, page: previous.page - 1 }))}>Previous</button>
        <button type="button" className={purchaseSecondary} disabled={!orders.data.hasNext} onClick={() => setQuery(previous => ({ ...previous, page: previous.page + 1 }))}>Next</button>
      </div></div>
    </>}
  </PurchaseShell>;
}
