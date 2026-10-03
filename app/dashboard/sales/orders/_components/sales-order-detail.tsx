'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import { salesOrdersApi, formatSalesAmount, formatSalesDate, type SalesOrder } from '@/lib/sales-orders';
import { formatQuantity } from '@/lib/product-quantity';
import { useSalesResource } from './use-sales-resource';
import { SalesShell, SalesError, SalesLoading, SalesStatusBadge, salesCard, salesSecondary } from './sales-ui';
import SalesOrderActions from './sales-order-actions';
import OrderSalesHistory from './order-sales-history';

export default function SalesOrderDetail({ id }: { id: number }) {
  const load = useCallback(() => salesOrdersApi.get(id), [id]);
  const resource = useSalesResource(load);
  if (resource.loading) return <SalesShell title="Sales Order"><SalesLoading /></SalesShell>;
  if (resource.error || !resource.data) return <SalesShell title="Sales Order"><SalesError message={resource.error ?? 'Order unavailable.'} retry={resource.reload} /></SalesShell>;
  return <SalesOrderContent order={resource.data} reload={resource.reload} />;
}

function SalesOrderContent({ order, reload }: { order: SalesOrder; reload: () => void }) {
  const fulfilledLines = order.lines.filter(line => Number(line.fulfilledQuantity) >= Number(line.quantity)).length;
  return <SalesShell title={order.orderNumber} description={order.customer.name} order={{ id: order.id, label: order.orderNumber }} actions={<button type="button" className={salesSecondary} onClick={reload}>Refresh order</button>}>
    <div className={`${salesCard} grid gap-5 sm:grid-cols-2 lg:grid-cols-4`}>
      <div><p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Status</p><SalesStatusBadge status={order.status} /></div>
      <div><p className="text-xs uppercase tracking-wide text-slate-500">Ordered</p><p className="mt-2 font-semibold">{formatSalesDate(order.orderDate)}</p></div>
      <div><p className="text-xs uppercase tracking-wide text-slate-500">Expected delivery</p><p className="mt-2 font-semibold">{formatSalesDate(order.expectedDeliveryDate)}</p></div>
      <div><p className="text-xs uppercase tracking-wide text-slate-500">Lines fulfilled</p><p className="mt-2 font-semibold tabular-nums">{fulfilledLines} / {order.lines.length}</p></div>
    </div>
    <OrderSalesHistory order={order} />
    <section className={salesCard}><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Items</h2><p className="text-sm text-slate-500">{fulfilledLines} of {order.lines.length} product lines fulfilled</p></div>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-700"><tr>{['Product', 'Ordered', 'Fulfilled', 'Remaining', 'Unit price', 'Discount', 'Net total'].map(label => <th key={label} className="px-3 py-3">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{order.lines.map(line => <tr key={line.id}><td className="px-3 py-4"><p className="font-medium">{line.product.name}</p>{line.product.sku && <p className="text-xs text-slate-500">{line.product.sku}</p>}{line.notes && <p className="mt-1 max-w-xs whitespace-pre-wrap break-words text-xs text-slate-500">{line.notes}</p>}</td><td className="px-3 py-4">{formatQuantity(line.quantity, line.product.baseUnit)}</td><td className="px-3 py-4">{formatQuantity(line.fulfilledQuantity, line.product.baseUnit)}</td><td className="px-3 py-4">{formatQuantity(Math.max(0, Number(line.quantity) - Number(line.fulfilledQuantity)), line.product.baseUnit)}</td><td className="px-3 py-4 tabular-nums">{formatSalesAmount(line.unitPrice)} / {line.product.baseUnit}</td><td className="px-3 py-4 tabular-nums">{formatSalesAmount(line.discountAmount)}</td><td className="px-3 py-4 tabular-nums">{formatSalesAmount(line.netAmount)}</td></tr>)}</tbody>
      </table></div>
    </section>
    <div className={`${salesCard} grid gap-5 sm:grid-cols-2`}><div><h2 className="font-semibold">Customer</h2><p className="mt-2 text-sm">{order.customer.name}</p><p className="text-sm text-slate-500">{order.customer.phone}</p></div><div><h2 className="font-semibold">Payment terms</h2><p className="mt-2 text-sm">{order.paymentMethod === 'CREDIT' ? `Credit · ${order.paymentTermDays} days` : 'Cash'}</p><p className="text-sm text-slate-500">Gross {formatSalesAmount(order.grossAmount)} · Discount {formatSalesAmount(order.discountAmount)}</p></div></div>
    {order.notes && <section className={salesCard}><h2 className="mb-2 font-semibold">Order notes</h2><p className="whitespace-pre-wrap break-words text-sm">{order.notes}</p></section>}
    {order.cancellationReason && <section className={salesCard}><h2 className="mb-2 font-semibold">Cancellation reason</h2><p className="whitespace-pre-wrap break-words text-sm">{order.cancellationReason}</p></section>}
    <SalesOrderActions order={order} reload={reload} />
    <Link href="/dashboard/sales/records" className={salesSecondary}>View sales and documents</Link>
    <Link href="/dashboard/sales/orders" className={salesSecondary}>Back to sales orders</Link>
  </SalesShell>;
}
