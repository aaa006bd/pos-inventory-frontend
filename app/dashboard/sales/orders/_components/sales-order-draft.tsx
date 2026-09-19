'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState, type FormEvent } from 'react';
import { api, type Product } from '@/lib/api';
import { formatSalesAmount, getPurchaseCatalog, salesOrdersApi, uncertainMutation, validateSalesOrderDraft, type CreateSalesOrder, type SalesOrder } from '@/lib/sales-orders';
import { useSalesResource } from './use-sales-resource';
import { SalesShell, SalesError, SalesLoading, salesButton, salesSecondary, salesInput, salesCard } from './sales-ui';

type Customer = { id: number; name: string; active?: boolean };
type DraftRow = { key: number; productId: string; quantity: string; unitPrice: string; discountAmount: string; notes: string };
const emptyRow = (key: number): DraftRow => ({ key, productId: '', quantity: '1', unitPrice: '', discountAmount: '0', notes: '' });

export default function SalesOrderDraftPage({ id }: { id?: number }) {
  const load = useCallback(async () => {
    const [customers, products, order] = await Promise.all([api.get<Customer[]>('/customers'), getPurchaseCatalog(), id ? salesOrdersApi.get(id) : Promise.resolve(undefined)]);
    if (!Array.isArray(customers)) throw new Error('Unable to read the customer list. Please try again.');
    return { customers, products, order };
  }, [id]);
  const resource = useSalesResource(load);
  return <SalesShell title={id ? 'Edit Sales Order' : 'New Sales Order'} description="Save a draft, review its items, then confirm it before fulfillment.">
    {resource.loading ? <SalesLoading /> : resource.error ? <SalesError message={resource.error} retry={resource.reload} /> : resource.data && (resource.data.order && resource.data.order.status !== 'DRAFT' ? <SalesError message="Only draft orders can be edited." /> : <SalesOrderDraftForm {...resource.data} />)}
  </SalesShell>;
}

