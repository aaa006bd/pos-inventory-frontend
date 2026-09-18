'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, type Customer } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { allocationKey, buildAllocations, customerPaymentsApi, paymentCents, paymentMethodLabels, paymentShortcut, type CustomerPayment, type OutstandingTarget } from '@/lib/customer-payments';
import { formatSalesAmount, formatSalesDate } from '@/lib/sales-orders';
import { useSalesResource } from '../../orders/_components/use-sales-resource';
import { SalesError, salesCard, salesButton, salesInput, salesSecondary } from '../../orders/_components/sales-ui';
import { PaymentLoading, PaymentPager, PaymentReceipt, PaymentShell } from './payment-ui';
import { usePaymentAction } from './use-payment-action';

async function allOutstanding(customerId: number) {
  const rows: OutstandingTarget[] = [];
  const seen = new Set<string>();
  for (let page = 1; ; page++) {
    const response = await customerPaymentsApi.outstanding(customerId, page);
    if (!Array.isArray(response.items) || Number(response.page) !== page || !Number.isSafeInteger(Number(response.total))) throw new Error('Unable to read outstanding balances.');
    for (const row of response.items) {
      const key = allocationKey(row);
      if (seen.has(key)) throw new Error('Outstanding balances changed while loading. Refresh and try again.');
      seen.add(key); rows.push(row);
    }
    if (rows.length === Number(response.total)) return rows;
    if (!response.items.length || rows.length > Number(response.total)) throw new Error('Outstanding balances are incomplete. Refresh and try again.');
  }
}

export default function PaymentDetail({ id, orderId, saleId }: { id: number; orderId?: number; saleId?: number }) {
  const load = useCallback(async () => {
    const payment = await customerPaymentsApi.get(id);
    const customer = await api.get<Customer>(`/customers/${payment.customerId}`);
    return { payment, customer };
  }, [id]);
  const resource = useSalesResource(load);
  return <PaymentShell title={`Payment #${id}`}>
    {resource.loading ? <PaymentLoading /> : resource.error ? <SalesError message={resource.error} retry={resource.reload} /> : resource.data && <PaymentContent {...resource.data} orderId={orderId} saleId={saleId} reload={resource.reload} />}
  </PaymentShell>;
}

function PaymentContent({ payment, customer, orderId, saleId, reload }: { payment: CustomerPayment; customer: Customer; orderId?: number; saleId?: number; reload: () => void }) {
  const { user } = useAuth();
  const canWrite = !user?.role || user.role.toLowerCase() === 'admin';
  const action = usePaymentAction(`payment:${payment.id}`);
  const [reversing, setReversing] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { if (action.result) reload(); }, [action.result, reload]);
  const disabled = !action.ready || action.busy || Boolean(action.pending);
  const reverse = (event: FormEvent) => {
    event.preventDefault();
    if (!reversing || !reason.trim() || reason.trim().length > 1000) { setError('Enter a reversal reason of up to 1,000 characters.'); return; }
    setError(''); action.run({ type: 'reverse', paymentId: payment.id, allocationId: reversing, body: { reason: reason.trim() } });
  };
  return <div className="space-y-5">
    <section className={`${salesCard} space-y-4`}><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">{customer.name}</h2><p className="text-sm text-slate-500">{paymentMethodLabels[payment.paymentMethod]} · {formatSalesDate(payment.paymentDate)} · {payment.reference}</p></div><PaymentReceipt id={payment.id} /></div><div className="grid gap-4 sm:grid-cols-3">{[['Received', payment.amount], ['Applied', payment.allocatedAmount], ['Available credit', payment.availableAmount]].map(([label, value]) => <div key={label}><p className="text-xs text-slate-500">{label}</p><p className="text-lg font-semibold">{formatSalesAmount(value)}</p></div>)}</div>{typeof payment.notes === 'string' && payment.notes && <p className="whitespace-pre-wrap text-sm">{payment.notes}</p>}</section>
    {(action.error || error) && <SalesError message={action.error || error} />}
    {action.pending && <div className={`${salesCard} space-y-2`}><p className="text-sm">An {action.pending.action.type === 'reverse' ? 'allocation reversal' : 'allocation'} is awaiting confirmation. Recover its result before continuing.</p><button type="button" className={salesSecondary} disabled={action.busy} onClick={action.retry}>Recover operation result</button></div>}
    {canWrite && payment.availableAmount > 0 && <ApplyCredit payment={payment} orderId={orderId} saleId={saleId} disabled={disabled} apply={targets => action.run({ type: 'allocate', paymentId: payment.id, body: { targets } })} />}
    {payment.availableAmount === 0 && <p className="text-sm text-slate-500">All money from this payment has been applied.</p>}
    <section className={`${salesCard} space-y-3`}><h2 className="font-semibold">Allocation history</h2><p className="text-sm text-slate-500">Applying credit uses money already received. Reversing an allocation restores credit; it does not refund money.</p>
      {!payment.allocations.length && <p className="text-sm">No allocations yet. The received amount remains customer credit.</p>}
      {payment.allocations.map(allocation => <div key={allocation.id} className="space-y-2 border-t border-slate-100 py-3 text-sm dark:border-slate-700"><div className="flex flex-wrap items-center justify-between gap-3"><div><Link className="text-sky-700 underline" href={allocation.salesOrderId ? `/dashboard/sales/orders/${allocation.salesOrderId}` : `/dashboard/sales/records/${allocation.salesRecordId}`}>{allocation.salesOrderId ? `Order #${allocation.salesOrderId}` : 'POS sale'} · Sale #{allocation.salesRecordId}</Link><p>{formatSalesAmount(allocation.amount)} · {formatSalesDate(allocation.allocatedAt)} · {allocation.reversedAt ? 'Reversed' : 'Applied'}</p>{allocation.reversedAt && <p className="text-slate-500">{typeof allocation.reversedAt === 'string' ? formatSalesDate(allocation.reversedAt) : ''} {typeof allocation.reversalReason === 'string' ? allocation.reversalReason : ''}</p>}</div>{canWrite && !allocation.reversedAt && <button type="button" className={salesSecondary} disabled={disabled} onClick={() => { setReversing(allocation.id); setReason(''); }}>Reverse allocation</button>}</div>
        {reversing === allocation.id && !allocation.reversedAt && <form onSubmit={reverse} className="space-y-2"><p>This restores {formatSalesAmount(allocation.amount)} to this payment’s available credit.</p><label className="block">Reason<textarea required maxLength={1000} className={salesInput} disabled={disabled} value={reason} onChange={event => setReason(event.target.value)} /></label><div className="flex gap-2"><button className={salesButton} disabled={disabled}>Confirm reversal</button><button type="button" className={salesSecondary} disabled={disabled} onClick={() => setReversing(null)}>Cancel</button></div></form>}
      </div>)}
    </section>
    <div className="flex flex-wrap gap-2"><Link className={salesSecondary} href={paymentShortcut(payment.customerId)}>Back to customer payments</Link><button type="button" className={salesSecondary} disabled={action.busy} onClick={reload}>Refresh payment</button></div>
  </div>;
}

