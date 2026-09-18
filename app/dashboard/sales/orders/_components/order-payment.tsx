'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/auth-context';
import { customerPaymentsApi, paymentMethods, paymentMethodLabels, validateOrderPayment, type CustomerPayment, type PaymentMethod } from '@/lib/customer-payments';
import { formatSalesAmount, formatSalesDate, type SalesOrder, type SaleRecord } from '@/lib/sales-orders';
import { previewOrderPayment } from '@/lib/order-payment-preview';
import { usePaymentAction } from '../../payments/_components/use-payment-action';
import { PaymentReceipt } from '../../payments/_components/payment-ui';
import { useSalesResource } from './use-sales-resource';
import { SalesError, salesButton, salesInput, salesSecondary } from './sales-ui';

export default function OrderPayment({ order, outstanding, onRecorded, sales = [] }: { order: SalesOrder; outstanding?: number; onRecorded: () => void; sales?: SaleRecord[] }) {
  const { user } = useAuth();
  const canWrite = !user?.role || user.role.toLowerCase() === 'admin';
  const action = usePaymentAction(`order-payment:${order.id}`);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [date, setDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');
  const preview = previewOrderPayment(sales, amount);
  const allocations = (payment: CustomerPayment) => <ul className="space-y-1 text-sm">{payment.allocations.filter(item => item.salesOrderId === order.id).map(item => <li key={item.id}><Link className="text-sky-700 underline" href={`/dashboard/sales/records/${item.salesRecordId}`}>{sales.find(sale => sale.id === item.salesRecordId)?.saleNumber ?? `Sale #${item.salesRecordId}`}</Link> · {formatSalesAmount(item.amount)}{item.reversedAt ? ' · Reversed' : ' applied'}</li>)}</ul>;
  const load = useCallback(async () => {
    const payments: CustomerPayment[] = [];
    const ids = new Set<number>();
    let total: number | undefined;
    for (let page = 1; ; page++) {
      const result = await customerPaymentsApi.list(order.customerId, page);
      if (!Array.isArray(result.items) || Number(result.page) !== page || !Number.isSafeInteger(result.total) || result.total < 0 || (total !== undefined && total !== result.total)) throw new Error('Unable to read complete payment history. Please refresh.');
      total = result.total;
      for (const payment of result.items) {
        if (ids.has(payment.id)) throw new Error('Payment history changed. Please refresh.');
        ids.add(payment.id);
        if (payment.salesOrderId === order.id || payment.allocations.some(allocation => allocation.salesOrderId === order.id)) payments.push(payment);
      }
      if (ids.size === total) return payments;
      if (!result.items.length || ids.size > total) throw new Error('Payment history is incomplete. Please refresh.');
    }
  }, [order.customerId, order.id]);
  const history = useSalesResource(load);
  const reloadHistory = history.reload;
  const notified = useRef<CustomerPayment | null>(null);
  useEffect(() => {
    if (action.result && notified.current !== action.result) {
      notified.current = action.result;
      onRecorded();
      reloadHistory();
    }
  }, [action.result, onRecorded, reloadHistory]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (outstanding === undefined || !canWrite) return;
    const body = { amount: Number(amount), paymentMethod: method, paymentDate: date, ...(reference.trim() ? { reference: reference.trim() } : {}) };
    const problem = validateOrderPayment(body, outstanding);
    setError(problem ?? '');
    if (!problem) action.run({ type: 'order-payment', orderId: order.id, body });
  };

  return <section className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-700" aria-label="Order payments">
    <h3 className="font-semibold">Payments</h3>
    {action.result && <div role="status" className="space-y-2 rounded-xl bg-emerald-50 p-3 text-slate-900"><p>Payment #{action.result.id} recorded and applied to {order.orderNumber}: {formatSalesAmount(action.result.amount)}.</p>{allocations(action.result)}<PaymentReceipt id={action.result.id} /></div>}
    {canWrite && <>
      {!action.pending && <button type="button" className={salesButton} disabled={!action.ready || action.busy || outstanding === undefined || outstanding <= 0} onClick={() => { setOpen(value => action.result ? true : !value); action.reset(); setAmount(''); setReference(''); setError(''); }}>{open && !action.result ? 'Close payment form' : 'Record payment'}</button>}
      {outstanding === 0 && <p className="text-sm text-slate-500">No outstanding payment for fulfilled items.</p>}
      {action.pending && <div className="space-y-2"><p className="text-sm">A payment is awaiting confirmation. Recover its result before recording another payment.</p><button type="button" className={salesSecondary} disabled={action.busy} onClick={action.retry}>Recover payment result</button></div>}
      {open && !action.result && <form onSubmit={submit} className="space-y-3">
        <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800"><p>Sales order: <Link className="font-semibold text-sky-700 underline" href={`/dashboard/sales/orders/${order.id}`}>{order.orderNumber}</Link></p><p>Customer: {order.customer.name}</p></div>
        <div className="overflow-x-auto"><h4 className="font-semibold">Sales being paid</h4><p className="text-sm text-slate-500">Oldest unpaid sale first. Enter an amount to preview its distribution; final allocations are confirmed by the server.</p><table className="w-full text-left text-sm"><thead><tr>{['Sales reference', 'Outstanding', 'This payment', 'Remaining'].map(label => <th key={label} className="py-2 pr-3">{label}</th>)}</tr></thead><tbody>{preview.map(row => <tr key={row.sale.id}><td className="py-2 pr-3"><Link className="text-sky-700 underline" href={`/dashboard/sales/records/${row.sale.id}`}>{row.sale.saleNumber}</Link></td><td>{formatSalesAmount(row.sale.outstandingAmount)}</td><td>{formatSalesAmount(row.applied)}</td><td>{formatSalesAmount(row.remaining)}</td></tr>)}</tbody></table></div>
        <fieldset disabled={!action.ready || action.busy || !!action.pending || outstanding === undefined || outstanding <= 0} className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Amount<input className={salesInput} type="number" required min="0.01" step="0.01" max={outstanding} value={amount} onChange={event => setAmount(event.target.value)} /></label>
          <label className="text-sm">Payment method<select className={salesInput} value={method} onChange={event => setMethod(event.target.value as PaymentMethod)}>{paymentMethods.map(value => <option key={value} value={value}>{paymentMethodLabels[value]}</option>)}</select></label>
          <label className="text-sm">Payment date<input className={salesInput} type="date" required value={date} onChange={event => setDate(event.target.value)} /></label>
          <label className="text-sm">Transaction reference (optional)<input className={salesInput} maxLength={200} value={reference} onChange={event => setReference(event.target.value)} /></label>
          <button type="submit" className={salesButton}>{action.busy ? 'Recording…' : 'Confirm payment'}</button>
        </fieldset>
      </form>}
    </>}
    {(error || action.error) && <SalesError message={error || action.error} />}
    <details><summary className="cursor-pointer text-sm font-semibold">Payment history</summary>
      {history.loading && <p role="status">Loading payments…</p>}
      {history.error && <SalesError message={history.error} retry={history.reload} />}
      {history.data?.length === 0 && <p className="mt-3 text-sm text-slate-500">No payments linked to this order yet.</p>}
      {history.data?.map(payment => <div key={payment.id} className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-sm"><div><Link className="text-sky-700 underline" href={`/dashboard/sales/payments/${payment.id}`}>Payment #{payment.id}</Link><p>{formatSalesDate(payment.paymentDate)} · Received {formatSalesAmount(payment.amount)} · Applied to this order {formatSalesAmount(payment.allocations.filter(item => item.salesOrderId === order.id && !item.reversedAt).reduce((sum, item) => sum + Number(item.amount), 0))}</p>{allocations(payment)}</div><PaymentReceipt id={payment.id} /></div>)}
    </details>
  </section>;
}
