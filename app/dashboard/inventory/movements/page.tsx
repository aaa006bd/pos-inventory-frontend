'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { emptyMovementFilters, getInventoryMovements, movementDelta, movementQuery, movementSourceLabel, movementSourceLink, movementTypes, stockStatuses, type InventoryMovement, type MovementFilters } from '@/lib/inventory-movements';
import { getPurchaseCatalog } from '@/lib/purchases';
import { useSalesResource } from '../../sales/orders/_components/use-sales-resource';
import { SalesError, salesButton, salesCard, salesInput, salesSecondary } from '../../sales/orders/_components/sales-ui';

function Source({ row }: { row: InventoryMovement }) {
  const href = movementSourceLink(row);
  return href ? <Link className="text-sky-700 underline dark:text-sky-300" href={href}>{movementSourceLabel(row)}</Link> : <span>{movementSourceLabel(row)}</span>;
}
const dateLabel = (date: string) => new Date(date).toLocaleString();

export default function InventoryMovementsPage() {
  const [draft, setDraft] = useState<MovementFilters>(emptyMovementFilters);
  const [filters, setFilters] = useState<MovementFilters>(emptyMovementFilters);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<InventoryMovement | null>(null);
  const [itemLabel, setItemLabel] = useState('');
  const load = useCallback(() => getInventoryMovements(filters, page), [filters, page]);
  const ledger = useSalesResource(load);
  const catalog = useSalesResource(getPurchaseCatalog);
  const apply = (event: FormEvent) => {
    event.preventDefault();
    try { movementQuery(draft, 1); setError(''); setFilters({ ...draft }); setPage(1); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Check the filters.'); }
  };
  const clear = () => { setDraft(emptyMovementFilters); setFilters(emptyMovementFilters); setPage(1); setItemLabel(''); setError(''); };
  const itemHistory = (row: InventoryMovement) => {
    const next = { ...emptyMovementFilters, ...(row.inventoryItemId === null ? { productId: String(row.productId) } : { inventoryItemId: row.inventoryItemId }) };
    setDraft(next); setFilters(next); setPage(1); setItemLabel(row.barcode ?? row.productName); setSelected(null); setError('');
  };
  const data = ledger.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  return <div className="mx-auto max-w-6xl space-y-5 pb-8">
    <nav aria-label="Breadcrumb" className="text-sm text-slate-500"><Link href="/dashboard/inventory/list">Inventory</Link> / Movements</nav>
    <header className="flex flex-wrap justify-between gap-3"><div><h1 className="text-2xl font-semibold">Inventory Movements</h1><p className="text-sm text-slate-500">See what changed in stock and trace its source. History is read-only.</p></div><button className={salesSecondary} onClick={ledger.reload}>Refresh</button></header>
    <form onSubmit={apply} className={`${salesCard} space-y-4`}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">Product<select className={salesInput} value={draft.productId} onChange={event => setDraft({ ...draft, productId: event.target.value })}><option value="">All products</option>{catalog.data?.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
        <label className="text-sm">Movement type<select className={salesInput} value={draft.type} onChange={event => setDraft({ ...draft, type: event.target.value })}><option value="">All movements</option>{Object.entries(movementTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="text-sm">From date<input className={salesInput} type="date" value={draft.from} onChange={event => setDraft({ ...draft, from: event.target.value })} /></label>
        <label className="text-sm">To date<input className={salesInput} type="date" value={draft.to} onChange={event => setDraft({ ...draft, to: event.target.value })} /></label>
      </div>
      <details><summary className="cursor-pointer text-sm">More filters</summary><label className="mt-3 block max-w-xs text-sm">Resulting status<select className={salesInput} value={draft.toStatus} onChange={event => setDraft({ ...draft, toStatus: event.target.value })}><option value="">All statuses</option>{Object.entries(stockStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></details>
      <p className="text-xs text-slate-500">Dates include the whole day in your local timezone.</p>
      {filters.inventoryItemId && <p className="text-sm">Item history: <strong>{itemLabel || `Item #${filters.inventoryItemId}`}</strong></p>}
      <div className="flex gap-2"><button className={salesButton}>Apply filters</button><button type="button" className={salesSecondary} onClick={clear}>Clear filters</button></div>
      {error && <SalesError message={error} />}
      {catalog.error && <SalesError message="Product choices could not be loaded. Other filters remain available." retry={catalog.reload} />}
    </form>
    {ledger.loading ? <p role="status">Loading movements…</p> : ledger.error ? <SalesError message={ledger.error} retry={ledger.reload} /> : data && <>
      <div className="grid gap-3 sm:grid-cols-2"><div className={salesCard}><p className="text-sm text-slate-500">Matching movements</p><p className="text-2xl font-semibold">{data.total}</p></div><div className={salesCard}><p className="text-sm text-slate-500">Net stock change</p><p className="text-2xl font-semibold">{Object.entries(data.netQuantityByUnit).map(([unit, value]) => <span className="mr-4 inline-block" key={unit}>{value! > 0 ? '+' : ''}{value} {unit}</span>)}{Object.keys(data.netQuantityByUnit).length === 0 && 'No movement'}</p><p className="text-xs text-slate-500">Across all filtered results. Not the current stock balance.</p></div></div>
      <section className={`${salesCard} overflow-x-auto`} aria-label="Movement ledger"><table className="w-full text-left text-sm"><thead><tr>{['Date', 'Product / Barcode', 'Movement', 'Stock change', 'Source', 'Details'].map(label => <th key={label} className="px-3 py-3">{label}</th>)}</tr></thead><tbody>{data.items.map(row => <tr key={row.id} className="border-t border-slate-100 dark:border-slate-700"><td className="px-3 py-3 whitespace-nowrap">{dateLabel(row.occurredAt)}</td><td className="px-3 py-3"><p>{row.productName}</p><p className="text-xs text-slate-500">{row.barcode ?? `Quantity stock · ${row.baseUnit}`}</p></td><td className="px-3 py-3">{movementTypes[row.type] ?? row.type}</td><td className={`px-3 py-3 whitespace-nowrap font-semibold ${row.quantityDelta > 0 ? 'text-emerald-700 dark:text-emerald-300' : row.quantityDelta < 0 ? 'text-rose-700 dark:text-rose-300' : 'text-slate-500'}`}>{`${movementDelta(row.quantityDelta)} ${row.baseUnit}`}</td><td className="px-3 py-3"><Source row={row} /></td><td className="px-3 py-3"><button className={salesSecondary} aria-label={`View movement ${row.id}`} onClick={() => setSelected(row)}>View</button></td></tr>)}</tbody></table>{!data.items.length && <p className="py-8 text-center text-slate-500">No movements match these filters.</p>}</section>
      <div className="flex items-center justify-between text-sm"><span>Page {page} of {pages}</span><div className="flex gap-2"><button className={salesSecondary} disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Previous</button><button className={salesSecondary} disabled={page >= pages} onClick={() => setPage(value => value + 1)}>Next</button></div></div>
    </>}
    {selected && <MovementDetail row={selected} close={() => setSelected(null)} history={() => itemHistory(selected)} />}
  </div>;
}

function MovementDetail({ row, close, history }: { row: InventoryMovement; close: () => void; history: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => { element?.close(); }; }, []);
  return <dialog ref={dialog} onCancel={close} aria-labelledby="movement-title" className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-full max-w-lg overflow-y-auto bg-white p-6 text-slate-900 shadow-xl backdrop:bg-black/40 dark:bg-slate-900 dark:text-slate-100">
    <div className="flex items-center justify-between gap-3"><h2 id="movement-title" className="text-xl font-semibold">Movement #{row.id}</h2><button className={salesSecondary} onClick={close}>Close</button></div>
    <dl className="my-6 space-y-4">{[['Product', row.productName], ['Barcode', row.barcode ?? 'Not applicable — quantity stock'], ['Movement', movementTypes[row.type]], ['Stock change', `${movementDelta(row.quantityDelta)} ${row.baseUnit}`], ['Status change', `${row.fromStatus ? stockStatuses[row.fromStatus] : 'No previous status'} → ${stockStatuses[row.toStatus]}`], ['Occurred at', dateLabel(row.occurredAt)], ['Recorded by', row.actorName ?? (row.actorId ? `User #${row.actorId}` : 'System / unavailable')], ['Unit cost', row.unitCost == null ? 'Not recorded' : row.unitCost.toLocaleString(undefined, { minimumFractionDigits: 2 })], ['Reason', row.reason?.replaceAll('_', ' ') ?? 'Not recorded'], ['Notes', row.notes ?? 'No notes']].map(([label, value]) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="whitespace-pre-wrap break-words">{value}</dd></div>)}<div><dt className="text-xs text-slate-500">Source</dt><dd><Source row={row} /></dd></div></dl>
    <button className={salesButton} onClick={history}>{row.inventoryItemId === null ? 'View this product’s history' : 'View this item’s history'}</button><p className="mt-3 text-xs text-slate-500">Shows all movements for this item or quantity product, clearing other filters. Entries cannot be edited or deleted.</p>
  </dialog>;
}
