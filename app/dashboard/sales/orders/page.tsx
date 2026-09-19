'use client';

import Link from 'next/link';
import { useCallback, useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { salesOrdersApi, salesOrderStatuses, salesOrderStatusLabels, salesOrderProgress, formatSalesAmount, formatSalesDate, type SalesOrderListQuery, type SalesOrderStatus } from '@/lib/sales-orders';
import { useSalesResource } from './_components/use-sales-resource';
import { SalesShell, SalesError, SalesLoading, SalesStatusBadge, salesButton, salesSecondary, salesInput, salesCard } from './_components/sales-ui';

type CustomerChoice = { id: number; name: string };
const loadCustomers = () => api.get<CustomerChoice[]>('/customers');

export default function SalesOrdersPage() {
  const [query, setQuery] = useState<SalesOrderListQuery>({ page: 1, limit: 20 });
  const [search, setSearch] = useState('');
  const load = useCallback(() => salesOrdersApi.list(query), [query]);
  const orders = useSalesResource(load);
  const customers = useSalesResource(loadCustomers);
  const applySearch = (event: FormEvent) => {
    event.preventDefault();
    setQuery(previous => ({ ...previous, page: 1, orderNumber: search.trim() || undefined }));
  };
  const invalidDates = Boolean(query.from && query.to && query.from > query.to);

  return <SalesShell title="Sales Orders" description="Track dealer orders from draft through fulfillment and settlement." actions={<Link href="/dashboard/sales/orders/new" className={salesButton}>+ New Order</Link>}>
    <form onSubmit={applySearch} className={`${salesCard} grid gap-3 sm:grid-cols-2 lg:grid-cols-3`}>
      <label className="space-y-1 text-sm">Order number<input className={salesInput} value={search} onChange={event => setSearch(event.target.value)} placeholder="Search order number…" /></label>
      <label className="space-y-1 text-sm">Status<select className={salesInput} value={query.status ?? ''} onChange={event => setQuery(previous => ({ ...previous, page: 1, status: (event.target.value || undefined) as SalesOrderStatus | undefined }))}><option value="">All statuses</option>{salesOrderStatuses.map(status => <option key={status} value={status}>{salesOrderStatusLabels[status]}</option>)}</select></label>
      <label className="space-y-1 text-sm">Customer<select className={salesInput} disabled={!Array.isArray(customers.data)} value={query.customerId ?? ''} onChange={event => setQuery(previous => ({ ...previous, page: 1, customerId: Number(event.target.value) || undefined }))}><option value="">All customers</option>{Array.isArray(customers.data) && customers.data.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
      <label className="space-y-1 text-sm">From<input type="date" className={salesInput} value={query.from ?? ''} onChange={event => setQuery(previous => ({ ...previous, page: 1, from: event.target.value || undefined }))} /></label>
      <label className="space-y-1 text-sm">To<input type="date" className={salesInput} value={query.to ?? ''} onChange={event => setQuery(previous => ({ ...previous, page: 1, to: event.target.value || undefined }))} /></label>
      <div className="flex items-end gap-2"><button className={salesButton} disabled={invalidDates}>Search</button><button type="button" className={salesSecondary} onClick={() => { setSearch(''); setQuery({ page: 1, limit: 20 }); }}>Reset</button></div>
    </form>
    {invalidDates && <SalesError message="The To date must not be earlier than the From date." />}
    {customers.error && <SalesError message={`Customer filter: ${customers.error}`} retry={customers.reload} />}
    {orders.loading ? <SalesLoading /> : orders.error ? <SalesError message={orders.error} retry={orders.reload} /> : orders.data && <>
      <div className={`${salesCard} overflow-x-auto`}>
        {!orders.data.items.length ? <div className="py-12 text-center"><h2 className="font-semibold">No sales orders found</h2><p className="mt-2 text-sm text-slate-500">Try changing your filters.</p></div> : <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700"><tr>{['Order', 'Customer', 'Date', 'Status', 'Fulfilled', 'Payment', 'Net total'].map(label => <th key={label} className="px-3 py-3">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{orders.data.items.map(order => {
            const progress = salesOrderProgress(order);
            return <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-800"><td className="px-3 py-4"><Link href={`/dashboard/sales/orders/${order.id}`} className="font-semibold text-sky-700 underline-offset-4 hover:underline dark:text-sky-400">{order.orderNumber}</Link></td><td className="px-3 py-4">{order.customer.name}</td><td className="whitespace-nowrap px-3 py-4">{formatSalesDate(order.orderDate)}</td><td className="px-3 py-4"><SalesStatusBadge status={order.status} /></td><td className="whitespace-nowrap px-3 py-4">{progress.fulfilled} / {progress.ordered}</td><td className="px-3 py-4">{order.paymentMethod === 'CREDIT' ? `Credit · ${order.paymentTermDays} days` : 'Cash'}</td><td className="px-3 py-4 tabular-nums">{formatSalesAmount(order.netAmount)}</td></tr>;
          })}</tbody>
        </table>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500"><span>{orders.data.total} orders · Page {orders.data.page} of {Math.max(1, orders.data.pageCount)}</span><div className="flex gap-2"><button type="button" className={salesSecondary} disabled={query.page <= 1} onClick={() => setQuery(previous => ({ ...previous, page: previous.page - 1 }))}>Previous</button><button type="button" className={salesSecondary} disabled={!orders.data.hasNext} onClick={() => setQuery(previous => ({ ...previous, page: previous.page + 1 }))}>Next</button></div></div>
    </>}
  </SalesShell>;
}
