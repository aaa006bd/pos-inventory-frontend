'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { formatSalesAmount, formatSalesDate, type SalesOrder } from '@/lib/sales-orders';
import { loadSalesOrderBatches, summarizeSalesOrder } from '@/lib/sales-order-summary';
import OrderPayment from './order-payment';
import { useSalesResource } from './use-sales-resource';
import SalesPrintButton from './sales-print-button';
import { SalesError, salesCard, salesSecondary } from './sales-ui';

export default function OrderSalesHistory({ order }: { order: SalesOrder }) {
  const [page, setPage] = useState(1);
  const load = useCallback(async () => {
    const sales = await loadSalesOrderBatches(order.id);
    return { sales, totals: summarizeSalesOrder(order, sales) };
  }, [order]);
  const resource = useSalesResource(load);
  const data = resource.data;
  const values: [string, number | string | null | undefined][] = [
    ['Order total', order.netAmount],
    ['Fulfilled value', data?.totals.fulfilledValue],
    ['Not yet fulfilled', data?.totals.unfulfilledValue],
    ['Payments applied', data?.totals.paidAmount],
    ['Current outstanding', data?.totals.outstandingAmount],
  ];
  return <section className={`${salesCard} space-y-4`} aria-label="Order financial summary">
    <h2 className="font-semibold">Order balance</h2>
    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{values.map(([label, value]) => <div key={label} className={label === 'Current outstanding' ? 'rounded-xl bg-sky-50 p-3 dark:bg-sky-950' : 'p-3'}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{value == null ? '—' : formatSalesAmount(value)}</dd></div>)}</dl>
    {resource.loading && <p role="status" className="text-sm text-slate-500">Loading the combined balance across all deliveries…</p>}
    {resource.error && <SalesError message={resource.error} retry={resource.reload} />}
    {order.paymentMethod === 'CREDIT' && <OrderPayment key={order.id} order={order} sales={data?.sales} outstanding={data?.totals.outstandingAmount} onRecorded={resource.reload} />}
    {data && <>
      <p className="text-sm text-slate-500">Current outstanding covers fulfilled sales only. The unfulfilled value is not included. Payments applied excludes customer credit that has not been applied to this order.</p>
      {data.totals.adjusted && <p className="text-sm text-slate-500">This order includes voided or refunded sales. The balance covers active sales; unfulfilled value is unavailable for adjusted deliveries.</p>}
      <details className="border-t border-slate-100 pt-4 dark:border-slate-700"><summary className="cursor-pointer text-sm font-semibold">Deliveries · {data.sales.length} {data.sales.length === 1 ? 'batch' : 'batches'}</summary>
        <p className="my-3 text-sm text-slate-500">Each batch below contains the units delivered in that batch, not the whole order.</p>
        {!data.sales.length ? <p className="text-sm text-slate-500">No deliveries recorded yet.</p> : <div className="space-y-3">{data.sales.slice((page - 1) * 20, page * 20).map(sale => <article key={sale.id} className="space-y-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
          <div className="flex flex-wrap justify-between gap-3"><div><Link href={`/dashboard/sales/records/${sale.id}`} className="text-sm font-semibold text-sky-700 hover:underline">Delivery batch · {sale.saleNumber}</Link><p className="text-xs text-slate-500">{formatSalesDate(sale.soldAt)} · {sale.lines.length} {sale.lines.length === 1 ? 'unit' : 'units'}{sale.status !== 'COMPLETED' ? ` · ${sale.status.toLowerCase()}` : ''}</p></div><p className="text-sm font-semibold">Batch value: {formatSalesAmount(sale.netAmount)}</p></div>
          <ul className="space-y-1 text-sm">{sale.lines.map(line => <li key={line.id} className="flex flex-wrap justify-between gap-2"><span>1 × {line.product.name} · Barcode {line.barcode}</span><span>{formatSalesAmount(line.netAmount)}</span></li>)}</ul>
          <div className="flex flex-wrap gap-2"><SalesPrintButton saleId={sale.id} kind="challan" /><SalesPrintButton saleId={sale.id} kind="invoice" /></div>
        </article>)}</div>}
        {data.sales.length > 20 && <div className="mt-3 flex items-center justify-between text-sm"><span>Page {page} of {Math.ceil(data.sales.length / 20)}</span><div className="flex gap-2"><button type="button" className={salesSecondary} disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Previous</button><button type="button" className={salesSecondary} disabled={page * 20 >= data.sales.length} onClick={() => setPage(value => value + 1)}>Next</button></div></div>}
      </details>
    </>}
  </section>;
}
