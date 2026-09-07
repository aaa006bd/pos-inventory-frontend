'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState, type FormEvent } from 'react';
import { getPurchaseCatalog, getPurchaseSuppliers, purchasesApi, validateDraft, purchaseError, uncertainMutation, formatAmount, type PurchaseOrder } from '@/lib/purchases';
import type { Product, Supplier } from '@/lib/api';
import { usePurchaseResource } from './use-purchase-resource';
import { PurchaseShell, PurchaseError, PurchaseLoading, purchaseInput, purchaseButton, purchaseSecondary, purchaseCard } from './purchase-ui';

interface DraftRow { key: number; productId: string; quantity: string; unitCost: string; notes: string }

export default function PurchaseDraftPage({ id }: { id?: number }) {
  const load = useCallback(async () => {
    const [products, suppliers, order] = await Promise.all([getPurchaseCatalog(), getPurchaseSuppliers(), id ? purchasesApi.get(id) : Promise.resolve(undefined)]);
    return { products, suppliers, order };
  }, [id]);
  const resource = usePurchaseResource(load);
  return <PurchaseShell title={id ? 'Edit Purchase Order' : 'New Purchase Order'} description="Save a draft, review its items, then confirm it before receiving stock." order={resource.data?.order ? { id: resource.data.order.id, label: resource.data.order.orderNumber } : undefined}>
    {resource.loading ? <PurchaseLoading /> : resource.error ? <PurchaseError message={resource.error} retry={resource.reload} /> : resource.data && (
      resource.data.order && resource.data.order.status !== 'DRAFT' ? <div className={purchaseCard}><p>This order is no longer a draft and cannot be edited.</p><Link className={`${purchaseSecondary} mt-4`} href={`/dashboard/purchases/${id}`}>Back to order</Link></div>
      : <PurchaseDraftForm {...resource.data} />
    )}
  </PurchaseShell>;
}

