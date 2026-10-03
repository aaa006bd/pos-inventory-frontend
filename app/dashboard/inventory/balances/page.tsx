'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { getStockBalances } from '@/lib/stock-balances';
import { formatQuantity } from '@/lib/product-quantity';
import { getPurchaseCatalog } from '@/lib/purchases';
import { useSalesResource } from '../../sales/orders/_components/use-sales-resource';
import { SalesError, salesCard, salesInput, salesSecondary } from '../../sales/orders/_components/sales-ui';

export default function StockBalancesPage() {
  const [page, setPage] = useState(1);
  const [productId, setProductId] = useState('');
  const load = useCallback(() => getStockBalances(page, productId ? Number(productId) : undefined), [page, productId]);
  const resource = useSalesResource(load);
  const catalog = useSalesResource(getPurchaseCatalog);
  const data = resource.data;
  return <div className="mx-auto max-w-6xl space-y-5 pb-8">
    <header><h1 className="text-2xl font-semibold">Stock Balances</h1><p className="text-sm text-slate-500">Sellable stock across serialized and quantity products. Each quantity is in its own base unit.</p></header>
    <div className="flex flex-wrap items-end gap-3"><label className="text-sm">Product<select className={salesInput} value={productId} onChange={event => { setProductId(event.target.value); setPage(1); }}><option value="">All products</option>{catalog.data?.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label><button className={salesSecondary} onClick={resource.reload}>Refresh</button><Link className={salesSecondary} href="/dashboard/inventory/list">Serialized items and barcodes</Link></div>
    {catalog.error && <SalesError message="Product choices could not be loaded. Stock balances remain available." retry={catalog.reload} />}
    {resource.loading ? <p role="status">Loading stock balances…</p> : resource.error ? <SalesError message={resource.error} retry={resource.reload} /> : data && <>
      <p className="text-sm">{data.total} products · quantities are not summed across units.</p>
      <section className={`${salesCard} overflow-x-auto`}><table className="w-full text-left text-sm"><thead><tr>{['Product', 'Tracking', 'Available', 'Stock value'].map(label => <th className="p-3" key={label}>{label}</th>)}</tr></thead><tbody>{data.items.map(row => <tr className="border-t border-slate-200 dark:border-slate-700" key={row.productId}><td className="p-3">{row.productName}</td><td className="p-3">{row.trackingMode === 'QUANTITY' ? 'Quantity' : 'Serialized'}</td><td className="p-3">{formatQuantity(row.quantity, row.baseUnit)}</td><td className="p-3">{row.stockValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>)}</tbody></table>{!data.items.length && <p className="p-4">No stock balances match this filter.</p>}</section>
      <div className="flex items-center justify-between"><span>Page {page} of {Math.max(1, Math.ceil(data.total / data.limit))}</span><div className="flex gap-2"><button className={salesSecondary} disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Previous</button><button className={salesSecondary} disabled={page * data.limit >= data.total} onClick={() => setPage(value => value + 1)}>Next</button></div></div>
    </>}
  </div>;
}
