'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { getStockBalances } from '@/lib/stock-balances';
import { formatQuantity } from '@/lib/product-quantity';
import { getPurchaseCatalog } from '@/lib/purchases';
import { useSalesResource } from '../../sales/orders/_components/use-sales-resource';
import { SalesError } from '../../sales/orders/_components/sales-ui';
import { InventoryBadge, InventoryCountBadge, InventoryRefreshButton, inventoryButton, inventoryCard, inventoryPage } from '@/app/components/InventoryTheme';

export default function StockBalancesPage() {
  const [page, setPage] = useState(1);
  const [productId, setProductId] = useState('');
  const load = useCallback(() => getStockBalances(page, productId ? Number(productId) : undefined), [page, productId]);
  const resource = useSalesResource(load);
  const catalog = useSalesResource(getPurchaseCatalog);
  const data = resource.data;
  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return <div className={inventoryPage}>
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3"><InventoryBadge>Stock overview</InventoryBadge>{data && <InventoryCountBadge>{data.total} products</InventoryCountBadge>}</div>
        <InventoryRefreshButton onClick={resource.reload} />
      </header>
      <div><h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Stock Overview</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Available stock for serialized and quantity-tracked products. Each quantity is shown in its own base unit.</p></div>

      <div className={`${inventoryCard} flex flex-wrap items-end gap-4 p-5`}>
        <label className="min-w-56 flex-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Product
          <select className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-sm font-normal normal-case tracking-normal text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-100 dark:focus:border-sky-500 dark:focus:bg-slate-700 dark:focus:ring-sky-900/50" value={productId} onChange={event => { setProductId(event.target.value); setPage(1); }}>
            <option value="">All products</option>{catalog.data?.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}
          </select>
        </label>
        <Link className={inventoryButton} href="/dashboard/inventory/list">Browse serialized units &amp; barcodes</Link>
      </div>

      {catalog.error && <SalesError message="Product choices could not be loaded. Stock balances remain available." retry={catalog.reload} />}
      {resource.loading ? <p role="status" className={`${inventoryCard} p-6 text-sm text-slate-500`}>Loading stock balances…</p> : resource.error ? <SalesError message={resource.error} retry={resource.reload} /> : data && <>
        <p className="text-sm text-slate-600 dark:text-slate-300">Quantities are not summed across different units.</p>
        <section className={`${inventoryCard} overflow-hidden`}>
          <div className="border-b border-slate-100 px-7 pb-4 pt-6 dark:border-slate-700/50"><div className="mb-1.5 h-1 w-10 rounded-full bg-linear-to-r from-sky-500 to-orange-400" /><span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 dark:bg-slate-700 dark:text-slate-300">Products &mdash; {data.items.length}</span></div>
          {data.items.length ? <div className="overflow-x-auto"><table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50/80 dark:bg-slate-800/80"><tr>{['Product', 'Tracking', 'Available', 'Stock value'].map(label => <th className="border-b border-slate-100 px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:border-slate-700/50 dark:text-slate-400" key={label}>{label}</th>)}</tr></thead>
            <tbody>{data.items.map(row => <tr className="border-b border-slate-100 transition-colors last:border-0 hover:bg-sky-50/40 dark:border-slate-700/50 dark:hover:bg-sky-900/10" key={row.productId}>
              <td className="px-6 py-4 font-semibold"><Link className="text-sky-700 hover:underline dark:text-sky-400" href={`/dashboard/inventory/balances/${row.productId}`}>{row.productName}</Link></td>
              <td className="px-6 py-4"><span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:border-sky-700/50 dark:bg-sky-900/30 dark:text-sky-300">{row.trackingMode === 'QUANTITY' ? 'Quantity' : 'Serialized'}</span></td>
              <td className="px-6 py-4 font-medium tabular-nums text-slate-700 dark:text-slate-300">{formatQuantity(row.quantity, row.baseUnit)}</td>
              <td className="px-6 py-4 tabular-nums text-slate-600 dark:text-slate-300">{row.stockValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>)}</tbody>
          </table></div> : <div className="p-12 text-center"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">No stock balances found</p><p className="mt-2 text-sm text-slate-400">Try another product or receive stock to get started.</p></div>}
        </section>
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 text-sm text-slate-500 dark:text-slate-400"><span>Page {page} of {pageCount}</span><div className="flex gap-3"><button className={inventoryButton} disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Previous</button><button className={inventoryButton} disabled={page >= pageCount} onClick={() => setPage(value => value + 1)}>Next</button></div></div>
      </>}
    </div>
  </div>;
}
