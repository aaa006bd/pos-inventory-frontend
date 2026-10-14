'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { realApi, type Customer, type InventoryItemWithProduct, type Product, type CheckoutInput, type CheckoutResponse } from '@/lib/api';
import { getPurchaseCatalog } from '@/lib/purchases';
import { formatQuantity, validProductQuantity } from '@/lib/product-quantity';
import { useDurableInventoryMutation } from './useDurableInventoryMutation';
import { checkoutQuantitySummary } from '@/lib/checkout-summary';

type CartLine =
  | { key: string; kind: 'SERIALIZED'; item: InventoryItemWithProduct; product: Product; quantity: 1; salePrice: string; discountAmount: string; notes: string }
  | { key: string; kind: 'QUANTITY'; product: Product; quantity: string; salePrice: string; discountAmount: string; notes: string };
const CART_KEY = 'mixed-checkout-cart:v1';
const loadCart = (): CartLine[] => { try { const value = localStorage.getItem(CART_KEY); return value ? JSON.parse(value) : []; } catch { return []; } };
const cardClass = 'rounded-[28px] border border-white/80 bg-white/88 p-7 shadow-[0_30px_80px_-36px_rgba(15,23,42,0.30)] backdrop-blur dark:border-slate-700/70 dark:bg-slate-800/90';
const inputClass = 'w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-sky-500 dark:focus:bg-slate-700 dark:focus:ring-sky-900/50';
const compactInputClass = 'w-full min-w-20 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-xs text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-100 dark:focus:border-sky-500 dark:focus:bg-slate-700 dark:focus:ring-sky-900/50';