function SalesOrderDraftForm({ customers, products, order }: { customers: Customer[]; products: Product[]; order?: SalesOrder }) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState(String(order?.customerId ?? ''));
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(order?.expectedDeliveryDate?.slice(0, 10) ?? '');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CREDIT'>(order?.paymentMethod ?? 'CASH');
  const [paymentTermDays, setPaymentTermDays] = useState(String(order?.paymentTermDays ?? 0));
  const [notes, setNotes] = useState(order?.notes ?? '');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<DraftRow[]>(() => order ? order.lines.map((line, key) => ({ key, productId: String(line.productId), quantity: String(line.quantity), unitPrice: String(line.unitPrice), discountAmount: String(line.discountAmount), notes: line.notes ?? '' })) : [emptyRow(0)]);
  const nextKey = useRef(order?.lines.length ?? 1);
  const submitLock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [mustReview, setMustReview] = useState(false);
  const updateRow = (key: number, patch: Partial<DraftRow>) => setRows(previous => previous.map(row => row.key === key ? { ...row, ...patch } : row));
  const visibleProducts = products.filter(product => product.active !== false && `${product.name} ${product.sku ?? ''}`.toLowerCase().includes(search.toLowerCase()));
  const total = rows.reduce((sum, row) => sum + (Number(row.quantity) || 0) * (Number(row.unitPrice) || 0) - (Number(row.discountAmount) || 0), 0);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitLock.current || mustReview) return;
    const draft: CreateSalesOrder = {
      customerId: Number(customerId),
      paymentMethod,
      paymentTermDays: Number(paymentTermDays),
      expectedDeliveryDate: expectedDeliveryDate || undefined,
      notes: order ? notes.trim() : notes.trim() || undefined,
      items: rows.map(row => ({ productId: Number(row.productId), quantity: Number(row.quantity), unitPrice: Number(row.unitPrice), discountAmount: Number(row.discountAmount), notes: row.notes.trim() || undefined })),
    };
    const validation = validateSalesOrderDraft(draft, order?.orderDate?.slice(0, 10));
    if (validation) { setError(validation); return; }
    if (!customers.some(customer => customer.id === draft.customerId && customer.active !== false)) { setError('Select an active customer.'); return; }
    if (draft.items.some(item => !products.some(product => product.id === item.productId && product.active !== false))) { setError('Select an active product for every line.'); return; }
    submitLock.current = true;
    setBusy(true);
    setError('');
    try {
      const saved = order ? await salesOrdersApi.update(order.id, draft) : await salesOrdersApi.create(draft);
      if (!saved?.id) throw new Error('The server did not return an order ID.');
      router.push(`/dashboard/sales/orders/${saved.id}`);
    } catch (cause) {
      const review = uncertainMutation(cause);
      setMustReview(review);
      setError(review ? 'The save result could not be confirmed. Check Sales Orders before trying again to avoid creating a duplicate.' : cause instanceof Error ? cause.message : 'Unable to save the draft.');
      submitLock.current = false;
      setBusy(false);
    }
  };

  return <form onSubmit={submit} className="space-y-5">
    {error && <SalesError message={error} />}
    {mustReview && <Link href={order ? `/dashboard/sales/orders/${order.id}` : '/dashboard/sales/orders'} className={salesSecondary}>Review saved orders</Link>}
    <fieldset disabled={busy || mustReview} className="space-y-5 disabled:opacity-70">
      <section className={`${salesCard} grid gap-4 sm:grid-cols-2`} aria-label="Order details">
        <label className="space-y-1 text-sm">Customer *<select required className={salesInput} value={customerId} onChange={event => setCustomerId(event.target.value)}><option value="">Select customer</option>{customers.filter(customer => customer.active !== false).map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
        <label className="space-y-1 text-sm">Expected delivery date<input type="date" min={order?.orderDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)} className={salesInput} value={expectedDeliveryDate} onChange={event => setExpectedDeliveryDate(event.target.value)} /></label>
        <label className="space-y-1 text-sm">Payment method *<select className={salesInput} value={paymentMethod} onChange={event => setPaymentMethod(event.target.value as 'CASH' | 'CREDIT')}><option value="CASH">Cash</option><option value="CREDIT">Credit</option></select></label>
        <label className="space-y-1 text-sm">Payment terms (days)<input required type="number" min="0" max="3650" step="1" className={salesInput} value={paymentTermDays} onChange={event => setPaymentTermDays(event.target.value)} /></label>
        {!customers.some(customer => customer.active !== false) && <p className="text-sm text-amber-700">An active customer is required before creating an order.</p>}
      </section>
      <section className={`${salesCard} space-y-4`} aria-label="Order items">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Items</h2><button type="button" className={salesSecondary} disabled={rows.length >= 100} onClick={() => setRows(previous => [...previous, emptyRow(nextKey.current++)])}>+ Add line</button></div>
        <label className="block space-y-1 text-sm">Filter product choices<input type="search" className={salesInput} placeholder="Product name or SKU" value={search} onChange={event => setSearch(event.target.value)} /></label>
        <div className="space-y-4">{rows.map((row, index) => {
          const selected = products.find(product => String(product.id) === row.productId);
          return <div key={row.key} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold">Line {index + 1}</h3><button type="button" aria-label={`Remove line ${index + 1}`} className="text-sm text-rose-600 disabled:opacity-40" disabled={rows.length === 1} onClick={() => setRows(previous => previous.filter(item => item.key !== row.key))}>Remove</button></div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="space-y-1 text-sm lg:col-span-2">Product *<select required className={salesInput} value={row.productId} onChange={event => { const product = products.find(item => String(item.id) === event.target.value); updateRow(row.key, { productId: event.target.value, unitPrice: product ? String(product.basePrice ?? '') : '' }); }}><option value="">Select product</option>{row.productId && !visibleProducts.some(product => String(product.id) === row.productId) && <option value={row.productId}>{selected?.name ?? `Product #${row.productId}`}</option>}{visibleProducts.map(product => <option key={product.id} value={product.id}>{product.name}{product.sku ? ` · ${product.sku}` : ''}</option>)}</select></label>
              <label className="space-y-1 text-sm">Quantity *<input required type="number" min="1" max="10000" step="1" className={salesInput} value={row.quantity} onChange={event => updateRow(row.key, { quantity: event.target.value })} /></label>
              <label className="space-y-1 text-sm">Unit price *<input required type="number" min="0" step="0.01" className={salesInput} value={row.unitPrice} onChange={event => updateRow(row.key, { unitPrice: event.target.value })} /></label>
              <label className="space-y-1 text-sm">Line discount<input required type="number" min="0" step="0.01" className={salesInput} value={row.discountAmount} onChange={event => updateRow(row.key, { discountAmount: event.target.value })} /></label>
              <label className="space-y-1 text-sm sm:col-span-2">Line notes<input maxLength={1000} className={salesInput} value={row.notes} onChange={event => updateRow(row.key, { notes: event.target.value })} /></label>
              <p className="self-end py-2 text-right text-sm font-semibold tabular-nums">Line total: {formatSalesAmount((Number(row.quantity) || 0) * (Number(row.unitPrice) || 0) - (Number(row.discountAmount) || 0))}</p>
            </div>
          </div>;
        })}</div>
        <p className="text-right font-semibold tabular-nums">Estimated total: {formatSalesAmount(total)}</p>
      </section>
      <label className={`${salesCard} block space-y-2 text-sm`}>Order notes<textarea className={salesInput} maxLength={2000} rows={3} value={notes} onChange={event => setNotes(event.target.value)} /></label>
      <div className="flex flex-wrap justify-end gap-3"><Link href={order ? `/dashboard/sales/orders/${order.id}` : '/dashboard/sales/orders'} className={salesSecondary}>Back</Link><button className={salesButton} disabled={busy || mustReview}>{busy ? 'Saving…' : 'Save Draft'}</button></div>
    </fieldset>
  </form>;
}
