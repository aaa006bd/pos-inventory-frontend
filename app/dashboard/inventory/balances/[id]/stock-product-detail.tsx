'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { realApi } from '@/lib/api';
import { getStockBalances } from '@/lib/stock-balances';
import { formatQuantity } from '@/lib/product-quantity';
import { getInventoryMovements, movementTypes, type MovementFilters } from '@/lib/inventory-movements';
import { useSalesResource } from '../../../sales/orders/_components/use-sales-resource';
import { SalesError } from '../../../sales/orders/_components/sales-ui';
import { InventoryBadge, InventoryCountBadge, InventoryRefreshButton, inventoryButton as button, inventoryCard as card, inventoryPage, inventoryStatCard } from '@/app/components/InventoryTheme';
import { StatusBadge } from '@/app/components/InventoryListTab';

export default function StockProductDetail({ productId }: { productId: number }) {
  const [page, setPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const loadProduct = useCallback(() => realApi.getProduct(productId), [productId]);
  const loadBalance = useCallback(() => getStockBalances(1, productId), [productId]);
  const loadUnits = useCallback(() => realApi.getInventory({ productId, page, limit: 20 }), [productId, page]);
  const loadHistory = useCallback(() => getInventoryMovements({ productId: String(productId), type: '', toStatus: '', from: '', to: '' } satisfies MovementFilters, historyPage), [productId, historyPage]);
  const product = useSalesResource(loadProduct);
  const balance = useSalesResource(loadBalance);
  const units = useSalesResource(loadUnits);
  const history = useSalesResource(loadHistory);
  const trackingMode = product.data?.trackingMode ?? 'SERIALIZED';
  const balanceRow = balance.data?.items.find(row => row.productId === productId);
  const unitPages = units.data ? Math.max(1, Math.ceil(units.data.total / units.data.limit)) : 1;
  const historyPages = history.data ? Math.max(1, Math.ceil(history.data.total / history.data.limit)) : 1;

  return <div className={inventoryPage}>
    <div className="mx-auto max-w-6xl space-y-5">
      <nav aria-label="Breadcrumb" className="text-sm text-slate-500"><Link className="text-sky-700 hover:underline dark:text-sky-400" href="/dashboard/inventory/balances">Stock Overview</Link> / Product details</nav>
      {product.loading ? <p role="status">Loading product…</p> : product.error ? <SalesError message={product.error} retry={product.reload} /> : product.data && <>
        <header className="flex flex-wrap items-center justify-between gap-4"><div className="flex flex-wrap items-center gap-3"><InventoryBadge>Product stock</InventoryBadge><InventoryCountBadge>{trackingMode === 'QUANTITY' ? 'Quantity stock' : 'Serialized units'}</InventoryCountBadge></div><InventoryRefreshButton onClick={() => { product.reload(); balance.reload(); units.reload(); history.reload(); }} /></header>
        <div><h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{product.data.name}</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{product.data.sku} · {trackingMode === 'QUANTITY' ? 'Quantity-tracked stock' : 'Serialized units'}</p></div>
        <section className="grid gap-3 sm:grid-cols-3" aria-label="Product stock summary">
          <div className={inventoryStatCard}><div className="mb-2 h-0.5 w-8 bg-linear-to-r from-emerald-500 to-sky-500" /><p className="text-2xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">{balance.loading ? '…' : balanceRow ? formatQuantity(balanceRow.quantity, balanceRow.baseUnit) : '—'}</p><p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">Available</p></div>
          <div className={inventoryStatCard}><div className="mb-2 h-0.5 w-8 bg-linear-to-r from-sky-500 to-blue-600" /><p className="text-2xl font-semibold text-sky-700 dark:text-sky-300">{trackingMode === 'QUANTITY' ? 'Quantity' : 'Serialized'}</p><p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">Tracking</p></div>
          <div className={inventoryStatCard}><div className="mb-2 h-0.5 w-8 bg-linear-to-r from-amber-400 to-orange-400" /><p className="text-2xl font-semibold tabular-nums text-amber-700 dark:text-amber-300">{balance.loading ? '…' : balanceRow ? balanceRow.stockValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}</p><p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">Stock value</p></div>
        </section>
        {balance.error && <SalesError message={balance.error} retry={balance.reload} />}
        {trackingMode === 'QUANTITY' ? <section className={`${card} p-6`}><h2 className="text-lg font-semibold">Quantity stock</h2><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{product.data.baseUnit === 'piece' ? 'These are whole pieces tracked as a combined quantity, not separate barcoded units.' : `This stock is tracked in ${product.data.baseUnit}, not as individual barcoded units.`} Receipts, sales, returns and adjustments appear in the movement history below.</p></section> : <section className={`${card} overflow-hidden`}>
          <div className="px-7 pt-6 pb-4 border-b border-slate-100 dark:border-slate-700/50"><div className="mb-1.5 h-1 w-10 rounded-full bg-linear-to-r from-sky-500 to-orange-400" /><div className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">Items &mdash; {units.data?.items.length ?? 0}</div><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Individual barcodes, lots and unit status for this product.</p></div>
          {units.loading ? <p role="status" className="p-6">Loading units…</p> : units.error ? <div className="p-6"><SalesError message={units.error} retry={units.reload} /></div> : units.data && <>
            <div className="overflow-x-auto"><table className="w-full border-collapse"><thead><tr className="bg-slate-50/80 dark:bg-slate-800/80">{['Barcode', 'Product', 'Lot', 'Supplier', 'Status', 'Acquired', 'Sold / Adjusted'].map(label => <th key={label} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700/50">{label}</th>)}</tr></thead><tbody>{units.data.items.map(item => <tr key={item.id} className="border-b border-slate-100 transition-colors last:border-0 hover:bg-sky-50/40 dark:border-slate-700/50 dark:hover:bg-sky-900/10">
              <td className="px-6 py-4 font-mono text-xs text-slate-500 dark:text-slate-400">{item.barcode}</td>
              <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-slate-100">{item.product?.name ?? product.data?.name ?? `Product #${productId}`}</td>
              <td className="px-6 py-4 font-mono text-xs text-slate-600 dark:text-slate-300">{item.lotNumber ? <Link className="text-sky-700 hover:underline dark:text-sky-400" href={`/dashboard/inventory/list?lotNumber=${encodeURIComponent(item.lotNumber)}`}>{item.lotNumber}</Link> : '—'}</td>
              <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{item.supplier?.name ?? <span className="text-slate-300 dark:text-slate-600">—</span>}</td>
              <td className="px-6 py-4"><StatusBadge status={item.status} /></td>
              <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{new Date(item.acquiredDate).toLocaleDateString()}</td>
              <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{item.soldDate ? new Date(item.soldDate).toLocaleDateString() : item.adjustedDate ? new Date(item.adjustedDate).toLocaleDateString() : <span className="text-slate-300 dark:text-slate-600">—</span>}</td>
            </tr>)}</tbody></table></div>
            {!units.data.items.length && <p className="p-6 text-sm text-slate-500">No serialized units found for this product.</p>}
            <div className="flex items-center justify-between gap-3 border-t border-slate-100 p-4 text-sm dark:border-slate-700"><span>{units.data.total} units · Page {page} of {unitPages}</span><div className="flex gap-2"><button className={button} disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Previous</button><button className={button} disabled={page >= unitPages} onClick={() => setPage(value => value + 1)}>Next</button></div></div>
          </>}
        </section>}
        <section className={`${card} overflow-hidden`}><div className="border-b border-slate-100 px-6 py-5 dark:border-slate-700"><div className="mb-2 h-1 w-10 rounded-full bg-linear-to-r from-sky-500 to-orange-400" /><h2 className="text-lg font-semibold">Stock movements</h2><p className="text-sm text-slate-500">Read-only history of changes to this product’s stock.</p></div>
          {history.loading ? <p role="status" className="p-6">Loading movements…</p> : history.error ? <div className="p-6"><SalesError message={history.error} retry={history.reload} /></div> : history.data && <><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-800/80"><tr>{['Date', 'Movement', 'Change', 'Reference'].map(label => <th className="px-6 py-3" key={label}>{label}</th>)}</tr></thead><tbody>{history.data.items.map(row => <tr key={row.id} className="border-t border-slate-100 dark:border-slate-700"><td className="whitespace-nowrap px-6 py-4">{new Date(row.occurredAt).toLocaleString()}</td><td className="px-6 py-4">{movementTypes[row.type] ?? row.type}</td><td className="whitespace-nowrap px-6 py-4 tabular-nums">{row.quantityDelta > 0 ? '+' : ''}{formatQuantity(row.quantityDelta, row.baseUnit)}</td><td className="px-6 py-4">{row.sourceDocumentNumber ?? row.barcode ?? '—'}</td></tr>)}</tbody></table></div>{!history.data.items.length && <p className="p-6 text-sm text-slate-500">No movements recorded for this product.</p>}<div className="flex items-center justify-between gap-3 border-t border-slate-100 p-4 text-sm dark:border-slate-700"><span>{history.data.total} movements · Page {historyPage} of {historyPages}</span><div className="flex gap-2"><button className={button} disabled={historyPage <= 1} onClick={() => setHistoryPage(value => value - 1)}>Previous</button><button className={button} disabled={historyPage >= historyPages} onClick={() => setHistoryPage(value => value + 1)}>Next</button></div></div></>}
        </section>
      </>}
    </div>
  </div>;
}
