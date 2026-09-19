'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, type Customer } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { customerPaymentsApi, paymentMethods, paymentMethodLabels, validateReceipt, type PaymentMethod } from '@/lib/customer-payments';
import { formatSalesAmount, formatSalesDate } from '@/lib/sales-orders';
import { useSalesResource } from '../../orders/_components/use-sales-resource';
import { SalesError, salesCard, salesButton, salesInput, salesSecondary } from '../../orders/_components/sales-ui';
import { PaymentShell, PaymentPager, PaymentLoading, PaymentReceipt } from './payment-ui';
import { usePaymentAction } from './use-payment-action';

const loadCustomers = async () => {
  const customers = await api.get<Customer[]>('/customers');
  if (!Array.isArray(customers)) throw new Error('Unable to read the customer list.');
  return customers;
};
export default function PaymentsWorkspace({ customerId, orderId, saleId }: { customerId?: number; orderId?: number; saleId?: number }) {
  const customers = useSalesResource(loadCustomers);
  const [selected, setSelected] = useState(customerId ?? 0);
  const customer = customers.data?.find(item => item.id === selected);
  const target = selected === customerId ? orderId ? `?salesOrderId=${orderId}` : saleId ? `?salesRecordId=${saleId}` : '' : '';
  return <PaymentShell title="Customer Payments">
    <p className="text-sm text-slate-500">Receive money once, then apply available credit to outstanding orders or POS sales.</p>
    {customers.loading ? <PaymentLoading /> : customers.error ? <SalesError message={customers.error} retry={customers.reload} /> : <label className={`${salesCard} block text-sm`}>Customer<select className={salesInput} value={selected || ''} onChange={event => setSelected(Number(event.target.value))}><option value="">Choose customer</option>{customers.data?.map(item => <option key={item.id} value={item.id}>{item.name} · {item.phone}</option>)}</select></label>}
    {customer && <CustomerHistory key={selected} customer={customer} target={target} />}
    {selected > 0 && customers.data && !customer && <SalesError message="This customer is not available. Choose a customer from the list." />}
    {!selected && <p className="text-sm text-slate-500">Choose a customer to view their payments and available credit.</p>}
  </PaymentShell>;
}

function CustomerHistory({ customer, target }: { customer: Customer; target: string }) {
  const { user } = useAuth();
  // Some login responses contain only a token; the backend still enforces admin writes.
  const canWrite = !user?.role || user.role.toLowerCase() === 'admin';
  const [page, setPage] = useState(1);
  const [receiving, setReceiving] = useState(false);
  const load = useCallback(() => customerPaymentsApi.list(customer.id, page), [customer.id, page]);
  const payments = useSalesResource(load);
  return <div className="space-y-5">
    {target && <p className="rounded-xl bg-sky-50 p-3 text-sm text-sky-900">An order or POS sale is preselected for the next step. Choose an existing payment below or record newly received money.</p>}
    <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">{customer.name} · payment history</h2>{canWrite && <button type="button" className={salesButton} onClick={() => setReceiving(value => !value)}>{receiving ? 'Close receive form' : 'Receive payment'}</button>}</div>
    {canWrite && <div hidden={!receiving}><ReceivePaymentForm customer={customer} target={target} onReceived={payments.reload} /></div>}
    {payments.loading ? <PaymentLoading /> : payments.error ? <SalesError message={payments.error} retry={payments.reload} /> : payments.data && <>
      <div className={`${salesCard} overflow-x-auto`}><table className="w-full text-left text-sm"><thead><tr>{['Payment / Reference', 'Date', 'Method', 'Received', 'Applied', 'Available credit'].map(label => <th className="px-3 py-3" key={label}>{label}</th>)}</tr></thead><tbody>{payments.data.items.map(payment => <tr key={payment.id} className="border-t border-slate-100 dark:border-slate-700"><td className="px-3 py-3"><Link className="font-semibold text-sky-700 hover:underline" href={`/dashboard/sales/payments/${payment.id}${target}`}>Payment #{payment.id} · {payment.reference || 'No reference'}</Link></td><td className="px-3 py-3">{formatSalesDate(payment.paymentDate)}</td><td className="px-3 py-3">{paymentMethodLabels[payment.paymentMethod]}</td><td className="px-3 py-3">{formatSalesAmount(payment.amount)}</td><td className="px-3 py-3">{formatSalesAmount(payment.allocatedAmount)}</td><td className="px-3 py-3">{formatSalesAmount(payment.availableAmount)}</td></tr>)}</tbody></table>{!payments.data.items.length && <p className="py-5 text-sm text-slate-500">No customer payments recorded yet.</p>}</div>
      <PaymentPager page={page} total={payments.data.total} limit={payments.data.limit} change={setPage} />
    </>}
  </div>;
}

function ReceivePaymentForm({ customer, target, onReceived }: { customer: Customer; target: string; onReceived: () => void }) {
  const action = usePaymentAction(`receive:${customer.id}`);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [date, setDate] = useState(() => { const today = new Date(); return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`; });
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { if (action.result) onReceived(); }, [action.result, onReceived]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const body = { amount: Number(amount), paymentMethod: method, paymentDate: date, reference: reference.trim(), notes: notes.trim() || undefined };
    const validation = validateReceipt(body);
    if (validation) { setError(validation); return; }
    setError(''); action.run({ type: 'receive', customerId: customer.id, body });
  };
  if (action.result) return <section className={`${salesCard} space-y-3`} role="status"><h3 className="font-semibold">Payment received: {formatSalesAmount(action.result.amount)}</h3><p className="text-sm">The money is available as customer credit. Choose where to apply it next.</p><div className="flex flex-wrap gap-2"><Link className={salesButton} href={`/dashboard/sales/payments/${action.result.id}${target}`}>View payment and apply credit</Link><PaymentReceipt id={action.result.id} /><button type="button" className={salesSecondary} onClick={() => { action.reset(); setAmount(''); setReference(''); setNotes(''); }}>Receive another payment</button></div></section>;
  return <form onSubmit={submit} className={`${salesCard} space-y-4`}>
    <div><h3 className="font-semibold">Receive money from {customer.name}</h3><p className="text-sm text-slate-500">Use this form for new money received. Applying an existing payment is available from its history entry.</p></div>
    <fieldset disabled={!action.ready || action.busy || Boolean(action.pending)} className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm">Amount received<input required type="number" min="0.01" step="0.01" className={salesInput} value={amount} onChange={event => setAmount(event.target.value)} /></label>
      <label className="text-sm">Payment method<select className={salesInput} value={method} onChange={event => setMethod(event.target.value as PaymentMethod)}>{paymentMethods.map(value => <option key={value} value={value}>{paymentMethodLabels[value]}</option>)}</select></label>
      <label className="text-sm">Payment date<input type="date" required className={salesInput} value={date} onChange={event => setDate(event.target.value)} /></label>
      <label className="text-sm">Transaction reference<input required maxLength={200} className={salesInput} value={reference} onChange={event => setReference(event.target.value)} /></label>
      <label className="text-sm sm:col-span-2">Notes<textarea maxLength={1000} className={salesInput} value={notes} onChange={event => setNotes(event.target.value)} /></label>
      <button className={salesButton}>{action.busy ? 'Recording…' : 'Record money received'}</button>
    </fieldset>
    {(error || action.error) && <SalesError message={error || action.error} />}
    {action.pending && <div className="space-y-2 text-sm"><p>A payment request is awaiting confirmation. Recover its result before recording another payment.</p><button type="button" className={salesSecondary} disabled={action.busy} onClick={action.retry}>Recover payment result</button></div>}
  </form>;
}
