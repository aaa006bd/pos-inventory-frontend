'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { inventoryReturnsApi, validateReturnQuantity, type CustomerReturnInput } from '@/lib/inventory-returns';
import { formatQuantity, type BaseUnit } from '@/lib/product-quantity';
import { formatSalesAmount, salesOrdersApi } from '@/lib/sales-orders';
import { useDurableInventoryMutation } from '@/app/components/useDurableInventoryMutation';
import { useSalesResource } from './use-sales-resource';
import { SalesShell, SalesError, SalesLoading, salesButton, salesCard, salesInput, salesSecondary } from './sales-ui';

export default function CustomerReturn({ saleId }: { saleId: number }) {
  const load = useCallback(() => salesOrdersApi.sale(saleId), [saleId]);
  const sale = useSalesResource(load);
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [restockable, setRestockable] = useState<Record<number, boolean>>({});
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const operation = useDurableInventoryMutation<CustomerReturnInput, Awaited<ReturnType<typeof inventoryReturnsApi.create>>>(`customer-return:${saleId}`, inventoryReturnsApi.create);
  const submit = () => {
    if (!sale.data) return;
    const items: CustomerReturnInput['items'] = [];
    for (const line of sale.data.lines.filter(value => selected[value.id])) {
      if (line.barcode) items.push({ barcode: line.barcode, restockable: restockable[line.id] !== false });
      else {
        const raw = amounts[line.id] ?? '';
        if (!validateReturnQuantity(line, raw)) { setError(`Enter a valid return quantity for ${line.product.name}, no more than ${formatQuantity(Number(line.quantity) - Number(line.returnedQuantity), line.baseUnit as BaseUnit)}.`); return; }
        items.push({ salesRecordLineId: line.id, quantity: Number(raw), restockable: restockable[line.id] !== false });
      }
    }
    if (!items.length) { setError('Select at least one original sale line.'); return; }
    setError(''); operation.run({ type: 'customer_return', salesRecordId: saleId, items, notes: notes.trim() || undefined });
  };
  return <SalesShell section="records" title="Customer Return" description={sale.data?.saleNumber}>
    {sale.loading ? <SalesLoading /> : sale.error || !sale.data ? <SalesError message={sale.error ?? 'Sale unavailable.'} retry={sale.reload} /> : <div className="space-y-5">
      <section className={`${salesCard} space-y-3`}><p>Select quantities from the original sale. Previously returned quantities cannot be returned again.</p>{sale.data.lines.map(line => { const remaining = Number(line.quantity) - Number(line.returnedQuantity); return <div key={line.id} className="grid gap-3 rounded-xl border p-3 sm:grid-cols-[auto_1fr_1fr_auto]"><input aria-label={`Return ${line.product.name}`} type="checkbox" checked={!!selected[line.id]} disabled={remaining <= 0 || !!operation.pending || !!operation.result} onChange={event => setSelected(values => ({ ...values, [line.id]: event.target.checked }))} /><div><p className="font-semibold">{line.product.name}</p><p className="text-xs text-slate-500">{line.barcode ?? `Sale line #${line.id}`} · {formatQuantity(remaining, line.baseUnit as BaseUnit)} returnable</p></div>{line.barcode ? <span>1 piece</span> : <label className="text-sm">Return quantity ({line.baseUnit})<input className={salesInput} type="number" min={10 ** -(line.product.quantityPrecision ?? 3)} max={remaining} step={10 ** -(line.product.quantityPrecision ?? 3)} value={amounts[line.id] ?? ''} onChange={event => setAmounts(values => ({ ...values, [line.id]: event.target.value }))} /></label>}<label className="text-sm"><input type="checkbox" checked={restockable[line.id] !== false} onChange={event => setRestockable(values => ({ ...values, [line.id]: event.target.checked }))} /> Restockable</label></div>; })}</section>
      <label className={`${salesCard} block text-sm`}>Return notes<textarea className={salesInput} value={notes} onChange={event => setNotes(event.target.value)} /></label>
      {(error || operation.error) && <SalesError message={error || operation.error} />}{operation.pending && <button className={salesButton} onClick={operation.retry}>Recover return result</button>}
      {!operation.result && <div className="flex gap-2"><Link className={salesSecondary} href={`/dashboard/sales/records/${saleId}`}>Cancel</Link><button className={salesButton} disabled={!operation.ready || operation.busy || !!operation.pending} onClick={submit}>{operation.busy ? 'Submitting…' : 'Submit return'}</button></div>}
      {operation.result && <section className={`${salesCard} space-y-2 bg-emerald-50 text-emerald-950`} role="status"><h2 className="font-semibold">Return {operation.result.returnNumber} completed</h2><p>Return value: {formatSalesAmount(operation.result.refundAmount)}</p><p>{sale.data.paymentMethod === 'CREDIT' ? 'This reduces customer debt and may restore existing customer credit. It is not a cash refund.' : 'Cash refund due according to the completed return.'}</p><Link className={salesButton} href={`/dashboard/sales/records/${saleId}`}>Back to sale</Link></section>}
    </div>}
  </SalesShell>;
}