function ApplyCredit({ payment, orderId, saleId, disabled, apply }: { payment: CustomerPayment; orderId?: number; saleId?: number; disabled: boolean; apply: (targets: ReturnType<typeof buildAllocations>) => void }) {
  const load = useCallback(() => allOutstanding(payment.customerId), [payment.customerId]);
  const resource = useSalesResource(load);
  if (resource.loading) return <PaymentLoading />;
  if (resource.error) return <SalesError message={resource.error} retry={resource.reload} />;
  return resource.data && <AllocationForm key={resource.data.map(row => `${row.type}:${row.id}:${row.outstandingAmount}`).join('|')} rows={resource.data} payment={payment} orderId={orderId} saleId={saleId} disabled={disabled} apply={apply} />;
}

function AllocationForm({ rows, payment, orderId, saleId, disabled, apply }: { rows: OutstandingTarget[]; payment: CustomerPayment; orderId?: number; saleId?: number; disabled: boolean; apply: (targets: ReturnType<typeof buildAllocations>) => void }) {
  const preferred = rows.find(row => orderId ? row.type === 'SALES_ORDER' && row.id === orderId : row.type === 'SALES_RECORD' && row.id === saleId);
  const [page, setPage] = useState(() => preferred ? Math.floor(rows.indexOf(preferred) / 20) + 1 : 1);
  const [amounts, setAmounts] = useState<Record<string, string>>(() => preferred ? { [allocationKey(preferred)]: String(Math.min(preferred.outstandingAmount, payment.availableAmount)) } : {});
  const [error, setError] = useState('');
  const total = Object.values(amounts).reduce((sum, amount) => sum + (paymentCents(amount) ?? 0), 0) / 100;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    try { const targets = buildAllocations(rows, amounts, payment.availableAmount); setError(''); apply(targets); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Check the allocation amounts.'); }
  };
  return <form onSubmit={submit} className={`${salesCard} space-y-4`}>
    <div><h2 className="font-semibold">Apply existing credit</h2><p className="text-sm text-slate-500">Select outstanding orders or POS credit sales. Within an order, credit is applied to its oldest unpaid fulfillment sales.</p></div>
    {(orderId || saleId) && !preferred && <p className="text-sm text-slate-500">The requested order or sale has no eligible outstanding balance for this customer.</p>}
    {!rows.length && <p className="text-sm">Nothing outstanding. This payment remains available as customer credit.</p>}
    {rows.slice((page - 1) * 20, page * 20).map(row => <div key={allocationKey(row)} className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 py-3 dark:border-slate-700"><div><Link className="text-sm font-semibold text-sky-700 underline" href={row.type === 'SALES_ORDER' ? `/dashboard/sales/orders/${row.id}` : `/dashboard/sales/records/${row.id}`}>{row.reference}</Link><p className="text-sm text-slate-500">{row.type === 'SALES_ORDER' ? 'Sales order' : 'POS credit sale'} · {formatSalesAmount(row.outstandingAmount)} outstanding</p></div><label className="w-48 text-sm">Apply to {row.reference}<input className={salesInput} type="number" min="0" max={row.outstandingAmount} step="0.01" placeholder="0.00" disabled={disabled} value={amounts[allocationKey(row)] ?? ''} onChange={event => setAmounts(previous => ({ ...previous, [allocationKey(row)]: event.target.value }))} /></label></div>)}
    {rows.length > 20 && <PaymentPager page={page} total={rows.length} limit={20} change={setPage} />}
    {rows.length > 0 && <><p className="text-sm">Apply {formatSalesAmount(total)} · Credit remaining {formatSalesAmount(payment.availableAmount - total)}</p><button className={salesButton} disabled={disabled || total <= 0 || total > payment.availableAmount}>Apply existing payment</button></>}
    {error && <SalesError message={error} />}
  </form>;
}
