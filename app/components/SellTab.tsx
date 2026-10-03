'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { realApi, type Customer, type InventoryItemWithProduct, type Product, type CheckoutInput, type CheckoutResponse } from '@/lib/api';
import { getPurchaseCatalog } from '@/lib/purchases';
import { formatQuantity, validProductQuantity } from '@/lib/product-quantity';
import { salesButton, salesCard, salesInput, salesSecondary } from '../dashboard/sales/orders/_components/sales-ui';
import { useDurableInventoryMutation } from './useDurableInventoryMutation';

type CartLine =
  | { key: string; kind: 'SERIALIZED'; item: InventoryItemWithProduct; product: Product; quantity: 1; salePrice: string; discountAmount: string; notes: string }
  | { key: string; kind: 'QUANTITY'; product: Product; quantity: string; salePrice: string; discountAmount: string; notes: string };
const CART_KEY = 'mixed-checkout-cart:v1';
const loadCart = (): CartLine[] => { try { const value = localStorage.getItem(CART_KEY); return value ? JSON.parse(value) : []; } catch { return []; } };

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
  const operation = useDurableInventoryMutation<CheckoutInput, CheckoutResponse>('checkout', realApi.sellBatchItems);
  useEffect(() => { setCart(loadCart()); void getPurchaseCatalog().then(setProducts).catch(cause => showMessage('error', cause instanceof Error ? cause.message : 'Unable to load products.')); void realApi.getCustomers().then(setCustomers).catch(() => showMessage('error', 'Unable to load customers.')); }, [showMessage]);
  useEffect(() => { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch { /* submitted operations remain recoverable */ } }, [cart]);
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
      setCart(lines => [...lines, { key: `unit:${item.id}`, kind: 'SERIALIZED', item, product: item.product, quantity: 1, salePrice: String(item.product.basePrice), discountAmount: '', notes: '' }]); setBarcode('');
    } catch (cause) { showMessage('error', cause instanceof Error ? cause.message : 'Unable to scan barcode.'); } finally { setScanning(false); }
  };
  const addQuantity = (event: FormEvent) => {
    event.preventDefault(); if (!selectedProduct) return;
    const tracking = { trackingMode: 'QUANTITY' as const, baseUnit: selectedProduct.baseUnit ?? 'piece', quantityPrecision: selectedProduct.quantityPrecision ?? 0 };
    if (!validProductQuantity(quantity, tracking)) { showMessage('error', `Enter a positive quantity with at most ${tracking.quantityPrecision} decimal places.`); return; }
    setCart(lines => [...lines.filter(line => !(line.kind === 'QUANTITY' && line.product.id === selectedProduct.id)), { key: `product:${selectedProduct.id}`, kind: 'QUANTITY', product: selectedProduct, quantity, salePrice: String(selectedProduct.basePrice), discountAmount: '', notes: '' }]); setProductId(''); setQuantity('');
  };
  const update = (key: string, field: 'quantity' | 'salePrice' | 'discountAmount' | 'notes', value: string) => setCart(lines => lines.map(line => line.key === key ? { ...line, [field]: value } as CartLine : line));
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

  return <div className="mx-auto max-w-5xl space-y-5 p-6">
    <header><h1 className="text-2xl font-semibold">POS Checkout</h1><p className="text-sm text-slate-500">Scan serialized items and add measured products in the same cart.</p></header>
    <div className="grid gap-4 lg:grid-cols-2">
      <form onSubmit={scan} className={`${salesCard} space-y-3`}><h2 className="font-semibold">Serialized item</h2><label className="text-sm">Barcode<input className={salesInput} value={barcode} onChange={event => setBarcode(event.target.value)} placeholder="Scan or enter barcode" /></label><button className={salesButton} disabled={!barcode.trim() || scanning}>{scanning ? 'Scanning…' : 'Add barcode'}</button></form>
      <form onSubmit={addQuantity} className={`${salesCard} space-y-3`}><h2 className="font-semibold">Quantity product</h2><label className="text-sm">Product<select className={salesInput} value={productId} onChange={event => { setProductId(event.target.value); setQuantity(''); }}><option value="">Choose product</option>{quantityProducts.map(product => <option key={product.id} value={product.id}>{product.name} · {product.baseUnit}</option>)}</select></label><label className="text-sm">Quantity{selectedProduct ? ` (${selectedProduct.baseUnit})` : ''}<input className={salesInput} type="number" min={selectedProduct?.quantityPrecision ? 10 ** -selectedProduct.quantityPrecision : 1} step={selectedProduct?.quantityPrecision ? 10 ** -selectedProduct.quantityPrecision : 1} value={quantity} onChange={event => setQuantity(event.target.value)} /></label><button className={salesButton} disabled={!selectedProduct || !quantity}>Add quantity</button></form>
    </div>
    <section className={`${salesCard} space-y-4`}><h2 className="font-semibold">Cart · {cart.length} lines</h2>{!cart.length ? <p className="text-sm text-slate-500">Scan an item or add a quantity product.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{['Product', 'Quantity', 'Price / unit', 'Line discount', 'Notes', ''].map(label => <th className="p-2" key={label}>{label}</th>)}</tr></thead><tbody>{cart.map(line => <tr className="border-t" key={line.key}><td className="p-2"><p>{line.product.name}</p><p className="text-xs text-slate-500">{line.kind === 'SERIALIZED' ? line.item.barcode : 'Measured stock'}</p></td><td className="p-2">{line.kind === 'SERIALIZED' ? formatQuantity(1, 'piece') : <input aria-label={`Quantity for ${line.product.name}`} className={salesInput} type="number" step={10 ** -(line.product.quantityPrecision ?? 0)} value={line.quantity} onChange={event => update(line.key, 'quantity', event.target.value)} />}</td><td className="p-2"><input aria-label={`Price for ${line.product.name}`} className={salesInput} type="number" min="0" step="0.01" value={line.salePrice} onChange={event => update(line.key, 'salePrice', event.target.value)} /></td><td className="p-2"><input aria-label={`Discount for ${line.product.name}`} className={salesInput} type="number" min="0" step="0.01" value={line.discountAmount} onChange={event => update(line.key, 'discountAmount', event.target.value)} /></td><td className="p-2"><input aria-label={`Notes for ${line.product.name}`} className={salesInput} value={line.notes} onChange={event => update(line.key, 'notes', event.target.value)} /></td><td><button type="button" className={salesSecondary} onClick={() => setCart(lines => lines.filter(item => item.key !== line.key))}>Remove</button></td></tr>)}</tbody></table></div>}
      <dl className="grid grid-cols-3 gap-3 text-sm"><div><dt>Gross</dt><dd>{totals.gross.toFixed(2)}</dd></div><div><dt>Discount</dt><dd>{totals.discount.toFixed(2)}</dd></div><div><dt>Expected net</dt><dd>{totals.net.toFixed(2)}</dd></div></dl><p className="text-xs text-slate-500">The backend returns the authoritative sale totals.</p>
    </section>
    <section className={`${salesCard} space-y-3`}><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Payment method<select className={salesInput} value={paymentMethod} onChange={event => setPaymentMethod(event.target.value as 'CASH' | 'CREDIT')}><option value="CASH">Cash</option><option value="CREDIT">Credit</option></select></label><label className="text-sm">Customer {paymentMethod === 'CREDIT' ? '(required)' : '(optional)'}<select className={salesInput} value={customerId} onChange={event => setCustomerId(event.target.value)}><option value="">No customer</option>{customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name} · {customer.phone}</option>)}</select></label></div>
      {!operation.result && <button className={salesButton} disabled={!cart.length || operation.busy || !!operation.pending || !operation.ready} onClick={checkout}>{operation.busy ? 'Completing…' : 'Complete sale'}</button>}{operation.error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{operation.error}</p>}{operation.pending && <button className={salesSecondary} onClick={operation.retry} disabled={operation.busy}>Recover checkout result</button>}
      {operation.result && <div role="status" className="space-y-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900"><p>Sale <strong>{operation.result.salesRecord.saleNumber}</strong> completed.</p><p>Backend total: {Number(operation.result.salesRecord.netAmount).toFixed(2)} · {operation.result.soldItems.length} serialized units sold.</p><div className="flex gap-2"><Link className={salesButton} href={`/dashboard/sales/records/${operation.result.salesRecord.id}`}>View sale</Link><button className={salesSecondary} onClick={finish}>New checkout</button></div></div>}
    </section>
  </div>;
}
