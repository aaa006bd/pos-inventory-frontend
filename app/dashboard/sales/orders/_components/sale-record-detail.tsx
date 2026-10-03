'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import { paymentShortcut } from '@/lib/customer-payments';
import { salesOrdersApi, formatSalesAmount, formatSalesDate, formatPaymentStatus } from '@/lib/sales-orders';
import { useSalesResource } from './use-sales-resource';
import SalesPrintButton from './sales-print-button';
import { SalesShell, SalesError, SalesLoading, salesCard, salesSecondary } from './sales-ui';

export default function SaleRecordDetail({ id }: { id: number }) {
  const load = useCallback(() => salesOrdersApi.sale(id), [id]);
  const resource = useSalesResource(load);
  const sale = resource.data;
  return <SalesShell section="records" title={sale?.saleNumber ?? 'Sale'} description={sale ? `Recorded ${formatSalesDate(sale.soldAt)}` : undefined}>
    {resource.loading ? <SalesLoading /> : resource.error || !sale ? <SalesError message={resource.error ?? 'Sale unavailable.'} retry={resource.reload} /> : <div className="space-y-5">
      <section className={`${salesCard} grid gap-4 sm:grid-cols-4`}><div><p className="text-xs text-slate-500">Status</p><p className="font-semibold">{sale.status}</p></div><div><p className="text-xs text-slate-500">Payment</p><p className="font-semibold">{formatPaymentStatus(sale.paymentStatus)}</p></div><div><p className="text-xs text-slate-500">Net total</p><p className="font-semibold">{formatSalesAmount(sale.netAmount)}</p></div><div><p className="text-xs text-slate-500">Outstanding</p><p className="font-semibold">{formatSalesAmount(sale.outstandingAmount)}</p></div></section>
      <section className={`${salesCard} space-y-3`}><h2 className="font-semibold">Documents</h2><div className="flex flex-wrap gap-2">{sale.salesOrderId && <SalesPrintButton saleId={id} kind="challan" />}<SalesPrintButton saleId={id} kind="invoice" /></div></section>
      {sale.status === 'COMPLETED' && sale.lines.some(line => Number(line.returnedQuantity) < Number(line.quantity)) && <section className={`${salesCard} space-y-2`}><h2 className="font-semibold">Customer return</h2><p className="text-sm text-slate-500">Return an original serialized unit or part of a quantity line.</p><Link className={salesSecondary} href={`/dashboard/sales/records/${id}/return`}>Create customer return</Link></section>}
      <section className={salesCard}><h2 className="mb-3 font-semibold">Sold lines</h2>{sale.lines?.length ? <div className="space-y-2">{sale.lines.map(line => <div key={line.id} className="flex justify-between gap-3 border-b border-slate-100 py-2 text-sm dark:border-slate-700"><span>{line.product?.name} · {line.barcode ?? `${line.quantity} ${line.baseUnit}`}{line.returnedQuantity ? ` · ${line.returnedQuantity} returned` : ''}</span><span>{formatSalesAmount(line.netAmount)}</span></div>)}</div> : <p className="text-sm text-slate-500">No lines listed.</p>}</section>
      <section className={`${salesCard} space-y-3`}><h2 className="font-semibold">Payments</h2>{sale.salesOrderId ? <><p className="text-sm text-slate-500">Record payments and view linked receipts on the order, across all its deliveries.</p><Link className={salesSecondary} href={`/dashboard/sales/orders/${sale.salesOrderId}`}>View order payments</Link></> : sale.customerId ? <><p className="text-sm text-slate-500">Customer Payments contains received money, allocation history, and receipts for this POS sale.</p><Link className={salesSecondary} href={paymentShortcut(sale.customerId, undefined, sale.id)}>View customer payments</Link></> : <p className="text-sm">This sale has no linked customer.</p>}</section>
      {sale.salesOrderId && <Link href={`/dashboard/sales/orders/${sale.salesOrderId}`} className={salesSecondary}>Back to order</Link>}
    </div>}
  </SalesShell>;
}
