'use client';

import Link from 'next/link';
import { api, type Customer } from '@/lib/api';
import { useCallback, useState } from 'react';
import { salesOrdersApi, formatSalesAmount, formatSalesDate, formatPaymentStatus } from '@/lib/sales-orders';
import { useSalesResource } from '../orders/_components/use-sales-resource';
import { SalesShell, SalesError, SalesLoading, salesCard, salesSecondary } from '../orders/_components/sales-ui';

export default function SalesRecordsPage() {
  const [page, setPage] = useState(1);
  const load = useCallback(() => salesOrdersApi.sales(page), [page]);
  const resource = useSalesResource(load);
  const loadCustomers = useCallback(() => api.get<Customer[]>('/customers'), []);
  const customers = useSalesResource(loadCustomers);
  return <SalesShell section="records" title="Sales Records" description="Sales from order deliveries and POS checkout. Open a sale for its items and documents.">
    {resource.loading ? <SalesLoading /> : resource.error ? <SalesError message={resource.error} retry={resource.reload} /> : resource.data && <><section className={`${salesCard} overflow-x-auto`}><table className="w-full text-left text-sm"><thead><tr>{['Sales reference', 'Customer', 'Date', 'Sales order', 'Payment status', 'Amount', 'Paid', 'Outstanding'].map(label => <th key={label} className="px-3 py-3">{label}</th>)}</tr></thead><tbody>{resource.data.items.map(sale => <tr key={sale.id} className="border-t border-slate-100 dark:border-slate-700"><td className="px-3 py-3"><Link className="font-semibold text-sky-700 hover:underline" href={`/dashboard/sales/records/${sale.id}`}>{sale.saleNumber}</Link></td><td className="px-3 py-3">{sale.customerId ? (Array.isArray(customers.data) ? customers.data.find(customer => customer.id === sale.customerId)?.name : undefined) ?? `Customer #${sale.customerId}` : 'Walk-in customer'}</td><td className="px-3 py-3">{formatSalesDate(sale.soldAt)}</td><td className="px-3 py-3">{sale.salesOrderId ? <><Link className="text-sky-700 hover:underline" href={`/dashboard/sales/orders/${sale.salesOrderId}`}>{sale.salesOrder?.orderNumber ?? `Order #${sale.salesOrderId}`}</Link></> : 'POS checkout'}</td><td className="px-3 py-3">{formatPaymentStatus(sale.paymentStatus)}</td><td className="px-3 py-3">{formatSalesAmount(sale.netAmount)}</td><td className="px-3 py-3">{formatSalesAmount(sale.paidAmount)}</td><td className="px-3 py-3">{formatSalesAmount(sale.outstandingAmount)}</td></tr>)}</tbody></table>{!resource.data.items.length && <p className="py-8 text-center text-sm text-slate-500">No sales recorded yet.</p>}</section><div className="flex items-center justify-between text-sm"><span>{resource.data.total} sales · Page {page} of {Math.max(1, resource.data.pageCount)}</span><div className="flex gap-2"><button className={salesSecondary} disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><button className={salesSecondary} disabled={!resource.data.hasNext} onClick={() => setPage(page + 1)}>Next</button></div></div></>}
  </SalesShell>;
}