function PurchaseDraftForm({ products, suppliers, order }: { products: Product[]; suppliers: (Supplier & { active?: boolean })[]; order?: PurchaseOrder }) {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState(String(order?.supplierId ?? ''));
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(order?.expectedDeliveryDate?.slice(0, 10) ?? '');
  const [notes, setNotes] = useState(order?.notes ?? '');
  const [productSearch, setProductSearch] = useState('');
  const [rows, setRows] = useState<DraftRow[]>(() => order ? order.lines.map((line, index) => ({ key: index, productId: String(line.productId), quantity: String(line.quantity), unitCost: String(line.unitCost), notes: line.notes ?? '' })) : [{ key: 0, productId: '', quantity: '1', unitCost: '', notes: '' }]);
  const nextKey = useRef(rows.length);
  const submitLock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [mustReview, setMustReview] = useState(false);
  const updateRow = (key: number, patch: Partial<DraftRow>) => setRows(previous => previous.map(row => row.key === key ? { ...row, ...patch } : row));
  const visibleProducts = products.filter(product => product.active !== false && `${product.name} ${product.sku ?? ''}`.toLowerCase().includes(productSearch.toLowerCase()));
  const total = rows.reduce((sum, row) => sum + (Number(row.quantity) || 0) * (Number(row.unitCost) || 0), 0);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitLock.current || mustReview) return;
    const draft = {
      supplierId: Number(supplierId), expectedDeliveryDate: expectedDeliveryDate || undefined,
      // Empty order notes can be saved explicitly when editing.
      notes: notes.trim(),
      items: rows.map(row => ({ productId: Number(row.productId), quantity: Number(row.quantity), unitCost: Number(row.unitCost), notes: row.notes.trim() || undefined })),
    };
    const validation = validateDraft(draft);
    if (validation) { setError(validation); return; }
    if (!suppliers.some(supplier => supplier.id === draft.supplierId && supplier.active !== false)) { setError('Select an active supplier.'); return; }
    if (draft.items.some(item => !products.some(product => product.id === item.productId && product.active !== false))) { setError('Select an active product for every line.'); return; }
    submitLock.current = true;
    setBusy(true); setError('');
    try {
      const saved = order ? await purchasesApi.update(order.id, draft) : await purchasesApi.create(draft);
      if (!saved?.id) throw new Error('The server did not return an order number.');
      router.push(`/dashboard/purchases/${saved.id}`);
    } catch (cause) {
      const review = uncertainMutation(cause);
      setMustReview(review);
      setError(review ? 'The save result could not be confirmed. Check the order list before trying again to avoid creating a duplicate.' : purchaseError(cause));
      submitLock.current = false;
      setBusy(false);
    }
  };

  return <form onSubmit={submit} className="space-y-5">
    {error && <PurchaseError message={error} />}
    {mustReview && <Link href={order ? `/dashboard/purchases/${order.id}` : '/dashboard/purchases'} className={purchaseSecondary}>Review saved orders</Link>}
    <fieldset disabled={busy || mustReview} className="space-y-5 disabled:opacity-70">
      <div className={`${purchaseCard} grid gap-4 sm:grid-cols-2`}>
        <label className="space-y-1 text-sm">Supplier *<select required className={purchaseInput} value={supplierId} onChange={event => setSupplierId(event.target.value)}><option value="">Select supplier</option>{suppliers.filter(supplier => supplier.active !== false || supplier.id === order?.supplierId).map(supplier => <option key={supplier.id} value={supplier.id} disabled={supplier.active === false}>{supplier.name}{supplier.active === false ? ' (inactive)' : ''}</option>)}</select></label>
        <label className="space-y-1 text-sm">Expected delivery date<input type="date" required={Boolean(order?.expectedDeliveryDate)} className={purchaseInput} value={expectedDeliveryDate} onChange={event => setExpectedDeliveryDate(event.target.value)} />{order?.expectedDeliveryDate && <span className="block text-xs text-slate-500">Choose a replacement date to change the existing delivery date.</span>}</label>
        {!suppliers.some(supplier => supplier.active !== false) && <p className="text-sm text-amber-700">An active supplier is required. <Link href="/dashboard/suppliers" className="underline">Manage suppliers</Link></p>}
      </div>
      <section className={`${purchaseCard} space-y-4`} aria-label="Order items">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Items</h2><button type="button" className={purchaseSecondary} onClick={() => { const key = nextKey.current++; setRows(previous => [...previous, { key, productId: '', quantity: '1', unitCost: '', notes: '' }]); }}>+ Add line</button></div>
        <label className="block space-y-1 text-sm">Filter product choices<input type="search" className={purchaseInput} placeholder="Product name or SKU" value={productSearch} onChange={event => setProductSearch(event.target.value)} /></label>
        <div className="space-y-4">{rows.map((row, index) => {
          const selected = products.find(product => String(product.id) === row.productId);
          const priorLine = order?.lines.find(line => String(line.productId) === row.productId);
          return <div key={row.key} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold">Line {index + 1}</h3><button type="button" aria-label={`Remove line ${index + 1}`} className="text-sm text-rose-600 disabled:opacity-40" disabled={rows.length === 1} onClick={() => setRows(previous => previous.filter(item => item.key !== row.key))}>Remove</button></div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="space-y-1 text-sm lg:col-span-2">Product *<select required className={purchaseInput} value={row.productId} onChange={event => updateRow(row.key, { productId: event.target.value })}><option value="">Select product</option>
                {row.productId && !visibleProducts.some(product => String(product.id) === row.productId) && <option value={row.productId}>{selected?.name ?? priorLine?.product.name ?? `Product #${row.productId}`}</option>}
                {visibleProducts.map(product => <option key={product.id} value={product.id}>{product.name}{product.sku ? ` · ${product.sku}` : ''}</option>)}
              </select></label>
              <label className="space-y-1 text-sm">Quantity *<input required type="number" min="1" max="10000" step="1" className={purchaseInput} value={row.quantity} onChange={event => updateRow(row.key, { quantity: event.target.value })} /></label>
              <label className="space-y-1 text-sm">Unit cost *<input required type="number" min="0.01" step="any" className={purchaseInput} value={row.unitCost} onChange={event => updateRow(row.key, { unitCost: event.target.value })} /></label>
            </div>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-3"><label className="min-w-48 flex-1 space-y-1 text-sm">Line notes<input maxLength={1000} className={purchaseInput} value={row.notes} onChange={event => updateRow(row.key, { notes: event.target.value })} /></label><p className="py-2 text-sm font-semibold tabular-nums">Line total: {formatAmount((Number(row.quantity) || 0) * (Number(row.unitCost) || 0))}</p></div>
          </div>;
        })}</div>
        <p className="text-right font-semibold tabular-nums">Estimated total: {formatAmount(total)}</p>
      </section>
      <label className={`${purchaseCard} block space-y-2 text-sm`}>Order notes<textarea className={purchaseInput} maxLength={2000} rows={3} value={notes} onChange={event => setNotes(event.target.value)} /></label>
      <div className="flex flex-wrap justify-end gap-3"><Link href={order ? `/dashboard/purchases/${order.id}` : '/dashboard/purchases'} className={purchaseSecondary}>Back</Link><button className={purchaseButton} disabled={busy || mustReview}>{busy ? 'Saving…' : 'Save Draft'}</button></div>
    </fieldset>
  </form>;
}