export default function SellTab({ showMessage }: { showMessage: (type: 'success' | 'error', text: string) => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [barcode, setBarcode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CREDIT'>('CASH');
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '', address: '' });
  const operation = useDurableInventoryMutation<CheckoutInput, CheckoutResponse>('checkout', realApi.sellBatchItems, () => {
    setCart([]);
    try { localStorage.removeItem(CART_KEY); } catch { /* the in-memory cart is still cleared */ }
  });
  useEffect(() => { setCart(loadCart()); void getPurchaseCatalog().then(setProducts).catch(cause => showMessage('error', cause instanceof Error ? cause.message : 'Unable to load products.')); void realApi.getCustomers().then(setCustomers).catch(() => showMessage('error', 'Unable to load customers.')); }, [showMessage]);
  useEffect(() => { try { if (cart.length) localStorage.setItem(CART_KEY, JSON.stringify(cart)); else localStorage.removeItem(CART_KEY); } catch { /* submitted operations remain recoverable */ } }, [cart]);
  const quantityProducts = products.filter(product => product.active && product.trackingMode === 'QUANTITY');
  const selectedProduct = quantityProducts.find(product => product.id === Number(productId));
  const totals = useMemo(() => cart.reduce((result, line) => { const gross = Number(line.salePrice) * Number(line.quantity); const discount = Number(line.discountAmount || 0); return { gross: result.gross + gross, discount: result.discount + discount, net: result.net + gross - discount }; }, { gross: 0, discount: 0, net: 0 }), [cart]);

  const scan = async (event: FormEvent) => {
    event.preventDefault(); if (!barcode.trim() || scanning) return; setScanning(true);
    try {
      const item = await realApi.scanBarcode(barcode.trim());
      if (item.status !== 'in_stock') throw new Error(`Item is ${item.status}, not in stock.`);
      if ((item.product.trackingMode ?? 'SERIALIZED') !== 'SERIALIZED') throw new Error('Quantity products must be added by product and quantity.');
      if (cart.some(line => line.kind === 'SERIALIZED' && line.item.id === item.id)) throw new Error('This barcode is already in the cart.');
      if (operation.result) operation.reset();
      setCart(lines => [...lines, { key: `unit:${item.id}`, kind: 'SERIALIZED', item, product: item.product, quantity: 1, salePrice: String(item.product.basePrice), discountAmount: '', notes: '' }]); setBarcode('');
    } catch (cause) { showMessage('error', cause instanceof Error ? cause.message : 'Unable to scan barcode.'); } finally { setScanning(false); }
  };
  const addQuantity = (event: FormEvent) => {
    event.preventDefault(); if (!selectedProduct) return;
    const tracking = { trackingMode: 'QUANTITY' as const, baseUnit: selectedProduct.baseUnit ?? 'piece', quantityPrecision: selectedProduct.quantityPrecision ?? 0 };
    if (!validProductQuantity(quantity, tracking)) { showMessage('error', `Enter a positive quantity with at most ${tracking.quantityPrecision} decimal places.`); return; }
    if (operation.result) operation.reset();
    setCart(lines => [...lines.filter(line => !(line.kind === 'QUANTITY' && line.product.id === selectedProduct.id)), { key: `product:${selectedProduct.id}`, kind: 'QUANTITY', product: selectedProduct, quantity, salePrice: String(selectedProduct.basePrice), discountAmount: '', notes: '' }]); setProductId(''); setQuantity('');
  };
  const update = (key: string, field: 'quantity' | 'salePrice' | 'discountAmount' | 'notes', value: string) => setCart(lines => lines.map(line => line.key === key ? { ...line, [field]: value } as CartLine : line));
  const createCustomer = async () => {
    const customerInput = {
      name: newCustomer.name.trim(),
      phone: newCustomer.phone.trim(),
      email: newCustomer.email.trim(),
      address: newCustomer.address.trim(),
    };
    if (!customerInput.name || !customerInput.phone || !customerInput.email) {
      showMessage('error', 'Please fill in name, phone, and email.');
      return;
    }
    try {
      const customer = await realApi.createCustomer(customerInput);
      setCustomers(current => [...current, customer]);
      setCustomerId(String(customer.id));
      setShowCustomerForm(false);
      setNewCustomer({ name: '', phone: '', email: '', address: '' });
      showMessage('success', 'Customer created successfully.');
    } catch (cause) {
      showMessage('error', cause instanceof Error ? cause.message : 'Unable to create customer.');
    }
  };
  const checkout = () => {
    if (!cart.length) return;
    if (paymentMethod === 'CREDIT' && !customerId) { showMessage('error', 'Select a customer for a credit sale.'); return; }
    for (const line of cart) {
      const tracking = { trackingMode: line.kind, baseUnit: line.product.baseUnit ?? 'piece', quantityPrecision: line.product.quantityPrecision ?? 0 };
      const gross = Number(line.salePrice) * Number(line.quantity);
      if (!validProductQuantity(line.quantity, tracking) || !Number.isFinite(Number(line.salePrice)) || Number(line.salePrice) < 0 || !Number.isFinite(Number(line.discountAmount || 0)) || Number(line.discountAmount || 0) < 0 || Number(line.discountAmount || 0) > gross) { showMessage('error', `Check quantity, price, and line discount for ${line.product.name}.`); return; }
    }
    operation.run({ paymentMethod, ...(customerId ? { customerId: Number(customerId) } : {}), items: cart.map(line => line.kind === 'SERIALIZED' ? { barcode: line.item.barcode, salePrice: Number(line.salePrice), discountAmount: Number(line.discountAmount || 0), notes: line.notes || undefined } : { productId: line.product.id, quantity: Number(line.quantity), salePrice: Number(line.salePrice), discountAmount: Number(line.discountAmount || 0), notes: line.notes || undefined }) });
  };
  const finish = () => { operation.reset(); setCart([]); try { localStorage.removeItem(CART_KEY); } catch {} };

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.10),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(249,115,22,0.08),transparent_30%),linear-gradient(160deg,#f8fafc_0%,#eef6ff_50%,#fff7ed_100%)] p-4 dark:bg-none dark:bg-slate-950 sm:p-6">
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/75 px-4 py-2 text-sm text-slate-600 shadow-[0_10px_35px_-22px_rgba(15,23,42,0.4)] backdrop-blur dark:border-slate-700/70 dark:bg-slate-800/75 dark:text-slate-300">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-900">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
            </span>
            Point of Sale
          </div>
          {cart.length > 0 && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:border-sky-700/50 dark:bg-sky-900/30 dark:text-sky-300">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
              {cart.length} {cart.length === 1 ? 'item' : 'items'} in cart
            </div>
          )}
        </div>

        <section className={cardClass}>
          <div className="mb-1.5 h-1 w-10 rounded-full bg-linear-to-r from-sky-500 to-orange-400" />
          <div className="mb-5">
            <div className="mb-2 inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 dark:bg-slate-700 dark:text-slate-300">Add items</div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Scan serialized stock or add a measured quantity to this sale</p>
          </div>

          <form onSubmit={scan}>
            <label htmlFor="pos-barcode" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Scan barcode</label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input id="pos-barcode" aria-label="Barcode" className={inputClass} value={barcode} onChange={event => setBarcode(event.target.value)} placeholder="Scan or enter barcode..." disabled={scanning} autoFocus />
              <button type="submit" disabled={!barcode.trim() || scanning} className="shrink-0 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 dark:disabled:bg-slate-600 dark:disabled:text-slate-400">{scanning ? 'Scanning…' : 'Add barcode'}</button>
            </div>
          </form>

          <div className="my-5 flex items-center gap-3"><div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" /><span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">or measured stock</span><div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" /></div>

          <form onSubmit={addQuantity} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-end">
            <label htmlFor="pos-product" className="text-sm font-medium text-slate-700 dark:text-slate-300">Product
              <select id="pos-product" className={`${inputClass} mt-2`} value={productId} onChange={event => { setProductId(event.target.value); setQuantity(''); }}>
                <option value="">Choose quantity product</option>
                {quantityProducts.map(product => <option key={product.id} value={product.id}>{product.name} · {product.baseUnit}</option>)}
              </select>
            </label>
            <label htmlFor="pos-quantity" className="text-sm font-medium text-slate-700 dark:text-slate-300">Quantity{selectedProduct ? ` (${selectedProduct.baseUnit})` : ''}
              <input id="pos-quantity" className={`${inputClass} mt-2`} type="number" min={selectedProduct?.quantityPrecision ? 10 ** -selectedProduct.quantityPrecision : 1} step={selectedProduct?.quantityPrecision ? 10 ** -selectedProduct.quantityPrecision : 1} value={quantity} onChange={event => setQuantity(event.target.value)} />
            </label>
            <button type="submit" disabled={!selectedProduct || !quantity} className="rounded-2xl border border-slate-200 bg-white/70 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-700">Add quantity</button>
          </form>
        </section>

        <section className={`relative z-10 ${cardClass}`}>
          <div className="mb-1.5 h-1 w-10 rounded-full bg-linear-to-r from-orange-400 to-sky-500" />
          <div className="mb-5">
            <div className="mb-2 inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 dark:bg-slate-700 dark:text-slate-300">Customer</div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Select an existing customer or create a new one</p>
          </div>
          <label htmlFor="pos-customer" className="sr-only">Customer</label>
          <select id="pos-customer" className={inputClass} value={customerId} onChange={event => setCustomerId(event.target.value)}>
            <option value="">Walk-in customer</option>
            {customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name} · {customer.phone}</option>)}
          </select>
          <button type="button" onClick={() => setShowCustomerForm(current => !current)} className="mt-3 w-full rounded-2xl border border-slate-200 bg-white/70 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-700">{showCustomerForm ? 'Cancel new customer' : '+ New Customer'}</button>
          {showCustomerForm && (
            <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-700 dark:bg-slate-900/25 sm:grid-cols-2">
              {(['name', 'phone', 'email', 'address'] as const).map(field => (
                <label key={field} className="text-xs font-medium capitalize text-slate-600 dark:text-slate-300">{field}{field !== 'address' && ' *'}
                  <input type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'} className={`${inputClass} mt-2`} value={newCustomer[field]} onChange={event => setNewCustomer(current => ({ ...current, [field]: event.target.value }))} />
                </label>
              ))}
              <button type="button" onClick={createCustomer} className="rounded-2xl bg-slate-950 py-3 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 sm:col-span-2">Create Customer</button>
            </div>
          )}
        </section>

        {operation.result && <div role="status" className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 shadow-sm dark:border-emerald-700/50 dark:bg-emerald-900/20 dark:text-emerald-200"><p>Sale <strong>{operation.result.salesRecord.saleNumber}</strong> completed. The cart is ready for the next checkout.</p><p>Backend total: {Number(operation.result.salesRecord.netAmount).toFixed(2)} · {checkoutQuantitySummary(operation.result.salesRecord.lines, operation.result.soldItems.length)}</p><div className="flex gap-2"><Link className="flex-1 rounded-xl bg-emerald-700 px-3 py-2 text-center text-xs font-semibold text-white" href={`/dashboard/sales/records/${operation.result.salesRecord.id}`}>View sale</Link><button type="button" className="flex-1 rounded-xl border border-emerald-300 bg-white/70 px-3 py-2 text-xs font-semibold text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200" onClick={finish}>Dismiss</button></div></div>}

        {cart.length === 0 ? (
          <section className={`${cardClass} py-12 text-center`}>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"><svg className="h-8 w-8 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13 5.4 5M7 13l-2.3 2.3c-.63.63-.18 1.7.7 1.7H17m0 0a2 2 0 100 4 2 2 0 000-4Zm-8 2a2 2 0 11-4 0 2 2 0 014 0Z" /></svg></div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Cart is empty</p>
            <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">Add an item above to begin checkout</p>
          </section>
        ) : (
          <section className={cardClass}>
            <div className="mb-1.5 h-1 w-10 rounded-full bg-linear-to-r from-sky-500 to-orange-400" />
            <div className="mb-5 inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 dark:bg-slate-700 dark:text-slate-300">Cart — {cart.length} {cart.length === 1 ? 'item' : 'items'}</div>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
              <table className="min-w-205">
                <thead><tr>{['Product', 'Reference', 'Quantity', 'Price / unit', 'Discount', 'Notes', ''].map(label => <th key={label}>{label}</th>)}</tr></thead>
                <tbody>{cart.map(line => (
                  <tr key={line.key}>
                    <td className="font-semibold text-slate-900 dark:text-slate-100">{line.product.name}</td>
                    <td className="font-mono text-xs text-slate-500 dark:text-slate-400">{line.kind === 'SERIALIZED' ? line.item.barcode : line.product.baseUnit}</td>
                    <td>{line.kind === 'SERIALIZED' ? formatQuantity(1, 'piece') : <input aria-label={`Quantity for ${line.product.name}`} className={compactInputClass} type="number" min={10 ** -(line.product.quantityPrecision ?? 0)} step={10 ** -(line.product.quantityPrecision ?? 0)} value={line.quantity} onChange={event => update(line.key, 'quantity', event.target.value)} />}</td>
                    <td><input aria-label={`Price for ${line.product.name}`} className={compactInputClass} type="number" min="0" step="0.01" value={line.salePrice} onChange={event => update(line.key, 'salePrice', event.target.value)} /></td>
                    <td><input aria-label={`Discount for ${line.product.name}`} className={compactInputClass} type="number" min="0" step="0.01" placeholder="0.00" value={line.discountAmount} onChange={event => update(line.key, 'discountAmount', event.target.value)} /></td>
                    <td><input aria-label={`Notes for ${line.product.name}`} className={compactInputClass} placeholder="Notes..." value={line.notes} onChange={event => update(line.key, 'notes', event.target.value)} /></td>
                    <td className="text-right"><button type="button" aria-label={`Remove ${line.product.name}`} title="Remove" onClick={() => setCart(lines => lines.filter(item => item.key !== line.key))} className="rounded-xl p-2 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500 dark:text-slate-600 dark:hover:bg-rose-900/20"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>

            <dl className="mt-5 space-y-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-700 dark:bg-slate-800/70">
              <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400"><dt>Subtotal ({cart.length} {cart.length === 1 ? 'item' : 'items'})</dt><dd className="font-medium text-slate-900 dark:text-slate-100">৳{totals.gross.toFixed(2)}</dd></div>
              <div className="flex items-center justify-between text-sm"><dt className="text-slate-600 dark:text-slate-400">Discount</dt><dd className="font-medium text-rose-600 dark:text-rose-400">−৳{totals.discount.toFixed(2)}</dd></div>
              <div className="mt-1 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-700"><dt className="font-semibold text-slate-900 dark:text-slate-100">Total</dt><dd className="text-lg font-semibold text-slate-950 dark:text-white">৳{totals.net.toFixed(2)}</dd></div>
            </dl>

            <div className="mt-5">
              <p className="mb-2.5 text-sm font-medium text-slate-700 dark:text-slate-300">Payment Method *</p>
              <div className="grid grid-cols-2 gap-2">{(['CASH', 'CREDIT'] as const).map(method => <button key={method} type="button" onClick={() => setPaymentMethod(method)} className={`rounded-2xl border py-2.5 text-sm font-semibold transition ${paymentMethod === method ? 'border-slate-900 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-900' : 'border-slate-200 bg-white/70 text-slate-600 hover:border-slate-300 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-300 dark:hover:border-slate-500'}`}>{method}</button>)}</div>
            </div>

            {paymentMethod === 'CREDIT' && !customerId && <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-700 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-300">Select a customer above to complete a credit sale.</div>}
            <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">The backend returns the authoritative sale totals.</p>
            {!operation.result && <button type="button" onClick={checkout} disabled={!cart.length || operation.busy || !!operation.pending || !operation.ready} className="mt-4 flex w-full items-center justify-center rounded-2xl bg-slate-950 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 dark:disabled:bg-slate-600 dark:disabled:text-slate-400">{operation.busy ? 'Completing…' : 'Complete sale'}</button>}
            {operation.error && <p role="alert" className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-700/50 dark:bg-rose-900/20 dark:text-rose-300">{operation.error}</p>}
            {operation.pending && <button type="button" className="mt-3 w-full rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" onClick={operation.retry} disabled={operation.busy}>Recover checkout result</button>}
          </section>
        )}
      </div>
    </div>
  );
}
