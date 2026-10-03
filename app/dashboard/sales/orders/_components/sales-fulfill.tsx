'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, type InventoryItemWithProduct } from '@/lib/api';
import { formatQuantity, validProductQuantity } from '@/lib/product-quantity';
import { salesOrdersApi, type FulfillSalesOrderInput } from '@/lib/sales-orders';
import { useDurableInventoryMutation } from '@/app/components/useDurableInventoryMutation';
import { useSalesResource } from './use-sales-resource';
import { SalesShell, SalesError, SalesLoading, salesButton, salesSecondary, salesInput, salesCard } from './sales-ui';

type Picked = { id: number; barcode: string; productId: number };
export default function SalesFulfillPage({ id }: { id: number }) {
  const router = useRouter();
  const load = useCallback(() => salesOrdersApi.get(id), [id]);
  const resource = useSalesResource(load);
  const order = resource.data;
  const [barcode, setBarcode] = useState('');
  const [lineId, setLineId] = useState('');
  const [picked, setPicked] = useState<Picked[]>([]);
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const operation = useDurableInventoryMutation<FulfillSalesOrderInput, Awaited<ReturnType<typeof salesOrdersApi.fulfill>>>(`fulfill:${id}`, (body, key) => salesOrdersApi.fulfill(id, body, key));
  useEffect(() => { if (operation.result?.sale?.id) router.push(`/dashboard/sales/orders/${id}`); }, [operation.result, router, id]);
  const remaining = order?.lines.filter(line => Number(line.quantity) > Number(line.fulfilledQuantity)) ?? [];
  const serialized = remaining.filter(line => line.product.trackingMode === 'SERIALIZED');
  const quantityLines = remaining.filter(line => line.product.trackingMode === 'QUANTITY');
  const scan = async (event: FormEvent) => {
    event.preventDefault(); const line = serialized.find(item => String(item.id) === lineId);
    if (!line || !barcode.trim()) { setError('Choose a serialized order line and enter a barcode.'); return; }
    setError('');
    try {
      const item = await api.get<InventoryItemWithProduct>('/inventory/scan', { barcode: barcode.trim() });
      if (!item || item.status !== 'in_stock' || item.productId !== line.productId) throw new Error('That barcode is not an in-stock unit of the selected product.');
      if (picked.some(value => value.id === item.id)) throw new Error('This inventory unit is already selected.');
      if (picked.filter(value => value.productId === line.productId).length >= Number(line.quantity) - Number(line.fulfilledQuantity)) throw new Error('This line has no remaining quantity.');
      setPicked(previous => [...previous, { id: item.id, barcode: item.barcode, productId: item.productId }]); setBarcode('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to scan barcode.'); }
  };
  const fulfill = () => {
    if (!order) return;
    const items: FulfillSalesOrderInput['items'] = [];
    for (const line of serialized) { const ids = picked.filter(item => item.productId === line.productId).map(item => item.id); if (ids.length) items.push({ salesOrderLineId: line.id, inventoryItemIds: ids }); }
    for (const line of quantityLines) {
      const raw = quantities[line.id]; if (!raw || Number(raw) === 0) continue;
      const available = Number(line.quantity) - Number(line.fulfilledQuantity);
      if (!validProductQuantity(raw, line.product) || Number(raw) > available) { setError(`Enter up to ${formatQuantity(available, line.product.baseUnit)} for ${line.product.name}, using at most ${line.product.quantityPrecision} decimals.`); return; }
      items.push({ salesOrderLineId: line.id, quantity: Number(raw) });
    }
    if (!items.length) { setError('Select at least one serialized unit or enter a quantity to fulfill.'); return; }
    setError(''); operation.run({ items, notes: notes.trim() || undefined });
  };
  const hasSelection = picked.length > 0 || Object.values(quantities).some(value => Number(value) > 0);
  return <SalesShell title="Fulfill Sales Order" description={order?.orderNumber} order={order ? { id, label: order.orderNumber } : undefined}>
    {resource.loading ? <SalesLoading /> : resource.error || !order ? <SalesError message={resource.error ?? 'Order unavailable.'} retry={resource.reload} /> : !['CONFIRMED', 'PARTIALLY_FULFILLED'].includes(order.status) ? <div className={salesCard}>This order cannot be fulfilled in its current status. <Link className="underline" href={`/dashboard/sales/orders/${id}`}>Back to order</Link></div> : <div className="space-y-5">
      {(error || operation.error) && <SalesError message={error || operation.error} retry={operation.pending ? operation.retry : resource.reload} />}
      {operation.pending && <div className={salesCard}><p className="mb-2 text-sm">A fulfillment is awaiting confirmation. Recover it before selecting more stock.</p><button className={salesButton} disabled={operation.busy} onClick={operation.retry}>Recover fulfillment result</button></div>}
      {!!serialized.length && <section className={`${salesCard} space-y-4`}><h2 className="font-semibold">Serialized products</h2><p className="text-sm text-slate-500">Scan each physical unit’s barcode.</p><form onSubmit={scan} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><label className="text-sm">Order line<select className={salesInput} value={lineId} onChange={event => setLineId(event.target.value)} required><option value="">Select line</option>{serialized.map(line => <option key={line.id} value={line.id}>{line.product.name} · {Number(line.quantity) - Number(line.fulfilledQuantity)} pieces remaining</option>)}</select></label><label className="text-sm">Barcode<input className={salesInput} value={barcode} onChange={event => setBarcode(event.target.value)} required /></label><button className={salesSecondary} disabled={operation.busy || !!operation.pending}>Add unit</button></form>{serialized.map(line => <div key={line.id} className="rounded-xl border p-3 text-sm"><strong>{line.product.name}</strong><div className="mt-2 flex flex-wrap gap-2">{picked.filter(item => item.productId === line.productId).map(item => <button type="button" key={item.id} className={salesSecondary} onClick={() => setPicked(values => values.filter(value => value.id !== item.id))}>{item.barcode} ×</button>)}</div></div>)}</section>}
      {!!quantityLines.length && <section className={`${salesCard} space-y-4`}><h2 className="font-semibold">Quantity products</h2><p className="text-sm text-slate-500">Enter the amount delivered in each product’s base unit.</p>{quantityLines.map(line => { const available = Number(line.quantity) - Number(line.fulfilledQuantity); return <label key={line.id} className="block text-sm">{line.product.name} · {formatQuantity(available, line.product.baseUnit)} remaining<input aria-label={`Fulfill quantity for ${line.product.name}`} className={salesInput} type="number" min={10 ** -line.product.quantityPrecision} max={available} step={10 ** -line.product.quantityPrecision} value={quantities[line.id] ?? ''} onChange={event => setQuantities(values => ({ ...values, [line.id]: event.target.value }))} /></label>; })}</section>}
      <label className={`${salesCard} block space-y-2 text-sm`}>Fulfillment notes<textarea className={salesInput} maxLength={1000} rows={2} value={notes} onChange={event => setNotes(event.target.value)} /></label>
      <div className="flex justify-end gap-2"><Link href={`/dashboard/sales/orders/${id}`} className={salesSecondary}>Back to order</Link><button type="button" className={salesButton} disabled={operation.busy || !!operation.pending || !operation.ready || !hasSelection} onClick={fulfill}>{operation.busy ? 'Processing…' : 'Fulfill selected stock'}</button></div>
    </div>}
  </SalesShell>;
}
