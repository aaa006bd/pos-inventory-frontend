'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { purchasesApi, formatAmount, type PurchaseOrder } from '@/lib/purchases';
import { formatQuantity } from '@/lib/product-quantity';
import { usePurchaseResource } from './use-purchase-resource';
import { PurchaseError, PurchaseLoading, purchaseCard, purchaseSecondary } from './purchase-ui';
import PurchaseReceiptPrintButton from './purchase-receipt-print-button';

export default function PurchaseHistory({ order }: { order: PurchaseOrder }) {
  const orderId = order.id;
  const [page, setPage] = useState(1);
  const load = useCallback(() => purchasesApi.receipts(orderId, page), [orderId, page]);
  const resource = usePurchaseResource(load);
  if (resource.loading) return <PurchaseLoading />;
  if (resource.error) return <PurchaseError message={resource.error} retry={resource.reload} />;
  if (!resource.data) return null;
  const history = resource.data;
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Receipt History</h2><button className={purchaseSecondary} onClick={resource.reload}>Refresh history</button></div>
    {!history.items.length && <div className={`${purchaseCard} text-sm text-slate-500`}>No receipts recorded yet.</div>}
    {history.items.map(receipt => <article key={receipt.id} className={`${purchaseCard} space-y-4`}>
      <header className="flex flex-wrap justify-between gap-3"><div><h3 className="font-semibold">Receipt #{receipt.id}</h3><p className="mt-1 text-sm text-slate-500"><time dateTime={receipt.receiptDate}>{new Date(receipt.receiptDate).toLocaleString()}</time> · {receipt.receivedBy.email}</p></div><div className="flex flex-col items-start gap-2 sm:items-end"><p className="text-sm font-semibold tabular-nums">Total: {formatAmount(receipt.totalAmount)}</p><PurchaseReceiptPrintButton orderId={orderId} receiptId={receipt.id} /></div></header>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-700"><tr>{['Product / lot', 'Received', 'Unit cost', 'Line total', 'Accounting', 'Actions'].map(label => <th key={label} className="px-3 py-3">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{receipt.lines.map(line => { const product = order.lines.find(orderLine => orderLine.id === line.purchaseOrderLineId)?.product; return <tr key={line.id}>
          <td className="px-3 py-4"><p className="font-medium">{line.productName}</p><p className="text-xs text-slate-500">{line.lotNumber}</p>{line.notes && <p className="mt-1 max-w-xs whitespace-pre-wrap break-words text-xs text-slate-500">{line.notes}</p>}</td>
          <td className="px-3 py-4">{product ? formatQuantity(line.receivedQuantity, product.baseUnit) : line.receivedQuantity}</td><td className="px-3 py-4 tabular-nums">{formatAmount(line.unitCost)}{product ? ` / ${product.baseUnit}` : ''}</td><td className="px-3 py-4 tabular-nums">{formatAmount(line.lineTotal)}</td>
          <td className="px-3 py-4 text-xs">{line.accounting ? <><p>{line.accounting.reference}</p><p className="text-slate-500">{line.accounting.date}</p></> : line.journalEntryId ? `Journal #${line.journalEntryId}` : '—'}</td>
          <td className="px-3 py-4"><div className="flex flex-wrap gap-2"><Link className={purchaseSecondary} href={product?.trackingMode === 'QUANTITY' ? '/dashboard/inventory/balances' : { pathname: '/dashboard/inventory/list', query: { lotNumber: line.lotNumber } }}>View stock</Link>{product?.trackingMode !== 'QUANTITY' && <Link className={purchaseSecondary} href={{ pathname: '/dashboard/inventory/barcode', query: { lotNumber: line.lotNumber } }}>Print barcodes</Link>}</div></td>
        </tr>; })}</tbody></table></div>
    </article>)}
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500"><span>{history.total} receipts · Page {history.page} of {Math.max(1, history.pageCount)}</span><div className="flex gap-2"><button className={purchaseSecondary} disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Previous receipts</button><button className={purchaseSecondary} disabled={!history.hasNext} onClick={() => setPage(value => value + 1)}>Next receipts</button></div></div>
  </div>;
}
